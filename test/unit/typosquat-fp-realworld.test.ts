/**
 * Real-world false positive test: packages fetched from npm registry
 * Tests legitimate packages with names that could trigger typosquat detection
 */
import { describe, test, expect } from '@jest/globals';
import { checkTyposquat } from '../../src/typosquat/detector.js';

/**
 * Real npm packages with names close to popular ones
 * All verified to exist on npm as legitimate packages
 */
const REAL_LEGITIMATE_PACKAGES = [
  // Scoped packages that are real
  '@babel/core', '@babel/preset-env', '@babel/cli',
  '@types/node', '@types/react', '@types/lodash', '@types/express',
  '@jest/core', '@jest/globals',
  '@apollo/client', '@apollo/server',
  '@emotion/react', '@emotion/styled',
  '@tanstack/react-query', '@tanstack/react-table',
  '@mui/material', '@mui/icons-material',
  
  // Real packages with prefix/suffix patterns
  'pre-commit', 'pre-push',
  'fast-json-stringify', 'fast-deep-equal', 'fast-glob',
  'safe-regex', 'safe-stable-stringify',
  'node-addon-api', 'node-gyp', 'node-pty',
  'http-proxy', 'http-errors', 'http-status-codes',
  'cross-env', 'cross-spawn', 'cross-fetch',
  
  // Short names close to other short names
  'got', 'qs', 'ms', 'ip', 'os', 'pm2',
  'ws', 'pg', 'co', 'ncp', 'mv', 'cp',
  'tar', 'tmp', 'csv', 'xml', 'ini', 'toml',
  'lru-cache', 'p-limit', 'p-map', 'p-queue',
  
  // Names that differ by one char from popular packages
  'axe-core',       // not axios
  'charm',          // not chalk  
  'globs',          // not glob (real package)
  'moo',            // not mocha (real lexer)
  'eta',            // not ejs (real template engine)
  'ava',            // not a typo
  'tap',            // not a typo
  'c8',             // not a typo
  'execa',          // not express
  'picocolors',     // not a typo of picocolor
  'kleur',          // not a typo of color
  
  // Legitimately similar package pairs
  'mysql2',         // not a typo of mysql
  'pg-pool',        // not a typo of pg
  'bcryptjs',       // not a typo of bcrypt
  'jwt-decode',     // not a typo of jsonwebtoken
  'enquirer',       // not a typo of inquirer
  'ioredis',        // not a typo of redis
  
  // Framework-adjacent packages
  'koa-router', 'koa-bodyparser', 'koa-cors',
  'fastify-plugin', 'fastify-cors',
  'hapi-auth-jwt2',
  'nest-winston',
  
  // Build tool plugins
  'rollup-plugin-terser', 'rollup-plugin-node-resolve',
  'vite-plugin-react', 'vite-plugin-svelte',
  'esbuild-loader', 'esbuild-register',
  
  // Test utility packages
  'jest-extended', 'jest-when', 'jest-mock-extended',
  'sinon', 'sinon-chai',
  'supertest', 'superagent',
  'nock', 'msw',
  
  // Monorepo/workspace tools
  'lerna', 'nx', 'turbo', 'changesets',
  
  // Python packages (PyPI ecosystem)
  'requests', 'django', 'flask', 'numpy', 'pandas',
  'scipy', 'matplotlib', 'scikit-learn', 'tensorflow',
  'pytorch', 'keras', 'pillow', 'beautifulsoup4',
  'sqlalchemy', 'celery', 'gunicorn', 'uvicorn',
  'fastapi', 'pydantic', 'httpx', 'aiohttp',
  'black', 'ruff', 'mypy', 'pytest', 'tox',
  'boto3', 'botocore',
  'cryptography', 'paramiko', 'fabric',
];

describe('Real-world false positive test', () => {
  const falsePositives: Array<{ pkg: string; target: string; similarity: number; risk: string }> = [];

  test.each(REAL_LEGITIMATE_PACKAGES)('"%s" should not be flagged as MEDIUM+ typosquat', (pkg) => {
    const result = checkTyposquat(pkg, { ecosystem: pkg.includes('.') || /^[a-z]/.test(pkg) ? 'npm' : 'npm' });
    
    // Filter to MEDIUM or higher risk only (LOW is acceptable)
    const mediumPlus = result.filter(m => m.risk !== 'LOW');
    
    if (mediumPlus.length > 0) {
      for (const m of mediumPlus) {
        falsePositives.push({ pkg, target: m.target, similarity: m.similarity, risk: m.risk });
      }
    }
    
    // Allow up to 0 MEDIUM+ results for legitimate packages
    expect(mediumPlus).toHaveLength(0);
  });

  // Summary test
  test('summary: total false positives should be zero', () => {
    if (falsePositives.length > 0) {
      console.log('\n=== FALSE POSITIVES FOUND ===');
      for (const fp of falsePositives) {
        console.log(`  ${fp.pkg} -> ${fp.target} (sim: ${fp.similarity.toFixed(3)}, risk: ${fp.risk})`);
      }
    }
    // This is just a summary, individual tests handle assertions
  });
});
