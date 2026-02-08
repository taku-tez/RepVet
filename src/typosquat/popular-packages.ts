/**
 * Popular packages database for typosquat detection
 * These are common targets for typosquatting attacks
 * 
 * Sources:
 * - npm download statistics
 * - Known typosquatting incidents
 * - Security advisories
 */

export interface PopularPackage {
  name: string;
  weeklyDownloads?: number;
  /** High-value target (e.g., security-sensitive, widely used) */
  highValue?: boolean;
}

/**
 * Top npm packages (based on weekly downloads and security importance)
 * ~300 packages covering major categories
 */
export const NPM_POPULAR_PACKAGES: PopularPackage[] = [
  // ===== Core utilities (50M+ downloads) =====
  { name: 'lodash', weeklyDownloads: 50000000, highValue: true },
  { name: 'chalk', weeklyDownloads: 45000000 },
  { name: 'axios', weeklyDownloads: 40000000, highValue: true },
  { name: 'express', weeklyDownloads: 35000000, highValue: true },
  { name: 'moment', weeklyDownloads: 25000000 },
  { name: 'debug', weeklyDownloads: 60000000 },
  { name: 'uuid', weeklyDownloads: 45000000 },
  { name: 'commander', weeklyDownloads: 40000000 },
  { name: 'minimist', weeklyDownloads: 55000000 },
  { name: 'glob', weeklyDownloads: 50000000 },
  { name: 'semver', weeklyDownloads: 55000000 },
  { name: 'async', weeklyDownloads: 40000000 },
  { name: 'colors', weeklyDownloads: 30000000, highValue: true }, // Famous incident
  { name: 'request', weeklyDownloads: 25000000 },
  { name: 'mkdirp', weeklyDownloads: 45000000 },
  { name: 'rimraf', weeklyDownloads: 40000000 },
  { name: 'fs-extra', weeklyDownloads: 35000000 },
  { name: 'yargs', weeklyDownloads: 40000000 },
  { name: 'dotenv', weeklyDownloads: 30000000, highValue: true },
  { name: 'bluebird', weeklyDownloads: 15000000 },
  { name: 'underscore', weeklyDownloads: 10000000 },
  { name: 'qs', weeklyDownloads: 40000000 },
  { name: 'inherits', weeklyDownloads: 60000000 },
  { name: 'readable-stream', weeklyDownloads: 50000000 },
  { name: 'safe-buffer', weeklyDownloads: 45000000 },
  { name: 'supports-color', weeklyDownloads: 50000000 },
  { name: 'source-map', weeklyDownloads: 45000000 },
  { name: 'through2', weeklyDownloads: 30000000 },
  { name: 'graceful-fs', weeklyDownloads: 50000000 },
  { name: 'string_decoder', weeklyDownloads: 45000000 },

  // ===== React ecosystem =====
  { name: 'react', weeklyDownloads: 25000000, highValue: true },
  { name: 'react-dom', weeklyDownloads: 20000000, highValue: true },
  { name: 'react-router', weeklyDownloads: 10000000 },
  { name: 'react-router-dom', weeklyDownloads: 10000000 },
  { name: 'redux', weeklyDownloads: 8000000, highValue: true },
  { name: 'react-redux', weeklyDownloads: 7000000 },
  { name: 'next', weeklyDownloads: 5000000, highValue: true },
  { name: 'gatsby', weeklyDownloads: 1000000 },
  { name: 'prop-types', weeklyDownloads: 15000000 },
  { name: 'create-react-app', weeklyDownloads: 1000000 },
  { name: 'react-scripts', weeklyDownloads: 5000000 },
  { name: 'react-hook-form', weeklyDownloads: 3000000 },
  { name: 'react-query', weeklyDownloads: 2500000 },
  { name: 'styled-components', weeklyDownloads: 4000000 },
  { name: 'emotion', weeklyDownloads: 2000000 },
  { name: '@emotion/react', weeklyDownloads: 5000000 },
  { name: '@emotion/styled', weeklyDownloads: 4000000 },
  { name: 'zustand', weeklyDownloads: 3000000 },
  { name: 'mobx', weeklyDownloads: 1500000 },
  { name: 'recoil', weeklyDownloads: 500000 },
  { name: 'jotai', weeklyDownloads: 1000000 },
  { name: 'swr', weeklyDownloads: 2000000 },
  { name: 'framer-motion', weeklyDownloads: 2500000 },
  { name: 'react-spring', weeklyDownloads: 1000000 },

  // ===== Vue ecosystem =====
  { name: 'vue', weeklyDownloads: 5000000, highValue: true },
  { name: 'vuex', weeklyDownloads: 2000000 },
  { name: 'vue-router', weeklyDownloads: 2000000 },
  { name: 'nuxt', weeklyDownloads: 500000 },
  { name: 'pinia', weeklyDownloads: 1500000 },
  { name: '@vue/cli', weeklyDownloads: 500000 },
  { name: 'vuetify', weeklyDownloads: 500000 },
  { name: 'element-ui', weeklyDownloads: 300000 },
  { name: 'element-plus', weeklyDownloads: 400000 },
  { name: 'ant-design-vue', weeklyDownloads: 200000 },

  // ===== Angular ecosystem =====
  { name: '@angular/core', weeklyDownloads: 3000000, highValue: true },
  { name: '@angular/common', weeklyDownloads: 3000000 },
  { name: '@angular/cli', weeklyDownloads: 1500000 },
  { name: '@angular/forms', weeklyDownloads: 2500000 },
  { name: '@angular/router', weeklyDownloads: 2500000 },
  { name: '@angular/material', weeklyDownloads: 1000000 },
  { name: '@angular/platform-browser', weeklyDownloads: 2500000 },
  { name: 'rxjs', weeklyDownloads: 25000000 },
  { name: 'zone.js', weeklyDownloads: 3000000 },
  { name: 'ngx-bootstrap', weeklyDownloads: 200000 },

  // ===== Build tools =====
  { name: 'webpack', weeklyDownloads: 25000000, highValue: true },
  { name: 'webpack-cli', weeklyDownloads: 15000000 },
  { name: 'webpack-dev-server', weeklyDownloads: 10000000 },
  { name: 'babel-core', weeklyDownloads: 10000000 },
  { name: '@babel/core', weeklyDownloads: 35000000, highValue: true },
  { name: '@babel/preset-env', weeklyDownloads: 25000000 },
  { name: '@babel/preset-react', weeklyDownloads: 15000000 },
  { name: '@babel/preset-typescript', weeklyDownloads: 10000000 },
  { name: '@babel/plugin-transform-runtime', weeklyDownloads: 15000000 },
  { name: 'rollup', weeklyDownloads: 10000000 },
  { name: 'esbuild', weeklyDownloads: 20000000 },
  { name: 'vite', weeklyDownloads: 8000000, highValue: true },
  { name: 'parcel', weeklyDownloads: 500000 },
  { name: 'turbo', weeklyDownloads: 2000000 },
  { name: 'lerna', weeklyDownloads: 2000000 },
  { name: 'nx', weeklyDownloads: 1500000 },
  { name: 'gulp', weeklyDownloads: 3000000 },
  { name: 'grunt', weeklyDownloads: 1000000 },

  // ===== TypeScript =====
  { name: 'typescript', weeklyDownloads: 40000000, highValue: true },
  { name: 'ts-node', weeklyDownloads: 15000000 },
  { name: 'tslib', weeklyDownloads: 50000000 },
  { name: '@types/node', weeklyDownloads: 30000000 },
  { name: '@types/react', weeklyDownloads: 15000000 },
  { name: '@types/react-dom', weeklyDownloads: 10000000 },
  { name: '@types/jest', weeklyDownloads: 10000000 },
  { name: '@types/lodash', weeklyDownloads: 8000000 },
  { name: '@types/express', weeklyDownloads: 5000000 },
  { name: 'tsx', weeklyDownloads: 5000000 },

  // ===== Testing =====
  { name: 'jest', weeklyDownloads: 20000000, highValue: true },
  { name: 'mocha', weeklyDownloads: 8000000 },
  { name: 'chai', weeklyDownloads: 7000000 },
  { name: 'jasmine', weeklyDownloads: 2000000 },
  { name: 'cypress', weeklyDownloads: 5000000 },
  { name: 'puppeteer', weeklyDownloads: 5000000 },
  { name: 'playwright', weeklyDownloads: 3000000 },
  { name: 'vitest', weeklyDownloads: 4000000 },
  { name: 'sinon', weeklyDownloads: 5000000 },
  { name: 'nyc', weeklyDownloads: 5000000 },
  { name: 'istanbul', weeklyDownloads: 2000000 },
  { name: 'supertest', weeklyDownloads: 3000000 },
  { name: 'ava', weeklyDownloads: 500000 },
  { name: 'tape', weeklyDownloads: 500000 },
  { name: '@testing-library/react', weeklyDownloads: 8000000 },
  { name: '@testing-library/jest-dom', weeklyDownloads: 7000000 },
  { name: 'enzyme', weeklyDownloads: 2000000 },

  // ===== Linting =====
  { name: 'eslint', weeklyDownloads: 35000000, highValue: true },
  { name: 'prettier', weeklyDownloads: 25000000 },
  { name: 'stylelint', weeklyDownloads: 5000000 },
  { name: 'tslint', weeklyDownloads: 1500000 },
  { name: 'biome', weeklyDownloads: 500000 },
  { name: 'oxlint', weeklyDownloads: 200000 },
  { name: '@eslint/js', weeklyDownloads: 10000000 },
  { name: 'eslint-plugin-react', weeklyDownloads: 10000000 },
  { name: 'eslint-plugin-import', weeklyDownloads: 15000000 },
  { name: '@typescript-eslint/parser', weeklyDownloads: 15000000 },
  { name: '@typescript-eslint/eslint-plugin', weeklyDownloads: 15000000 },
  { name: 'husky', weeklyDownloads: 10000000 },
  { name: 'lint-staged', weeklyDownloads: 8000000 },

  // ===== HTTP/Networking =====
  { name: 'node-fetch', weeklyDownloads: 30000000 },
  { name: 'got', weeklyDownloads: 15000000 },
  { name: 'superagent', weeklyDownloads: 10000000 },
  { name: 'http-proxy', weeklyDownloads: 15000000 },
  { name: 'cors', weeklyDownloads: 10000000 },
  { name: 'body-parser', weeklyDownloads: 20000000 },
  { name: 'cookie-parser', weeklyDownloads: 5000000 },
  { name: 'multer', weeklyDownloads: 3000000 },
  { name: 'formidable', weeklyDownloads: 5000000 },
  { name: 'form-data', weeklyDownloads: 20000000 },
  { name: 'isomorphic-fetch', weeklyDownloads: 3000000 },
  { name: 'cross-fetch', weeklyDownloads: 5000000 },
  { name: 'ky', weeklyDownloads: 1000000 },
  { name: 'needle', weeklyDownloads: 2000000 },

  // ===== Database =====
  { name: 'mongoose', weeklyDownloads: 3000000 },
  { name: 'mysql', weeklyDownloads: 1500000 },
  { name: 'mysql2', weeklyDownloads: 3000000 },
  { name: 'pg', weeklyDownloads: 3000000 },
  { name: 'redis', weeklyDownloads: 2000000 },
  { name: 'ioredis', weeklyDownloads: 2000000 },
  { name: 'sequelize', weeklyDownloads: 1500000 },
  { name: 'prisma', weeklyDownloads: 2000000, highValue: true },
  { name: '@prisma/client', weeklyDownloads: 2000000 },
  { name: 'typeorm', weeklyDownloads: 1000000 },
  { name: 'knex', weeklyDownloads: 1500000 },
  { name: 'mongodb', weeklyDownloads: 2000000 },
  { name: 'sqlite3', weeklyDownloads: 1500000 },
  { name: 'better-sqlite3', weeklyDownloads: 500000 },
  { name: 'drizzle-orm', weeklyDownloads: 500000 },

  // ===== Authentication/Security =====
  { name: 'jsonwebtoken', weeklyDownloads: 15000000, highValue: true },
  { name: 'bcrypt', weeklyDownloads: 3000000, highValue: true },
  { name: 'bcryptjs', weeklyDownloads: 4000000 },
  { name: 'passport', weeklyDownloads: 2000000, highValue: true },
  { name: 'passport-local', weeklyDownloads: 500000 },
  { name: 'passport-jwt', weeklyDownloads: 500000 },
  { name: 'helmet', weeklyDownloads: 2000000, highValue: true },
  { name: 'crypto-js', weeklyDownloads: 5000000 },
  { name: 'jose', weeklyDownloads: 3000000 },
  { name: 'node-forge', weeklyDownloads: 10000000 },
  { name: 'oauth', weeklyDownloads: 1000000 },
  { name: 'express-session', weeklyDownloads: 2000000 },
  { name: 'csurf', weeklyDownloads: 500000 },
  { name: 'argon2', weeklyDownloads: 500000 },

  // ===== File handling =====
  { name: 'chokidar', weeklyDownloads: 30000000 },
  { name: 'globby', weeklyDownloads: 20000000 },
  { name: 'fast-glob', weeklyDownloads: 25000000 },
  { name: 'archiver', weeklyDownloads: 5000000 },
  { name: 'adm-zip', weeklyDownloads: 3000000 },
  { name: 'tar', weeklyDownloads: 20000000 },
  { name: 'unzipper', weeklyDownloads: 2000000 },
  { name: 'tmp', weeklyDownloads: 10000000 },

  // ===== CLI =====
  { name: 'inquirer', weeklyDownloads: 20000000 },
  { name: 'ora', weeklyDownloads: 15000000 },
  { name: 'cli-table', weeklyDownloads: 10000000 },
  { name: 'boxen', weeklyDownloads: 10000000 },
  { name: 'meow', weeklyDownloads: 10000000 },
  { name: 'prompts', weeklyDownloads: 10000000 },
  { name: 'enquirer', weeklyDownloads: 5000000 },
  { name: 'cli-progress', weeklyDownloads: 3000000 },
  { name: 'listr', weeklyDownloads: 2000000 },
  { name: 'listr2', weeklyDownloads: 3000000 },
  { name: 'arg', weeklyDownloads: 10000000 },
  { name: 'cac', weeklyDownloads: 5000000 },

  // ===== Parsing =====
  { name: 'cheerio', weeklyDownloads: 8000000 },
  { name: 'jsdom', weeklyDownloads: 15000000 },
  { name: 'marked', weeklyDownloads: 8000000 },
  { name: 'markdown-it', weeklyDownloads: 5000000 },
  { name: 'yaml', weeklyDownloads: 25000000 },
  { name: 'xml2js', weeklyDownloads: 15000000 },
  { name: 'csv-parser', weeklyDownloads: 2000000 },
  { name: 'papaparse', weeklyDownloads: 3000000 },
  { name: 'htmlparser2', weeklyDownloads: 15000000 },
  { name: 'json5', weeklyDownloads: 25000000 },
  { name: 'toml', weeklyDownloads: 2000000 },
  { name: 'js-yaml', weeklyDownloads: 30000000 },
  { name: 'gray-matter', weeklyDownloads: 5000000 },

  // ===== Logging =====
  { name: 'winston', weeklyDownloads: 10000000 },
  { name: 'pino', weeklyDownloads: 8000000 },
  { name: 'bunyan', weeklyDownloads: 2000000 },
  { name: 'morgan', weeklyDownloads: 5000000 },
  { name: 'log4js', weeklyDownloads: 3000000 },
  { name: 'loglevel', weeklyDownloads: 5000000 },
  { name: 'signale', weeklyDownloads: 500000 },
  { name: 'consola', weeklyDownloads: 5000000 },

  // ===== Date/Time =====
  { name: 'dayjs', weeklyDownloads: 15000000 },
  { name: 'date-fns', weeklyDownloads: 20000000 },
  { name: 'luxon', weeklyDownloads: 5000000 },
  { name: 'ms', weeklyDownloads: 50000000 },
  { name: 'timeago.js', weeklyDownloads: 500000 },

  // ===== Validation =====
  { name: 'joi', weeklyDownloads: 8000000, highValue: true },
  { name: 'yup', weeklyDownloads: 6000000 },
  { name: 'zod', weeklyDownloads: 10000000, highValue: true },
  { name: 'validator', weeklyDownloads: 10000000 },
  { name: 'ajv', weeklyDownloads: 50000000 },
  { name: 'class-validator', weeklyDownloads: 2000000 },
  { name: 'superstruct', weeklyDownloads: 1000000 },
  { name: 'valibot', weeklyDownloads: 500000 },

  // ===== GraphQL =====
  { name: 'graphql', weeklyDownloads: 10000000 },
  { name: 'apollo-server', weeklyDownloads: 1500000 },
  { name: '@apollo/client', weeklyDownloads: 2000000 },
  { name: '@apollo/server', weeklyDownloads: 1000000 },
  { name: 'graphql-tag', weeklyDownloads: 3000000 },
  { name: 'graphql-tools', weeklyDownloads: 2000000 },
  { name: 'urql', weeklyDownloads: 500000 },
  { name: 'type-graphql', weeklyDownloads: 200000 },

  // ===== WebSocket =====
  { name: 'socket.io', weeklyDownloads: 5000000 },
  { name: 'socket.io-client', weeklyDownloads: 4000000 },
  { name: 'ws', weeklyDownloads: 35000000 },
  { name: 'sockjs', weeklyDownloads: 3000000 },
  { name: 'primus', weeklyDownloads: 100000 },

  // ===== Process management =====
  { name: 'pm2', weeklyDownloads: 2000000 },
  { name: 'nodemon', weeklyDownloads: 8000000 },
  { name: 'concurrently', weeklyDownloads: 5000000 },
  { name: 'cross-env', weeklyDownloads: 15000000 },
  { name: 'execa', weeklyDownloads: 25000000 },
  { name: 'shelljs', weeklyDownloads: 10000000 },
  { name: 'npm-run-all', weeklyDownloads: 5000000 },

  // ===== Templating =====
  { name: 'ejs', weeklyDownloads: 10000000 },
  { name: 'handlebars', weeklyDownloads: 15000000 },
  { name: 'pug', weeklyDownloads: 5000000 },
  { name: 'mustache', weeklyDownloads: 5000000 },
  { name: 'nunjucks', weeklyDownloads: 2000000 },
  { name: 'eta', weeklyDownloads: 1000000 },

  // ===== Image processing =====
  { name: 'sharp', weeklyDownloads: 5000000 },
  { name: 'jimp', weeklyDownloads: 2000000 },
  { name: 'canvas', weeklyDownloads: 2000000 },
  { name: 'image-size', weeklyDownloads: 5000000 },

  // ===== PDF =====
  { name: 'pdfkit', weeklyDownloads: 1500000 },
  { name: 'pdf-lib', weeklyDownloads: 1500000 },
  { name: 'pdfmake', weeklyDownloads: 500000 },
  { name: 'jspdf', weeklyDownloads: 1000000 },

  // ===== Email =====
  { name: 'nodemailer', weeklyDownloads: 3000000, highValue: true },
  { name: 'mailgun-js', weeklyDownloads: 200000 },
  { name: '@sendgrid/mail', weeklyDownloads: 500000 },
  { name: 'email-templates', weeklyDownloads: 200000 },

  // ===== Cloud/AWS =====
  { name: 'aws-sdk', weeklyDownloads: 10000000, highValue: true },
  { name: '@aws-sdk/client-s3', weeklyDownloads: 3000000 },
  { name: '@aws-sdk/client-dynamodb', weeklyDownloads: 1000000 },
  { name: '@aws-sdk/client-lambda', weeklyDownloads: 500000 },
  { name: 'firebase', weeklyDownloads: 1000000 },
  { name: 'firebase-admin', weeklyDownloads: 1000000 },
  { name: '@google-cloud/storage', weeklyDownloads: 1000000 },
  { name: 'azure-storage', weeklyDownloads: 200000 },

  // ===== Serverless =====
  { name: 'serverless', weeklyDownloads: 500000 },
  { name: '@vercel/node', weeklyDownloads: 500000 },
  { name: '@netlify/functions', weeklyDownloads: 200000 },

  // ===== Other utilities =====
  { name: 'ramda', weeklyDownloads: 5000000 },
  { name: 'immutable', weeklyDownloads: 8000000 },
  { name: 'immer', weeklyDownloads: 10000000 },
  { name: 'nanoid', weeklyDownloads: 25000000 },
  { name: 'shortid', weeklyDownloads: 5000000 },
  { name: 'classnames', weeklyDownloads: 15000000 },
  { name: 'clsx', weeklyDownloads: 10000000 },
  { name: 'query-string', weeklyDownloads: 10000000 },
  { name: 'qs', weeklyDownloads: 40000000 },
  { name: 'lodash.get', weeklyDownloads: 10000000 },
  { name: 'lodash.merge', weeklyDownloads: 15000000 },
  { name: 'lodash.debounce', weeklyDownloads: 10000000 },
  { name: 'lodash.throttle', weeklyDownloads: 5000000 },
  { name: 'deepmerge', weeklyDownloads: 15000000 },
  { name: 'object-assign', weeklyDownloads: 30000000 },
  { name: 'escape-html', weeklyDownloads: 25000000 },
  { name: 'he', weeklyDownloads: 15000000 },
  { name: 'entities', weeklyDownloads: 20000000 },
  { name: 'iconv-lite', weeklyDownloads: 30000000 },
  { name: 'eventemitter3', weeklyDownloads: 20000000 },
  { name: 'mitt', weeklyDownloads: 3000000 },
  { name: 'tiny-emitter', weeklyDownloads: 5000000 },
  { name: 'p-limit', weeklyDownloads: 30000000 },
  { name: 'p-map', weeklyDownloads: 15000000 },
  { name: 'p-queue', weeklyDownloads: 5000000 },
  { name: 'p-retry', weeklyDownloads: 5000000 },
  { name: 'retry', weeklyDownloads: 15000000 },
  { name: 'async-retry', weeklyDownloads: 5000000 },
  { name: 'bottleneck', weeklyDownloads: 2000000 },

  // ===== Known attack targets (from security incidents) =====
  { name: 'event-stream', weeklyDownloads: 10000000, highValue: true }, // Famous incident
  { name: 'flatmap-stream', weeklyDownloads: 0, highValue: true }, // Malicious
  { name: 'coa', weeklyDownloads: 20000000, highValue: true }, // Compromised
  { name: 'rc', weeklyDownloads: 30000000, highValue: true }, // Compromised
  { name: 'ua-parser-js', weeklyDownloads: 8000000, highValue: true }, // Compromised
  { name: 'faker', weeklyDownloads: 3000000, highValue: true }, // Sabotaged

  // ===== Additional popular packages (2026-02-08 batch) =====
  // Build tools & bundlers
  { name: 'esbuild', weeklyDownloads: 25000000, highValue: true },
  { name: 'rollup', weeklyDownloads: 20000000 },
  { name: 'swc', weeklyDownloads: 5000000 },
  { name: 'parcel', weeklyDownloads: 3000000 },
  { name: 'turbo', weeklyDownloads: 4000000 },
  { name: 'nx', weeklyDownloads: 5000000 },
  { name: 'lerna', weeklyDownloads: 3000000 },
  { name: 'tsup', weeklyDownloads: 4000000 },
  { name: 'unbuild', weeklyDownloads: 2000000 },
  { name: 'vite-plugin-dts', weeklyDownloads: 2000000 },

  // Testing
  { name: 'vitest', weeklyDownloads: 10000000 },
  { name: 'playwright', weeklyDownloads: 6000000, highValue: true },
  { name: 'cypress', weeklyDownloads: 5000000 },
  { name: 'puppeteer', weeklyDownloads: 4000000 },
  { name: 'supertest', weeklyDownloads: 5000000 },
  { name: 'sinon', weeklyDownloads: 6000000 },
  { name: 'nock', weeklyDownloads: 4000000 },
  { name: 'c8', weeklyDownloads: 4000000 },
  { name: 'nyc', weeklyDownloads: 5000000 },
  { name: 'ava', weeklyDownloads: 2000000 },
  { name: 'tap', weeklyDownloads: 1500000 },
  { name: 'msw', weeklyDownloads: 3000000 },

  // Server frameworks
  { name: 'fastify', weeklyDownloads: 4000000 },
  { name: 'koa', weeklyDownloads: 3000000 },
  { name: 'hapi', weeklyDownloads: 1000000 },
  { name: 'hono', weeklyDownloads: 3000000 },
  { name: 'nestjs', weeklyDownloads: 2000000 },
  { name: 'polka', weeklyDownloads: 2000000 },
  { name: 'restify', weeklyDownloads: 1000000 },
  { name: 'connect', weeklyDownloads: 8000000 },

  // Database / ORM
  { name: 'prisma', weeklyDownloads: 4000000, highValue: true },
  { name: 'drizzle-orm', weeklyDownloads: 2000000 },
  { name: 'knex', weeklyDownloads: 3000000 },
  { name: 'sequelize', weeklyDownloads: 2500000 },
  { name: 'typeorm', weeklyDownloads: 2000000 },
  { name: 'mongoose', weeklyDownloads: 3000000 },
  { name: 'pg', weeklyDownloads: 5000000, highValue: true },
  { name: 'mysql2', weeklyDownloads: 4000000 },
  { name: 'better-sqlite3', weeklyDownloads: 3000000 },
  { name: 'ioredis', weeklyDownloads: 4000000 },
  { name: 'redis', weeklyDownloads: 3000000 },
  { name: 'mongodb', weeklyDownloads: 3000000 },
  { name: 'mssql', weeklyDownloads: 1000000 },

  // Auth / Security
  { name: 'jsonwebtoken', weeklyDownloads: 12000000, highValue: true },
  { name: 'bcrypt', weeklyDownloads: 3000000, highValue: true },
  { name: 'bcryptjs', weeklyDownloads: 3000000, highValue: true },
  { name: 'passport', weeklyDownloads: 3000000, highValue: true },
  { name: 'helmet', weeklyDownloads: 3000000, highValue: true },
  { name: 'cors', weeklyDownloads: 6000000 },
  { name: 'csurf', weeklyDownloads: 1000000 },
  { name: 'express-rate-limit', weeklyDownloads: 2000000 },
  { name: 'jose', weeklyDownloads: 8000000, highValue: true },
  { name: 'oauth4webapi', weeklyDownloads: 2000000 },

  // Logging / Monitoring
  { name: 'pino', weeklyDownloads: 6000000 },
  { name: 'winston', weeklyDownloads: 8000000 },
  { name: 'bunyan', weeklyDownloads: 2000000 },
  { name: 'morgan', weeklyDownloads: 5000000 },
  { name: 'log4js', weeklyDownloads: 3000000 },

  // HTTP / Network
  { name: 'node-fetch', weeklyDownloads: 30000000 },
  { name: 'undici', weeklyDownloads: 15000000 },
  { name: 'got', weeklyDownloads: 10000000 },
  { name: 'superagent', weeklyDownloads: 5000000 },
  { name: 'http-proxy', weeklyDownloads: 8000000 },
  { name: 'proxy-agent', weeklyDownloads: 6000000 },
  { name: 'http-proxy-middleware', weeklyDownloads: 5000000 },
  { name: 'ws', weeklyDownloads: 20000000 },
  { name: 'socket.io', weeklyDownloads: 4000000 },
  { name: 'socket.io-client', weeklyDownloads: 4000000 },

  // Validation / Schema
  { name: 'zod', weeklyDownloads: 15000000, highValue: true },
  { name: 'joi', weeklyDownloads: 6000000 },
  { name: 'yup', weeklyDownloads: 5000000 },
  { name: 'ajv', weeklyDownloads: 35000000 },
  { name: 'superstruct', weeklyDownloads: 2000000 },
  { name: 'class-validator', weeklyDownloads: 3000000 },
  { name: 'valibot', weeklyDownloads: 2000000 },

  // File / Stream processing
  { name: 'sharp', weeklyDownloads: 5000000 },
  { name: 'multer', weeklyDownloads: 3000000 },
  { name: 'archiver', weeklyDownloads: 5000000 },
  { name: 'formidable', weeklyDownloads: 4000000 },
  { name: 'busboy', weeklyDownloads: 6000000 },
  { name: 'unzipper', weeklyDownloads: 3000000 },
  { name: 'adm-zip', weeklyDownloads: 3000000 },
  { name: 'csv-parser', weeklyDownloads: 2000000 },
  { name: 'papaparse', weeklyDownloads: 3000000 },
  { name: 'exceljs', weeklyDownloads: 2000000 },
  { name: 'xlsx', weeklyDownloads: 3000000 },
  { name: 'pdf-lib', weeklyDownloads: 2000000 },
  { name: 'pdfkit', weeklyDownloads: 2000000 },

  // Templating / Rendering
  { name: 'handlebars', weeklyDownloads: 10000000 },
  { name: 'ejs', weeklyDownloads: 6000000 },
  { name: 'pug', weeklyDownloads: 2000000 },
  { name: 'nunjucks', weeklyDownloads: 2000000 },
  { name: 'mustache', weeklyDownloads: 3000000 },
  { name: 'eta', weeklyDownloads: 2000000 },

  // Date / Time
  { name: 'dayjs', weeklyDownloads: 15000000 },
  { name: 'date-fns', weeklyDownloads: 12000000 },
  { name: 'luxon', weeklyDownloads: 5000000 },
  { name: 'chrono-node', weeklyDownloads: 1000000 },

  // CLI / Terminal
  { name: 'inquirer', weeklyDownloads: 10000000 },
  { name: 'ora', weeklyDownloads: 6000000 },
  { name: 'prompts', weeklyDownloads: 8000000 },
  { name: 'meow', weeklyDownloads: 6000000 },
  { name: 'execa', weeklyDownloads: 15000000 },
  { name: 'shelljs', weeklyDownloads: 5000000 },
  { name: 'cross-spawn', weeklyDownloads: 25000000 },
  { name: 'which', weeklyDownloads: 30000000 },
  { name: 'kleur', weeklyDownloads: 8000000 },
  { name: 'picocolors', weeklyDownloads: 25000000 },
  { name: 'wrap-ansi', weeklyDownloads: 20000000 },
  { name: 'strip-ansi', weeklyDownloads: 30000000 },
  { name: 'ansi-escapes', weeklyDownloads: 8000000 },
  { name: 'listr2', weeklyDownloads: 5000000 },

  // Config / Env
  { name: 'cosmiconfig', weeklyDownloads: 15000000 },
  { name: 'rc', weeklyDownloads: 15000000 },
  { name: 'conf', weeklyDownloads: 2000000 },
  { name: 'convict', weeklyDownloads: 1500000 },
  { name: 'envalid', weeklyDownloads: 1500000 },

  // Crypto / Encoding
  { name: 'crypto-js', weeklyDownloads: 6000000, highValue: true },
  { name: 'tweetnacl', weeklyDownloads: 5000000, highValue: true },
  { name: 'sjcl', weeklyDownloads: 500000, highValue: true },
  { name: 'node-forge', weeklyDownloads: 10000000, highValue: true },
  { name: 'argon2', weeklyDownloads: 1000000, highValue: true },

  // Cloud SDKs
  { name: '@aws-sdk/client-s3', weeklyDownloads: 8000000, highValue: true },
  { name: '@aws-sdk/client-dynamodb', weeklyDownloads: 4000000 },
  { name: '@aws-sdk/client-lambda', weeklyDownloads: 3000000 },
  { name: '@aws-sdk/client-sqs', weeklyDownloads: 3000000 },
  { name: '@aws-sdk/client-sns', weeklyDownloads: 2000000 },
  { name: '@azure/identity', weeklyDownloads: 3000000, highValue: true },
  { name: '@azure/storage-blob', weeklyDownloads: 3000000 },
  { name: '@google-cloud/storage', weeklyDownloads: 3000000 },
  { name: '@google-cloud/pubsub', weeklyDownloads: 2000000 },
  { name: 'firebase', weeklyDownloads: 3000000 },
  { name: 'firebase-admin', weeklyDownloads: 2000000, highValue: true },

  // React ecosystem
  { name: 'zustand', weeklyDownloads: 6000000 },
  { name: 'jotai', weeklyDownloads: 2000000 },
  { name: 'recoil', weeklyDownloads: 1500000 },
  { name: 'immer', weeklyDownloads: 8000000 },
  { name: 'swr', weeklyDownloads: 4000000 },
  { name: '@tanstack/react-query', weeklyDownloads: 5000000 },
  { name: 'react-hook-form', weeklyDownloads: 5000000 },
  { name: 'formik', weeklyDownloads: 3000000 },
  { name: 'framer-motion', weeklyDownloads: 4000000 },
  { name: 'clsx', weeklyDownloads: 10000000 },
  { name: 'classnames', weeklyDownloads: 12000000 },
  { name: 'tailwind-merge', weeklyDownloads: 5000000 },

  // Misc utilities
  { name: 'p-limit', weeklyDownloads: 20000000 },
  { name: 'p-queue', weeklyDownloads: 5000000 },
  { name: 'fast-glob', weeklyDownloads: 15000000 },
  { name: 'globby', weeklyDownloads: 10000000 },
  { name: 'chokidar', weeklyDownloads: 15000000 },
  { name: 'micromatch', weeklyDownloads: 20000000 },
  { name: 'picomatch', weeklyDownloads: 25000000 },
  { name: 'nanoid', weeklyDownloads: 10000000 },
  { name: 'cuid', weeklyDownloads: 2000000 },
  { name: 'ulid', weeklyDownloads: 1500000 },
  { name: 'ms', weeklyDownloads: 25000000 },
  { name: 'bytes', weeklyDownloads: 15000000 },
  { name: 'mime', weeklyDownloads: 15000000 },
  { name: 'mime-types', weeklyDownloads: 20000000 },
  { name: 'content-type', weeklyDownloads: 15000000 },
  { name: 'eventemitter3', weeklyDownloads: 10000000 },
  { name: 'signal-exit', weeklyDownloads: 25000000 },
  { name: 'on-finished', weeklyDownloads: 15000000 },
  { name: 'destroy', weeklyDownloads: 15000000 },
  { name: 'depd', weeklyDownloads: 15000000 },
  { name: 'vary', weeklyDownloads: 10000000 },
  { name: 'etag', weeklyDownloads: 10000000 },
  { name: 'fresh', weeklyDownloads: 10000000 },
  { name: 'cookie', weeklyDownloads: 12000000 },
  { name: 'cookie-parser', weeklyDownloads: 5000000 },
  { name: 'body-parser', weeklyDownloads: 15000000 },
  { name: 'compression', weeklyDownloads: 5000000 },
  { name: 'serve-static', weeklyDownloads: 10000000 },
  { name: 'finalhandler', weeklyDownloads: 10000000 },
  { name: 'statuses', weeklyDownloads: 10000000 },
  { name: 'raw-body', weeklyDownloads: 10000000 },
  { name: 'iconv-lite', weeklyDownloads: 20000000 },
  { name: 'type-is', weeklyDownloads: 10000000 },
  { name: 'accepts', weeklyDownloads: 10000000 },
  { name: 'negotiator', weeklyDownloads: 10000000 },
  { name: 'range-parser', weeklyDownloads: 8000000 },
  { name: 'path-to-regexp', weeklyDownloads: 15000000 },
  { name: 'methods', weeklyDownloads: 10000000 },
  { name: 'merge-descriptors', weeklyDownloads: 8000000 },
  { name: 'encodeurl', weeklyDownloads: 10000000 },
  { name: 'escape-html', weeklyDownloads: 10000000 },
  { name: 'parseurl', weeklyDownloads: 10000000 },
  { name: 'send', weeklyDownloads: 8000000 },
  { name: 'proxy-addr', weeklyDownloads: 8000000 },

  // ===== Added 2026-02-08: Push to 510+ =====
  // Modern frameworks & runtimes
  { name: 'hono', weeklyDownloads: 2000000 },
  { name: 'elysia', weeklyDownloads: 500000 },
  { name: 'drizzle-orm', weeklyDownloads: 1500000 },
  { name: 'kysely', weeklyDownloads: 800000 },
  { name: 'effect', weeklyDownloads: 500000 },
  { name: 'zx', weeklyDownloads: 1000000 },
  { name: 'ofetch', weeklyDownloads: 3000000 },
  { name: 'undici', weeklyDownloads: 15000000 },
  { name: 'citty', weeklyDownloads: 2000000 },
  { name: 'consola', weeklyDownloads: 5000000 },
  { name: 'unenv', weeklyDownloads: 3000000 },
  { name: 'nitro', weeklyDownloads: 2000000 },
];

