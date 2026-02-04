#!/usr/bin/env node

/**
 * RepVet CLI
 * Maintainer Reputation Checker
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createRequire } from 'module';
import pLimit from 'p-limit';
import { checkPackageReputation } from './scorer.js';
import { ReputationResult, Ecosystem, PackageDependency } from './types.js';
import { parseEnvironmentYaml } from './registry/conda.js';

const DEFAULT_CONCURRENCY = 5;

// Get version from package.json (single source of truth)
const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

// Supported dependency files for monorepo scanning
const SUPPORTED_DEP_FILES = [
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'requirements.txt',
  'pyproject.toml',
  'poetry.lock',
  'Pipfile.lock',
  'Cargo.toml',
  'Cargo.lock',
  'Gemfile',
  'Gemfile.lock',
  'go.mod',
  'composer.json',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'mix.exs',
  'pubspec.yaml',
  'cpanfile',
  'Podfile',
  'Package.swift',
  'environment.yml',
  'environment.yaml',
];

const program = new Command();

program
  .name('repvet')
  .description('Check package maintainer reputation (12 ecosystems supported)')
  .version(packageJson.version);

program
  .command('check <package>')
  .description('Check reputation of a single package')
  .option('--json', 'Output as JSON')
  .option('-e, --ecosystem <ecosystem>', 'Ecosystem: npm, pypi, crates, rubygems, go, packagist, nuget, maven, hex, pub, cpan, cocoapods, conda', 'npm')
  .action(async (packageName: string, options: { json?: boolean; ecosystem?: string }) => {
    try {
      const ecosystem = validateEcosystem(options.ecosystem || 'npm');
      const result = await checkPackageReputation(packageName, ecosystem);
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        printResult(result);
      }
      
      process.exit(0);
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ error: String(error) }));
      } else {
        console.error(chalk.red(`Error: ${error}`));
      }
      process.exit(1);
    }
  });

interface SkippedPackage {
  name: string;
  reason: string;
}

program
  .command('scan <path>')
  .description('Scan dependency file or directory (monorepo support)')
  .option('--json', 'Output as JSON')
  .option('--threshold <score>', 'Only show packages below this score', '100')
  .option('--fail-under <score>', 'Exit with code 1 if any package scores below this')
  .option('-c, --concurrency <number>', 'Number of concurrent API requests', String(DEFAULT_CONCURRENCY))
  .option('--show-skipped', 'Show details of skipped packages')
  .action(async (inputPath: string, options: { json?: boolean; threshold?: string; failUnder?: string; concurrency?: string; showSkipped?: boolean }) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const resolvedPath = path.resolve(inputPath);
      const stat = fs.statSync(resolvedPath);
      
      const threshold = parseInt(options.threshold || '100', 10);
      const failUnder = options.failUnder ? parseInt(options.failUnder, 10) : undefined;
      const concurrency = Math.max(1, Math.min(20, parseInt(options.concurrency || String(DEFAULT_CONCURRENCY), 10)));
      
      // Determine files to scan
      let filesToScan: string[];
      if (stat.isDirectory()) {
        filesToScan = findDepFiles(resolvedPath, fs, path);
        if (filesToScan.length === 0) {
          if (options.json) {
            console.log(JSON.stringify({ error: 'No dependency files found in directory' }));
          } else {
            console.log(chalk.yellow('No dependency files found in directory'));
          }
          process.exit(0);
        }
      } else {
        filesToScan = [resolvedPath];
      }
      
      // Scan each file
      interface FileResult {
        path: string;
        relativePath: string;
        ecosystem: Ecosystem;
        packageNames: string[];
        results: ReputationResult[];
        skipped: SkippedPackage[];
      }
      
      const fileResults: FileResult[] = [];
      const limit = pLimit(concurrency);
      
      const checkPackage = async (pkg: PackageDependency, ecosystem: Ecosystem): Promise<{ result?: ReputationResult; skipped?: SkippedPackage }> => {
        try {
          // Pass version to checkPackageReputation for precise OSV matching
          const result = await checkPackageReputation(pkg.name, ecosystem, pkg.version);
          return { result };
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          return { skipped: { name: pkg.name, reason } };
        }
      };
      
      for (const filePath of filesToScan) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileName = path.basename(filePath);
        
        // Set file path for recursive includes in requirements.txt
        (globalThis as unknown as { __repvetFilePath?: string }).__repvetFilePath = filePath;
        
        try {
          const { packages, ecosystem } = parseDepFile(fileName, content);
          
          if (packages.length === 0) continue;
          
          // Extract package names for display (version info preserved in packages array)
          const packageNames = packages.map(p => p.name);
          
          const relativePath = stat.isDirectory() 
            ? path.relative(resolvedPath, filePath)
            : fileName;
          
          if (!options.json) {
            console.log(chalk.dim(`Scanning ${relativePath} (${packageNames.length} ${ecosystem} packages)...`));
          }
          
          const checkResults = await Promise.all(
            packages.map(pkg => limit(() => checkPackage(pkg, ecosystem)))
          );
          
          const results: ReputationResult[] = [];
          const skipped: SkippedPackage[] = [];
          
          for (const { result, skipped: skip } of checkResults) {
            if (skip) skipped.push(skip);
            if (result) results.push(result);
          }
          
          fileResults.push({
            path: filePath,
            relativePath,
            ecosystem,
            packageNames,
            results,
            skipped,
          });
        } catch (e) {
          // Skip unsupported files silently in directory mode
          if (!stat.isDirectory()) throw e;
        }
      }
      
      // Aggregate results
      const allResults: ReputationResult[] = [];
      const allSkipped: SkippedPackage[] = [];
      let totalPackages = 0;
      
      for (const fr of fileResults) {
        allResults.push(...fr.results);
        allSkipped.push(...fr.skipped);
        totalPackages += fr.packageNames.length;
      }
      
      const filteredResults = allResults.filter(r => r.score < threshold);
      const hasFailure = failUnder !== undefined && allResults.some(r => r.score < failUnder);
      
      if (options.json) {
        // Multi-file JSON output
        const summary = summarizeResults(allResults);
        const output = stat.isDirectory()
          ? {
              mode: 'directory',
              path: resolvedPath,
              filesScanned: fileResults.length,
              files: fileResults.map(fr => ({
                path: fr.relativePath,
                ecosystem: fr.ecosystem,
                packageCount: fr.packageNames.length,
                successCount: fr.results.length,
                skippedCount: fr.skipped.length,
                results: fr.results,
                skipped: fr.skipped,
              })),
              summary: {
                totalPackages,
                totalSuccessful: allResults.length,
                totalSkipped: allSkipped.length,
                ...summary,
              },
              threshold,
              filteredCount: filteredResults.length,
              filteredResults,
            }
          : {
              mode: 'file',
              ecosystem: fileResults[0]?.ecosystem,
              scanned: totalPackages,
              successful: allResults.length,
              skipped: allSkipped.length,
              skippedPackages: allSkipped,
              summary: summarizeResults(allResults),
              threshold,
              filteredCount: filteredResults.length,
              filteredSummary: summarizeResults(filteredResults),
              allResults,
              filteredResults,
            };
        console.log(JSON.stringify(output, null, 2));
      } else {
        console.log('');
        
        if (filteredResults.length === 0) {
          console.log(chalk.green('✓ All packages above threshold'));
        } else {
          console.log(chalk.bold(`Packages below threshold (${threshold}):\n`));
          for (const result of filteredResults) {
            printResult(result);
            console.log('');
          }
        }
        
        const summary = summarizeResults(allResults);
        console.log(chalk.dim('─'.repeat(50)));
        
        if (stat.isDirectory()) {
          console.log(chalk.dim(`Files scanned: ${fileResults.length}`));
        }
        
        console.log(`Scanned: ${allResults.length}/${totalPackages} | ` + 
          chalk.red(`Critical: ${summary.critical}`) + ' | ' +
          chalk.red(`High: ${summary.high}`) + ' | ' +
          chalk.yellow(`Medium: ${summary.medium}`) + ' | ' +
          chalk.green(`Low: ${summary.low}`));
        
        if (allSkipped.length > 0) {
          console.log(chalk.dim(`Skipped: ${allSkipped.length} (not found or API error)`));
          if (options.showSkipped) {
            console.log(chalk.dim('\nSkipped packages:'));
            for (const sp of allSkipped) {
              console.log(chalk.dim(`  • ${sp.name}: ${sp.reason}`));
            }
          }
        }
      }
      
      process.exit(hasFailure ? 1 : 0);
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ error: String(error) }));
      } else {
        console.error(chalk.red(`Error: ${error}`));
      }
      process.exit(1);
    }
  });

/**
 * Recursively find supported dependency files in a directory
 */
