/**
 * False positive regression tests for typosquat detection
 * All packages here are LEGITIMATE and should NOT be flagged as MEDIUM+ risk
 */
import { describe, test, expect } from '@jest/globals';
import { checkTyposquat, TyposquatMatch } from '../../src/typosquat/detector.js';

const LEGITIMATE_PACKAGES = [
  // Extensions/variants of popular packages
  'commander-js', 'jestjs', 'lodash-es', 'lodash.clonedeep', 'lodash.isequal',
  'moment-timezone', 'dotenv-expand', 'dotenv-safe', 'dotenv-cli',
  'express-ws', 'express-rate-limit', 'express-validator', 'express-session',
  'chalk-animation', 'yargs-parser', 'yargs-unparser',
  'async-mutex', 'async-retry', 'async-lock',
  'glob-parent', 'globby', 'semver-compare',
  'webpack-cli', 'webpack-merge', 'webpack-bundle-analyzer',
  
  // React ecosystem
  'react-dom', 'react-router', 'react-router-dom', 'react-redux',
  'react-query', 'react-hook-form', 'react-select', 'react-icons',
  'react-native', 'react-datepicker', 'react-draggable', 'react-dropzone',
  
  // Vue/Next ecosystem
  'vue-router', 'vuex', 'vue-loader', 'next-auth', 'next-seo', 'nuxt',
  
  // ESLint plugins (all legitimate)
  'eslint-plugin-vue', 'eslint-plugin-jest', 'eslint-config-prettier',
  'eslint-plugin-react', 'eslint-plugin-import',
  
  // Similar short names (all real packages)
  'nest', 'got', 'tap', 'tar', 'koa', 'coa', 'ora', 'ink', 'joi', 'pug',
  'npm', 'npx', 'nps', 'pg', 'ws', 'ftp', 'ssh2', 'nx', 'np', 'd3',
  
  // Task runner successors
  'listr2',
  
  // DB clients
  'mysql2', 'pg-promise', 'ioredis', 'bullmq',
  
  // Auth/security
  'bcryptjs', 'passport-jwt', 'passport-local',
  
  // GraphQL
  'graphql-tag', 'graphql-tools', 'graphql-request',
  
  // Build tools
  'ts-node', 'ts-jest', 'tsx', 'esbuild', 'rollup', 'parcel', 'turbo',
  
  // Styling
  'tailwindcss', 'postcss', 'autoprefixer', 'sass', 'less',
  
  // Validation
  'zod', 'yup', 'ajv',
  
  // IDs
  'nanoid', 'cuid', 'ulid', 'shortid',
  
  // Enquirer is legitimate (not typosquat of inquirer)
  'enquirer',
  
  // Short names that are distinct packages
  'color',   // color manipulation (vs colors)
  'socks',   // SOCKS proxy client (vs sockjs)
  
  // Legitimate alternatives/related crypto packages
  'preact',  // Lightweight React alternative (NOT a typosquat of react)
  'scrypt',  // Crypto hash algorithm (NOT a typosquat of bcrypt)
  
  // Newly verified legitimate packages (2026-02-09 batch)
  // 'axio' removed - it IS a common axios typosquat pattern
  'expressions',   // math expression parser (not express typo)
  'colours',       // British spelling of colors
  'yamljs',        // legitimate YAML parser
  'args',          // legitimate CLI argument parser
  'babel-plugin-transform-runtime', // old unscoped babel plugin
  
  // Frameworks that look similar but are distinct
  'fastify', 'hono', 'elysia', 'polka',
  'svelte', 'solid-js', 'qwik', 'astro', 'remix',
  'vite', 'vitest', 'tsup',
  
  // Runtime/tooling
  'pnpm', 'bun', 'oxc', 'biome',
  
  // DB/ORM
  'prisma', 'drizzle-orm', 'kysely', 'knex',
  'mongoose', 'typeorm', 'sequelize',
  
  // Crypto/auth
  'argon2', 'jose', 'paseto',
  
  // State management
  'zustand', 'jotai', 'valtio', 'recoil',
  
  // Misc utilities
  'dayjs', 'luxon', 'cheerio', 'undici', 'ky',
  'pino', 'winston', 'sharp', 'canvas',
];

describe('Typosquat false positive regression', () => {
  test.each(LEGITIMATE_PACKAGES)(
    '%s should not be flagged as MEDIUM+ typosquat risk',
    (pkg) => {
      const matches = checkTyposquat(pkg, { threshold: 0.75 });
      const actionable = matches.filter((m: TyposquatMatch) => m.risk !== 'LOW');
      if (actionable.length > 0) {
        const details = actionable.map((m: TyposquatMatch) => 
          `${m.target} (${(m.similarity * 100).toFixed(1)}%, ${m.risk})`
        ).join(', ');
        expect(`False positive: ${pkg} flagged as similar to ${details}`).toBe('');
      }
    }
  );
});
