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
import { ReputationResult, Ecosystem } from './types.js';
import { parseEnvironmentYaml } from './registry/conda.js';

const DEFAULT_CONCURRENCY = 5;

// Get version from package.json (single source of truth)
const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

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
  .command('scan <file>')
  .description('Scan dependency file (package.json, requirements.txt, Cargo.toml)')
  .option('--json', 'Output as JSON')
  .option('--threshold <score>', 'Only show packages below this score', '100')
  .option('--fail-under <score>', 'Exit with code 1 if any package scores below this')
  .option('-c, --concurrency <number>', 'Number of concurrent API requests', String(DEFAULT_CONCURRENCY))
  .option('--show-skipped', 'Show details of skipped packages')
  .action(async (file: string, options: { json?: boolean; threshold?: string; failUnder?: string; concurrency?: string; showSkipped?: boolean }) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.resolve(file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      
      // Set file path for recursive includes in requirements.txt
      (globalThis as unknown as { __repvetFilePath?: string }).__repvetFilePath = filePath;
      
      const { packages, ecosystem } = parseDepFile(fileName, content);
      
      if (packages.length === 0) {
        console.log(chalk.yellow('No dependencies found'));
        process.exit(0);
      }
      
      const threshold = parseInt(options.threshold || '100', 10);
      const failUnder = options.failUnder ? parseInt(options.failUnder, 10) : undefined;
      const concurrency = Math.max(1, Math.min(20, parseInt(options.concurrency || String(DEFAULT_CONCURRENCY), 10)));
      
      const allResults: ReputationResult[] = [];
      const filteredResults: ReputationResult[] = [];
      const skippedPackages: SkippedPackage[] = [];
      let hasFailure = false;
      
      if (!options.json) {
        console.log(chalk.dim(`Scanning ${packages.length} ${ecosystem} packages (concurrency: ${concurrency})...\n`));
      }
      
      // Parallel scanning with rate limiting
      const limit = pLimit(concurrency);
      
      const checkPackage = async (pkg: string): Promise<{ result?: ReputationResult; skipped?: SkippedPackage }> => {
        try {
          const result = await checkPackageReputation(pkg, ecosystem);
          return { result };
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          return { skipped: { name: pkg, reason } };
        }
      };
      
      const results = await Promise.all(
        packages.map(pkg => limit(() => checkPackage(pkg)))
      );
      
      for (const { result, skipped } of results) {
        if (skipped) {
          skippedPackages.push(skipped);
        } else if (result) {
          allResults.push(result);
          if (result.score < threshold) {
            filteredResults.push(result);
          }
          if (failUnder !== undefined && result.score < failUnder) {
            hasFailure = true;
          }
        }
      }
      
      if (options.json) {
        // Separate all results from filtered results for clarity
        const allSummary = summarizeResults(allResults);
        const filteredSummary = summarizeResults(filteredResults);
        console.log(JSON.stringify({
          ecosystem,
          scanned: packages.length,
          successful: allResults.length,
          skipped: skippedPackages.length,
          skippedPackages,
          summary: allSummary,
          threshold,
          filteredCount: filteredResults.length,
          filteredSummary,
          allResults,
          filteredResults,
        }, null, 2));
      } else {
        if (filteredResults.length === 0) {
          console.log(chalk.green('✓ All packages above threshold'));
        } else {
          console.log(chalk.bold(`Packages below threshold (${threshold}):\n`));
          for (const result of filteredResults) {
            printResult(result);
            console.log('');
          }
        }
        
        // Summary based on ALL packages, not just filtered
        const summary = summarizeResults(allResults);
        console.log(chalk.dim('─'.repeat(50)));
        console.log(`Scanned: ${allResults.length}/${packages.length} | ` + 
          chalk.red(`Critical: ${summary.critical}`) + ' | ' +
          chalk.red(`High: ${summary.high}`) + ' | ' +
          chalk.yellow(`Medium: ${summary.medium}`) + ' | ' +
          chalk.green(`Low: ${summary.low}`));
        if (skippedPackages.length > 0) {
          console.log(chalk.dim(`Skipped: ${skippedPackages.length} (not found or API error)`));
          if (options.showSkipped) {
            console.log(chalk.dim('\nSkipped packages:'));
            for (const sp of skippedPackages) {
              console.log(chalk.dim(`  • ${sp.name}: ${sp.reason}`));
            }
          }
        }
      }
      
      process.exit(hasFailure ? 1 : 0);
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

function validateEcosystem(eco: string): Ecosystem {
  const valid = ['npm', 'pypi', 'crates', 'rubygems', 'go', 'packagist', 'nuget', 'maven', 'hex', 'pub', 'cpan', 'cocoapods', 'conda'];
  if (!valid.includes(eco.toLowerCase())) {
    throw new Error(`Invalid ecosystem: ${eco}. Use: ${valid.join(', ')}`);
  }
  return eco.toLowerCase() as Ecosystem;
}

function parseDepFile(fileName: string, content: string): { packages: string[]; ecosystem: Ecosystem } {
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
    const packages = [...new Set([...Object.keys(allDeps), ...bundled])];
    
    return {
      packages,
      ecosystem: 'npm',
    };
  }
  
  if (fileName === 'requirements.txt' || fileName.endsWith('.txt')) {
    // For recursive includes, we need the file path
    // If called from scan command, filePath is available
    const packages = parseRequirementsTxt(content, (globalThis as unknown as { __repvetFilePath?: string }).__repvetFilePath);
    return { packages, ecosystem: 'pypi' };
  }
  
  if (fileName === 'Cargo.toml' || fileName.endsWith('/Cargo.toml')) {
    const packages = parseCargoToml(content);
    return { packages, ecosystem: 'crates' };
  }
  
  if (fileName === 'Gemfile' || fileName === 'Gemfile.lock' || fileName.endsWith('.gemspec')) {
    // Parse Ruby gem dependencies
    const packages: string[] = [];
    const gemPattern = /gem\s+['"]([a-zA-Z0-9_-]+)['"]/g;
    let match;
    while ((match = gemPattern.exec(content)) !== null) {
      if (!packages.includes(match[1])) {
        packages.push(match[1]);
      }
    }
    return { packages, ecosystem: 'rubygems' };
  }
  
  if (fileName === 'go.mod') {
    const packages = parseGoMod(content);
    return { packages, ecosystem: 'go' };
  }
  
  if (fileName === 'composer.json') {
    // Parse PHP Composer dependencies
    const pkg = JSON.parse(content) as { 
      require?: Record<string, string>; 
      'require-dev'?: Record<string, string> 
    };
    const packages = Object.keys({ 
      ...pkg.require, 
      ...pkg['require-dev'] 
    }).filter(p => !p.startsWith('php') && !p.startsWith('ext-'));
    return { packages, ecosystem: 'packagist' };
  }
  
  if (fileName.endsWith('.csproj') || fileName.endsWith('.fsproj')) {
    // Parse .NET project file
    const packages: string[] = [];
    const packageRefPattern = /<PackageReference\s+Include="([^"]+)"/g;
    let match;
    while ((match = packageRefPattern.exec(content)) !== null) {
      packages.push(match[1]);
    }
    return { packages, ecosystem: 'nuget' };
  }
  
  if (fileName === 'pom.xml') {
    // Parse Maven POM
    const packages: string[] = [];
    const depPattern = /<dependency>[\s\S]*?<groupId>([^<]+)<\/groupId>[\s\S]*?<artifactId>([^<]+)<\/artifactId>/g;
    let match;
    while ((match = depPattern.exec(content)) !== null) {
      packages.push(`${match[1]}:${match[2]}`);
    }
    return { packages, ecosystem: 'maven' };
  }
  
  if (fileName === 'build.gradle' || fileName === 'build.gradle.kts') {
    const packages = parseBuildGradle(content);
    return { packages, ecosystem: 'maven' };
  }
  
  if (fileName === 'mix.exs') {
    // Parse Elixir Mix dependencies
    const packages: string[] = [];
    const depPattern = /\{:([a-z_]+),/g;
    let match;
    while ((match = depPattern.exec(content)) !== null) {
      packages.push(match[1]);
    }
    return { packages, ecosystem: 'hex' };
  }
  
  if (fileName === 'pubspec.yaml') {
    // Parse Dart/Flutter pubspec
    const packages: string[] = [];
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
          packages.push(match[1]);
        }
      }
    }
    return { packages, ecosystem: 'pub' };
  }
  
  if (fileName === 'cpanfile' || fileName === 'Makefile.PL' || fileName === 'Build.PL') {
    // Parse Perl dependencies
    const packages: string[] = [];
    const requiresPattern = /requires\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = requiresPattern.exec(content)) !== null) {
      packages.push(match[1].replace(/::/g, '-'));
    }
    return { packages, ecosystem: 'cpan' };
  }
  
  if (fileName === 'Podfile') {
    // Parse CocoaPods
    const packages: string[] = [];
    const podPattern = /pod\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = podPattern.exec(content)) !== null) {
      packages.push(match[1]);
    }
    return { packages, ecosystem: 'cocoapods' };
  }
  
  if (fileName === 'Package.swift') {
    // Parse Swift Package Manager
    const packages: string[] = [];
    const depPattern = /\.package\s*\([^)]*name:\s*"([^"]+)"/g;
    let match;
    while ((match = depPattern.exec(content)) !== null) {
      packages.push(match[1]);
    }
    return { packages, ecosystem: 'cocoapods' }; // Use CocoaPods for Swift too
  }
  
  if (fileName === 'environment.yml' || fileName === 'environment.yaml' || 
      fileName.endsWith('/environment.yml') || fileName.endsWith('/environment.yaml')) {
    // Parse Conda environment file
    const { condaPackages } = parseEnvironmentYaml(content);
    return { packages: condaPackages, ecosystem: 'conda' };
  }
  
  // ========== Lock Files ==========
  
  // npm: package-lock.json, npm-shrinkwrap.json
  if (fileName === 'package-lock.json' || fileName === 'npm-shrinkwrap.json' ||
      fileName.endsWith('/package-lock.json') || fileName.endsWith('/npm-shrinkwrap.json')) {
    const packages = parsePackageLock(content);
    return { packages, ecosystem: 'npm' };
  }
  
  // yarn: yarn.lock
  if (fileName === 'yarn.lock' || fileName.endsWith('/yarn.lock')) {
    const packages = parseYarnLock(content);
    return { packages, ecosystem: 'npm' };
  }
  
  // pnpm: pnpm-lock.yaml
  if (fileName === 'pnpm-lock.yaml' || fileName.endsWith('/pnpm-lock.yaml')) {
    const packages = parsePnpmLock(content);
    return { packages, ecosystem: 'npm' };
  }
  
  // Python: poetry.lock
  if (fileName === 'poetry.lock' || fileName.endsWith('/poetry.lock')) {
    const packages = parsePoetryLock(content);
    return { packages, ecosystem: 'pypi' };
  }
  
  // Python: Pipfile.lock
  if (fileName === 'Pipfile.lock' || fileName.endsWith('/Pipfile.lock')) {
    const packages = parsePipfileLock(content);
    return { packages, ecosystem: 'pypi' };
  }
  
  // Rust: Cargo.lock
  if (fileName === 'Cargo.lock' || fileName.endsWith('/Cargo.lock')) {
    const packages = parseCargoLock(content);
    return { packages, ecosystem: 'crates' };
  }
  
  // Ruby: Gemfile.lock
  if (fileName === 'Gemfile.lock' || fileName.endsWith('/Gemfile.lock')) {
    const packages = parseGemfileLock(content);
    return { packages, ecosystem: 'rubygems' };
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
 */
function parsePackageLock(content: string): string[] {
  const lock = JSON.parse(content) as {
    packages?: Record<string, unknown>;
    dependencies?: Record<string, unknown>;
  };
  
  // v2/v3 format: "packages" object with "node_modules/pkg" keys
  // v1 format: "dependencies" object with pkg names as keys
  const packagesObj = lock.packages || lock.dependencies || {};
  
  const packages = Object.keys(packagesObj)
    .filter(p => {
      // Skip empty string key (root package in v2/v3)
      if (!p) return false;
      // Skip workspace packages (local paths)
      if (p.startsWith('node_modules/') && p.includes('node_modules/node_modules/')) return false;
      return true;
    })
    .map(p => p.replace(/^node_modules\//, ''))
    // Handle scoped packages
    .filter(p => p.length > 0);
  
  return [...new Set(packages)];
}

/**
 * Parse yarn.lock (Yarn Classic v1 and Yarn Berry v2+)
 * Format: "package@version:" or "package@npm:version:"
 */
function parseYarnLock(content: string): string[] {
  const packages: string[] = [];
  
  // Match package entries at the start of lines
  // Yarn v1: "package@^1.0.0":
  // Yarn v1 scoped: "@types/node@^20.0.0":
  // Yarn v1 with multiple versions: "package@^1.0.0, package@^1.1.0":
  // Yarn Berry: "package@npm:^1.0.0":
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Skip comments and indented lines
    if (line.startsWith('#') || line.startsWith(' ') || line.startsWith('\t')) {
      continue;
    }
    
    // Match package declarations
    // Handle scoped packages: "@scope/package@version"
    // Handle regular packages: "package@version"
    // Can be: "pkg@version": or pkg@version: (with or without quotes)
    
    // Try scoped package first: "@scope/package@version"
    const scopedMatch = line.match(/^"?(@[^/]+\/[^@\s"]+)@/);
    if (scopedMatch && scopedMatch[1]) {
      packages.push(scopedMatch[1]);
      continue;
    }
    
    // Regular package: "package@version"
    const match = line.match(/^"?([^@\s"]+)@/);
    if (match && match[1]) {
      // Skip internal yarn entries
      if (!match[1].startsWith('__')) {
        packages.push(match[1]);
      }
    }
  }
  
  return [...new Set(packages)];
}