function findDepFiles(
  dir: string,
  fs: typeof import('fs'),
  path: typeof import('path'),
  maxDepth = 5,
  currentDepth = 0
): string[] {
  if (currentDepth > maxDepth) return [];
  
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    // Skip common non-project directories
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'vendor', 'target', '__pycache__', '.venv', 'venv', 'dist', 'build'].includes(entry.name)) {
        continue;
      }
      const subDir = path.join(dir, entry.name);
      files.push(...findDepFiles(subDir, fs, path, maxDepth, currentDepth + 1));
    } else if (entry.isFile()) {
      if (SUPPORTED_DEP_FILES.includes(entry.name)) {
        files.push(path.join(dir, entry.name));
      }
    }
  }
  
  return files;
}

function validateEcosystem(eco: string): Ecosystem {
  const valid = ['npm', 'pypi', 'crates', 'rubygems', 'go', 'packagist', 'nuget', 'maven', 'hex', 'pub', 'cpan', 'cocoapods', 'conda'];
  if (!valid.includes(eco.toLowerCase())) {
    throw new Error(`Invalid ecosystem: ${eco}. Use: ${valid.join(', ')}`);
  }
  return eco.toLowerCase() as Ecosystem;
}

function parseDepFile(fileName: string, content: string): { packages: PackageDependency[]; ecosystem: Ecosystem } {
  if (fileName === 'package.json' || fileName.endsWith('/package.json')) {
    const pkg = JSON.parse(content) as { 
      dependencies?: Record<string, string>; 
      devDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      bundledDependencies?: string[] | Record<string, string>;
    };
    
    // Handle bundledDependencies which can be an array or object
    const bundled = Array.isArray(pkg.bundledDependencies)
      ? pkg.bundledDependencies
      : Object.keys(pkg.bundledDependencies || {});
    
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.optionalDependencies,
      ...pkg.peerDependencies,
    };
    
    // Merge object keys with bundled array
    const packageNames = [...new Set([...Object.keys(allDeps), ...bundled])];
    
    return {
      packages: packageNames.map(name => ({ name })),
      ecosystem: 'npm',
    };
  }
  
  if (fileName === 'requirements.txt' || fileName.endsWith('.txt')) {
    // For recursive includes, we need the file path
    // If called from scan command, filePath is available
    const packageNames = parseRequirementsTxt(content, (globalThis as unknown as { __repvetFilePath?: string }).__repvetFilePath);
    return { packages: packageNames.map(name => ({ name })), ecosystem: 'pypi' };
  }
  
  if (fileName === 'Cargo.toml' || fileName.endsWith('/Cargo.toml')) {
    const packageNames = parseCargoToml(content);
    return { packages: packageNames.map(name => ({ name })), ecosystem: 'crates' };
  }
  
  if (fileName === 'Gemfile' || fileName.endsWith('.gemspec')) {
    // Parse Ruby gem dependencies (Gemfile.lock is handled separately below)
    const packageNames: string[] = [];
    const gemPattern = /gem\s+['"]([a-zA-Z0-9_-]+)['"]/g;
    let match;
    while ((match = gemPattern.exec(content)) !== null) {
      if (!packageNames.includes(match[1])) {
        packageNames.push(match[1]);
      }
    }
    return { packages: packageNames.map(name => ({ name })), ecosystem: 'rubygems' };
  }
  
  if (fileName === 'go.mod') {
    const packageNames = parseGoMod(content);
    return { packages: packageNames.map(name => ({ name })), ecosystem: 'go' };
  }
  
  if (fileName === 'composer.json') {
    // Parse PHP Composer dependencies
    const pkg = JSON.parse(content) as { 
      require?: Record<string, string>; 
      'require-dev'?: Record<string, string> 
    };
    const packageNames = Object.keys({ 
      ...pkg.require, 
      ...pkg['require-dev'] 
    }).filter(p => !p.startsWith('php') && !p.startsWith('ext-'));
    return { packages: packageNames.map(name => ({ name })), ecosystem: 'packagist' };
  }
  
  if (fileName.endsWith('.csproj') || fileName.endsWith('.fsproj')) {
    // Parse .NET project file
    const packageNames: string[] = [];
    const packageRefPattern = /<PackageReference\s+Include="([^"]+)"/g;
    let match;
    while ((match = packageRefPattern.exec(content)) !== null) {
      packageNames.push(match[1]);
    }
    return { packages: packageNames.map(name => ({ name })), ecosystem: 'nuget' };
  }
  
  if (fileName === 'pom.xml') {
    // Parse Maven POM
    const packageNames: string[] = [];
    const depPattern = /<dependency>[\s\S]*?<groupId>([^<]+)<\/groupId>[\s\S]*?<artifactId>([^<]+)<\/artifactId>/g;
    let match;
    while ((match = depPattern.exec(content)) !== null) {
      packageNames.push(`${match[1]}:${match[2]}`);
    }
    return { packages: packageNames.map(name => ({ name })), ecosystem: 'maven' };
  }
  
  if (fileName === 'build.gradle' || fileName === 'build.gradle.kts') {
    const packageNames = parseBuildGradle(content);
    return { packages: packageNames.map(name => ({ name })), ecosystem: 'maven' };
  }
  
  if (fileName === 'mix.exs') {
    // Parse Elixir Mix dependencies
    const packageNames: string[] = [];
    const depPattern = /\{:([a-z_]+),/g;
    let match;
    while ((match = depPattern.exec(content)) !== null) {
      packageNames.push(match[1]);
    }
    return { packages: packageNames.map(name => ({ name })), ecosystem: 'hex' };
  }
  
  if (fileName === 'pubspec.yaml') {
    // Parse Dart/Flutter pubspec
    const packageNames: string[] = [];
    const lines = content.split('\n');
    let inDependencies = false;
    
    for (const line of lines) {
      if (line.match(/^dependencies:/)) {
        inDependencies = true;
        continue;
      }
      if (line.match(/^[a-z_]+:/) && !line.startsWith(' ')) {
        inDependencies = false;
        continue;
      }
      if (inDependencies) {
        const match = line.match(/^\s+([a-z_0-9]+):/);
        if (match && !match[1].startsWith('flutter')) {
          packageNames.push(match[1]);
        }
      }
    }
    return { packages: packageNames.map(name => ({ name })), ecosystem: 'pub' };
  }
  
  if (fileName === 'cpanfile' || fileName === 'Makefile.PL' || fileName === 'Build.PL') {
    // Parse Perl dependencies
    const packageNames: string[] = [];
    const requiresPattern = /requires\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = requiresPattern.exec(content)) !== null) {
      packageNames.push(match[1].replace(/::/g, '-'));
    }
    return { packages: packageNames.map(name => ({ name })), ecosystem: 'cpan' };
  }
  
  if (fileName === 'Podfile') {
    // Parse CocoaPods
    const packageNames: string[] = [];
    const podPattern = /pod\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = podPattern.exec(content)) !== null) {
      packageNames.push(match[1]);
    }
    return { packages: packageNames.map(name => ({ name })), ecosystem: 'cocoapods' };
  }
  
  if (fileName === 'Package.swift') {
    // Parse Swift Package Manager
    const packageNames: string[] = [];
    const depPattern = /\.package\s*\([^)]*name:\s*"([^"]+)"/g;
    let match;
    while ((match = depPattern.exec(content)) !== null) {
      packageNames.push(match[1]);
    }
    return { packages: packageNames.map(name => ({ name })), ecosystem: 'cocoapods' }; // Use CocoaPods for Swift too
  }
  
  if (fileName === 'environment.yml' || fileName === 'environment.yaml' || 
      fileName.endsWith('/environment.yml') || fileName.endsWith('/environment.yaml')) {
    // Parse Conda environment file
    const { condaPackages } = parseEnvironmentYaml(content);
    return { packages: condaPackages.map(name => ({ name })), ecosystem: 'conda' };
  }
  
  if (fileName === 'pyproject.toml' || fileName.endsWith('/pyproject.toml')) {
    // Parse pyproject.toml (PEP 621 and Poetry)
    const packages = parsePyprojectToml(content);
    return { packages: packages.map(name => ({ name })), ecosystem: 'pypi' };
  }
  
  // ========== Lock Files ==========
  
  // npm: package-lock.json, npm-shrinkwrap.json
  if (fileName === 'package-lock.json' || fileName === 'npm-shrinkwrap.json' ||
      fileName.endsWith('/package-lock.json') || fileName.endsWith('/npm-shrinkwrap.json')) {
    return { packages: parsePackageLock(content), ecosystem: 'npm' };
  }
  
  // yarn: yarn.lock
  if (fileName === 'yarn.lock' || fileName.endsWith('/yarn.lock')) {
    return { packages: parseYarnLock(content), ecosystem: 'npm' };
  }
  
  // pnpm: pnpm-lock.yaml
  if (fileName === 'pnpm-lock.yaml' || fileName.endsWith('/pnpm-lock.yaml')) {
    return { packages: parsePnpmLock(content), ecosystem: 'npm' };
  }
  
  // Python: poetry.lock
  if (fileName === 'poetry.lock' || fileName.endsWith('/poetry.lock')) {
    return { packages: parsePoetryLock(content), ecosystem: 'pypi' };
  }
  
  // Python: Pipfile.lock
  if (fileName === 'Pipfile.lock' || fileName.endsWith('/Pipfile.lock')) {
    return { packages: parsePipfileLock(content), ecosystem: 'pypi' };
  }
  
  // Rust: Cargo.lock
  if (fileName === 'Cargo.lock' || fileName.endsWith('/Cargo.lock')) {
    return { packages: parseCargoLock(content), ecosystem: 'crates' };
  }
  
  // Ruby: Gemfile.lock
  if (fileName === 'Gemfile.lock' || fileName.endsWith('/Gemfile.lock')) {
    return { packages: parseGemfileLock(content), ecosystem: 'rubygems' };
  }
  
  throw new Error(`Unsupported file format: ${fileName}`);
}

