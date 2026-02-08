/**
 * Extended false positive testing for typosquat detection
 * Tests real npm/PyPI packages that should NOT be flagged
 */
import { describe, test, expect } from '@jest/globals';
import { checkTyposquat, TyposquatMatch } from '../../src/typosquat/detector.js';

const EXTENDED_REAL_PACKAGES = [
  // Testing frameworks
  'mocha', 'chai', 'sinon', 'ava', 'nyc', 'c8', 'supertest', 'nock',
  'cypress', 'playwright', 'puppeteer', 'msw', 'faker', 'chance',
  // HTTP/networking  
  'node-fetch', 'superagent', 'bent', 'phin', 'needle', 'wreck',
  // CLI tools
  'inquirer', 'prompts', 'meow', 'clipboardy', 'execa', 'zx',
  'listr', 'consola', 'signale',
  // Parsing
  'csv-parser', 'papaparse', 'xml2js', 'fast-xml-parser', 'yaml', 'toml',
  'marked', 'remark', 'rehype', 'unified',
  // Monorepo
  'lerna', 'changesets', 'syncpack',
  // Serverless
  'serverless', 'middy',
  // Auth/security
  'jsonwebtoken', 'bcrypt', 'helmet', 'cors', 'hpp',
  // Queue
  'bull', 'bee-queue', 'agenda', 'eventemitter3', 'mitt',
  // Config
  'convict', 'nconf', 'rc', 'cosmiconfig',
  // Logging
  'morgan', 'bunyan', 'log4js', 'loglevel',
  // Dates
  'date-fns', 'chrono-node',
  // File/glob
  'chokidar', 'micromatch', 'picomatch', 'fast-glob',
  'find-up', 'resolve', 'resolve-from',
  // Streams/process
  'pump', 'concat-stream', 'get-stream', 'cross-env', 'cross-spawn',
  // Template engines
  'handlebars', 'mustache', 'nunjucks', 'ejs', 'eta',
  // Validation libs
  'superstruct', 'io-ts', 'runtypes', 'valibot', 'typebox',
  // Functional
  'ramda', 'immer', 'immutable',
  // Reactive
  'rxjs', 'highland', 'most',
  // Classname utils
  'classnames', 'clsx',
  // Size/format utils
  'ms', 'bytes', 'pretty-bytes', 'filesize',
  // Promise helpers
  'p-limit', 'p-queue', 'p-retry', 'p-map', 'p-all',
  // CLI display
  'cli-spinners', 'log-update', 'figures', 'boxen',
  // Colors
  'ansi-colors', 'kleur', 'colorette', 'picocolors',
  // Misc
  'open', 'conf', 'configstore', 'lowdb',
  'got', 'ofetch', 'redaxios',
  // Image
  'jimp', 'pdfkit', 'docx', 'pixelmatch',
];

describe('Extended typosquat false positive testing', () => {
  const failures: string[] = [];

  test.each(EXTENDED_REAL_PACKAGES)(
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
