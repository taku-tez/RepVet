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
import {
  parsePackageLock,
  parseYarnLock,
  parsePnpmLock,
  parseRequirementsTxt,
  parsePoetryLock,
  parsePipfileLock,
  parsePyprojectToml,
  parseCargoToml,
  parseCargoLock,
  parseGoMod,
  parseBuildGradle,
  parseGemfileLock,
  parseComposerLock,
  parseMixLock,
  parsePubspecLock,
  parsePodfileLock,
  parseBunLock,
} from './parsers/index.js';

const DEFAULT_CONCURRENCY = 5;

// Get version from package.json (single source of truth)
const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

// Supported dependency files for monorepo scanning (exact names)
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
  'composer.lock',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'mix.exs',
  'mix.lock',
  'pubspec.yaml',
  'pubspec.lock',
  'cpanfile',
  'Makefile.PL',
  'Build.PL',
  'Podfile',
  'Podfile.lock',
  'bun.lock',
  'Package.swift',
  'environment.yml',
  'environment.yaml',
];

// Supported file extensions for monorepo scanning
const SUPPORTED_DEP_EXTENSIONS = [
  '.csproj',    // NuGet (.NET C#)
  '.fsproj',    // NuGet (.NET F#)
  '.gemspec',   // RubyGems
];

const program = new Command();