function summarizeResults(results: ReputationResult[]) {
  return {
    low: results.filter(r => r.riskLevel === 'LOW').length,
    medium: results.filter(r => r.riskLevel === 'MEDIUM').length,
    high: results.filter(r => r.riskLevel === 'HIGH').length,
    critical: results.filter(r => r.riskLevel === 'CRITICAL').length,
  };
}

function printResult(result: ReputationResult): void {
  const scoreColor = result.riskLevel === 'LOW' ? chalk.green 
    : result.riskLevel === 'MEDIUM' ? chalk.yellow 
    : result.riskLevel === 'HIGH' ? chalk.red
    : chalk.bgRed.white;
  
  const ecosystemBadge = chalk.dim(`[${result.ecosystem}]`);
  const deletedBadge = result.isDeleted ? chalk.bgRed.white(' DELETED/REMOVED ') : '';
  
  console.log(chalk.bold(`📦 ${result.package}`) + ' ' + ecosystemBadge + deletedBadge);
  console.log(`   Score: ${scoreColor(`${result.score}/100`)} (${result.riskLevel} risk)`);
  
  if (result.isDeleted) {
    console.log(chalk.red(`   ⚠️  This package was removed from ${result.ecosystem} (known malware)`));
  } else {
    console.log(`   Maintainers: ${result.maintainers.join(', ') || 'Unknown'}`);
  }
  
  if (result.lastCommitDate) {
    console.log(`   Last Commit: ${result.lastCommitDate.split('T')[0]}`);
  }
  
  if (result.vulnerabilityStats && result.vulnerabilityStats.total > 0) {
    const vs = result.vulnerabilityStats;
    console.log(`   Vulnerabilities: ${vs.total} total` +
      (vs.critical > 0 ? chalk.red(` (${vs.critical} critical)`) : '') +
      (vs.high > 0 ? chalk.yellow(` (${vs.high} high)`) : '') +
      (vs.hasUnfixed ? chalk.red(' [unfixed]') : ''));
  }
  
  if (result.deductions.length > 0) {
    console.log(chalk.yellow('   Deductions:'));
    for (const d of result.deductions) {
      const confidenceBadge = d.confidence !== 'high' ? chalk.dim(` [${d.confidence}]`) : '';
      console.log(chalk.red(`     -${d.points}: ${d.reason}`) + confidenceBadge);
    }
  }
}

