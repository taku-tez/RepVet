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
  { name: 'chalk', weeklyDownloads: 45000000, highValue: true },
  { name: 'axios', weeklyDownloads: 40000000, highValue: true },
  { name: 'express', weeklyDownloads: 35000000, highValue: true },
  { name: 'moment', weeklyDownloads: 25000000, highValue: true },
  { name: 'debug', weeklyDownloads: 60000000, highValue: true },
  { name: 'uuid', weeklyDownloads: 45000000, highValue: true },
  { name: 'commander', weeklyDownloads: 40000000, highValue: true },
  { name: 'minimist', weeklyDownloads: 55000000, highValue: true },
  { name: 'glob', weeklyDownloads: 50000000 },
  { name: 'semver', weeklyDownloads: 55000000, highValue: true },
  { name: 'async', weeklyDownloads: 40000000 },
  { name: 'colors', weeklyDownloads: 30000000, highValue: true }, // Famous incident
  { name: 'request', weeklyDownloads: 25000000, highValue: true },
  { name: 'mkdirp', weeklyDownloads: 45000000 },
  { name: 'rimraf', weeklyDownloads: 40000000 },
  { name: 'fs-extra', weeklyDownloads: 35000000 },
  { name: 'yargs', weeklyDownloads: 40000000, highValue: true },
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
  { name: 'swc', weeklyDownloads: 5000000 },
  { name: 'tsup', weeklyDownloads: 4000000 },
  { name: 'unbuild', weeklyDownloads: 2000000 },
  { name: 'vite-plugin-dts', weeklyDownloads: 2000000 },

  // Testing
  { name: 'nock', weeklyDownloads: 4000000 },
  { name: 'c8', weeklyDownloads: 4000000 },
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
  { name: 'drizzle-orm', weeklyDownloads: 2000000 },
  { name: 'mssql', weeklyDownloads: 1000000 },

  // Auth / Security
  { name: 'express-rate-limit', weeklyDownloads: 2000000 },
  { name: 'oauth4webapi', weeklyDownloads: 2000000 },

  // Logging / Monitoring

  // HTTP / Network
  { name: 'undici', weeklyDownloads: 15000000 },
  { name: 'proxy-agent', weeklyDownloads: 6000000 },
  { name: 'http-proxy-middleware', weeklyDownloads: 5000000 },

  // Validation / Schema

  // File / Stream processing
  { name: 'busboy', weeklyDownloads: 6000000 },
  { name: 'exceljs', weeklyDownloads: 2000000 },
  { name: 'xlsx', weeklyDownloads: 3000000 },

  // Templating / Rendering

  // Date / Time
  { name: 'chrono-node', weeklyDownloads: 1000000 },

  // CLI / Terminal
  { name: 'cross-spawn', weeklyDownloads: 25000000 },
  { name: 'which', weeklyDownloads: 30000000 },
  { name: 'kleur', weeklyDownloads: 8000000 },
  { name: 'picocolors', weeklyDownloads: 25000000 },
  { name: 'wrap-ansi', weeklyDownloads: 20000000 },
  { name: 'strip-ansi', weeklyDownloads: 30000000 },
  { name: 'ansi-escapes', weeklyDownloads: 8000000 },

  // Config / Env
  { name: 'cosmiconfig', weeklyDownloads: 15000000 },
  { name: 'conf', weeklyDownloads: 2000000 },
  { name: 'convict', weeklyDownloads: 1500000 },
  { name: 'envalid', weeklyDownloads: 1500000 },

  // Crypto / Encoding
  { name: 'tweetnacl', weeklyDownloads: 5000000, highValue: true },
  { name: 'sjcl', weeklyDownloads: 500000, highValue: true },

  // Cloud SDKs
  { name: '@aws-sdk/client-sqs', weeklyDownloads: 3000000 },
  { name: '@aws-sdk/client-sns', weeklyDownloads: 2000000 },
  { name: '@azure/identity', weeklyDownloads: 3000000, highValue: true },
  { name: '@azure/storage-blob', weeklyDownloads: 3000000 },
  { name: '@google-cloud/pubsub', weeklyDownloads: 2000000 },

  // React ecosystem
  { name: '@tanstack/react-query', weeklyDownloads: 5000000 },
  { name: 'formik', weeklyDownloads: 3000000 },
  { name: 'tailwind-merge', weeklyDownloads: 5000000 },

  // Misc utilities
  { name: 'micromatch', weeklyDownloads: 20000000 },
  { name: 'picomatch', weeklyDownloads: 25000000 },
  { name: 'cuid', weeklyDownloads: 2000000 },
  { name: 'ulid', weeklyDownloads: 1500000 },
  { name: 'bytes', weeklyDownloads: 15000000 },
  { name: 'mime', weeklyDownloads: 15000000 },
  { name: 'mime-types', weeklyDownloads: 20000000 },
  { name: 'content-type', weeklyDownloads: 15000000 },
  { name: 'signal-exit', weeklyDownloads: 25000000 },
  { name: 'on-finished', weeklyDownloads: 15000000 },
  { name: 'destroy', weeklyDownloads: 15000000 },
  { name: 'depd', weeklyDownloads: 15000000 },
  { name: 'vary', weeklyDownloads: 10000000 },
  { name: 'etag', weeklyDownloads: 10000000 },
  { name: 'fresh', weeklyDownloads: 10000000 },
  { name: 'cookie', weeklyDownloads: 12000000 },
  { name: 'compression', weeklyDownloads: 5000000 },
  { name: 'serve-static', weeklyDownloads: 10000000 },
  { name: 'finalhandler', weeklyDownloads: 10000000 },
  { name: 'statuses', weeklyDownloads: 10000000 },
  { name: 'raw-body', weeklyDownloads: 10000000 },
  { name: 'type-is', weeklyDownloads: 10000000 },
  { name: 'accepts', weeklyDownloads: 10000000 },
  { name: 'negotiator', weeklyDownloads: 10000000 },
  { name: 'range-parser', weeklyDownloads: 8000000 },
  { name: 'path-to-regexp', weeklyDownloads: 15000000 },
  { name: 'methods', weeklyDownloads: 10000000 },
  { name: 'merge-descriptors', weeklyDownloads: 8000000 },
  { name: 'encodeurl', weeklyDownloads: 10000000 },
  { name: 'parseurl', weeklyDownloads: 10000000 },
  { name: 'send', weeklyDownloads: 8000000 },
  { name: 'proxy-addr', weeklyDownloads: 8000000 },

  // ===== Added 2026-02-08: Push to 510+ =====
  // Modern frameworks & runtimes
  { name: 'elysia', weeklyDownloads: 500000 },
  { name: 'kysely', weeklyDownloads: 800000 },
  { name: 'effect', weeklyDownloads: 500000 },
  { name: 'zx', weeklyDownloads: 1000000 },
  { name: 'ofetch', weeklyDownloads: 3000000 },
  { name: 'citty', weeklyDownloads: 2000000 },
  { name: 'unenv', weeklyDownloads: 3000000 },
  { name: 'nitro', weeklyDownloads: 2000000 },

  // ===== Desktop/Electron =====
  { name: 'electron', weeklyDownloads: 3000000, highValue: true },
  { name: 'electron-builder', weeklyDownloads: 1500000 },
  { name: 'electron-updater', weeklyDownloads: 1000000 },

  // ===== Additional high-value targets =====
  { name: 'depcheck', weeklyDownloads: 1000000 },
  { name: 'ncu', weeklyDownloads: 500000 },
  { name: 'bullmq', weeklyDownloads: 1000000 },
  { name: 'agenda', weeklyDownloads: 500000 },
  { name: 'puppeteer-core', weeklyDownloads: 3000000 },

  // ===== Core infrastructure packages (2026-02-09 batch) =====
  // These are deeply embedded npm dependencies - prime typosquatting targets
  { name: 'ansi-styles', weeklyDownloads: 80000000, highValue: true },
  { name: 'ansi-regex', weeklyDownloads: 75000000, highValue: true },
  { name: 'color-convert', weeklyDownloads: 60000000, highValue: true },
  { name: 'color-name', weeklyDownloads: 55000000 },
  { name: 'resolve', weeklyDownloads: 50000000, highValue: true },
  { name: 'minimatch', weeklyDownloads: 50000000, highValue: true },
  { name: 'lru-cache', weeklyDownloads: 50000000, highValue: true },
  { name: 'source-map-js', weeklyDownloads: 40000000 },
  { name: 'source-map-support', weeklyDownloads: 35000000 },
  { name: 'string-width', weeklyDownloads: 45000000 },
  { name: 'fill-range', weeklyDownloads: 40000000 },
  { name: 'to-regex-range', weeklyDownloads: 35000000 },
  { name: 'braces', weeklyDownloads: 40000000 },
  { name: 'emoji-regex', weeklyDownloads: 35000000 },
  { name: 'escape-string-regexp', weeklyDownloads: 35000000 },
  { name: 'has-flag', weeklyDownloads: 35000000 },
  { name: 'once', weeklyDownloads: 40000000 },
  { name: 'wrappy', weeklyDownloads: 35000000 },
  { name: 'isexe', weeklyDownloads: 35000000 },
  { name: 'shebang-command', weeklyDownloads: 30000000 },
  { name: 'shebang-regex', weeklyDownloads: 30000000 },
  { name: 'path-key', weeklyDownloads: 30000000 },
  { name: 'path-parse', weeklyDownloads: 30000000 },
  { name: 'path-exists', weeklyDownloads: 25000000 },
  { name: 'path-is-absolute', weeklyDownloads: 25000000 },
  { name: 'path-type', weeklyDownloads: 20000000 },
  { name: 'normalize-path', weeklyDownloads: 30000000 },
  { name: 'readdirp', weeklyDownloads: 25000000 },
  { name: 'is-glob', weeklyDownloads: 30000000 },
  { name: 'is-extglob', weeklyDownloads: 30000000 },
  { name: 'is-number', weeklyDownloads: 30000000 },
  { name: 'is-core-module', weeklyDownloads: 25000000 },
  { name: 'is-plain-object', weeklyDownloads: 20000000 },
  { name: 'is-fullwidth-code-point', weeklyDownloads: 25000000 },
  { name: 'call-bind', weeklyDownloads: 30000000 },
  { name: 'get-intrinsic', weeklyDownloads: 30000000 },
  { name: 'has-symbols', weeklyDownloads: 25000000 },
  { name: 'has-proto', weeklyDownloads: 25000000 },
  { name: 'has-property-descriptors', weeklyDownloads: 25000000 },
  { name: 'define-properties', weeklyDownloads: 20000000 },
  { name: 'object-inspect', weeklyDownloads: 20000000 },
  { name: 'es-abstract', weeklyDownloads: 20000000 },
  { name: 'es-define-property', weeklyDownloads: 20000000 },
  { name: 'es-errors', weeklyDownloads: 20000000 },
  { name: 'function-bind', weeklyDownloads: 25000000 },
  { name: 'gopd', weeklyDownloads: 25000000 },
  { name: 'side-channel', weeklyDownloads: 20000000 },
  { name: 'json-stable-stringify-without-jsonval', weeklyDownloads: 15000000 },
  { name: 'json-schema-traverse', weeklyDownloads: 20000000 },
  { name: 'fast-json-stable-stringify', weeklyDownloads: 25000000 },
  { name: 'fast-deep-equal', weeklyDownloads: 25000000 },
  { name: 'deep-extend', weeklyDownloads: 15000000 },
  { name: 'merge2', weeklyDownloads: 20000000 },
  { name: 'follow-redirects', weeklyDownloads: 30000000, highValue: true },
  { name: 'proxy-from-env', weeklyDownloads: 20000000 },
  { name: 'combined-stream', weeklyDownloads: 20000000 },
  { name: 'delayed-stream', weeklyDownloads: 15000000 },
  { name: 'jsonfile', weeklyDownloads: 20000000 },
  { name: 'universalify', weeklyDownloads: 20000000 },
  { name: 'get-stream', weeklyDownloads: 20000000 },
  { name: 'human-signals', weeklyDownloads: 15000000 },
  { name: 'onetime', weeklyDownloads: 20000000 },
  { name: 'mimic-fn', weeklyDownloads: 15000000 },
  { name: 'strip-final-newline', weeklyDownloads: 15000000 },
  { name: 'npm-run-path', weeklyDownloads: 15000000 },
  { name: 'p-locate', weeklyDownloads: 20000000 },
  { name: 'yocto-queue', weeklyDownloads: 20000000 },
  { name: 'find-up', weeklyDownloads: 20000000 },
  { name: 'locate-path', weeklyDownloads: 15000000 },
  { name: 'postcss', weeklyDownloads: 30000000, highValue: true },
  { name: 'undici-types', weeklyDownloads: 25000000 },
  { name: 'esprima', weeklyDownloads: 20000000 },
  { name: 'estraverse', weeklyDownloads: 20000000 },
  { name: 'esquery', weeklyDownloads: 15000000 },
  { name: 'esrecurse', weeklyDownloads: 15000000 },
  { name: 'eslint-scope', weeklyDownloads: 15000000 },
  { name: 'optionator', weeklyDownloads: 15000000 },
  { name: 'levn', weeklyDownloads: 15000000 },
  { name: 'type-check', weeklyDownloads: 15000000 },
  { name: 'type-fest', weeklyDownloads: 20000000 },
  { name: 'csstype', weeklyDownloads: 20000000 },
  { name: 'terser', weeklyDownloads: 20000000, highValue: true },
  { name: 'serialize-javascript', weeklyDownloads: 15000000 },
  { name: 'tapable', weeklyDownloads: 15000000 },
  { name: 'watchpack', weeklyDownloads: 15000000 },
  { name: 'schema-utils', weeklyDownloads: 15000000 },
  { name: 'interpret', weeklyDownloads: 10000000 },
  { name: 'rechoir', weeklyDownloads: 10000000 },
  { name: 'domhandler', weeklyDownloads: 15000000 },
  { name: 'domutils', weeklyDownloads: 15000000 },
  { name: 'punycode', weeklyDownloads: 20000000 },
  { name: 'safer-buffer', weeklyDownloads: 15000000 },
  { name: 'escalade', weeklyDownloads: 20000000 },
  { name: 'electron-to-chromium', weeklyDownloads: 20000000 },
  { name: 'gensync', weeklyDownloads: 15000000 },
  { name: 'regenerator-runtime', weeklyDownloads: 20000000 },
  { name: 'loose-envify', weeklyDownloads: 20000000 },
  { name: 'scheduler', weeklyDownloads: 15000000 },
  { name: 'invariant', weeklyDownloads: 15000000 },
  { name: 'history', weeklyDownloads: 10000000 },
  { name: 'content-disposition', weeklyDownloads: 10000000 },
  { name: 'y18n', weeklyDownloads: 15000000 },
  { name: 'yallist', weeklyDownloads: 15000000 },
  { name: 'cliui', weeklyDownloads: 15000000 },
  { name: 'lilconfig', weeklyDownloads: 15000000 },
  { name: 'jiti', weeklyDownloads: 15000000 },
  { name: 'log-symbols', weeklyDownloads: 10000000 },
  { name: 'cli-cursor', weeklyDownloads: 10000000 },
  { name: 'cli-spinners', weeklyDownloads: 10000000 },
  { name: 'restore-cursor', weeklyDownloads: 10000000 },
  { name: 'open', weeklyDownloads: 15000000 },
  { name: 'slash', weeklyDownloads: 15000000 },
  { name: 'ignore', weeklyDownloads: 15000000 },
  { name: 'flat-cache', weeklyDownloads: 12000000 },
  { name: 'flatted', weeklyDownloads: 12000000 },
  { name: 'keyv', weeklyDownloads: 12000000 },
  { name: 'through', weeklyDownloads: 10000000 },
  { name: 'pump', weeklyDownloads: 10000000 },
  { name: 'pify', weeklyDownloads: 10000000 },
  { name: 'make-dir', weeklyDownloads: 10000000 },
  { name: 'ini', weeklyDownloads: 10000000 },
  { name: 'nan', weeklyDownloads: 10000000 },
  { name: 'node-addon-api', weeklyDownloads: 10000000 },
  { name: 'diff', weeklyDownloads: 10000000 },
  { name: 'pretty-format', weeklyDownloads: 12000000 },
  { name: 'pure-rand', weeklyDownloads: 10000000 },
  { name: 'natural-compare', weeklyDownloads: 10000000 },
  { name: 'fast-levenshtein', weeklyDownloads: 10000000 },
  { name: 'word-wrap', weeklyDownloads: 10000000 },
  { name: 'text-table', weeklyDownloads: 10000000 },
  { name: 'balanced-match', weeklyDownloads: 20000000 },
  { name: 'brace-expansion', weeklyDownloads: 20000000 },
  { name: 'run-parallel', weeklyDownloads: 15000000 },
  { name: 'queue-microtask', weeklyDownloads: 15000000 },
  { name: 'reusify', weeklyDownloads: 15000000 },
  { name: 'fastq', weeklyDownloads: 15000000 },
  { name: 'jackspeak', weeklyDownloads: 15000000 },
  { name: 'clean-css', weeklyDownloads: 10000000 },
  { name: 'css-loader', weeklyDownloads: 10000000 },
  { name: 'cssnano', weeklyDownloads: 10000000 },
  { name: 'co', weeklyDownloads: 10000000 },
  { name: 'encoding', weeklyDownloads: 10000000 },

  // ===== Webpack loaders (all legitimate, prevent cross-FP) =====
  { name: 'ts-loader', weeklyDownloads: 5000000 },
  { name: 'style-loader', weeklyDownloads: 8000000 },
  { name: 'file-loader', weeklyDownloads: 6000000 },
  { name: 'url-loader', weeklyDownloads: 5000000 },
  { name: 'babel-loader', weeklyDownloads: 10000000 },
  { name: 'raw-loader', weeklyDownloads: 3000000 },
  { name: 'sass-loader', weeklyDownloads: 5000000 },
  { name: 'less-loader', weeklyDownloads: 2000000 },
  { name: 'postcss-loader', weeklyDownloads: 8000000 },
  { name: 'html-loader', weeklyDownloads: 2000000 },
  { name: 'csv-loader', weeklyDownloads: 500000 },
  { name: 'json-loader', weeklyDownloads: 1000000 },
  { name: 'source-map-loader', weeklyDownloads: 3000000 },
  { name: 'esbuild-loader', weeklyDownloads: 2000000 },
  { name: 'swc-loader', weeklyDownloads: 1000000 },
  { name: 'thread-loader', weeklyDownloads: 2000000 },
  { name: 'cache-loader', weeklyDownloads: 1500000 },
  { name: 'vue-loader', weeklyDownloads: 4000000 },
  { name: 'svg-loader', weeklyDownloads: 500000 },

  // ===== Additional utilities (FP prevention) =====
  { name: 'undici', weeklyDownloads: 15000000 },
  { name: 'undici-types', weeklyDownloads: 15000000 },
  { name: 'tinypool', weeklyDownloads: 5000000 },
  { name: 'tinybench', weeklyDownloads: 5000000 },
  { name: 'tinyspy', weeklyDownloads: 5000000 },
  { name: 'picomatch', weeklyDownloads: 20000000 },
  { name: 'micromatch', weeklyDownloads: 20000000 },
  { name: 'minimatch', weeklyDownloads: 30000000 },
  { name: 'chokidar', weeklyDownloads: 25000000 },
  { name: 'lru-cache', weeklyDownloads: 20000000 },
  { name: 'quick-lru', weeklyDownloads: 5000000 },
  { name: 'meow', weeklyDownloads: 8000000 },
  { name: 'formidable', weeklyDownloads: 5000000 },
  { name: 'busboy', weeklyDownloads: 8000000 },
  { name: 'multer', weeklyDownloads: 5000000 },
  { name: 'pino', weeklyDownloads: 5000000 },
  { name: 'morgan', weeklyDownloads: 5000000 },
  { name: 'bunyan', weeklyDownloads: 2000000 },
  { name: 'eta', weeklyDownloads: 1000000 },
  { name: 'nunjucks', weeklyDownloads: 2000000 },
  { name: 'mustache', weeklyDownloads: 3000000 },
  { name: 'cacache', weeklyDownloads: 10000000 },
  { name: 'terser', weeklyDownloads: 15000000 },
  { name: 'defu', weeklyDownloads: 5000000 },
  { name: 'ohash', weeklyDownloads: 5000000 },
  { name: 'kleur', weeklyDownloads: 10000000 },
  { name: 'kolorist', weeklyDownloads: 3000000 },
  { name: 'ansis', weeklyDownloads: 2000000 },
  { name: 'depd', weeklyDownloads: 15000000 },
  { name: 'negotiator', weeklyDownloads: 15000000 },
  { name: 'finalhandler', weeklyDownloads: 15000000 },
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
  { name: 'bottle', weeklyDownloads: 2000000 },
  { name: 'falcon', weeklyDownloads: 1500000 },
  { name: 'sanic', weeklyDownloads: 1000000 },

  // Database / ORM
  { name: 'motor', weeklyDownloads: 2000000 },

  // Data science / ML
  { name: 'sympy', weeklyDownloads: 5000000 },

  // DevOps / Cloud
  { name: 'google-cloud-storage', weeklyDownloads: 5000000 },
  { name: 'google-cloud-bigquery', weeklyDownloads: 4000000 },
  { name: 'azure-storage-blob', weeklyDownloads: 3000000 },
  { name: 'azure-identity', weeklyDownloads: 3000000, highValue: true },
  { name: 'kubernetes', weeklyDownloads: 3000000 },

  // Security / Crypto
  { name: 'authlib', weeklyDownloads: 1500000 },

  // Testing

  // CLI / Utils
  { name: 'dataclasses-json', weeklyDownloads: 3000000 },

  // Parsing / Serialization
  { name: 'html5lib', weeklyDownloads: 5000000 },
  { name: 'orjson', weeklyDownloads: 5000000 },
  { name: 'ujson', weeklyDownloads: 3000000 },
  { name: 'msgpack', weeklyDownloads: 5000000 },

  // Async / Concurrency
  { name: 'trio', weeklyDownloads: 2000000 },

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

  // ===== AI/ML SDKs (Added 2026-02-09) =====
  { name: 'openai', weeklyDownloads: 15000000, highValue: true },
  { name: 'anthropic', weeklyDownloads: 5000000, highValue: true },
  { name: 'langchain', weeklyDownloads: 8000000, highValue: true },
  { name: 'langchain-core', weeklyDownloads: 7000000, highValue: true },
  { name: 'langchain-community', weeklyDownloads: 4000000 },
  { name: 'langchain-openai', weeklyDownloads: 3000000 },
  { name: 'langsmith', weeklyDownloads: 5000000 },
  { name: 'llama-index', weeklyDownloads: 2000000, highValue: true },
  { name: 'chromadb', weeklyDownloads: 1500000 },
  { name: 'pinecone-client', weeklyDownloads: 1000000 },
  { name: 'weaviate-client', weeklyDownloads: 500000 },
  { name: 'qdrant-client', weeklyDownloads: 500000 },
  { name: 'cohere', weeklyDownloads: 800000 },
  { name: 'replicate', weeklyDownloads: 600000 },
  { name: 'together', weeklyDownloads: 400000 },
  { name: 'groq', weeklyDownloads: 500000 },
  { name: 'mistralai', weeklyDownloads: 300000 },

  // ===== ML Ops & Data Apps =====
  { name: 'mlflow', weeklyDownloads: 3000000 },
  { name: 'wandb', weeklyDownloads: 2000000 },
  { name: 'streamlit', weeklyDownloads: 4000000, highValue: true },
  { name: 'gradio', weeklyDownloads: 3000000 },
  { name: 'dash', weeklyDownloads: 2500000 },
  { name: 'ray', weeklyDownloads: 2000000 },
  { name: 'dask', weeklyDownloads: 3000000 },
  { name: 'prefect', weeklyDownloads: 1500000 },
  { name: 'dagster', weeklyDownloads: 1000000 },
  { name: 'airflow', weeklyDownloads: 500000 },
  { name: 'apache-airflow', weeklyDownloads: 3000000, highValue: true },

  // ===== Modern Data Tools =====
  { name: 'polars', weeklyDownloads: 3000000 },
  { name: 'duckdb', weeklyDownloads: 2500000 },
  { name: 'pyarrow', weeklyDownloads: 20000000 },
  { name: 'networkx', weeklyDownloads: 8000000 },
  { name: 'altair', weeklyDownloads: 2000000 },
  { name: 'bokeh', weeklyDownloads: 3000000 },

  // ===== Async / Networking =====
  { name: 'uvloop', weeklyDownloads: 8000000 },
  { name: 'websockets', weeklyDownloads: 6000000 },
  { name: 'aiofiles', weeklyDownloads: 5000000 },
  { name: 'httptools', weeklyDownloads: 7000000 },
  { name: 'python-multipart', weeklyDownloads: 10000000 },
  { name: 'twisted', weeklyDownloads: 3000000 },
  { name: 'pyzmq', weeklyDownloads: 8000000 },

  // ===== Messaging / Streaming =====
  { name: 'kafka-python', weeklyDownloads: 2000000 },
  { name: 'confluent-kafka', weeklyDownloads: 2500000 },
  { name: 'pika', weeklyDownloads: 3000000 },
  { name: 'fastavro', weeklyDownloads: 2000000 },

  // ===== ORMs & DB Drivers =====
  { name: 'beanie', weeklyDownloads: 500000 },
  { name: 'tortoise-orm', weeklyDownloads: 400000 },
  { name: 'databases', weeklyDownloads: 600000 },
  { name: 'mysql-connector-python', weeklyDownloads: 3000000 },

  // ===== Web Frameworks =====
  { name: 'litestar', weeklyDownloads: 300000 },
  { name: 'pyramid', weeklyDownloads: 500000 },
  { name: 'cherrypy', weeklyDownloads: 300000 },
  { name: 'robyn', weeklyDownloads: 100000 },

  // ===== Date/Time =====
  { name: 'pendulum', weeklyDownloads: 4000000 },
  { name: 'arrow', weeklyDownloads: 3000000 },
  { name: 'python-dateutil', weeklyDownloads: 50000000 },

  // ===== Additional PyPI packages (2026-02-09 batch) =====
  
  // Infrastructure & DevOps
  { name: 'ansible', weeklyDownloads: 5000000, highValue: true },
  { name: 'ansible-core', weeklyDownloads: 4000000 },
  { name: 'terraform', weeklyDownloads: 1000000 },
  { name: 'pulumi', weeklyDownloads: 500000 },
  { name: 'salt', weeklyDownloads: 300000 },
  
  // HTTP & Networking
  { name: 'httpcore', weeklyDownloads: 15000000 },
  { name: 'h11', weeklyDownloads: 10000000 },
  { name: 'h2', weeklyDownloads: 5000000 },
  { name: 'websockets', weeklyDownloads: 8000000 },
  { name: 'websocket-client', weeklyDownloads: 6000000 },
  { name: 'pycurl', weeklyDownloads: 2000000 },
  { name: 'httplib2', weeklyDownloads: 5000000 },
  { name: 'grpcio', weeklyDownloads: 15000000, highValue: true },
  { name: 'grpcio-tools', weeklyDownloads: 3000000 },
  { name: 'protobuf', weeklyDownloads: 20000000, highValue: true },
  
  // Serialization & Data Formats
  { name: 'msgpack', weeklyDownloads: 5000000 },
  { name: 'orjson', weeklyDownloads: 8000000 },
  { name: 'ujson', weeklyDownloads: 4000000 },
  { name: 'simplejson', weeklyDownloads: 5000000 },
  { name: 'cbor2', weeklyDownloads: 1000000 },
  { name: 'avro-python3', weeklyDownloads: 1000000 },
  { name: 'pyarrow', weeklyDownloads: 12000000, highValue: true },
  { name: 'parquet', weeklyDownloads: 500000 },
  
  // Logging & Monitoring
  { name: 'loguru', weeklyDownloads: 8000000 },
  { name: 'structlog', weeklyDownloads: 3000000 },
  { name: 'sentry-sdk', weeklyDownloads: 10000000, highValue: true },
  { name: 'prometheus-client', weeklyDownloads: 5000000 },
  { name: 'opentelemetry-api', weeklyDownloads: 5000000 },
  { name: 'opentelemetry-sdk', weeklyDownloads: 4000000 },
  { name: 'datadog', weeklyDownloads: 2000000 },
  
  // Image & Media
  { name: 'pillow', weeklyDownloads: 30000000, highValue: true },
  { name: 'opencv-python', weeklyDownloads: 10000000, highValue: true },
  { name: 'imageio', weeklyDownloads: 3000000 },
  { name: 'wand', weeklyDownloads: 1000000 },
  { name: 'cairosvg', weeklyDownloads: 1000000 },
  
  // Task Queues & Background Jobs
  { name: 'celery', weeklyDownloads: 8000000, highValue: true },
  { name: 'rq', weeklyDownloads: 2000000 },
  { name: 'dramatiq', weeklyDownloads: 500000 },
  { name: 'huey', weeklyDownloads: 300000 },
  
  // CLI & Terminal
  { name: 'typer', weeklyDownloads: 8000000 },
  { name: 'fire', weeklyDownloads: 3000000 },
  { name: 'tqdm', weeklyDownloads: 25000000, highValue: true },
  { name: 'colorama', weeklyDownloads: 30000000 },
  { name: 'tabulate', weeklyDownloads: 10000000 },
  { name: 'prettytable', weeklyDownloads: 3000000 },
  
  // Auth & Security
  { name: 'pyjwt', weeklyDownloads: 15000000, highValue: true },
  { name: 'oauthlib', weeklyDownloads: 10000000 },
  { name: 'python-jose', weeklyDownloads: 5000000 },
  { name: 'passlib', weeklyDownloads: 3000000 },
  { name: 'itsdangerous', weeklyDownloads: 15000000 },
  { name: 'certifi', weeklyDownloads: 50000000, highValue: true },
  { name: 'truststore', weeklyDownloads: 1000000 },
  
  // Cloud SDKs
  { name: 'google-cloud-storage', weeklyDownloads: 10000000 },
  { name: 'google-cloud-bigquery', weeklyDownloads: 8000000 },
  { name: 'google-auth', weeklyDownloads: 20000000, highValue: true },
  { name: 'azure-storage-blob', weeklyDownloads: 5000000 },
  { name: 'azure-identity', weeklyDownloads: 8000000 },
  { name: 'msal', weeklyDownloads: 5000000 },
  
  // Typing & Validation
  { name: 'typing-extensions', weeklyDownloads: 80000000, highValue: true },
  { name: 'annotated-types', weeklyDownloads: 15000000 },
  { name: 'mypy-extensions', weeklyDownloads: 10000000 },
  { name: 'typeguard', weeklyDownloads: 3000000 },
  
  // Async & Concurrency
  { name: 'anyio', weeklyDownloads: 15000000 },
  { name: 'trio', weeklyDownloads: 2000000 },
  { name: 'gevent', weeklyDownloads: 5000000 },
  { name: 'eventlet', weeklyDownloads: 3000000 },
  { name: 'greenlet', weeklyDownloads: 15000000 },
  
  // Config & Environment
  { name: 'python-dotenv', weeklyDownloads: 15000000, highValue: true },
  { name: 'dynaconf', weeklyDownloads: 1000000 },
  { name: 'hydra-core', weeklyDownloads: 2000000 },
  { name: 'omegaconf', weeklyDownloads: 3000000 },
  
  // PDF & Document
  { name: 'pypdf', weeklyDownloads: 5000000 },
  { name: 'reportlab', weeklyDownloads: 3000000 },
  { name: 'python-docx', weeklyDownloads: 3000000 },
  { name: 'openpyxl', weeklyDownloads: 10000000 },
  { name: 'xlsxwriter', weeklyDownloads: 5000000 },
  
  // AI/ML Additional
  { name: 'langchain', weeklyDownloads: 8000000, highValue: true },
  { name: 'openai', weeklyDownloads: 10000000, highValue: true },
  { name: 'anthropic', weeklyDownloads: 5000000, highValue: true },
  { name: 'tiktoken', weeklyDownloads: 8000000 },
  { name: 'sentence-transformers', weeklyDownloads: 3000000 },
  { name: 'faiss-cpu', weeklyDownloads: 3000000 },
  { name: 'chromadb', weeklyDownloads: 2000000 },
  { name: 'pinecone-client', weeklyDownloads: 1000000 },
  { name: 'qdrant-client', weeklyDownloads: 500000 },
  { name: 'mlflow', weeklyDownloads: 5000000 },
  { name: 'wandb', weeklyDownloads: 5000000 },
  { name: 'optuna', weeklyDownloads: 2000000 },
  { name: 'ray', weeklyDownloads: 5000000 },
  { name: 'dask', weeklyDownloads: 3000000 },
  { name: 'polars', weeklyDownloads: 3000000 },
  { name: 'vaex', weeklyDownloads: 500000 },
  
  // Graph & Visualization
  { name: 'plotly', weeklyDownloads: 8000000 },
  { name: 'seaborn', weeklyDownloads: 8000000 },
  { name: 'bokeh', weeklyDownloads: 3000000 },
  { name: 'altair', weeklyDownloads: 3000000 },
  { name: 'networkx', weeklyDownloads: 8000000 },
  
  // Testing Additional
  { name: 'hypothesis', weeklyDownloads: 3000000 },
  { name: 'factory-boy', weeklyDownloads: 2000000 },
  { name: 'faker', weeklyDownloads: 8000000 },
  { name: 'responses', weeklyDownloads: 3000000 },
  { name: 'vcrpy', weeklyDownloads: 1000000 },
  { name: 'coverage', weeklyDownloads: 15000000 },
  { name: 'tox', weeklyDownloads: 5000000 },
  { name: 'nox', weeklyDownloads: 3000000 },
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
