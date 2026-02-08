/**
 * Batch false positive tests for typosquat detection
 * Ensures legitimate packages are NOT flagged as typosquats
 */
import { checkTyposquat } from '../../src/typosquat/detector.js';

describe('Typosquat False Positive Prevention', () => {
  const legitimatePackages = [
    // Short names
    'ms', 'qs', 'ws', 'ip', 'he', 'co', 'pg', 'mv',
    // Similar to popular but legitimate
    'cors', 'cron', 'nock', 'mock', 'koa', 'coa', 'ora', 'ava', 'got',
    'axe', 'ace', 'arc', 'ant', 'arg', 'art', 'ash', 'ask',
    // Ecosystem variants
    'express-session', 'express-validator', 'redux-thunk', 'redux-saga',
    'react-native', 'react-select', 'lodash-es', 'lodash.get', 'lodash.merge',
    'webpack-cli', 'webpack-merge',
    // Legitimate tools
    'husky', 'turbo', 'tsup', 'tsx', 'zod', 'yup', 'joi',
    'pnpm', 'yarn', 'bun', 'esbuild', 'rollup', 'parcel',
    'prisma', 'drizzle', 'knex', 'sequelize', 'mongoose',
    'fastify', 'hono', 'hapi', 'koa', 'polka', 'micro',
    'dayjs', 'luxon', 'date-fns', 'sharp', 'jimp',
    'nodemon', 'pm2', 'dotenvx',
    'color', 'colors', 'colord', 'colorette', 'picocolors',
    'bcrypt', 'bcryptjs', 'argon2',
    'uuid', 'nanoid', 'cuid', 'ulid', 'shortid',
    'yaml', 'yamljs', 'js-yaml',
    'glob', 'globby', 'fast-glob',
    'mysql2', 'mssql', 'better-sqlite3',
    'preact', 'svelte', 'solid-js',
    'listr2', 'nconf', 'conf', 'clsx', 'socks', 'sockjs',
    'inquirer', 'enquirer', 'prompts',
  ];

  test.each(legitimatePackages)('should NOT flag "%s" as typosquat', (pkg) => {
    const matches = checkTyposquat(pkg, { threshold: 0.75, includePatternMatches: true });
    expect(matches).toHaveLength(0);
  });
});
