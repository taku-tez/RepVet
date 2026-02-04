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
  .description('Check package maintainer reputation (npm, PyPI, crates.io)')
  .version('0.2.0');

program
  .command('check <package>')
  .description('Check reputation of a single package')
  .option('--json', 'Output as JSON')
  .option('-e, --ecosystem <ecosystem>', 'Package ecosystem (npm, pypi, crates)', 'npm')
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
  const valid = ['npm', 'pypi', 'crates'];
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
  
  console.log(chalk.bold(`📦 ${result.package}`) + ' ' + ecosystemBadge);
  console.log(`   Score: ${scoreColor(`${result.score}/100`)} (${result.riskLevel} risk)`);
  console.log(`   Maintainers: ${result.maintainers.join(', ') || 'Unknown'}`);
  
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
