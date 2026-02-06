#!/usr/bin/env npx ts-node --esm
/**
 * RepVet False Positive Testing & Package DB Enhancement Batch
 * 
 * Purpose:
 * 1. Test typosquat detection against known-good packages (FP measurement)
 * 2. Discover and add new popular packages to the database
 * 3. Track metrics over time
 * 
 * Run: npx ts-node --esm scripts/fp-test-batch.ts
 */

import { checkTyposquat } from '../dist/typosquat/detector.js';
import { 
  NPM_POPULAR_PACKAGES, 
  PYPI_POPULAR_PACKAGES,
  getPopularPackageNames 
} from '../dist/typosquat/popular-packages.js';

// Type-only import
import type { TyposquatMatch } from '../dist/typosquat/detector.js';
import * as fs from 'fs';
import * as path from 'path';

interface FPTestResult {
  timestamp: string;
  ecosystem: 'npm' | 'pypi';
  packagesChecked: number;
  falsePositives: FalsePositive[];
  fpRate: number;
  newPackagesAdded: number;
  topFPPatterns: Record<string, number>;
}

interface FalsePositive {
  package: string;
  flaggedAs: string;
  similarity: number;
  patterns: string[];
  risk: string;
}

interface PackageStats {
  name: string;
  weeklyDownloads: number;
  isNew?: boolean;
}

const RESULTS_DIR = path.join(process.cwd(), 'fp-results');
const POPULAR_PACKAGES_PATH = path.join(process.cwd(), 'src', 'typosquat', 'popular-packages.ts');

// Known legitimate packages that should NOT trigger typosquat warnings
// These form the FP test corpus
const KNOWN_GOOD_NPM = [
  // Scoped versions of popular packages (legit)
  '@babel/core', '@babel/preset-env', '@babel/preset-react',
  '@types/node', '@types/react', '@types/jest', '@types/lodash',
  '@typescript-eslint/parser', '@typescript-eslint/eslint-plugin',
  '@testing-library/react', '@testing-library/jest-dom',
  '@emotion/react', '@emotion/styled',
  '@vue/cli', '@angular/core', '@angular/cli',
  '@aws-sdk/client-s3', '@aws-sdk/client-dynamodb',
  '@apollo/client', '@apollo/server',
  '@vercel/node', '@netlify/functions',
  '@prisma/client',
  // Distinct packages that happen to be similar names
  'enquirer', // vs inquirer - different project
  'got', // vs get
  'ora', // short name, not typosquat
  'arg', // short name
  'cac', // short name
  'ky',  // short name
  'ms',  // short name
  'qs',  // short name
  'he',  // short name
  'fs-extra', // extension of fs
  'mkdirp', // not typosquat
  'rimraf', // not typosquat
  'glob', // not typosquat
  'chalk', // popular, not typosquat
  'axios', // popular, not typosquat
  'lodash', // popular, not typosquat
  'moment', // popular, not typosquat
  'dayjs', // moment alternative, not typosquat
  'date-fns', // date alternative
  'luxon', // date alternative
  'underscore', // lodash alternative
  'ramda', // fp alternative
  'immer', // state management
  'zustand', // state management
  'jotai', // state management
  'recoil', // state management
  'mobx', // state management
  'pinia', // vue state
  'vuex', // vue state
  'redux', // state management
  'express', // web framework
  'fastify', // web framework
  'koa', // web framework
  'hapi', // web framework
  'nest', // web framework
  'sails', // web framework
  // Test frameworks (all distinct)
  'jest', 'mocha', 'chai', 'vitest', 'ava', 'tape', 'jasmine',
  // DB clients (all distinct)
  'pg', 'mysql', 'mysql2', 'sqlite3', 'mongodb', 'redis', 'ioredis',
  // ORM/Query builders (all distinct)
  'knex', 'sequelize', 'typeorm', 'prisma', 'drizzle-orm',
  // Build tools (all distinct)
  'webpack', 'rollup', 'esbuild', 'vite', 'parcel', 'turbo', 'nx',
  // More legit packages
  'p-limit', 'p-map', 'p-queue', 'p-retry', // p-series
  'lodash.get', 'lodash.merge', 'lodash.debounce', 'lodash.throttle', // lodash methods
];