/**
 * Top PyPI packages (based on downloads and security importance)
 * ~200 packages covering major categories
 */
export const PYPI_POPULAR_PACKAGES: PopularPackage[] = [
  // ===== Core/Essential =====
  { name: 'requests', weeklyDownloads: 50000000, highValue: true },
  { name: 'urllib3', weeklyDownloads: 60000000 },
  { name: 'boto3', weeklyDownloads: 40000000, highValue: true },
  { name: 'botocore', weeklyDownloads: 40000000 },
  { name: 'setuptools', weeklyDownloads: 80000000 },
  { name: 'pip', weeklyDownloads: 50000000, highValue: true },
  { name: 'wheel', weeklyDownloads: 40000000 },
  { name: 'six', weeklyDownloads: 60000000 },
  { name: 'python-dateutil', weeklyDownloads: 50000000 },
  { name: 'certifi', weeklyDownloads: 60000000 },
  { name: 'charset-normalizer', weeklyDownloads: 50000000 },
  { name: 'idna', weeklyDownloads: 55000000 },
  { name: 'packaging', weeklyDownloads: 50000000 },
  { name: 'typing-extensions', weeklyDownloads: 60000000 },
  
  // ===== Web Frameworks =====
  { name: 'django', weeklyDownloads: 5000000, highValue: true },
  { name: 'flask', weeklyDownloads: 8000000, highValue: true },
  { name: 'fastapi', weeklyDownloads: 5000000, highValue: true },
  { name: 'tornado', weeklyDownloads: 3000000 },
  { name: 'aiohttp', weeklyDownloads: 10000000 },
  { name: 'starlette', weeklyDownloads: 5000000 },
  { name: 'uvicorn', weeklyDownloads: 5000000 },
  { name: 'gunicorn', weeklyDownloads: 5000000 },
  { name: 'werkzeug', weeklyDownloads: 10000000 },
  { name: 'jinja2', weeklyDownloads: 15000000 },
  { name: 'itsdangerous', weeklyDownloads: 10000000 },
  { name: 'click', weeklyDownloads: 15000000 },
  
  // ===== Data Science / ML =====
  { name: 'numpy', weeklyDownloads: 30000000, highValue: true },
  { name: 'pandas', weeklyDownloads: 20000000, highValue: true },
  { name: 'scipy', weeklyDownloads: 10000000 },
  { name: 'scikit-learn', weeklyDownloads: 8000000, highValue: true },
  { name: 'tensorflow', weeklyDownloads: 3000000, highValue: true },
  { name: 'torch', weeklyDownloads: 5000000, highValue: true },
  { name: 'pytorch', weeklyDownloads: 1000000 },
  { name: 'keras', weeklyDownloads: 2000000 },
  { name: 'matplotlib', weeklyDownloads: 10000000 },
  { name: 'seaborn', weeklyDownloads: 3000000 },
  { name: 'plotly', weeklyDownloads: 3000000 },
  { name: 'pillow', weeklyDownloads: 15000000 },
  { name: 'opencv-python', weeklyDownloads: 5000000 },
  { name: 'transformers', weeklyDownloads: 3000000 },
  { name: 'huggingface-hub', weeklyDownloads: 5000000 },
  { name: 'tokenizers', weeklyDownloads: 3000000 },
  { name: 'xgboost', weeklyDownloads: 2000000 },
  { name: 'lightgbm', weeklyDownloads: 1500000 },
  { name: 'catboost', weeklyDownloads: 500000 },
  
  // ===== Database =====
  { name: 'sqlalchemy', weeklyDownloads: 10000000, highValue: true },
  { name: 'psycopg2', weeklyDownloads: 5000000 },
  { name: 'psycopg2-binary', weeklyDownloads: 5000000 },
  { name: 'pymysql', weeklyDownloads: 3000000 },
  { name: 'redis', weeklyDownloads: 5000000 },
  { name: 'pymongo', weeklyDownloads: 3000000 },
  { name: 'elasticsearch', weeklyDownloads: 1500000 },
  { name: 'alembic', weeklyDownloads: 3000000 },
  { name: 'peewee', weeklyDownloads: 500000 },
  
  // ===== AWS =====
  { name: 'awscli', weeklyDownloads: 10000000, highValue: true },
  { name: 's3transfer', weeklyDownloads: 30000000 },
  { name: 'aws-sam-cli', weeklyDownloads: 500000 },
  { name: 'moto', weeklyDownloads: 2000000 },
  
  // ===== Testing =====
  { name: 'pytest', weeklyDownloads: 20000000, highValue: true },
  { name: 'pytest-cov', weeklyDownloads: 5000000 },
  { name: 'pytest-asyncio', weeklyDownloads: 3000000 },
  { name: 'pytest-mock', weeklyDownloads: 3000000 },
  { name: 'mock', weeklyDownloads: 10000000 },
  { name: 'coverage', weeklyDownloads: 15000000 },
  { name: 'tox', weeklyDownloads: 3000000 },
  { name: 'nose', weeklyDownloads: 2000000 },
  { name: 'unittest2', weeklyDownloads: 1000000 },
  { name: 'hypothesis', weeklyDownloads: 2000000 },
  { name: 'faker', weeklyDownloads: 5000000 },
  { name: 'factory-boy', weeklyDownloads: 1500000 },
  { name: 'responses', weeklyDownloads: 2000000 },
  { name: 'httpretty', weeklyDownloads: 1000000 },
  
  // ===== Linting / Formatting =====
  { name: 'black', weeklyDownloads: 8000000 },
  { name: 'flake8', weeklyDownloads: 10000000 },
  { name: 'pylint', weeklyDownloads: 5000000 },
  { name: 'mypy', weeklyDownloads: 8000000 },
  { name: 'isort', weeklyDownloads: 8000000 },
  { name: 'autopep8', weeklyDownloads: 3000000 },
  { name: 'yapf', weeklyDownloads: 1000000 },
  { name: 'ruff', weeklyDownloads: 5000000 },
  { name: 'bandit', weeklyDownloads: 3000000, highValue: true },
  { name: 'safety', weeklyDownloads: 1000000 },
  
  // ===== CLI =====
  { name: 'rich', weeklyDownloads: 10000000 },
  { name: 'typer', weeklyDownloads: 3000000 },
  { name: 'argparse', weeklyDownloads: 5000000 },
  { name: 'colorama', weeklyDownloads: 20000000 },
  { name: 'tqdm', weeklyDownloads: 15000000 },
  { name: 'tabulate', weeklyDownloads: 8000000 },
  
  // ===== HTTP/API =====
  { name: 'httpx', weeklyDownloads: 5000000 },
  { name: 'httplib2', weeklyDownloads: 5000000 },
  { name: 'grpcio', weeklyDownloads: 10000000 },
  { name: 'protobuf', weeklyDownloads: 20000000 },
  { name: 'pydantic', weeklyDownloads: 15000000, highValue: true },
  { name: 'marshmallow', weeklyDownloads: 5000000 },
  { name: 'jsonschema', weeklyDownloads: 15000000 },
  
  // ===== Security =====
  { name: 'cryptography', weeklyDownloads: 30000000, highValue: true },
  { name: 'pycryptodome', weeklyDownloads: 8000000, highValue: true },
  { name: 'pyopenssl', weeklyDownloads: 15000000 },
  { name: 'paramiko', weeklyDownloads: 8000000, highValue: true },
  { name: 'pyjwt', weeklyDownloads: 10000000, highValue: true },
  { name: 'passlib', weeklyDownloads: 2000000 },
  { name: 'bcrypt', weeklyDownloads: 5000000 },
  { name: 'python-jose', weeklyDownloads: 2000000 },
  { name: 'oauthlib', weeklyDownloads: 8000000 },
  
  // ===== Async =====
  { name: 'asyncio', weeklyDownloads: 3000000 },
  { name: 'gevent', weeklyDownloads: 3000000 },
  { name: 'eventlet', weeklyDownloads: 2000000 },
  { name: 'celery', weeklyDownloads: 3000000 },
  { name: 'kombu', weeklyDownloads: 5000000 },
  
  // ===== Configuration =====
  { name: 'pyyaml', weeklyDownloads: 40000000 },
  { name: 'toml', weeklyDownloads: 20000000 },
  { name: 'python-dotenv', weeklyDownloads: 10000000 },
  { name: 'configparser', weeklyDownloads: 5000000 },
  { name: 'environs', weeklyDownloads: 1000000 },
  
  // ===== Logging =====
  { name: 'loguru', weeklyDownloads: 5000000 },
  { name: 'structlog', weeklyDownloads: 2000000 },
  { name: 'colorlog', weeklyDownloads: 2000000 },
  
  // ===== Utils =====
  { name: 'attrs', weeklyDownloads: 30000000 },
  { name: 'more-itertools', weeklyDownloads: 20000000 },
  { name: 'decorator', weeklyDownloads: 20000000 },
  { name: 'wrapt', weeklyDownloads: 25000000 },
  { name: 'cachetools', weeklyDownloads: 15000000 },
  { name: 'tenacity', weeklyDownloads: 10000000 },
  { name: 'toolz', weeklyDownloads: 5000000 },
  { name: 'boltons', weeklyDownloads: 1000000 },
  { name: 'chardet', weeklyDownloads: 30000000 },
  { name: 'filelock', weeklyDownloads: 20000000 },
  { name: 'pathlib2', weeklyDownloads: 5000000 },
  { name: 'pathspec', weeklyDownloads: 15000000 },
  { name: 'regex', weeklyDownloads: 15000000 },
  { name: 'python-magic', weeklyDownloads: 2000000 },
  
  // ===== Jupyter =====
  { name: 'jupyter', weeklyDownloads: 2000000 },
  { name: 'notebook', weeklyDownloads: 5000000 },
  { name: 'jupyterlab', weeklyDownloads: 3000000 },
  { name: 'ipython', weeklyDownloads: 10000000 },
  { name: 'ipykernel', weeklyDownloads: 10000000 },
  { name: 'nbconvert', weeklyDownloads: 5000000 },
  { name: 'nbformat', weeklyDownloads: 10000000 },
  
  // ===== DevOps =====
  { name: 'ansible', weeklyDownloads: 1000000, highValue: true },
  { name: 'docker', weeklyDownloads: 3000000 },
  { name: 'docker-compose', weeklyDownloads: 1000000 },
  { name: 'fabric', weeklyDownloads: 500000 },
  { name: 'invoke', weeklyDownloads: 2000000 },
  
  // ===== Scraping =====
  { name: 'beautifulsoup4', weeklyDownloads: 10000000 },
  { name: 'lxml', weeklyDownloads: 15000000 },
  { name: 'scrapy', weeklyDownloads: 1000000 },
  { name: 'selenium', weeklyDownloads: 5000000 },
  { name: 'playwright', weeklyDownloads: 2000000 },
  
  // ===== Email =====
  { name: 'sendgrid', weeklyDownloads: 500000 },
  { name: 'email-validator', weeklyDownloads: 3000000 },
  
  // ===== Core infrastructure (high downloads) =====
  { name: 'aiobotocore', weeklyDownloads: 57000000 },
  { name: 'grpcio-status', weeklyDownloads: 46000000 },
  { name: 'cffi', weeklyDownloads: 37000000 },
  { name: 'fsspec', weeklyDownloads: 35000000 },
  { name: 's3fs', weeklyDownloads: 35000000 },
  { name: 'pycparser', weeklyDownloads: 34000000 },
  { name: 'pluggy', weeklyDownloads: 33000000 },
  { name: 'pygments', weeklyDownloads: 31000000 },
  { name: 'pydantic-core', weeklyDownloads: 29000000 },
  { name: 'markupsafe', weeklyDownloads: 27000000 },
  { name: 'jmespath', weeklyDownloads: 27000000 },
  { name: 'h11', weeklyDownloads: 27000000 },
  { name: 'platformdirs', weeklyDownloads: 26000000 },
  { name: 'anyio', weeklyDownloads: 26000000 },
  { name: 'iniconfig', weeklyDownloads: 26000000 },
  { name: 'rsa', weeklyDownloads: 25000000 },
  { name: 'pytz', weeklyDownloads: 25000000 },
  { name: 'annotated-types', weeklyDownloads: 24000000 },
  { name: 'importlib-metadata', weeklyDownloads: 23000000 },
  { name: 'pyasn1', weeklyDownloads: 23000000 },
  { name: 'exceptiongroup', weeklyDownloads: 22000000 },
  { name: 'sniffio', weeklyDownloads: 21000000 },
  { name: 'virtualenv', weeklyDownloads: 20000000 },
  { name: 'distlib', weeklyDownloads: 18000000 },
  { name: 'tomli', weeklyDownloads: 18000000 },
  { name: 'google-auth', weeklyDownloads: 17000000 },
  { name: 'cachecontrol', weeklyDownloads: 16000000 },
  { name: 'multidict', weeklyDownloads: 15000000 },
  { name: 'yarl', weeklyDownloads: 15000000 },
  { name: 'frozenlist', weeklyDownloads: 14000000 },
  { name: 'aiosignal', weeklyDownloads: 14000000 },
  { name: 'async-timeout', weeklyDownloads: 13000000 },
  { name: 'soupsieve', weeklyDownloads: 12000000 },
  { name: 'zipp', weeklyDownloads: 12000000 },

  // ===== Known attack targets =====
  { name: 'ctx', weeklyDownloads: 0, highValue: true }, // Malicious
  { name: 'request', weeklyDownloads: 500000, highValue: true }, // Typosquat of requests
  { name: 'python3-dateutil', weeklyDownloads: 0, highValue: true }, // Typosquat
  { name: 'jeIlyfish', weeklyDownloads: 0, highValue: true }, // Typosquat of jellyfish

  // ===== High-Download Packages (added 2026-02-08) =====
  { name: 'tzdata', weeklyDownloads: 85000000 },
  { name: 'httpcore', weeklyDownloads: 84000000 },
  { name: 'typing-inspection', weeklyDownloads: 82000000 },
  { name: 'opentelemetry-proto', weeklyDownloads: 80000000 },
  { name: 'google-api-core', weeklyDownloads: 77000000, highValue: true },
  { name: 'pyasn1-modules', weeklyDownloads: 75000000 },
  { name: 'opentelemetry-exporter-otlp-proto-grpc', weeklyDownloads: 71000000 },
  { name: 'googleapis-common-protos', weeklyDownloads: 71000000 },
  { name: 'requests-oauthlib', weeklyDownloads: 70000000 },
  { name: 'opentelemetry-sdk', weeklyDownloads: 69000000 },
  { name: 'pyarrow', weeklyDownloads: 68000000, highValue: true },
  { name: 'propcache', weeklyDownloads: 67000000 },
  { name: 'greenlet', weeklyDownloads: 67000000 },
  { name: 'rpds-py', weeklyDownloads: 66000000 },
  { name: 'opentelemetry-exporter-otlp-proto-http', weeklyDownloads: 65000000 },
  { name: 'referencing', weeklyDownloads: 64000000 },
  { name: 'markdown-it-py', weeklyDownloads: 64000000 },
  { name: 'psutil', weeklyDownloads: 63000000 },
  { name: 'pyparsing', weeklyDownloads: 63000000 },
  { name: 'yandexcloud', weeklyDownloads: 63000000 },

  // ===== Additional PyPI packages (2026-02-08 batch) =====
  // Web frameworks
  { name: 'fastapi', weeklyDownloads: 15000000, highValue: true },
  { name: 'uvicorn', weeklyDownloads: 12000000 },
  { name: 'gunicorn', weeklyDownloads: 10000000 },
  { name: 'starlette', weeklyDownloads: 12000000 },
  { name: 'tornado', weeklyDownloads: 8000000 },
  { name: 'bottle', weeklyDownloads: 2000000 },
  { name: 'falcon', weeklyDownloads: 1500000 },
  { name: 'sanic', weeklyDownloads: 1000000 },
  { name: 'aiohttp', weeklyDownloads: 12000000 },
  { name: 'httpx', weeklyDownloads: 15000000 },

  // Database / ORM
  { name: 'sqlalchemy', weeklyDownloads: 15000000, highValue: true },
  { name: 'psycopg2', weeklyDownloads: 8000000 },
  { name: 'psycopg2-binary', weeklyDownloads: 10000000 },
  { name: 'pymongo', weeklyDownloads: 5000000 },
  { name: 'redis', weeklyDownloads: 8000000 },
  { name: 'celery', weeklyDownloads: 5000000 },
  { name: 'kombu', weeklyDownloads: 5000000 },
  { name: 'alembic', weeklyDownloads: 6000000 },
  { name: 'peewee', weeklyDownloads: 2000000 },
  { name: 'motor', weeklyDownloads: 2000000 },

  // Data science / ML
  { name: 'pandas', weeklyDownloads: 30000000, highValue: true },
  { name: 'numpy', weeklyDownloads: 50000000, highValue: true },
  { name: 'scipy', weeklyDownloads: 15000000 },
  { name: 'scikit-learn', weeklyDownloads: 12000000 },
  { name: 'matplotlib', weeklyDownloads: 15000000 },
  { name: 'seaborn', weeklyDownloads: 5000000 },
  { name: 'plotly', weeklyDownloads: 4000000 },
  { name: 'tensorflow', weeklyDownloads: 5000000, highValue: true },
  { name: 'torch', weeklyDownloads: 8000000, highValue: true },
  { name: 'transformers', weeklyDownloads: 5000000, highValue: true },
  { name: 'keras', weeklyDownloads: 4000000 },
  { name: 'xgboost', weeklyDownloads: 3000000 },
  { name: 'lightgbm', weeklyDownloads: 2000000 },
  { name: 'catboost', weeklyDownloads: 1000000 },
  { name: 'opencv-python', weeklyDownloads: 8000000 },
  { name: 'pillow', weeklyDownloads: 20000000 },
  { name: 'sympy', weeklyDownloads: 5000000 },

  // DevOps / Cloud
  { name: 'boto3', weeklyDownloads: 30000000, highValue: true },
  { name: 'botocore', weeklyDownloads: 30000000 },
  { name: 'awscli', weeklyDownloads: 10000000, highValue: true },
  { name: 'google-cloud-storage', weeklyDownloads: 5000000 },
  { name: 'google-cloud-bigquery', weeklyDownloads: 4000000 },
  { name: 'azure-storage-blob', weeklyDownloads: 3000000 },
  { name: 'azure-identity', weeklyDownloads: 3000000, highValue: true },
  { name: 'kubernetes', weeklyDownloads: 3000000 },
  { name: 'docker', weeklyDownloads: 3000000 },
  { name: 'ansible', weeklyDownloads: 2000000 },
  { name: 'paramiko', weeklyDownloads: 5000000, highValue: true },
  { name: 'fabric', weeklyDownloads: 2000000 },

  // Security / Crypto
  { name: 'cryptography', weeklyDownloads: 30000000, highValue: true },
  { name: 'pycryptodome', weeklyDownloads: 5000000, highValue: true },
  { name: 'pyjwt', weeklyDownloads: 10000000, highValue: true },
  { name: 'passlib', weeklyDownloads: 2000000, highValue: true },
  { name: 'python-jose', weeklyDownloads: 2000000, highValue: true },
  { name: 'authlib', weeklyDownloads: 1500000 },
  { name: 'oauthlib', weeklyDownloads: 5000000 },

  // Testing
  { name: 'pytest', weeklyDownloads: 20000000 },
  { name: 'pytest-cov', weeklyDownloads: 8000000 },
  { name: 'pytest-asyncio', weeklyDownloads: 5000000 },
  { name: 'mock', weeklyDownloads: 5000000 },
  { name: 'coverage', weeklyDownloads: 10000000 },
  { name: 'tox', weeklyDownloads: 5000000 },
  { name: 'hypothesis', weeklyDownloads: 3000000 },
  { name: 'factory-boy', weeklyDownloads: 2000000 },
  { name: 'faker', weeklyDownloads: 5000000 },
  { name: 'responses', weeklyDownloads: 3000000 },
  { name: 'httpretty', weeklyDownloads: 1000000 },

  // CLI / Utils
  { name: 'click', weeklyDownloads: 20000000 },
  { name: 'typer', weeklyDownloads: 5000000 },
  { name: 'rich', weeklyDownloads: 15000000 },
  { name: 'tqdm', weeklyDownloads: 15000000 },
  { name: 'colorama', weeklyDownloads: 15000000 },
  { name: 'tabulate', weeklyDownloads: 8000000 },
  { name: 'python-dotenv', weeklyDownloads: 10000000 },
  { name: 'pydantic', weeklyDownloads: 20000000, highValue: true },
  { name: 'attrs', weeklyDownloads: 15000000 },
  { name: 'dataclasses-json', weeklyDownloads: 3000000 },
  { name: 'marshmallow', weeklyDownloads: 5000000 },

  // Parsing / Serialization
  { name: 'lxml', weeklyDownloads: 10000000 },
  { name: 'beautifulsoup4', weeklyDownloads: 10000000 },
  { name: 'html5lib', weeklyDownloads: 5000000 },
  { name: 'pyyaml', weeklyDownloads: 30000000 },
  { name: 'toml', weeklyDownloads: 10000000 },
  { name: 'orjson', weeklyDownloads: 5000000 },
  { name: 'ujson', weeklyDownloads: 3000000 },
  { name: 'msgpack', weeklyDownloads: 5000000 },
  { name: 'protobuf', weeklyDownloads: 15000000 },
  { name: 'grpcio', weeklyDownloads: 15000000 },

  // Async / Concurrency
  { name: 'anyio', weeklyDownloads: 15000000 },
  { name: 'trio', weeklyDownloads: 2000000 },
  { name: 'gevent', weeklyDownloads: 3000000 },
  { name: 'eventlet', weeklyDownloads: 2000000 },

  // Known PyPI attack targets (additional)
  { name: 'colourama', weeklyDownloads: 0, highValue: true }, // Typosquat of colorama
  { name: 'python-binance', weeklyDownloads: 500000, highValue: true }, // Crypto target
  { name: 'numppy', weeklyDownloads: 0, highValue: true }, // Known typosquat
  { name: 'requessts', weeklyDownloads: 0, highValue: true }, // Known typosquat

  // Added 2026-02-08 (FP batch discovery)
  { name: 'jsonschema-specifications', weeklyDownloads: 63000000 },
  { name: 'mdurl', weeklyDownloads: 62000000 },
  { name: 'et-xmlfile', weeklyDownloads: 61000000 },
  { name: 'openpyxl', weeklyDownloads: 61000000 },
  { name: 'trove-classifiers', weeklyDownloads: 60000000 },
  { name: 'aiohappyeyeballs', weeklyDownloads: 59000000 },
  { name: 'opentelemetry-exporter-otlp', weeklyDownloads: 58000000 },
  { name: 'grpcio-tools', weeklyDownloads: 57000000 },
];

