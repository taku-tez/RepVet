/**
 * False Positive Audit: Test real npm packages against typosquat detector
 * Fetches recent/popular real packages and checks for incorrect flags
 */

import { checkTyposquat } from '../src/typosquat/detector.js';

// Real, legitimate npm packages that might look similar to popular ones
// These are actual packages that should NOT be flagged
const LEGITIMATE_PACKAGES = [
  // Packages with names close to popular ones but are legit
  'express-validator', 'express-session', 'express-rate-limit',
  'lodash-es', 'lodash.merge', 'lodash.get', 'lodash.set', 'lodash.clonedeep',
  'chalk-animation', 'chalk-pipe', 'chalk-template',
  'axios-retry', 'axios-mock-adapter',
  'moment-timezone', 'moment-range',
  'debug-logger', 'debug-fabulous',
  'uuid-random', 'uuid-validate',
  'dotenv-expand', 'dotenv-safe', 'dotenv-flow',
  'yargs-parser', 'yargs-unparser',
  'commander-completion',
  'semver-diff', 'semver-regex', 'semver-compare',
  'glob-parent', 'glob-all',
  'mkdirp-classic',
  'rimraf-alt',
  'fs-extra-plus',
  'request-promise', 'request-promise-native',
  'colors-cli',
  'async-mutex', 'async-retry', 'async-lock',
  'underscore.string',
  'qs-stringify',
  // React ecosystem
  'react-dom', 'react-router', 'react-router-dom', 'react-query',
  'react-hook-form', 'react-select', 'react-table',
  'react-redux', 'react-spring', 'react-icons',
  'reactstrap', 'react-native',
  // Webpack ecosystem
  'webpack-cli', 'webpack-dev-server', 'webpack-merge',
  'webpack-bundle-analyzer', 'webpack-node-externals',
  // Babel ecosystem
  'babel-loader', 'babel-jest', 'babel-plugin-transform-runtime',
  // TypeScript ecosystem
  'typescript-eslint', 'ts-node', 'ts-jest', 'ts-loader',
  'tslib', 'tsconfig-paths',
  // Testing
  'jest-cli', 'jest-dom', 'jest-mock', 'jest-circus',
  'mocha-reporter', 'mocha-junit-reporter',
  // Various legit packages with short/similar names
  'ora', 'ink', 'got', 'ky', 'np', 'pm2', 'nvm',
  'meow', 'execa', 'globby', 'tempy', 'nanoid',
  'p-map', 'p-limit', 'p-queue', 'p-retry',
  // Scoped packages
  '@types/node', '@types/react', '@types/express',
  '@babel/core', '@babel/preset-env',
  '@emotion/react', '@emotion/styled',
  // Packages that might trigger char-swap/insert patterns
  'chokidar', 'cheerio', 'puppeteer', 'playwright',
  'fastify', 'hapi', 'koa', 'nest', 'nuxt', 'next',
  'prisma', 'drizzle-orm', 'sequelize', 'knex',
  'zod', 'joi', 'yup', 'ajv',
  'pino', 'winston', 'bunyan', 'log4js',
  'sharp', 'jimp', 'canvas',
  'socket.io', 'socket.io-client',
  'mongoose', 'mongodb', 'redis', 'ioredis',
  'pg', 'mysql2', 'sqlite3', 'better-sqlite3',
  'nodemailer', 'sendgrid',
  'stripe', 'paypal-rest-sdk',
  'jsonwebtoken', 'jose', 'passport',
  'bcrypt', 'bcryptjs', 'argon2',
  'helmet', 'cors', 'hpp', 'csurf',
  'multer', 'busboy', 'formidable',
  'dayjs', 'date-fns', 'luxon',
  'ramda', 'immer', 'rxjs',
  'prettier', 'eslint', 'stylelint',
  'rollup', 'vite', 'esbuild', 'swc',
  'tailwindcss', 'postcss', 'autoprefixer',
  'three', 'd3', 'chart.js', 'echarts',
];