const KNOWN_GOOD_PYPI = [
  // Standard packages
  'requests', 'urllib3', 'certifi', 'charset-normalizer', 'idna',
  'pip', 'setuptools', 'wheel', 'six',
  'numpy', 'pandas', 'scipy', 'matplotlib', 'seaborn',
  'scikit-learn', 'tensorflow', 'torch', 'keras',
  'flask', 'django', 'fastapi', 'tornado', 'aiohttp',
  'pytest', 'pytest-cov', 'pytest-asyncio', 'pytest-mock',
  'black', 'flake8', 'pylint', 'mypy', 'isort', 'ruff',
  'pyyaml', 'toml', 'python-dotenv',
  'boto3', 'botocore', 'awscli',
  'sqlalchemy', 'psycopg2', 'psycopg2-binary', 'pymysql', 'pymongo',
  'cryptography', 'pycryptodome', 'pyopenssl', 'paramiko',
  'pillow', 'opencv-python', 'beautifulsoup4', 'lxml',
  'celery', 'redis', 'kombu',
  'click', 'rich', 'typer', 'colorama', 'tqdm',
  // Different-but-similar names (legit)
  'attr', 'attrs', // different packages
  'yaml', 'pyyaml', // different packages  
];

/**
 * Run FP test against known-good packages
 */
function runFPTest(ecosystem: 'npm' | 'pypi'): FPTestResult {
  const knownGood = ecosystem === 'npm' ? KNOWN_GOOD_NPM : KNOWN_GOOD_PYPI;
  const falsePositives: FalsePositive[] = [];
  const patternCounts: Record<string, number> = {};
  
  console.log(`\n🔍 Testing ${knownGood.length} known-good ${ecosystem} packages...`);
  
  for (const pkg of knownGood) {
    const matches = checkTyposquat(pkg, { 
      ecosystem, 
      threshold: 0.75,
      maxMatches: 3 
    });
    
    // Filter out matches where package == target (self-match shouldn't happen but safety)
    const actualMatches = matches.filter(m => 
      m.package.toLowerCase() !== m.target.toLowerCase()
    );
    
    if (actualMatches.length > 0) {
      for (const match of actualMatches) {
        falsePositives.push({
          package: pkg,
          flaggedAs: match.target,
          similarity: match.similarity,
          patterns: match.patterns.map(p => p.pattern),
          risk: match.risk,
        });
        
        // Count patterns
        for (const p of match.patterns) {
          patternCounts[p.pattern] = (patternCounts[p.pattern] || 0) + 1;
        }
      }
    }
  }
  
  const fpRate = (falsePositives.length / knownGood.length) * 100;
  
  console.log(`   Checked: ${knownGood.length}`);
  console.log(`   False positives: ${falsePositives.length}`);
  console.log(`   FP rate: ${fpRate.toFixed(2)}%`);
  
  if (falsePositives.length > 0) {
    console.log(`\n   ⚠️  False positives detected:`);
    for (const fp of falsePositives.slice(0, 10)) {
      console.log(`      - ${fp.package} → ${fp.flaggedAs} (${(fp.similarity * 100).toFixed(0)}%, ${fp.risk})`);
    }
    if (falsePositives.length > 10) {
      console.log(`      ... and ${falsePositives.length - 10} more`);
    }
  }
  
  return {
    timestamp: new Date().toISOString(),
    ecosystem,
    packagesChecked: knownGood.length,
    falsePositives,
    fpRate,
    newPackagesAdded: 0,
    topFPPatterns: patternCounts,
  };
}

/**
 * Fetch top packages from npm registry
 */
async function fetchTopNpmPackages(limit: number = 50): Promise<PackageStats[]> {
  const packages: PackageStats[] = [];
  
  try {
    // Use npm search for popular packages
    const response = await fetch(
      `https://registry.npmjs.org/-/v1/search?text=boost-exact:true&popularity=1.0&size=${limit}`,
      { signal: AbortSignal.timeout(10000) }
    );
    
    if (!response.ok) {
      console.log(`   npm API returned ${response.status}`);
      return packages;
    }
    
    const data = await response.json() as any;
    
    for (const obj of data.objects || []) {
      const pkg = obj.package;
      if (pkg?.name) {
        packages.push({
          name: pkg.name,
          weeklyDownloads: Math.round((obj.score?.detail?.popularity || 0) * 50000000),
        });
      }
    }
  } catch (err) {
    console.log(`   npm fetch error: ${err}`);
  }
  
  return packages;
}

/**
 * Fetch top packages from PyPI using BigQuery stats endpoint
 */
