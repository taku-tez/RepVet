/**
 * Popular packages database for typosquat detection
 * These are common targets for typosquatting attacks
 */

export interface PopularPackage {
  name: string;
  weeklyDownloads?: number;
}

/**
 * Top npm packages (based on weekly downloads)
 * This list should be periodically updated
 */
export const NPM_POPULAR_PACKAGES: PopularPackage[] = [
  // Core utilities (50M+ downloads)
  { name: 'lodash', weeklyDownloads: 50000000 },
  { name: 'chalk', weeklyDownloads: 45000000 },
  { name: 'axios', weeklyDownloads: 40000000 },
  { name: 'express', weeklyDownloads: 35000000 },
  { name: 'moment', weeklyDownloads: 25000000 },
  { name: 'debug', weeklyDownloads: 60000000 },
  { name: 'uuid', weeklyDownloads: 45000000 },
  { name: 'commander', weeklyDownloads: 40000000 },
  { name: 'minimist', weeklyDownloads: 55000000 },
  { name: 'glob', weeklyDownloads: 50000000 },
  
  // React ecosystem
  { name: 'react', weeklyDownloads: 25000000 },
  { name: 'react-dom', weeklyDownloads: 20000000 },
  { name: 'react-router', weeklyDownloads: 10000000 },
  { name: 'react-router-dom', weeklyDownloads: 10000000 },
  { name: 'redux', weeklyDownloads: 8000000 },
  { name: 'react-redux', weeklyDownloads: 7000000 },
  { name: 'next', weeklyDownloads: 5000000 },
  { name: 'gatsby', weeklyDownloads: 1000000 },
  
  // Vue ecosystem
  { name: 'vue', weeklyDownloads: 5000000 },
  { name: 'vuex', weeklyDownloads: 2000000 },
  { name: 'vue-router', weeklyDownloads: 2000000 },
  { name: 'nuxt', weeklyDownloads: 500000 },
  
  // Angular ecosystem
  { name: '@angular/core', weeklyDownloads: 3000000 },
  { name: '@angular/common', weeklyDownloads: 3000000 },
  { name: '@angular/cli', weeklyDownloads: 1500000 },
  
  // Build tools
  { name: 'webpack', weeklyDownloads: 25000000 },
  { name: 'webpack-cli', weeklyDownloads: 15000000 },
  { name: 'babel-core', weeklyDownloads: 10000000 },
  { name: '@babel/core', weeklyDownloads: 35000000 },
  { name: '@babel/preset-env', weeklyDownloads: 25000000 },
  { name: 'rollup', weeklyDownloads: 10000000 },
  { name: 'esbuild', weeklyDownloads: 20000000 },
  { name: 'vite', weeklyDownloads: 8000000 },
  { name: 'parcel', weeklyDownloads: 500000 },
  
  // TypeScript
  { name: 'typescript', weeklyDownloads: 40000000 },
  { name: 'ts-node', weeklyDownloads: 15000000 },
  { name: 'tslib', weeklyDownloads: 50000000 },
  { name: '@types/node', weeklyDownloads: 30000000 },
  { name: '@types/react', weeklyDownloads: 15000000 },
  
  // Testing
  { name: 'jest', weeklyDownloads: 20000000 },
  { name: 'mocha', weeklyDownloads: 8000000 },
  { name: 'chai', weeklyDownloads: 7000000 },
  { name: 'jasmine', weeklyDownloads: 2000000 },
  { name: 'cypress', weeklyDownloads: 5000000 },
  { name: 'puppeteer', weeklyDownloads: 5000000 },
  { name: 'playwright', weeklyDownloads: 3000000 },
  { name: 'vitest', weeklyDownloads: 4000000 },
  
  // Linting
  { name: 'eslint', weeklyDownloads: 35000000 },
  { name: 'prettier', weeklyDownloads: 25000000 },
  { name: 'stylelint', weeklyDownloads: 5000000 },
  
  // HTTP/Networking
  { name: 'request', weeklyDownloads: 25000000 },
  { name: 'node-fetch', weeklyDownloads: 30000000 },
  { name: 'got', weeklyDownloads: 15000000 },
  { name: 'superagent', weeklyDownloads: 10000000 },
  { name: 'http-proxy', weeklyDownloads: 15000000 },
  { name: 'cors', weeklyDownloads: 10000000 },
  { name: 'body-parser', weeklyDownloads: 20000000 },
  
  // Database
  { name: 'mongoose', weeklyDownloads: 3000000 },
  { name: 'mysql', weeklyDownloads: 1500000 },
  { name: 'mysql2', weeklyDownloads: 3000000 },
  { name: 'pg', weeklyDownloads: 3000000 },
  { name: 'redis', weeklyDownloads: 2000000 },
  { name: 'sequelize', weeklyDownloads: 1500000 },
  { name: 'prisma', weeklyDownloads: 2000000 },
  { name: 'typeorm', weeklyDownloads: 1000000 },
  { name: 'knex', weeklyDownloads: 1500000 },
  
  // Authentication/Security
  { name: 'jsonwebtoken', weeklyDownloads: 15000000 },
  { name: 'bcrypt', weeklyDownloads: 3000000 },
  { name: 'bcryptjs', weeklyDownloads: 4000000 },
  { name: 'passport', weeklyDownloads: 2000000 },
  { name: 'helmet', weeklyDownloads: 2000000 },
  { name: 'crypto-js', weeklyDownloads: 5000000 },
  
  // File handling
  { name: 'fs-extra', weeklyDownloads: 35000000 },
  { name: 'rimraf', weeklyDownloads: 40000000 },
  { name: 'mkdirp', weeklyDownloads: 45000000 },
  { name: 'chokidar', weeklyDownloads: 30000000 },
  { name: 'multer', weeklyDownloads: 3000000 },
  { name: 'formidable', weeklyDownloads: 5000000 },
  
  // CLI
  { name: 'yargs', weeklyDownloads: 40000000 },
  { name: 'inquirer', weeklyDownloads: 20000000 },
  { name: 'ora', weeklyDownloads: 15000000 },
  { name: 'cli-table', weeklyDownloads: 10000000 },
  { name: 'boxen', weeklyDownloads: 10000000 },
  
  // Parsing
  { name: 'cheerio', weeklyDownloads: 8000000 },
  { name: 'jsdom', weeklyDownloads: 15000000 },
  { name: 'marked', weeklyDownloads: 8000000 },
  { name: 'yaml', weeklyDownloads: 25000000 },
  { name: 'xml2js', weeklyDownloads: 15000000 },
  { name: 'csv-parser', weeklyDownloads: 2000000 },
  
  // Logging
  { name: 'winston', weeklyDownloads: 10000000 },
  { name: 'pino', weeklyDownloads: 8000000 },
  { name: 'bunyan', weeklyDownloads: 2000000 },
  { name: 'morgan', weeklyDownloads: 5000000 },
  { name: 'log4js', weeklyDownloads: 3000000 },
  
  // Date/Time
  { name: 'dayjs', weeklyDownloads: 15000000 },
  { name: 'date-fns', weeklyDownloads: 20000000 },
  { name: 'luxon', weeklyDownloads: 5000000 },
  
  // Validation
  { name: 'joi', weeklyDownloads: 8000000 },
  { name: 'yup', weeklyDownloads: 6000000 },
  { name: 'zod', weeklyDownloads: 10000000 },
  { name: 'validator', weeklyDownloads: 10000000 },
  { name: 'ajv', weeklyDownloads: 50000000 },
  
  // State management
  { name: 'zustand', weeklyDownloads: 3000000 },
  { name: 'mobx', weeklyDownloads: 1500000 },
  { name: 'recoil', weeklyDownloads: 500000 },
  { name: 'jotai', weeklyDownloads: 1000000 },
  
  // GraphQL
  { name: 'graphql', weeklyDownloads: 10000000 },
  { name: 'apollo-server', weeklyDownloads: 1500000 },
  { name: '@apollo/client', weeklyDownloads: 2000000 },
  
  // WebSocket
  { name: 'socket.io', weeklyDownloads: 5000000 },
  { name: 'ws', weeklyDownloads: 35000000 },
  
  // Process management
  { name: 'pm2', weeklyDownloads: 2000000 },
  { name: 'nodemon', weeklyDownloads: 8000000 },
  { name: 'concurrently', weeklyDownloads: 5000000 },
  { name: 'cross-env', weeklyDownloads: 15000000 },
  { name: 'dotenv', weeklyDownloads: 30000000 },
  
  // Templating
  { name: 'ejs', weeklyDownloads: 10000000 },
  { name: 'handlebars', weeklyDownloads: 15000000 },
  { name: 'pug', weeklyDownloads: 5000000 },
  { name: 'mustache', weeklyDownloads: 5000000 },
  
  // Image processing
  { name: 'sharp', weeklyDownloads: 5000000 },
  { name: 'jimp', weeklyDownloads: 2000000 },
  
  // PDF
  { name: 'pdfkit', weeklyDownloads: 1500000 },
  { name: 'pdf-lib', weeklyDownloads: 1500000 },
  
  // Async utilities
  { name: 'async', weeklyDownloads: 40000000 },
  { name: 'bluebird', weeklyDownloads: 15000000 },
  { name: 'p-limit', weeklyDownloads: 30000000 },
  { name: 'p-map', weeklyDownloads: 15000000 },
  
  // Other utilities
  { name: 'underscore', weeklyDownloads: 10000000 },
  { name: 'ramda', weeklyDownloads: 5000000 },
  { name: 'rxjs', weeklyDownloads: 25000000 },
  { name: 'immutable', weeklyDownloads: 8000000 },
  { name: 'immer', weeklyDownloads: 10000000 },
  { name: 'nanoid', weeklyDownloads: 25000000 },
  { name: 'shortid', weeklyDownloads: 5000000 },
  { name: 'classnames', weeklyDownloads: 15000000 },
  { name: 'clsx', weeklyDownloads: 10000000 },
];

/**
 * Get all popular package names as a Set for fast lookup
 */
export function getPopularPackageNames(ecosystem: 'npm' | 'pypi' = 'npm'): Set<string> {
  if (ecosystem === 'npm') {
    return new Set(NPM_POPULAR_PACKAGES.map(p => p.name));
  }
  // TODO: Add PyPI popular packages
  return new Set();
}

/**
 * Get package info if it's a popular package
 */
export function getPopularPackageInfo(name: string, ecosystem: 'npm' | 'pypi' = 'npm'): PopularPackage | null {
  if (ecosystem === 'npm') {
    return NPM_POPULAR_PACKAGES.find(p => p.name === name) || null;
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
  return [];
}