async function main() {
  console.log('=== RepVet Typosquat False Positive Audit ===\n');
  console.log(`Testing ${LEGITIMATE_PACKAGES.length} legitimate packages...\n`);

  const falsePositives: Array<{ pkg: string; target: string; similarity: number; risk: string; patterns: string[] }> = [];
  const trueNegatives: string[] = [];

  for (const pkg of LEGITIMATE_PACKAGES) {
    const results = checkTyposquat(pkg, { ecosystem: 'npm', threshold: 0.75, includePatternMatches: true });
    
    if (results.length > 0) {
      // Filter: if the match is the base package (e.g., 'lodash-es' matching 'lodash'), 
      // that might be expected but still a FP for legit packages
      for (const r of results) {
        falsePositives.push({
          pkg,
          target: r.target,
          similarity: r.similarity,
          risk: r.risk,
          patterns: r.patterns.map(p => p.pattern),
        });
      }
    } else {
      trueNegatives.push(pkg);
    }
  }

  console.log(`✅ True Negatives (correctly NOT flagged): ${trueNegatives.length}/${LEGITIMATE_PACKAGES.length}`);
  console.log(`❌ False Positives (incorrectly flagged): ${falsePositives.length}\n`);

  if (falsePositives.length > 0) {
    console.log('--- False Positives Detail ---');
    // Group by risk
    const byRisk: Record<string, typeof falsePositives> = {};
    for (const fp of falsePositives) {
      (byRisk[fp.risk] ??= []).push(fp);
    }
    
    for (const risk of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
      const items = byRisk[risk] || [];
      if (items.length === 0) continue;
      console.log(`\n[${risk}] (${items.length} items):`);
      for (const fp of items) {
        console.log(`  ${fp.pkg} → ${fp.target} (sim: ${fp.similarity.toFixed(3)}, patterns: [${fp.patterns.join(', ')}])`);
      }
    }
  }

  const fpRate = (falsePositives.length / LEGITIMATE_PACKAGES.length * 100).toFixed(1);
  console.log(`\n📊 FP Rate: ${fpRate}% (${falsePositives.length}/${LEGITIMATE_PACKAGES.length})`);
  
  // === PyPI False Positive Test ===
  console.log('\n\n=== PyPI False Positive Audit ===\n');
  
  const PYPI_LEGIT = [
    'requests-toolbelt', 'requests-mock', 'requests-oauthlib',
    'django-rest-framework', 'django-cors-headers', 'django-filter',
    'flask-cors', 'flask-login', 'flask-sqlalchemy', 'flask-wtf',
    'boto3-stubs', 'botocore-stubs',
    'numpy-stl', 'pandas-profiling',
    'pytest-cov', 'pytest-mock', 'pytest-asyncio', 'pytest-xdist',
    'celery-beat', 'scrapy-splash',
    'pillow-heif', 'pillow-simd',
    'click-completion', 'click-log',
    'sqlalchemy-utils', 'alembic',
    'pydantic-settings', 'pydantic-core',
    'httpx', 'httptools', 'aiohttp',
    'uvicorn', 'gunicorn', 'hypercorn',
    'fastapi-users', 'starlette',
    'black', 'ruff', 'mypy', 'pylint', 'flake8', 'isort',
    'poetry', 'pipenv', 'hatch', 'flit',
    'networkx', 'scipy', 'sympy', 'statsmodels',
    'matplotlib', 'seaborn', 'plotly', 'bokeh',
    'torch', 'torchvision', 'torchaudio',
    'tensorflow-hub', 'keras',
    'transformers', 'tokenizers', 'datasets', 'accelerate',
    'langchain', 'langchain-core', 'langchain-community',
    'openai', 'anthropic', 'cohere',
    'redis-py', 'pymongo', 'psycopg2-binary', 'asyncpg',
  ];
  
  console.log(`Testing ${PYPI_LEGIT.length} legitimate PyPI packages...\n`);
  
  const pypiFP: typeof falsePositives = [];
  let pypiTN = 0;
  
  for (const pkg of PYPI_LEGIT) {
    const results = checkTyposquat(pkg, { ecosystem: 'pypi', threshold: 0.75, includePatternMatches: true });
    if (results.length > 0) {
      for (const r of results) {
        pypiFP.push({ pkg, target: r.target, similarity: r.similarity, risk: r.risk, patterns: r.patterns.map(p => p.pattern) });
      }
    } else {
      pypiTN++;
    }
  }
  
  console.log(`✅ True Negatives: ${pypiTN}/${PYPI_LEGIT.length}`);
  console.log(`❌ False Positives: ${pypiFP.length}`);
  if (pypiFP.length > 0) {
    for (const fp of pypiFP) {
      console.log(`  ${fp.pkg} → ${fp.target} (sim: ${fp.similarity.toFixed(3)}, risk: ${fp.risk}, patterns: [${fp.patterns.join(', ')}])`);
    }
  }
  console.log(`📊 PyPI FP Rate: ${(pypiFP.length / PYPI_LEGIT.length * 100).toFixed(1)}%`);

  return { falsePositives, trueNegatives, total: LEGITIMATE_PACKAGES.length };
}

main().catch(console.error);