/**
 * Parse requirements.txt with support for:
 * - -r (recursive includes) - follows and parses included files
 * - -c (constraint files) - follows and parses constraint files  
 * - VCS URLs (git+https://..., etc.)
 * - Comments and blank lines
 * - Editable installs (-e)
 */
function parseRequirementsTxt(content: string, filePath?: string, visitedPaths?: Set<string>): string[] {
  const packages: string[] = [];
  const lines = content.split('\n');
  
  // Track visited files to prevent circular includes
  const visited = visitedPaths ?? new Set<string>();
  if (filePath) {
    visited.add(filePath);
  }
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    // Handle recursive includes (-r) and constraint files (-c)
    if (trimmed.startsWith('-r ') || trimmed.startsWith('-c ')) {
      const includedFile = trimmed.replace(/^-[rc]\s+/, '').trim();
      
      if (filePath && includedFile) {
        try {
          // Import fs and path synchronously for recursive parsing
          const fsModule = require('fs');
          const pathModule = require('path');
          
          // Resolve relative path based on current file's directory
          const baseDir = pathModule.dirname(filePath);
          const includedPath = pathModule.resolve(baseDir, includedFile);
          
          // Skip if already visited (prevent circular includes)
          if (!visited.has(includedPath)) {
            if (fsModule.existsSync(includedPath)) {
              const includedContent = fsModule.readFileSync(includedPath, 'utf-8');
              const includedPackages = parseRequirementsTxt(includedContent, includedPath, visited);
              packages.push(...includedPackages);
            }
          }
        } catch {
          // Silently skip if file cannot be read
        }
      }
      continue;
    }
    
    // Handle editable installs: -e git+https://...#egg=package_name
    if (trimmed.startsWith('-e ')) {
      const eggMatch = trimmed.match(/#egg=([a-zA-Z0-9_-]+)/);
      if (eggMatch) {
        packages.push(eggMatch[1]);
      }
      continue;
    }
    
    // Skip other pip options (-i, --index-url, etc.)
    if (trimmed.startsWith('-') || trimmed.startsWith('--')) {
      continue;
    }
    
    // Handle VCS URLs: git+https://github.com/user/repo.git@tag#egg=package_name
    if (trimmed.match(/^(git|hg|svn|bzr)\+/)) {
      const eggMatch = trimmed.match(/#egg=([a-zA-Z0-9_-]+)/);
      if (eggMatch) {
        packages.push(eggMatch[1]);
      }
      continue;
    }
    
    // Standard package specification: package==1.0.0, package>=1.0, package[extra]>=1.0
    const match = trimmed.match(/^([a-zA-Z0-9][a-zA-Z0-9._-]*)(?:\[.*?\])?/);
    if (match) {
      packages.push(match[1]);
    }
  }
  
  return [...new Set(packages)]; // Deduplicate
}

/**
 * Parse Cargo.toml with support for:
 * - [dependencies]
 * - [dev-dependencies]
 * - [build-dependencies]
 * - [workspace.dependencies]
 * - Inline tables and multi-line specifications
 */
function parseCargoToml(content: string): string[] {
  const packages: string[] = [];
  
  // Match all dependency sections including workspace
  const depSections = [
    /\[dependencies\]([\s\S]*?)(?=\n\[|$)/g,
    /\[dev-dependencies\]([\s\S]*?)(?=\n\[|$)/g,
    /\[build-dependencies\]([\s\S]*?)(?=\n\[|$)/g,
    /\[workspace\.dependencies\]([\s\S]*?)(?=\n\[|$)/g,
  ];
  
  for (const regex of depSections) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const section = match[1];
      const lines = section.split('\n');
      
      for (const line of lines) {
        // Skip comments
        if (line.trim().startsWith('#')) continue;
        
        // Match package name (supports dotted names like foo.bar)
        // Examples:
        //   serde = "1.0"
        //   serde = { version = "1.0", features = ["derive"] }
        //   tokio.workspace = true
        const pkgMatch = line.match(/^([a-zA-Z0-9_-]+)(?:\.[a-zA-Z_]+)?\s*=/);
        if (pkgMatch) {
          packages.push(pkgMatch[1]);
        }
      }
    }
  }
  
  // Also match [dependencies.package_name] style
  const inlineDepRegex = /\[(?:dev-)?dependencies\.([a-zA-Z0-9_-]+)\]/g;
  let inlineMatch;
  while ((inlineMatch = inlineDepRegex.exec(content)) !== null) {
    packages.push(inlineMatch[1]);
  }
  
  return [...new Set(packages)]; // Deduplicate
}

/**
 * Parse go.mod with support for:
 * - require blocks and single-line requires
 * - replace directives (extract original module)
 * - exclude directives (skip these)
 * - Indirect dependencies (included)
 */
function parseGoMod(content: string): string[] {
  const packages: string[] = [];
  const excludedModules = new Set<string>();
  const lines = content.split('\n');
  
  let inRequire = false;
  let inExclude = false;
  let inReplace = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Track block state
    if (trimmed.startsWith('require (') || trimmed === 'require(') {
      inRequire = true;
      continue;
    }
    if (trimmed.startsWith('exclude (') || trimmed === 'exclude(') {
      inExclude = true;
      continue;
    }
    if (trimmed.startsWith('replace (') || trimmed === 'replace(') {
      inReplace = true;
      continue;
    }
    if (trimmed === ')') {
      inRequire = false;
      inExclude = false;
      inReplace = false;
      continue;
    }
    
    // Handle exclude directives
    if (inExclude || trimmed.startsWith('exclude ')) {
      const moduleMatch = trimmed.match(/^(?:exclude\s+)?([^\s]+)/);
      if (moduleMatch) {
        excludedModules.add(moduleMatch[1]);
      }
      continue;
    }
    
    // Handle replace directives - we still want to check the original module
    if (inReplace || trimmed.startsWith('replace ')) {
      const replaceMatch = trimmed.match(/^(?:replace\s+)?([^\s]+)\s+=>/);
      if (replaceMatch) {
        packages.push(replaceMatch[1]);
      }
      continue;
    }
    
    // Handle require directives
    if (inRequire || trimmed.startsWith('require ')) {
      // Match module path and version
      // Examples:
      //   github.com/gin-gonic/gin v1.9.0
      //   github.com/gin-gonic/gin v1.9.0 // indirect
      const moduleMatch = trimmed.match(/^(?:require\s+)?([^\s]+)\s+v[^\s]+/);
      if (moduleMatch) {
        packages.push(moduleMatch[1]);
      }
    }
  }
  
  // Remove excluded modules
  return packages.filter(pkg => !excludedModules.has(pkg));
}

/**
 * Parse build.gradle / build.gradle.kts with support for:
 * - Single-line dependencies
 * - Multi-line dependencies
 * - Various configuration names (implementation, api, compileOnly, etc.)
 * - Kotlin DSL syntax
 */
function parseBuildGradle(content: string): string[] {
  const packages: string[] = [];
  
  // Configuration names that indicate dependencies
  const configs = [
    'implementation',
    'api',
    'compileOnly',
    'runtimeOnly',
    'testImplementation',
    'testRuntimeOnly',
    'androidTestImplementation',
    'kapt',
    'annotationProcessor',
    'classpath',
  ];
  
  const configPattern = configs.join('|');
  
  // Kotlin DSL: implementation("group:artifact:version")
  const kotlinDslRegex = new RegExp(
    `(?:${configPattern})\\s*\\(\\s*["']([^"']+)["']\\s*\\)`,
    'g'
  );
  
  let match;
  while ((match = kotlinDslRegex.exec(content)) !== null) {
    const dep = match[1];
    const parts = dep.split(':');
    if (parts.length >= 2) {
      packages.push(`${parts[0]}:${parts[1]}`);
    }
  }
  
  // Groovy DSL: implementation 'group:artifact:version'
  const groovyDslRegex = new RegExp(
    `(?:${configPattern})\\s+["']([^"']+)["']`,
    'g'
  );
  
  while ((match = groovyDslRegex.exec(content)) !== null) {
    const dep = match[1];
    const parts = dep.split(':');
    if (parts.length >= 2) {
      packages.push(`${parts[0]}:${parts[1]}`);
    }
  }
  
  // Multi-line dependency blocks:
  // implementation(group: "com.example", name: "library", version: "1.0")
  const multiLineRegex = new RegExp(
    `(?:${configPattern})\\s*\\([^)]*group\\s*[=:]\\s*["']([^"']+)["'][^)]*name\\s*[=:]\\s*["']([^"']+)["']`,
    'g'
  );
  
  while ((match = multiLineRegex.exec(content)) !== null) {
    packages.push(`${match[1]}:${match[2]}`);
  }
  
  // Kotlin DSL with named parameters in different order:
  // implementation(name = "library", group = "com.example", version = "1.0")
  const kotlinNamedRegex = new RegExp(
    `(?:${configPattern})\\s*\\([^)]*name\\s*=\\s*["']([^"']+)["'][^)]*group\\s*=\\s*["']([^"']+)["']`,
    'g'
  );
  
  while ((match = kotlinNamedRegex.exec(content)) !== null) {
    packages.push(`${match[2]}:${match[1]}`);
  }
  
  return [...new Set(packages)]; // Deduplicate
}

/**
 * Parse package-lock.json / npm-shrinkwrap.json
 * Supports lockfileVersion 1, 2, and 3
 * Returns package names with versions
 */
function parsePackageLock(content: string): PackageDependency[] {
  const lock = JSON.parse(content) as {
    packages?: Record<string, { version?: string }>;
    dependencies?: Record<string, { version?: string }>;
  };
  
  // v2/v3 format: "packages" object with "node_modules/pkg" keys
  // v1 format: "dependencies" object with pkg names as keys
  const packagesObj = lock.packages || lock.dependencies || {};
  
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  
  for (const [key, value] of Object.entries(packagesObj)) {
    // Skip empty string key (root package in v2/v3)
    if (!key) continue;
    // Skip workspace packages (local paths)
    if (key.startsWith('node_modules/') && key.includes('node_modules/node_modules/')) continue;
    
    const name = key.replace(/^node_modules\//, '');
    if (!name || seen.has(name)) continue;
    seen.add(name);
    
    deps.push({
      name,
      version: value?.version,
    });
  }
  
  return deps;
}

/**
 * Parse yarn.lock (Yarn Classic v1 and Yarn Berry v2+)
 * Format: "package@version:" or "package@npm:version:"
 * Returns package names with resolved versions
 */
function parseYarnLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Map<string, string>(); // name -> version
  
  // Match package entries at the start of lines
  // Yarn v1: "package@^1.0.0":
  // Yarn v1 scoped: "@types/node@^20.0.0":
  // Yarn v1 with multiple versions: "package@^1.0.0, package@^1.1.0":
  // Yarn Berry: "package@npm:^1.0.0":
  const lines = content.split('\n');
  
  let currentPackage: string | null = null;
  
  for (const line of lines) {
    // Skip comments
    if (line.startsWith('#')) {
      continue;
    }
    
    // Check for version line (indented with "version")
    if (currentPackage && line.match(/^\s+version\s+["']?([^"'\s]+)["']?/)) {
      const versionMatch = line.match(/^\s+version\s+["']?([^"'\s]+)["']?/);
      if (versionMatch && !seen.has(currentPackage)) {
        seen.set(currentPackage, versionMatch[1]);
      }
      continue;
    }
    
    // Match package declarations (non-indented lines)
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      // Try scoped package first: "@scope/package@version"
      const scopedMatch = line.match(/^"?(@[^/]+\/[^@\s"]+)@/);
      if (scopedMatch && scopedMatch[1]) {
        currentPackage = scopedMatch[1];
        continue;
      }
      
      // Regular package: "package@version"
      const match = line.match(/^"?([^@\s"]+)@/);
      if (match && match[1]) {
        // Skip internal yarn entries
        if (!match[1].startsWith('__')) {
          currentPackage = match[1];
        }
      }
    }
  }
  
  // Convert Map to PackageDependency array
  for (const [name, version] of seen) {
    deps.push({ name, version });
  }
  
  return deps;
}