program
  .name('repvet')
  .description('Check package maintainer reputation (13 ecosystems supported)')
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
      const concurrency = parseInt(options.concurrency || String(DEFAULT_CONCURRENCY), 10);
      
      // Validate numeric options
      if (!Number.isFinite(threshold)) {
        const errMsg = `Invalid threshold value: ${options.threshold}. Must be a number.`;
        if (options.json) {
          console.log(JSON.stringify({ error: errMsg }));
        } else {
          console.error(chalk.red(`Error: ${errMsg}`));
        }
        process.exit(1);
      }
      
      if (failUnder !== undefined && !Number.isFinite(failUnder)) {
        const errMsg = `Invalid fail-under value: ${options.failUnder}. Must be a number.`;
        if (options.json) {
          console.log(JSON.stringify({ error: errMsg }));
        } else {
          console.error(chalk.red(`Error: ${errMsg}`));
        }
        process.exit(1);
      }
      
      if (!Number.isFinite(concurrency) || concurrency < 1) {
        const errMsg = `Invalid concurrency value: ${options.concurrency}. Must be a positive number.`;
        if (options.json) {
          console.log(JSON.stringify({ error: errMsg }));
        } else {
          console.error(chalk.red(`Error: ${errMsg}`));
        }
        process.exit(1);
      }
      
      // Clamp concurrency to safe range
      const safeConcurrency = Math.max(1, Math.min(20, concurrency));
      
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
      const limit = pLimit(safeConcurrency);
      
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
          const parseResults = parseDepFile(fileName, content);
          
          const relativePath = stat.isDirectory() 
            ? path.relative(resolvedPath, filePath)
            : fileName;
          
          // parseDepFile returns array (supports multi-ecosystem files like environment.yml)
          for (const { packages, ecosystem } of parseResults) {
            if (packages.length === 0) continue;
          
            // Extract package names for display (version info preserved in packages array)
            const packageNames = packages.map(p => p.name);
          
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
          }  // end of parseResults loop
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
      // Check exact file names
      if (SUPPORTED_DEP_FILES.includes(entry.name)) {
        files.push(path.join(dir, entry.name));
      } else {
        // Check file extensions
        for (const ext of SUPPORTED_DEP_EXTENSIONS) {
          if (entry.name.endsWith(ext)) {
            files.push(path.join(dir, entry.name));
            break;
          }
        }
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

function parseDepFile(fileName: string, content: string): Array<{ packages: PackageDependency[]; ecosystem: Ecosystem }> {
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
    
    return [{
      packages: packageNames.map(name => ({ name })),
      ecosystem: 'npm',
    }];
  }
  
  if (fileName === 'requirements.txt' || fileName.endsWith('.txt')) {
    // For recursive includes, we need the file path
    // If called from scan command, filePath is available
    const packageNames = parseRequirementsTxt(content, (globalThis as unknown as { __repvetFilePath?: string }).__repvetFilePath);
    return [{ packages: packageNames.map(name => ({ name })), ecosystem: 'pypi' }];
  }
  
  if (fileName === 'Cargo.toml' || fileName.endsWith('/Cargo.toml')) {
    const packageNames = parseCargoToml(content);
    return [{ packages: packageNames.map(name => ({ name })), ecosystem: 'crates' }];
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
    return [{ packages: packageNames.map(name => ({ name })), ecosystem: 'rubygems' }];
  }
  
  if (fileName === 'go.mod') {
    const packageNames = parseGoMod(content);
    return [{ packages: packageNames.map(name => ({ name })), ecosystem: 'go' }];
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
    return [{ packages: packageNames.map(name => ({ name })), ecosystem: 'packagist' }];
  }
  
  // PHP: composer.lock
  if (fileName === 'composer.lock' || fileName.endsWith('/composer.lock')) {
    return [{ packages: parseComposerLock(content), ecosystem: 'packagist' }];
  }
  
  // Elixir: mix.lock
  if (fileName === 'mix.lock' || fileName.endsWith('/mix.lock')) {
    return [{ packages: parseMixLock(content), ecosystem: 'hex' }];
  }
  
  if (fileName.endsWith('.csproj') || fileName.endsWith('.fsproj')) {
    // Parse .NET project file
    const packageNames: string[] = [];
    const packageRefPattern = /<PackageReference\s+Include="([^"]+)"/g;
    let match;
    while ((match = packageRefPattern.exec(content)) !== null) {
      packageNames.push(match[1]);
    }
    return [{ packages: packageNames.map(name => ({ name })), ecosystem: 'nuget' }];
  }
  
  if (fileName === 'pom.xml') {
    // Parse Maven POM
    const packageNames: string[] = [];
    const depPattern = /<dependency>[\s\S]*?<groupId>([^<]+)<\/groupId>[\s\S]*?<artifactId>([^<]+)<\/artifactId>/g;
    let match;
    while ((match = depPattern.exec(content)) !== null) {
      packageNames.push(`${match[1]}:${match[2]}`);
    }
    return [{ packages: packageNames.map(name => ({ name })), ecosystem: 'maven' }];
  }
  
  if (fileName === 'build.gradle' || fileName === 'build.gradle.kts') {
    const packageNames = parseBuildGradle(content);
    return [{ packages: packageNames.map(name => ({ name })), ecosystem: 'maven' }];
  }
  
  if (fileName === 'mix.exs') {
    // Parse Elixir Mix dependencies
    const packageNames: string[] = [];
    const depPattern = /\{:([a-z_]+),/g;
    let match;
    while ((match = depPattern.exec(content)) !== null) {
      packageNames.push(match[1]);
    }
    return [{ packages: packageNames.map(name => ({ name })), ecosystem: 'hex' }];
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
    return [{ packages: packageNames.map(name => ({ name })), ecosystem: 'pub' }];
  }
  
  if (fileName === 'cpanfile' || fileName === 'Makefile.PL' || fileName === 'Build.PL') {
    // Parse Perl dependencies
    const packageNames: string[] = [];
    const requiresPattern = /requires\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = requiresPattern.exec(content)) !== null) {
      packageNames.push(match[1].replace(/::/g, '-'));
    }
    return [{ packages: packageNames.map(name => ({ name })), ecosystem: 'cpan' }];
  }
  
  if (fileName === 'Podfile') {
    // Parse CocoaPods
    const packageNames: string[] = [];
    const podPattern = /pod\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = podPattern.exec(content)) !== null) {
      packageNames.push(match[1]);
    }
    return [{ packages: packageNames.map(name => ({ name })), ecosystem: 'cocoapods' }];
  }
  
  if (fileName === 'Package.swift') {
    // Swift Package Manager is not supported - it's a separate ecosystem from CocoaPods
    // CocoaPods API doesn't work for SwiftPM packages
    throw new Error('Swift Package Manager (Package.swift) is not yet supported. Use CocoaPods (Podfile) instead.');
  }
  
  if (fileName === 'environment.yml' || fileName === 'environment.yaml' || 
      fileName.endsWith('/environment.yml') || fileName.endsWith('/environment.yaml')) {
    // Parse Conda environment file (may contain both conda and pip dependencies)
    const { condaPackages, pipPackages } = parseEnvironmentYaml(content);
    const results: Array<{ packages: PackageDependency[]; ecosystem: Ecosystem }> = [];
    
    if (condaPackages.length > 0) {
      results.push({ packages: condaPackages.map(name => ({ name })), ecosystem: 'conda' });
    }
    if (pipPackages.length > 0) {
      results.push({ packages: pipPackages.map(name => ({ name })), ecosystem: 'pypi' });
    }
    
    return results.length > 0 ? results : [{ packages: [], ecosystem: 'conda' }];
  }
  
  if (fileName === 'pyproject.toml' || fileName.endsWith('/pyproject.toml')) {
    // Parse pyproject.toml (PEP 621 and Poetry)
    const packages = parsePyprojectToml(content);
    return [{ packages: packages.map(name => ({ name })), ecosystem: 'pypi' }];
  }
  
  // ========== Lock Files ==========
  
  // npm: package-lock.json, npm-shrinkwrap.json
  if (fileName === 'package-lock.json' || fileName === 'npm-shrinkwrap.json' ||
      fileName.endsWith('/package-lock.json') || fileName.endsWith('/npm-shrinkwrap.json')) {
    return [{ packages: parsePackageLock(content), ecosystem: 'npm' }];
  }
  
  // yarn: yarn.lock
  if (fileName === 'yarn.lock' || fileName.endsWith('/yarn.lock')) {
    return [{ packages: parseYarnLock(content), ecosystem: 'npm' }];
  }
  
  // pnpm: pnpm-lock.yaml
  if (fileName === 'pnpm-lock.yaml' || fileName.endsWith('/pnpm-lock.yaml')) {
    return [{ packages: parsePnpmLock(content), ecosystem: 'npm' }];
  }
  
  // Python: poetry.lock
  if (fileName === 'poetry.lock' || fileName.endsWith('/poetry.lock')) {
    return [{ packages: parsePoetryLock(content), ecosystem: 'pypi' }];
  }
  
  // Python: Pipfile.lock
  if (fileName === 'Pipfile.lock' || fileName.endsWith('/Pipfile.lock')) {
    return [{ packages: parsePipfileLock(content), ecosystem: 'pypi' }];
  }
  
  // Rust: Cargo.lock
  if (fileName === 'Cargo.lock' || fileName.endsWith('/Cargo.lock')) {
    return [{ packages: parseCargoLock(content), ecosystem: 'crates' }];
  }
  
  // Ruby: Gemfile.lock
  if (fileName === 'Gemfile.lock' || fileName.endsWith('/Gemfile.lock')) {
    return [{ packages: parseGemfileLock(content), ecosystem: 'rubygems' }];
  }
  
  // Dart/Flutter: pubspec.lock
  if (fileName === 'pubspec.lock' || fileName.endsWith('/pubspec.lock')) {
    return [{ packages: parsePubspecLock(content), ecosystem: 'pub' }];
  }
  
  // CocoaPods: Podfile.lock
  if (fileName === 'Podfile.lock' || fileName.endsWith('/Podfile.lock')) {
    return [{ packages: parsePodfileLock(content), ecosystem: 'cocoapods' }];
  }
  
  // Bun: bun.lock (text-based JSONC lockfile)
  if (fileName === 'bun.lock' || fileName.endsWith('/bun.lock')) {
    return [{ packages: parseBunLock(content), ecosystem: 'npm' }];
  }
  
  // Bun: bun.lockb (binary lockfile - not parseable)
  if (fileName === 'bun.lockb' || fileName.endsWith('/bun.lockb')) {
    throw new Error(
      'bun.lockb is a binary lockfile and cannot be parsed directly. ' +
      'Please convert to text format: bun install --save-text-lockfile --frozen-lockfile --lockfile-only'
    );
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

program.parse();