/**
 * Parse pnpm-lock.yaml
 * Format: YAML with packages/dependencies objects
 */
function parsePnpmLock(content: string): string[] {
  const packages: string[] = [];
  
  // Match package entries in dependencies section
  // Format: /package@version: or /package/version:
  // Also handles: '@scope/package': version
  
  // Simple line-by-line parsing (avoid YAML dependency)
  const lines = content.split('\n');
  let inPackages = false;
  let inDependencies = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect section headers
    if (trimmed === 'packages:') {
      inPackages = true;
      inDependencies = false;
      continue;
    }
    if (trimmed === 'dependencies:' || trimmed === 'devDependencies:' || trimmed === 'optionalDependencies:') {
      inDependencies = true;
      inPackages = false;
      continue;
    }
    if (/^[a-z]+:$/.test(trimmed) && !trimmed.startsWith('/')) {
      inPackages = false;
      inDependencies = false;
      continue;
    }
    
    if (inPackages) {
      // Match: /package@version: or /@scope/package@version:
      const pkgMatch = trimmed.match(/^\/?(@?[^@(]+)[@(]/);
      if (pkgMatch && pkgMatch[1]) {
        const pkg = pkgMatch[1].replace(/^\//, '');
        if (pkg && !pkg.startsWith('/')) {
          packages.push(pkg);
        }
      }
    }
    
    if (inDependencies) {
      // Match: 'package': version or '@scope/package': version
      const depMatch = trimmed.match(/^['"]?(@?[^'":\s]+)['"]?:/);
      if (depMatch && depMatch[1]) {
        packages.push(depMatch[1]);
      }
    }
  }
  
  return [...new Set(packages)];
}

/**
 * Parse poetry.lock (TOML format)
 * Format: [[package]] sections with name = "package"
 */
function parsePoetryLock(content: string): string[] {
  const packages: string[] = [];
  
  // Match name = "package" within [[package]] sections
  const namePattern = /^name\s*=\s*"([^"]+)"/gm;
  let match;
  
  while ((match = namePattern.exec(content)) !== null) {
    if (match[1]) {
      packages.push(match[1]);
    }
  }
  
  return [...new Set(packages)];
}