/**
 * Parse pnpm-lock.yaml
 * Format: YAML with packages/dependencies objects
 * Returns package names with versions from packages section
 */
function parsePnpmLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  
  // Two-pass parsing: first collect from packages (with versions), then from dependencies
  const lines = content.split('\n');
  
  // Pass 1: Extract packages with versions from packages section
  let inPackages = false;
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (/^packages:\s*$/.test(trimmed)) {
      inPackages = true;
      continue;
    }
    // New top-level section ends packages
    if (!line.startsWith(' ') && /^[a-zA-Z][a-zA-Z0-9]*:\s*$/.test(trimmed)) {
      if (inPackages) break; // Done with packages section
      continue;
    }
    
    if (inPackages) {
      // Match: /package@version: or /@scope/package@version:
      const pkgMatch = trimmed.match(/^\/?(@?[^@(]+)@([^(:]+)/);
      if (pkgMatch && pkgMatch[1] && pkgMatch[2]) {
        const name = pkgMatch[1].replace(/^\//, '');
        const version = pkgMatch[2];
        if (name && !name.startsWith('/') && !seen.has(name)) {
          seen.add(name);
          deps.push({ name, version });
        }
      }
    }
  }
  
  // Pass 2: Add any packages from dependencies section that weren't in packages
  let inDependencies = false;
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (/^(dependencies|devDependencies|optionalDependencies):\s*$/.test(trimmed)) {
      inDependencies = true;
      continue;
    }
    if (/^packages:\s*$/.test(trimmed)) {
      inDependencies = false;
      continue;
    }
    if (!line.startsWith(' ') && /^[a-zA-Z][a-zA-Z0-9]*:\s*$/.test(trimmed)) {
      inDependencies = false;
      continue;
    }
    
    if (inDependencies && line.match(/^  [^ ]/)) {
      const depMatch = line.match(/^  ['"]?(@?[a-zA-Z0-9_@/.-]+)['"]?\s*:/);
      if (depMatch && depMatch[1] && !seen.has(depMatch[1])) {
        seen.add(depMatch[1]);
        deps.push({ name: depMatch[1] });
      }
    }
  }
  
  return deps;
}

/**
 * Parse poetry.lock (TOML format)
 * Format: [[package]] sections with name = "package" and version = "..."
 * Returns package names with versions
 */
function parsePoetryLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  
  // Split into [[package]] blocks and parse each
  const lines = content.split('\n');
  let currentName: string | null = null;
  let currentVersion: string | null = null;
  
  for (const line of lines) {
    // New package block
    if (line.trim() === '[[package]]') {
      // Save previous package if exists
      if (currentName && !seen.has(currentName)) {
        seen.add(currentName);
        deps.push({ name: currentName, version: currentVersion || undefined });
      }
      currentName = null;
      currentVersion = null;
      continue;
    }
    
    // Match name = "..."
    const nameMatch = line.match(/^name\s*=\s*"([^"]+)"/);
    if (nameMatch) {
      currentName = nameMatch[1];
      continue;
    }
    
    // Match version = "..."
    const versionMatch = line.match(/^version\s*=\s*"([^"]+)"/);
    if (versionMatch) {
      currentVersion = versionMatch[1];
      continue;
    }
  }
  
  // Don't forget the last package
  if (currentName && !seen.has(currentName)) {
    deps.push({ name: currentName, version: currentVersion || undefined });
  }
  
  return deps;
}

