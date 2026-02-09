/**
 * Extended false positive testing for typosquat detection
 * Tests real npm/PyPI packages that should NOT be flagged
 */

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
  // Webpack loaders (all legitimate, prevent cross-loader FP)
  'ts-loader', 'style-loader', 'file-loader', 'url-loader',
  'babel-loader', 'raw-loader', 'sass-loader', 'less-loader',
  'postcss-loader', 'html-loader', 'csv-loader', 'json-loader',
  'source-map-loader', 'esbuild-loader', 'swc-loader',
  'thread-loader', 'cache-loader', 'vue-loader', 'svg-loader',
  // Build/bundler ecosystem
  'vite-plugin-pwa', 'vite-tsconfig-paths',
  'rollup-plugin-dts', 'rollup-plugin-terser',
  'esbuild-register', 'terser-webpack-plugin',
  // Matching/glob variants
  'minimatch', 'anymatch', 'multimatch',
  // Small utility packages
  'defu', 'ohash', 'kleur', 'kolorist', 'ansis',
  'depd', 'negotiator', 'finalhandler', 'cacache',
  'undici', 'undici-types', 'tinypool', 'tinybench', 'tinyspy',
  'formidable', 'busboy', 'multer',
  'form-data', 'body-parser', 'cookie-parser',
  'signal-exit', 'exit-hook',
  'ts-node-dev', 'ts-patch',
  'node-cron', 'node-schedule',
  'fast-json-stringify', 'fast-deep-equal', 'fast-diff',
  'simple-git', 'simple-peer',
  'http-proxy', 'http-errors', 'http-assert',
  'string-width', 'string-length', 'string-argv',
  'wrap-ansi', 'strip-ansi', 'slice-ansi',
  'crypto-js', 'crypto-random-string',
  'npm-run-all', 'npm-check-updates',
  'lint-staged', 'pretty-quick',
  'quick-lru', 'tiny-lru',
  'winston-daily-rotate-file',
];

const PYPI_REAL_PACKAGES = [
  'requests-oauthlib', 'requests-toolbelt',
  'django-rest-framework', 'django-cors-headers',
  'flask-cors', 'flask-login', 'flask-wtf',
  'numpy-financial', 'pandas-datareader',
  'pytest-cov', 'pytest-mock', 'pytest-xdist',
  'black', 'isort', 'ruff', 'mypy', 'pyright',
  'celery', 'dramatiq', 'huey',
  'boto3-stubs', 'botocore-stubs',
  'pydantic-settings', 'pydantic-extra-types',
  'sqlalchemy-utils', 'alembic',
  'httpx', 'httptools', 'aiohttp', 'uvicorn', 'gunicorn',
  'scrapy', 'beautifulsoup4', 'lxml', 'parsel',
  'pillow', 'opencv-python-headless',
  'scikit-learn', 'scikit-image',
  'tensorflow-io', 'tensorflow-hub',
  'torchvision', 'torchaudio',
  'fastapi-users', 'fastapi-mail',
  'typer-cli', 'click-completion',
  'rich-click', 'textual-dev',
];

// Packages that were previously FPs (regression guard)
const EXTENDED_REAL_PACKAGES_REGRESSION = [
  'openai', 'effector', 'socket', 'turso', 'typedi',
  'astro', 'remix', 'nuxt', 'qwik', 'fresh',
  'drizzle-orm', 'kysely', 'mikro-orm', 'trpc', 'hono', 'elysia',
  'jose', 'paseto', 'lucia', 'argon2', 'tweetnacl',
  'anthropic', 'langchain', 'llamaindex', 'transformers',
  'zustand', 'jotai', 'nanostores', 'xstate', 'legend-state',
  'pino', 'bunyan', 'consola', 'signale',
  'defu', 'destr', 'ofetch', 'unenv', 'unstorage',
  'hookable', 'unimport', 'unplugin', 'mlly', 'jiti',
  'citty', 'giget', 'nypm', 'pathe',
  'turso', 'planetscale', 'upstash', 'convex', 'neon',
  'effect', 'fp-ts', 'ramda', 'sanctuary',
  'bull', 'bullmq', 'agenda', 'bree',
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

  test.each(EXTENDED_REAL_PACKAGES_REGRESSION)(
    'Regression: %s should not be flagged (any risk)',
    (pkg) => {
      const matches = checkTyposquat(pkg, { threshold: 0.75, includePatternMatches: true });
      if (matches.length > 0) {
        const details = matches.map((m: TyposquatMatch) =>
          `${m.target} (${(m.similarity * 100).toFixed(1)}%, ${m.risk})`
        ).join(', ');
        expect(`False positive: ${pkg} flagged as similar to ${details}`).toBe('');
      }
    }
  );

  test.each(PYPI_REAL_PACKAGES)(
    'PyPI: %s should not be flagged as MEDIUM+ typosquat risk',
    (pkg) => {
      const matches = checkTyposquat(pkg, { threshold: 0.75, ecosystem: 'pypi' });
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