async function fetchTopPyPIPackages(limit: number = 50): Promise<PackageStats[]> {
  const packages: PackageStats[] = [];
  
  try {
    // PyPI doesn't have a direct "top packages" API
    // We'll use the hugovk/top-pypi-packages JSON
    const response = await fetch(
      'https://hugovk.github.io/top-pypi-packages/top-pypi-packages-30-days.min.json',
      { signal: AbortSignal.timeout(10000) }
    );
    
    if (!response.ok) {
      console.log(`   PyPI stats returned ${response.status}`);
      return packages;
    }
    
    const data = await response.json() as any;
    
    for (const row of (data.rows || []).slice(0, limit)) {
      packages.push({
        name: row.project,
        weeklyDownloads: Math.round(row.download_count / 4), // monthly to weekly
      });
    }
  } catch (err) {
    console.log(`   PyPI fetch error: ${err}`);
  }
  
  return packages;
}

/**
 * Find packages not in our DB yet
 */
function findNewPackages(
  fetched: PackageStats[],
  ecosystem: 'npm' | 'pypi'
): PackageStats[] {
  const existing = getPopularPackageNames(ecosystem);
  return fetched
    .filter(p => !existing.has(p.name))
    .map(p => ({ ...p, isNew: true }));
}

/**
 * Generate code snippet for new packages
 */
function generatePackageEntries(packages: PackageStats[]): string {
  return packages
    .map(p => {
      const dl = p.weeklyDownloads >= 10000000 ? 
        `${Math.round(p.weeklyDownloads / 1000000)}000000` : 
        `${Math.round(p.weeklyDownloads / 1000)}000`;
      return `  { name: '${p.name}', weeklyDownloads: ${dl} },`;
    })
    .join('\n');
}

/**
 * Save results to JSON
 */
function saveResults(results: FPTestResult[]): void {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  
  const filename = `fp-test-${new Date().toISOString().split('T')[0]}.json`;
  const filepath = path.join(RESULTS_DIR, filename);
  
  // Append to existing or create new
  let existing: FPTestResult[] = [];
  if (fs.existsSync(filepath)) {
    existing = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  }
  
  fs.writeFileSync(filepath, JSON.stringify([...existing, ...results], null, 2));
  console.log(`\n📁 Results saved to ${filepath}`);
}

/**
 * Main batch runner
 */
async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  RepVet FP Test & Package DB Enhancement Batch');
  console.log(`  ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════════');
  
  const results: FPTestResult[] = [];
  
  // 1. Run FP tests
  console.log('\n📊 Phase 1: False Positive Testing');
  console.log('───────────────────────────────────');
  
  const npmFP = runFPTest('npm');
  const pypiFP = runFPTest('pypi');
  results.push(npmFP, pypiFP);
  
  // 2. Discover new packages
  console.log('\n📦 Phase 2: Package Discovery');
  console.log('───────────────────────────────────');
  
  console.log('\n🔍 Fetching top npm packages...');
  const topNpm = await fetchTopNpmPackages(100);
  const newNpm = findNewPackages(topNpm, 'npm');
  console.log(`   Found ${topNpm.length} packages, ${newNpm.length} new`);
  
  console.log('\n🔍 Fetching top PyPI packages...');
  const topPyPI = await fetchTopPyPIPackages(100);
  const newPyPI = findNewPackages(topPyPI, 'pypi');
  console.log(`   Found ${topPyPI.length} packages, ${newPyPI.length} new`);
  
  // 3. Output suggestions
  if (newNpm.length > 0) {
    console.log('\n📝 Suggested npm additions:');
    console.log('───────────────────────────────────');
    console.log(generatePackageEntries(newNpm.slice(0, 20)));
    npmFP.newPackagesAdded = newNpm.length;
  }
  
  if (newPyPI.length > 0) {
    console.log('\n📝 Suggested PyPI additions:');
    console.log('───────────────────────────────────');
    console.log(generatePackageEntries(newPyPI.slice(0, 20)));
    pypiFP.newPackagesAdded = newPyPI.length;
  }
  
  // 4. Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  npm FP rate:   ${npmFP.fpRate.toFixed(2)}% (${npmFP.falsePositives.length}/${npmFP.packagesChecked})`);
  console.log(`  PyPI FP rate:  ${pypiFP.fpRate.toFixed(2)}% (${pypiFP.falsePositives.length}/${pypiFP.packagesChecked})`);
  console.log(`  New npm pkgs:  ${newNpm.length}`);
  console.log(`  New PyPI pkgs: ${newPyPI.length}`);
  
  // 5. Save results
  saveResults(results);
  
  // Exit with non-zero if FP rate too high
  const combinedFP = (npmFP.fpRate + pypiFP.fpRate) / 2;
  if (combinedFP > 10) {
    console.log(`\n❌ FP rate too high (${combinedFP.toFixed(2)}% > 10%)`);
    process.exit(1);
  } else {
    console.log(`\n✅ FP rate acceptable (${combinedFP.toFixed(2)}%)`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