/**
 * Parse Pipfile.lock (JSON format)
 * Format: {"default": {...}, "develop": {...}}
 * Returns package names with versions
 */
function parsePipfileLock(content: string): PackageDependency[] {
  const lock = JSON.parse(content) as {
    default?: Record<string, { version?: string }>;
    develop?: Record<string, { version?: string }>;
  };
  
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  
  // Process both default and develop dependencies
  for (const section of [lock.default, lock.develop]) {
    if (!section) continue;
    for (const [name, info] of Object.entries(section)) {
      if (seen.has(name)) continue;
      seen.add(name);
      // Pipfile.lock stores version as "==1.0.0", strip the prefix
      const version = info?.version?.replace(/^==/, '');
      deps.push({ name, version });
    }
  }
  
  return deps;
}

/**
 * Parse Cargo.lock (TOML format)
 * Format: [[package]] sections with name = "package" and version = "..."
 * Returns package names with versions
 */
function parseCargoLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  
  // Split into [[package]] blocks and parse each
  const lines = content.split('\n');
  let currentName: string | null = null;
  let currentVersion: string | null = null;
  
  for (const line of lines) {
    // New package block
    if (line.trim() === '[[package]]') {
      // Save previous package if exists
      if (currentName && !seen.has(currentName)) {
        seen.add(currentName);
        deps.push({ name: currentName, version: currentVersion || undefined });
      }
      currentName = null;
      currentVersion = null;
      continue;
    }
    
    // Match name = "..."
    const nameMatch = line.match(/^name\s*=\s*"([^"]+)"/);
    if (nameMatch) {
      currentName = nameMatch[1];
      continue;
    }
    
    // Match version = "..."
    const versionMatch = line.match(/^version\s*=\s*"([^"]+)"/);
    if (versionMatch) {
      currentVersion = versionMatch[1];
      continue;
    }
  }
  
  // Don't forget the last package
  if (currentName && !seen.has(currentName)) {
    deps.push({ name: currentName, version: currentVersion || undefined });
  }
  
  return deps;
}