/**
 * Parse Pipfile.lock (JSON format)
 * Format: {"default": {...}, "develop": {...}}
 */
function parsePipfileLock(content: string): string[] {
  const lock = JSON.parse(content) as {
    default?: Record<string, unknown>;
    develop?: Record<string, unknown>;
  };
  
  const defaultPkgs = Object.keys(lock.default || {});
  const devPkgs = Object.keys(lock.develop || {});
  
  return [...new Set([...defaultPkgs, ...devPkgs])];
}

/**
 * Parse Cargo.lock (TOML format)
 * Format: [[package]] sections with name = "package"
 */
function parseCargoLock(content: string): string[] {
  const packages: string[] = [];
  
  // Match name = "package" within [[package]] sections
  const namePattern = /^name\s*=\s*"([^"]+)"/gm;
  let match;
  
  while ((match = namePattern.exec(content)) !== null) {
    if (match[1]) {
      packages.push(match[1]);
    }
  }
  
  return [...new Set(packages)];
}

/**
 * Parse Gemfile.lock
 * Format: GEM section with specs, each gem indented with name (version)
 */
function parseGemfileLock(content: string): string[] {
  const packages: string[] = [];
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
      const gemMatch = line.match(/^    ([a-zA-Z0-9_-]+)\s+\(/);
      if (gemMatch && gemMatch[1]) {
        packages.push(gemMatch[1]);
      }
    }
  }
  
  return [...new Set(packages)];
}

program.parse();
