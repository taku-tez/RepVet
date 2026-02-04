#!/usr/bin/env node

/**
 * RepVet CLI
 * Maintainer Reputation Checker
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { checkPackageReputation } from './scorer.js';
import { ReputationResult } from './types.js';

const program = new Command();

program
  .name('repvet')
  .description('Check npm package maintainer reputation')
  .version('0.1.0');

program
  .command('check <package>')
  .description('Check reputation of a single package')
  .option('--json', 'Output as JSON')
  .action(async (packageName: string, options: { json?: boolean }) => {
    try {
      const result = await checkPackageReputation(packageName);
      
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
  .description('Scan package.json for all dependencies')
  .option('--json', 'Output as JSON')
  .option('--threshold <score>', 'Only show packages below this score', '100')
  .option('--fail-under <score>', 'Exit with code 1 if any package scores below this')
  .action(async (file: string, options: { json?: boolean; threshold?: string; failUnder?: string }) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.resolve(file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const packageJson = JSON.parse(content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      
      const packages = Object.keys(allDeps);
      if (packages.length === 0) {
        console.log(chalk.yellow('No dependencies found'));
        process.exit(0);
      }
      
      const threshold = parseInt(options.threshold || '100', 10);
      const failUnder = options.failUnder ? parseInt(options.failUnder, 10) : undefined;
      
      const results: ReputationResult[] = [];
      let hasFailure = false;
      
      for (const pkg of packages) {
        try {
          const result = await checkPackageReputation(pkg);
          if (result.score < threshold) {
            results.push(result);
          }
          if (failUnder !== undefined && result.score < failUnder) {
            hasFailure = true;
          }
        } catch {
          // Skip packages that fail (not on npm, etc)
        }
      }
      
      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        if (results.length === 0) {
          console.log(chalk.green('✓ All packages above threshold'));
        } else {
          console.log(chalk.bold(`\nPackages below threshold (${threshold}):\n`));
          for (const result of results) {
            printResult(result);
            console.log('');
          }
        }
      }
      
      process.exit(hasFailure ? 1 : 0);
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

function printResult(result: ReputationResult): void {
  const scoreColor = result.score >= 80 ? chalk.green 
    : result.score >= 50 ? chalk.yellow 
    : chalk.red;
  
  const riskLevel = result.score >= 80 ? 'LOW' 
    : result.score >= 50 ? 'MEDIUM' 
    : 'HIGH';
  
  console.log(chalk.bold(`📦 ${result.package}`));
  console.log(`   Score: ${scoreColor(`${result.score}/100`)} (${riskLevel} risk)`);
  console.log(`   Maintainers: ${result.maintainers.join(', ') || 'Unknown'}`);
  
  if (result.lastCommitDate) {
    console.log(`   Last Commit: ${result.lastCommitDate.split('T')[0]}`);
  }
  
  if (result.deductions.length > 0) {
    console.log(chalk.yellow('   Deductions:'));
    for (const d of result.deductions) {
      console.log(chalk.red(`     -${d.points}: ${d.reason}`));
    }
  }
}

program.parse();