/**
 * Parse Gemfile.lock
 * Format: GEM section with specs, each gem indented with name (version)
 * Returns package names with versions
 */
function parseGemfileLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  const lines = content.split('\n');
  
  let inSpecs = false;
  
  for (const line of lines) {
    // Detect specs section (indented under GEM remote)
    if (line === '  specs:') {
      inSpecs = true;
      continue;
    }
    
    // End of specs section (new top-level section)
    if (inSpecs && line.match(/^[A-Z]/)) {
      inSpecs = false;
      continue;
    }
    
    if (inSpecs) {
      // Match gem entries: "    gem_name (version)"
      // Top-level gems have 4 spaces, dependencies have 6+
      const gemMatch = line.match(/^    ([a-zA-Z0-9_-]+)\s+\(([^)]+)\)/);
      if (gemMatch && gemMatch[1] && !seen.has(gemMatch[1])) {
        seen.add(gemMatch[1]);
        deps.push({ name: gemMatch[1], version: gemMatch[2] });
      }
    }
  }
  
  return deps;
}

/**
 * Parse pyproject.toml with support for:
 * - PEP 621: project.dependencies array
 * - PEP 621: project.optional-dependencies.*
 * - Poetry: tool.poetry.dependencies
 * - Poetry: tool.poetry.dev-dependencies
 * - Poetry: tool.poetry.group.*.dependencies
 */
