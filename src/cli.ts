#!/usr/bin/env node

/**
 * RepVet CLI
 * Maintainer Reputation Checker
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { checkPackageReputation } from './scorer.js';
import { ReputationResult, Ecosystem } from './types.js';

const program = new Command();

program
  .name('repvet')
  .description('Check package maintainer reputation (12 ecosystems supported)')
  .version('0.2.0');

program
  .command('check <package>')
  .description('Check reputation of a single package')
  .option('--json', 'Output as JSON')
  .option('-e, --ecosystem <ecosystem>', 'Ecosystem: npm, pypi, crates, rubygems, go, packagist, nuget, maven, hex, pub, cpan, cocoapods', 'npm')
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

program
  .command('scan <file>')
  .description('Scan dependency file (package.json, requirements.txt, Cargo.toml)')
  .option('--json', 'Output as JSON')
  .option('--threshold <score>', 'Only show packages below this score', '100')
  .option('--fail-under <score>', 'Exit with code 1 if any package scores below this')
  .action(async (file: string, options: { json?: boolean; threshold?: string; failUnder?: string }) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.resolve(file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      
      const { packages, ecosystem } = parseDepFile(fileName, content);
      
      if (packages.length === 0) {
        console.log(chalk.yellow('No dependencies found'));
        process.exit(0);
      }
      
      const threshold = parseInt(options.threshold || '100', 10);
      const failUnder = options.failUnder ? parseInt(options.failUnder, 10) : undefined;
      
      const results: ReputationResult[] = [];
      let hasFailure = false;
      
      console.log(chalk.dim(`Scanning ${packages.length} ${ecosystem} packages...\n`));
      
      for (const pkg of packages) {
        try {
          const result = await checkPackageReputation(pkg, ecosystem);
          if (result.score < threshold) {
            results.push(result);
          }
          if (failUnder !== undefined && result.score < failUnder) {
            hasFailure = true;
          }
        } catch {
          // Skip packages that fail (not found, etc)
        }
      }
      
      if (options.json) {
        console.log(JSON.stringify({
          ecosystem,
          total: packages.length,
          results,
        }, null, 2));
      } else {
        if (results.length === 0) {
          console.log(chalk.green('✓ All packages above threshold'));
        } else {
          console.log(chalk.bold(`Packages below threshold (${threshold}):\n`));
          for (const result of results) {
            printResult(result);
            console.log('');
          }
        }
        
        // Summary
        const summary = summarizeResults(results);
        console.log(chalk.dim('─'.repeat(50)));
        console.log(`Total: ${packages.length} | ` + 
          chalk.red(`High Risk: ${summary.high + summary.critical}`) + ' | ' +
          chalk.yellow(`Medium: ${summary.medium}`) + ' | ' +
          chalk.green(`Low: ${summary.low}`));
      }
      
      process.exit(hasFailure ? 1 : 0);
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

function validateEcosystem(eco: string): Ecosystem {
  const valid = ['npm', 'pypi', 'crates', 'rubygems', 'go', 'packagist', 'nuget', 'maven', 'hex', 'pub', 'cpan', 'cocoapods'];
  if (!valid.includes(eco.toLowerCase())) {
    throw new Error(`Invalid ecosystem: ${eco}. Use: ${valid.join(', ')}`);
  }
  return eco.toLowerCase() as Ecosystem;
}

function parseDepFile(fileName: string, content: string): { packages: string[]; ecosystem: Ecosystem } {
  if (fileName === 'package.json' || fileName.endsWith('/package.json')) {
    const pkg = JSON.parse(content) as { 
      dependencies?: Record<string, string>; 
      devDependencies?: Record<string, string> 
    };
    return {
      packages: Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }),
      ecosystem: 'npm',
    };
  }
  
  if (fileName === 'requirements.txt' || fileName.endsWith('.txt')) {
    const packages = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && !line.startsWith('-'))
      .map(line => {
        // Extract package name from pip format: package==1.0.0, package>=1.0
        const match = line.match(/^([a-zA-Z0-9_-]+)/);
        return match ? match[1] : '';
      })
      .filter(Boolean);
    return { packages, ecosystem: 'pypi' };
  }
  
  if (fileName === 'Cargo.toml' || fileName.endsWith('/Cargo.toml')) {
    // Simple TOML parsing for dependencies
    const packages: string[] = [];
    const depSectionRegex = /\[dependencies\]([\s\S]*?)(?:\[|$)/;
    const devDepSectionRegex = /\[dev-dependencies\]([\s\S]*?)(?:\[|$)/;
    
    for (const regex of [depSectionRegex, devDepSectionRegex]) {
      const match = content.match(regex);
      if (match) {
        const lines = match[1].split('\n');
        for (const line of lines) {
          const pkgMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=/);
          if (pkgMatch) {
            packages.push(pkgMatch[1]);
          }
        }
      }
    }
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
    // Parse Go module dependencies
    const packages: string[] = [];
    const lines = content.split('\n');
    let inRequire = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('require (')) {
        inRequire = true;
        continue;
      }
      if (trimmed === ')') {
        inRequire = false;
        continue;
      }
      if (inRequire || trimmed.startsWith('require ')) {
        const moduleMatch = trimmed.match(/^(?:require\s+)?([^\s]+)\s+v/);
        if (moduleMatch) {
          packages.push(moduleMatch[1]);
        }
      }
    }
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
    // Parse Gradle (Java/Kotlin)
    const packages: string[] = [];
    const depPattern = /(?:implementation|api|compileOnly|runtimeOnly|testImplementation)\s*[(\s]['"]([^'"]+)['"]/g;
    let match;
    while ((match = depPattern.exec(content)) !== null) {
      // Convert "group:artifact:version" to "group:artifact"
      const parts = match[1].split(':');
      if (parts.length >= 2) {
        packages.push(`${parts[0]}:${parts[1]}`);
      }
    }
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