/**
 * Get all popular package names as a Set for fast lookup
 */
export function getPopularPackageNames(ecosystem: 'npm' | 'pypi' = 'npm'): Set<string> {
  if (ecosystem === 'npm') {
    return new Set(NPM_POPULAR_PACKAGES.map(p => p.name));
  }
  if (ecosystem === 'pypi') {
    return new Set(PYPI_POPULAR_PACKAGES.map(p => p.name));
  }
  return new Set();
}

/**
 * Get package info if it's a popular package
 */
export function getPopularPackageInfo(name: string, ecosystem: 'npm' | 'pypi' = 'npm'): PopularPackage | null {
  if (ecosystem === 'npm') {
    return NPM_POPULAR_PACKAGES.find(p => p.name === name) || null;
  }
  if (ecosystem === 'pypi') {
    return PYPI_POPULAR_PACKAGES.find(p => p.name === name) || null;
  }
  return null;
}

/**
 * Get all popular packages for an ecosystem
 */
export function getPopularPackages(ecosystem: 'npm' | 'pypi' = 'npm'): PopularPackage[] {
  if (ecosystem === 'npm') {
    return NPM_POPULAR_PACKAGES;
  }
  if (ecosystem === 'pypi') {
    return PYPI_POPULAR_PACKAGES;
  }
  return [];
}

/**
 * Get high-value targets (security-critical packages)
 */
export function getHighValueTargets(ecosystem: 'npm' | 'pypi' = 'npm'): PopularPackage[] {
  if (ecosystem === 'npm') {
    return NPM_POPULAR_PACKAGES.filter(p => p.highValue);
  }
  if (ecosystem === 'pypi') {
    return PYPI_POPULAR_PACKAGES.filter(p => p.highValue);
  }
  return [];
}