function parsePyprojectToml(content: string): string[] {
  const packages: string[] = [];
  
  // Helper to extract package name from PEP 508 requirement string
  // Examples: "requests>=2.28.0", "flask[async]>=2.0", "django~=4.0"
  const extractPkgName = (req: string): string | null => {
    const match = req.match(/^([a-zA-Z0-9][a-zA-Z0-9._-]*)(?:\[.*?\])?/);
    return match ? match[1] : null;
  };
  
  // ========== PEP 621 format ==========
  // [project]
  // dependencies = ["requests>=2.28.0", "flask[async]>=2.0"]
  
  // Match project.dependencies array (multi-line)
  // Use \n\s*\] to match closing bracket on its own line (avoids matching [extras] in deps)
  const projectDepsRegex = /\[project\][\s\S]*?dependencies\s*=\s*\[([\s\S]*?)\n\s*\]/;
  const projectDepsMatch = content.match(projectDepsRegex);
  if (projectDepsMatch) {
    const depsArray = projectDepsMatch[1];
    // Extract quoted strings from array
    const depStrings = depsArray.match(/"([^"]+)"/g) || [];
    for (const quoted of depStrings) {
      const dep = quoted.replace(/"/g, '');
      const pkgName = extractPkgName(dep);
      if (pkgName) packages.push(pkgName);
    }
  }
  
  // Match project.optional-dependencies.* arrays
  const optionalDepsRegex = /\[project\.optional-dependencies\]([\s\S]*?)(?=\n\[|$)/;
  const optionalMatch = content.match(optionalDepsRegex);
  if (optionalMatch) {
    const section = optionalMatch[1];
    // Find all arrays in this section
    const arrayRegex = /\w+\s*=\s*\[([\s\S]*?)\]/g;
    let arrayMatch;
    while ((arrayMatch = arrayRegex.exec(section)) !== null) {
      const depStrings = arrayMatch[1].match(/"([^"]+)"/g) || [];
      for (const quoted of depStrings) {
        const dep = quoted.replace(/"/g, '');
        const pkgName = extractPkgName(dep);
        if (pkgName) packages.push(pkgName);
      }
    }
  }
  
  // ========== Poetry format ==========
  // [tool.poetry.dependencies]
  // requests = "^2.28.0"
  // flask = {version = "^2.0", extras = ["async"]}
  
  const poetrySections = [
    /\[tool\.poetry\.dependencies\]([\s\S]*?)(?=\n\[|$)/,
    /\[tool\.poetry\.dev-dependencies\]([\s\S]*?)(?=\n\[|$)/,
  ];
  
  for (const regex of poetrySections) {
    const match = content.match(regex);
    if (match) {
      const section = match[1];
      const lines = section.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip comments
        if (trimmed.startsWith('#')) continue;
        // Match: package = "version" or package = { ... }
        const pkgMatch = trimmed.match(/^([a-zA-Z0-9][a-zA-Z0-9._-]*)\s*=/);
        if (pkgMatch && pkgMatch[1] !== 'python') {
          packages.push(pkgMatch[1]);
        }
      }
    }
  }
  
  // Poetry group dependencies: [tool.poetry.group.dev.dependencies]
  const groupRegex = /\[tool\.poetry\.group\.\w+\.dependencies\]([\s\S]*?)(?=\n\[|$)/g;
  let groupMatch;
  while ((groupMatch = groupRegex.exec(content)) !== null) {
    const section = groupMatch[1];
    const lines = section.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) continue;
      const pkgMatch = trimmed.match(/^([a-zA-Z0-9][a-zA-Z0-9._-]*)\s*=/);
      if (pkgMatch && pkgMatch[1] !== 'python') {
        packages.push(pkgMatch[1]);
      }
    }
  }
  
  return [...new Set(packages)];
}

program.parse();
