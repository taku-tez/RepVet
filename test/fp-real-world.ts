import { checkTyposquat } from '../src/typosquat/index.js';

// Legitimate packages that might trigger false positives due to similar names
const legitimatePackages = [
  'axio', 'axe', 'lodash-es', 'lodash.get', 'lodash.merge', 'lodash.set',
  'chalk-pipe', 'chalkboard', 'expression', 'expressive', 'debug-log',
  'debugger', 'uuid-v4', 'uuidv4', 'uuidjs',
  'moment-timezone', 'momently', 'react-dom', 'react-router', 'react-native',
  'preact', 'reacts', 'mkdirp', 'rimraf', 'semver',
  'commander-js', 'commands', 'yargs-parser', 'yargonaut',
  'glob-parent', 'globby', 'globals',
  'tslib', 'tsutils', 'ts-node', 'ts-jest',
  'webpack-cli', 'webpack-dev-server', 'web-pack',
  'babel-core', 'babel-cli', 'babel-loader',
  'eslint-plugin-react', 'eslint-config-prettier',
  'jest-cli', 'jests', 'testing',
  'color', 'colors', 'colour', 'colord',
  'request', 'requests', 'requested',
  'http-proxy', 'http-proxys', 'https-proxy-agent',
  'node-fetch', 'node-fetcher',
  'dotenv', 'dot-env', 'dotenvx',
  'cors', 'core', 'core-js',
  'qs', 'qss', 'querystring',
  'mime', 'mimes', 'mime-types',
  'ws', 'wss', 'websocket',
  'pg', 'pgs', 'mysql', 'mysql2',
  'redis', 'rediss', 'ioredis',
  'jsonwebtoken', 'jwt-simple', 'jwts',
  'bcrypt', 'bcryptjs', 'bycrypt',
  'passport', 'passports', 'passport-local',
  'mongoose', 'mongoos', 'mongodb',
  'sequelize', 'sequelizes',
  'knex', 'knexjs',
  'sharp', 'sharps', 'sharpjs',
  'puppeteer', 'puppeteers', 'puppeteer-core',
  'cheerio', 'cheerios',
  'socket.io', 'socketio', 'socket-io',
  'graphql', 'graphqls', 'graphql-tag',
  'next', 'nexts', 'nextjs',
  'nuxt', 'nuxts', 'nuxtjs',
  'vue', 'vues', 'vuejs',
  'svelte', 'sveltes', 'sveltejs',
  // PyPI-like names that are legitimate npm packages
  'flask', 'django', 'numpy', 'pandas',
  // Very short names (high FP risk)
  'fs', 'os', 'cp', 'ip', 'ms', 'on', 'or',
];

let fpCount = 0;
const fps: Array<{pkg: string; target: string; similarity: number; risk: string; patterns: string[]}> = [];

for (const pkg of legitimatePackages) {
  const results = checkTyposquat(pkg, { ecosystem: 'npm', threshold: 0.75 });
  if (results.length > 0) {
    for (const r of results) {
      if (r.target !== pkg) {
        fpCount++;
        fps.push({
          pkg,
          target: r.target,
          similarity: r.similarity,
          risk: r.risk,
          patterns: r.patterns.map((p: any) => p.pattern),
        });
      }
    }
  }
}

console.log(`\n=== False Positive Test Results (npm) ===`);
console.log(`Tested: ${legitimatePackages.length} legitimate packages`);
console.log(`False positives: ${fpCount}`);
console.log(`FP rate: ${(fpCount / legitimatePackages.length * 100).toFixed(1)}%\n`);

if (fps.length > 0) {
  console.log('Flagged packages:');
  for (const fp of fps) {
    console.log(`  ${fp.pkg} → ${fp.target} (sim: ${fp.similarity.toFixed(3)}, risk: ${fp.risk}, patterns: [${fp.patterns.join(',')}])`);
  }
}

// Also test PyPI
const pypiLegitimate = [
  'request', 'requests2', 'flask-cors', 'django-rest-framework',
  'numpyy', 'panda', 'scikit-learn', 'sci-kit',
  'tensorflow-gpu', 'torch', 'pytorch', 'torchvision',
  'pillow', 'pillows', 'pil',
  'beautifulsoup4', 'bs4', 'beautiful-soup',
  'selenium', 'seleniums',
  'boto3', 'botocore', 'boto',
  'celery', 'celerys',
  'gunicorn', 'uvicorn',
  'fastapi', 'fast-api', 'fastapy',
  'sqlalchemy', 'sql-alchemy',
  'pytest', 'py-test', 'pytests',
  'black', 'blacks', 'flake8', 'pylint',
  'cryptography', 'crypto', 'pycrypto',
  'paramiko', 'paramikos',
  'click', 'clicks', 'cliq',
  'rich', 'riches', 'richlib',
];

let pyFpCount = 0;
const pyFps: typeof fps = [];

for (const pkg of pypiLegitimate) {
  const results = checkTyposquat(pkg, { ecosystem: 'pypi', threshold: 0.75 });
  if (results.length > 0) {
    for (const r of results) {
      if (r.target !== pkg) {
        pyFpCount++;
        pyFps.push({
          pkg,
          target: r.target,
          similarity: r.similarity,
          risk: r.risk,
          patterns: r.patterns.map((p: any) => p.pattern),
        });
      }
    }
  }
}

console.log(`\n=== False Positive Test Results (PyPI) ===`);
console.log(`Tested: ${pypiLegitimate.length} legitimate packages`);
console.log(`False positives: ${pyFpCount}`);
console.log(`FP rate: ${(pyFpCount / pypiLegitimate.length * 100).toFixed(1)}%\n`);

if (pyFps.length > 0) {
  console.log('Flagged packages:');
  for (const fp of pyFps) {
    console.log(`  ${fp.pkg} → ${fp.target} (sim: ${fp.similarity.toFixed(3)}, risk: ${fp.risk}, patterns: [${fp.patterns.join(',')}])`);
  }
}
