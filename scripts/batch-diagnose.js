#!/usr/bin/env node
/**
 * RepVet Batch Diagnosis Script
 * 30分おきにOSSパッケージをバッチ診断して結果を保存・コミットする
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Gitコミットを実行
async function commitResults(batchNumber) {
  try {
    // Git設定確認
    try {
      execSync('git config user.email', { cwd: ROOT_DIR, stdio: 'pipe' });
    } catch {
      execSync('git config user.email "moltbot@3-shake.com"', { cwd: ROOT_DIR });
      execSync('git config user.name "MoltBot"', { cwd: ROOT_DIR });
    }
    
    // 変更があるか確認
    const status = execSync('git status --porcelain batch-results/', { 
      cwd: ROOT_DIR, 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    if (!status.trim()) {
      log('  ℹ️ No changes to commit');
      return;
    }
    
    // コミット
    execSync('git add batch-results/', { cwd: ROOT_DIR });
    execSync(`git commit -m "batch: OSS診断結果追加 (Batch #${batchNumber})"`, { cwd: ROOT_DIR });
    
    // プッシュ（認証があれば）
    try {
      execSync('git push origin HEAD:batch/diagnosis-results', { 
        cwd: ROOT_DIR,
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      log('  ✅ Committed and pushed to GitHub');
    } catch (pushErr) {
      log(`  ⚠️ Committed locally but push failed: ${pushErr.message}`);
    }
  } catch (err) {
    log(`  ⚠️ Git commit failed: ${err.message}`);
  }
}

// サマリーCSVを更新
function updateSummaryCsv(state) {
  const csvPath = join(RESULTS_DIR, 'summary.csv');
  const headers = ['package', 'ecosystem', 'score', 'riskLevel', 'maintainers', 'lastCommitDate', 'hasMalwareHistory', 'isArchived', 'diagnosedAt'];
  
  const rows = state.results.map(r => [
    r.package,
    r.ecosystem,
    r.score,
    r.riskLevel,
    (r.maintainers || []).join(';'),
    r.lastCommitDate || '',
    r.hasMalwareHistory ? 'yes' : 'no',
    r.isArchived ? 'yes' : 'no',
    r.diagnosedAt
  ].map(v => `"${String(v).replace(/"/g, '""')}"`));
  
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  writeFileSync(csvPath, csv);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const RESULTS_DIR = join(ROOT_DIR, 'batch-results');
const STATE_FILE = join(RESULTS_DIR, 'state.json');
const LOG_FILE = join(RESULTS_DIR, 'batch.log');

// 診断対象パッケージリスト
const PACKAGES = {
  npm: [
    'lodash', 'express', 'axios', 'react', 'vue', 'typescript', 'webpack', 'eslint', 'jest', 'mocha',
    'chalk', 'commander', 'rimraf', 'glob', 'semver', 'debug', 'uuid', 'moment', 'date-fns', 'dayjs',
    'next', 'nuxt', 'gatsby', 'svelte', 'angular', 'ember-cli', 'backbone', 'underscore', 'jquery', 'bootstrap',
    'tailwindcss', 'postcss', 'sass', 'less', 'stylus', 'babel-core', '@babel/core', 'esbuild', 'rollup', 'parcel',
    'vite', 'astro', 'remix', 'blitz', 'redwood', 'feathers', 'hapi', 'koa', 'fastify', 'nestjs',
    'prisma', 'sequelize', 'mongoose', 'typeorm', 'knex', 'objection', 'waterline', 'bookshelf', 'shelf',
    'graphql', 'apollo-server', 'urql', 'relay', 'strapi', 'directus', 'payload', 'keystone', 'ghost',
    'electron', 'tauri', 'nw', 'ionic', 'cordova', 'phonegap', 'capacitor', 'expo', 'react-native', 'flutter',
    'playwright', 'puppeteer', 'selenium-webdriver', 'cypress', 'webdriverio', 'testcafe', 'nightwatch', 'codeceptjs',
    'pm2', 'forever', 'nodemon', 'ts-node', 'tsx', 'esbuild-register', 'swc', '@swc/core', 'bun', 'deno',
    'prettier', 'eslint-config-airbnb', 'eslint-config-standard', 'stylelint', 'commitlint', 'husky', 'lint-staged',
    'conventional-changelog', 'semantic-release', 'standard-version', 'release-it', 'changesets',
    'storybook', '@storybook/react', 'chromatic', 'loki', 'percy', 'backstopjs', 'pa11y', 'axe-core',
    'sentry', '@sentry/node', 'logrocket', 'datadog', 'newrelic', 'appdynamics', 'dynatrace',
    'stripe', '@stripe/stripe-js', 'paypal-rest-sdk', 'braintree', 'square', 'adyen', 'checkout-sdk-node',
    'aws-sdk', '@aws-sdk/client-s3', 'azure-storage', '@google-cloud/storage', 'firebase-admin', 'supabase',
    'redis', 'ioredis', 'mongodb', 'mongoose', 'mysql2', 'pg', 'sqlite3', '@libsql/client', 'drizzle-orm',
    'bull', 'bullmq', 'bee-queue', 'agenda', 'node-cron', 'node-schedule', 'bree', 'toad-scheduler',
    'nodemailer', 'sendgrid', '@sendgrid/mail', 'mailgun-js', 'postmark', 'resend', 'aws-ses',
    'sharp', 'jimp', 'canvas', 'puppeteer-core', 'playwright-core', 'ffmpeg-static', 'fluent-ffmpeg',
    'socket.io', 'ws', 'sockjs', 'faye-websocket', 'uws', 'websocket', 'ws-wrapper',
    'passport', '@auth/core', 'next-auth', 'lucia', 'auth0', 'clerk', 'firebase-auth', 'aws-cognito',
    'zod', 'yup', 'joi', 'ajv', 'class-validator', 'io-ts', 'runtypes', 'superstruct', 'valibot',
    'winston', 'pino', 'bunyan', 'log4js', 'consola', 'signale', 'figlet', 'ora', 'listr2', 'ink',
    'inquirer', 'enquirer', 'prompts', '@clack/prompts', 'readline', 'blessed', 'blessed-contrib',
    'node-fetch', 'undici', 'got', 'axios', 'superagent', 'request', 'needle', 'phin', 'ky',
    'cheerio', 'jsdom', 'puppeteer', 'playwright', 'linkedom', 'happy-dom', 'parse5', 'htmlparser2',
    'marked', 'markdown-it', 'remark', 'rehype', 'mdx', 'unified', 'hast', 'xast', 'nlcst',
    'bcrypt', 'argon2', 'scrypt', 'pbkdf2', 'crypto-js', 'tweetnacl', 'libsodium-wrappers',
    'jsonwebtoken', 'jose', 'paseto', 'njwt', 'atob', 'btoa', 'base64-js', 'buffer',
    'compression', 'helmet', 'cors', 'csrf', 'hpp', 'rate-limiter-flexible', 'express-rate-limit',
    'validator', 'sanitizer', 'xss', 'dompurify', 'isomorphic-dompurify', 'sanitize-html',
    'multer', 'formidable', 'busboy', 'express-fileupload', 'file-type', 'mime', 'mime-types',
    'csv-parser', 'csv-write-stream', 'fast-csv', 'papaparse', 'xlsx', 'exceljs', 'sheetjs',
    'pdfkit', 'puppeteer-pdf', 'playwright-pdf', 'wkhtmltopdf', 'weasyprint', 'gotenberg-js-client',
    'qrcode', 'node-qrcode', 'qr-image', 'bwip-js', 'jsbarcode', 'barcode',
    'q', 'bluebird', 'when', 'rsvp', 'whenjs', 'promise', 'es6-promise', 'native-promise-only',
    'rxjs', 'zen-observable', 'most', 'xstream', 'baconjs', 'kefir', 'highland',
    'immutable', 'mori', 'seamless-immutable', 'immutability-helper', 'updeep', 'icepick',
    'ramda', 'lodash-es', 'underscore', 'lazy.js', 'collect.js', 'immutable-ext',
    'moment-timezone', 'luxon', 'date-fns-tz', 'dayjs-plugin-utc', 'spacetime', 'timezone-support',
    'numeral', 'accounting', 'dinero.js', 'currency.js', 'money-math', 'bignumber.js', 'decimal.js',
    'mathjs', 'numbers', 'complex.js', 'fraction.js', 'polynomial.js', 'simple-statistics', 'ml-matrix',
    'natural', 'compromise', 'nlp.js', 'retext', 'franc', 'cld', 'tinyld', 'langdetect',
    'sentiment', 'afinn-165', 'vader-sentiment', 'sentiment-multilang', 'emoji-sentiment',
    'fuse.js', 'flexsearch', 'minisearch', 'lunr', 'elasticlunr', 'search-index', 'ndx',
    'diff', 'fast-diff', 'jsdiff', 'deep-diff', 'deep-object-diff', 'just-diff', 'microdiff',
    'clone', 'clone-deep', 'rfdc', 'fast-copy', 'fast-clone', 'deep-copy', 'structured-clone',
    'merge', 'deepmerge', 'lodash.merge', 'merge-deep', 'assign-deep', 'mixin-deep',
    'traverse', 'estree-walker', 'ast-types', 'recast', 'esprima', 'espree', 'acorn', 'meriyah',
    'escodegen', 'esgenerate', 'prettier', 'recast', 'astring', 'js-beautify', 'uglify-js',
    'terser', 'esbuild', 'swc', '@swc/core', 'babel-core', '@babel/core', '@babel/generator',
    'eslint', 'tslint', 'jshint', 'jscs', 'jslint', 'standard', 'semistandard', 'xo',
    'mocha', 'jest', 'jasmine', 'karma', 'ava', 'tap', 'tape', 'node:test', 'vitest', 'playwright-test',
    'cypress', 'wdio', 'nightwatch', 'testcafe', 'codeceptjs', 'detox', 'appium',
    'nyc', 'c8', 'istanbul', 'codecov', 'coveralls', 'sonarqube-scanner', 'codeclimate-test-reporter',
    'husky', 'lint-staged', 'commitizen', 'commitlint', 'standard-version', 'semantic-release',
    'conventional-changelog', 'conventional-commits-parser', 'parse-commit-message',
    'plop', 'hygen', 'yeoman-generator', 'scaffold', 'cookiecutter', 'copier',
    'nx', '@nrwl/cli', 'turborepo', 'lerna', 'rush', 'pnpm-workspace', 'yarn-workspaces',
    'changesets', '@changesets/cli', 'beachball', 'semantic-release-monorepo', 'multi-semantic-release',
    'typedoc', 'jsdoc', 'documentation', 'esdoc', 'docusaurus', 'vuepress', 'docsify', 'gitbook',
    'webpack', 'rollup', 'parcel', 'esbuild', 'vite', 'rspack', 'farm', 'wmr', 'snowpack',
    'babel-loader', 'ts-loader', 'esbuild-loader', 'swc-loader', 'sass-loader', 'css-loader', 'style-loader',
    'html-webpack-plugin', 'mini-css-extract-plugin', 'terser-webpack-plugin', 'copy-webpack-plugin',
    'dotenv', 'dotenv-expand', 'env-cmd', 'cross-env', 'config', 'convict', 'nconf', 'rc',
    'yargs', 'minimist', 'arg', 'meow', 'cac', 'commander', 'clipanion', 'oclif',
    'chokidar', 'watchpack', 'sane', 'node-watch', 'gaze', 'watchr', 'watch',
    'glob', 'globby', 'fast-glob', 'tiny-glob', 'glob-stream', 'matched', 'multimatch',
    'rimraf', 'del', 'trash', 'make-dir', 'mkdirp', 'fs-extra', 'graceful-fs', 'cpx',
    'ncp', 'cpy', 'cpy-cli', 'copyfiles', 'copy-concurrently', 'move-concurrently',
    'temp', 'tmp', 'tempfile', 'temp-dir', 'os-tmpdir', 'unique-temp-dir', 'tempy',
    'which', 'cross-spawn', 'execa', 'child-process-promise', 'promisify-child-process',
    'ps-list', 'process-exists', 'fkill', 'pidtree', 'pidusage', 'systeminformation',
    'os-name', 'getos', 'platform', 'detect-libc', 'is-docker', 'is-wsl', 'is-ci',
    'ci-info', 'env-ci', 'ci-parallel-vars', 'buildkite', 'travis-ci', 'circleci',
    'strip-ansi', 'ansi-regex', 'chalk', 'kleur', 'colorette', 'picocolors', 'ansi-colors',
    'boxen', 'cli-boxes', 'terminal-link', 'hyperlinker', 'supports-hyperlinks',
    'wrap-ansi', 'slice-ansi', 'string-width', 'strip-ansi', 'ansi-align', 'center-align',
    'progress', 'cli-progress', 'progress-estimator', 'gauge', 'are-we-there-yet',
    'table', 'cli-table3', 'cli-table', 'tty-table', 'markdown-table', 'text-table',
    'tree-node-cli', 'archy', 'treeify', 'dree', 'directory-tree', 'folder-hash',
    'isomorphic-git', 'simple-git', 'nodegit', 'git-utils', 'gits', 'git-js', 'git-promise',
    'github-api', '@octokit/rest', '@octokit/graphql', '@octokit/auth-token', 'gh-got',
    'gitlab', '@gitbeaker/node', 'bitbucket', 'azure-devops-node-api',
    'aws-sdk', '@aws-sdk/client-s3', '@aws-sdk/client-lambda', '@aws-sdk/client-ec2',
    '@azure/storage-blob', '@azure/arm-resources', '@google-cloud/storage', 'firebase-admin',
    'stripe', '@stripe/stripe-js', 'paypal-rest-sdk', 'braintree', 'square', 'adyen',
    'twilio', '@sendgrid/mail', 'mailgun-js', 'postmark', 'resend', 'aws-ses', 'nodemailer',
    'algoliasearch', 'meilisearch', 'typesense', 'elasticsearch', '@elastic/elasticsearch',
    'redis', 'ioredis', 'keydb', 'dragonfly', 'valkey', 'mongodb', 'mongoose', 'prisma',
    'mysql2', 'pg', 'postgres', 'sqlite3', 'better-sqlite3', '@libsql/client', 'drizzle-orm',
    'typeorm', 'sequelize', 'bookshelf', 'knex', 'objection', 'waterline', 'orm',
    'bull', 'bullmq', 'bee-queue', 'agenda', 'node-cron', 'node-schedule', 'bree',
    'socket.io', 'ws', 'sockjs', 'faye-websocket', 'uws', 'websocket', 'ws-wrapper',
    'passport', '@auth/core', 'next-auth', 'lucia', 'auth0', 'clerk', 'firebase-auth',
    'zod', 'yup', 'joi', 'ajv', 'class-validator', 'io-ts', 'runtypes', 'superstruct',
    'winston', 'pino', 'bunyan', 'log4js', 'consola', 'signale', 'debug', 'npmlog',
    'sharp', 'jimp', 'canvas', 'skia-canvas', 'node-canvas', 'pureimage', 'imagescript',
    'cheerio', 'jsdom', 'linkedom', 'happy-dom', 'parse5', 'htmlparser2', 'node-html-parser',
    'marked', 'markdown-it', 'remark', 'rehype', 'mdx', 'unified', 'hast', 'micromark',
    'bcrypt', 'argon2', 'scrypt', 'pbkdf2', 'crypto-js', 'tweetnacl', 'libsodium-wrappers',
    'jsonwebtoken', 'jose', 'paseto', 'atob', 'btoa', 'base64-js', 'buffer',
    'helmet', 'cors', 'csrf', 'hpp', 'rate-limiter-flexible', 'express-rate-limit',
    'validator', 'xss', 'dompurify', 'isomorphic-dompurify', 'sanitize-html', 'insane',
    'multer', 'formidable', 'busboy', 'express-fileupload', 'file-type', 'mime', 'magic-bytes',
    'csv-parser', 'fast-csv', 'papaparse', 'xlsx', 'exceljs', 'sheetjs', 'csv-write-stream',
    'pdfkit', 'puppeteer-pdf', 'playwright-pdf', 'wkhtmltopdf', 'weasyprint', 'pagedjs',
    'qrcode', 'node-qrcode', 'qr-image', 'bwip-js', 'jsbarcode', 'barcode', 'bwip-js',
    'q', 'bluebird', 'when', 'rsvp', 'es6-promise', 'native-promise-only', 'promise-polyfill',
    'rxjs', 'zen-observable', 'most', 'xstream', 'baconjs', 'kefir', 'highland', 'callbag',
    'immutable', 'mori', 'seamless-immutable', 'immutability-helper', 'updeep', 'icepick',
    'ramda', 'lodash-es', 'underscore', 'lazy.js', 'collect.js', 'immutable-ext', 'immutable-assign',
    'moment', 'moment-timezone', 'luxon', 'date-fns', 'dayjs', 'spacetime', 'timezone-support',
    'numeral', 'accounting', 'dinero.js', 'currency.js', 'money-math', 'bignumber.js', 'decimal.js-light',
    'mathjs', 'numbers', 'complex.js', 'fraction.js', 'simple-statistics', 'ml-matrix', 'vectorious',
    'natural', 'compromise', 'nlp.js', 'retext', 'franc', 'cld', 'tinyld', 'langdetect', 'fasttext',
    'fuse.js', 'flexsearch', 'minisearch', 'lunr', 'elasticlunr', 'search-index', 'ndx', 'orama',
    'diff', 'fast-diff', 'jsdiff', 'deep-diff', 'deep-object-diff', 'just-diff', 'microdiff', 'rfc6902',
    'clone', 'clone-deep', 'rfdc', 'fast-copy', 'fast-clone', 'deep-copy', 'structured-clone', 'klona',
    'merge', 'deepmerge', 'lodash.merge', 'merge-deep', 'assign-deep', 'mixin-deep', 'defaults-deep',
    'traverse', 'estree-walker', 'ast-types', 'recast', 'esprima', 'espree', 'acorn', 'meriyah', 'oxc-parser',
    'escodegen', 'esgenerate', 'prettier', 'astring', 'js-beautify', 'uglify-js', 'terser', 'swc',
    'eslint', 'tslint', 'jshint', 'jscs', 'jslint', 'standard', 'xo', 'biome', 'oxlint', 'quick-lint-js',
  ],
  pypi: [
    'requests', 'urllib3', 'httpx', 'aiohttp', 'httplib2', 'treq', 'pycurl', 'httpie',
    'flask', 'django', 'fastapi', 'tornado', 'sanic', 'quart', 'falcon', 'bottle', 'pyramid',
    'sqlalchemy', 'django-orm', 'peewee', 'tortoise-orm', 'ormar', 'prisma-client-py',
    'psycopg2', 'psycopg', 'pymongo', 'redis', 'pymysql', 'sqlite3', 'asyncpg', 'aioredis',
    'numpy', 'pandas', 'scipy', 'scikit-learn', 'matplotlib', 'seaborn', 'plotly', 'bokeh',
    'tensorflow', 'torch', 'keras', 'jax', 'transformers', 'diffusers', 'accelerate',
    'pillow', 'opencv-python', 'scikit-image', 'imageio', 'pydicom', 'simpleitk',
    'pytest', 'unittest2', 'nose', 'hypothesis', 'tox', 'nox', 'coverage', 'codecov',
    'black', 'isort', 'autopep8', 'yapf', 'ruff', 'flake8', 'pylint', 'mypy', 'pyright',
    'sphinx', 'mkdocs', 'pdoc', 'pydoc-markdown', 'readme-renderer', 'twine', 'wheel',
    'setuptools', 'poetry', 'pipenv', 'hatch', 'pdm', 'flit', 'build', 'installer',
    'click', 'typer', 'argparse', 'docopt', 'fire', 'plac', 'cliff', 'cmd2',
    'rich', 'colorama', 'termcolor', 'blessed', 'urwid', 'prompt-toolkit', 'questionary',
    'tqdm', 'alive-progress', 'progress', 'halo', 'yaspin', 'click-spinner',
    'pydantic', 'attrs', 'dataclasses', 'marshmallow', 'cerberus', 'voluptuous', 'schematics',
    'jinja2', 'mako', 'chameleon', 'django-template', 'templite', 'stringtemplate3',
    'pyyaml', 'toml', 'tomli', 'tomli-w', 'configparser', 'python-dotenv', 'dynaconf',
    'jsonschema', 'orjson', 'ujson', 'rapidjson', 'simdjson', 'msgspec', 'cbor2',
    'cryptography', 'pycryptodome', 'pynacl', 'bcrypt', 'argon2-cffi', 'hashlib', 'hmac',
    'pyjwt', 'authlib', 'python-jose', 'jose', 'itsdangerous', 'passlib', 'oauthlib',
    'boto3', 'botocore', 'azure-storage', 'google-cloud-storage', 'firebase-admin', 'supabase-py',
    'celery', 'rq', 'dramatiq', 'huey', 'procrastinate', 'celery-redbeat', 'flower',
    'scrapy', 'beautifulsoup4', 'lxml', 'html5lib', 'pyquery', 'mechanize', 'requests-html',
    'selenium', 'playwright', 'puppeteer', 'splinter', ' mechanicalsoup', 'robobrowser',
    'paramiko', 'fabric', 'ansible', 'salt', 'puppet', 'chef', 'vagrant-python',
    'docker', 'docker-compose', 'podman', 'kubernetes', 'helm', 'skaffold', 'tilt',
    'gitpython', 'pygit2', 'dulwich', 'gitdb', 'smmap', 'git-url-parse',
    'sentry-sdk', 'loguru', 'structlog', 'python-json-logger', 'graypy', 'raven',
    'stripe', 'paypalrestsdk', 'braintree', 'squareup', 'adyen', 'checkout-sdk',
    'twilio', 'sendgrid', 'mailgun', 'postmark', 'resend', 'yagmail', 'emails',
    'slack-sdk', 'discord-py', 'python-telegram-bot', 'pywhatkit', 'fbchat', 'tweepy',
    'pandas', 'polars', 'dask', 'modin', 'vaex', 'datatable', 'pyarrow', 'fastparquet',
    'numpy', 'scipy', 'xarray', 'netcdf4', 'h5py', 'zarr', 'dask-array', 'cupy',
    'matplotlib', 'seaborn', 'plotly', 'bokeh', 'altair', 'holoviews', 'panel', 'dash',
    'scikit-learn', 'xgboost', 'lightgbm', 'catboost', 'optuna', 'hyperopt', 'ray',
    'tensorflow', 'torch', 'jax', 'mxnet', 'chainer', 'paddlepaddle', 'onnxruntime',
    'transformers', 'diffusers', 'accelerate', 'datasets', 'tokenizers', 'peft', 'trl',
    'spacy', 'nltk', 'gensim', 'textblob', 'polyglot', 'stanza', ' flair', 'allennlp',
    'opencv-python', 'pillow', 'scikit-image', 'imageio', 'pydicom', 'simpleitk', 'nibabel',
    'networkx', 'igraph', 'graph-tool', 'pygraphistry', 'snap', 'karateclub', 'node2vec',
    'pymc', 'pystan', 'emcee', 'arviz', 'corner', 'bilby', 'dynesty', 'zeus',
    'astropy', 'sunpy', 'spacepy', 'poliastro', 'orekit', 'skyfield', 'jplephem',
    'biopython', 'scikit-bio', 'pysam', 'pydna', 'cobrapy', 'tellurium', 'libroadrunner',
    'qiskit', 'cirq', 'pennylane', 'pyquil', 'amazon-braket-sdk', 'projectq', 'qutip',
    'pycuda', 'pyopencl', 'numba', 'cython', 'nuitka', 'mypyc', 'transonic', 'pythran',
    'mpi4py', 'dask-mpi', 'ipyparallel', 'ray', 'parsl', 'pycompss', 'unidist',
    'zmq', 'pyzmq', 'pika', 'kafka-python', 'confluent-kafka', 'aiokafka', 'redis-py',
    'websockets', 'socketio', 'aiohttp-sse', 'flask-sse', 'django-sse', 'server-sent-events',
    'grpcio', 'protobuf', 'thrift', 'avro', 'msgpack', 'capnproto', 'flatbuffers',
    'pydantic', 'dataclasses-json', 'marshmallow', 'cattrs', 'apischema', 'pyserde',
    'sqlalchemy', 'alembic', 'django-migrations', 'peewee-migrate', 'yoyo-migrations',
    'pytest', 'unittest', 'nose', 'hypothesis', 'tox', 'nox', 'coverage', 'pytest-cov',
    'mypy', 'pyright', 'pylint', 'flake8', 'black', 'isort', 'ruff', 'bandit', 'safety',
    'sphinx', 'mkdocs', 'pdoc', 'pydoc-markdown', 'readme-renderer', 'twine', 'wheel',
    'setuptools', 'poetry', 'pipenv', 'hatch', 'pdm', 'flit', 'build', 'installer',
    'pip', 'pip-tools', 'pipx', 'pipenv', 'conda', 'mamba', 'micromamba', 'pixi',
  ],
  crates: [
    'serde', 'tokio', 'async-trait', 'futures', 'hyper', 'reqwest', 'axum', 'actix-web',
    'rocket', 'tide', 'warp', 'gotham', 'nickel', 'iron', 'rouille', 'thruster',
    'diesel', 'sqlx', 'sea-orm', 'tokio-postgres', 'rusqlite', 'mongodb', 'redis',
    'chrono', 'time', 'humantime', 'dateparser', 'iso8601', 'rfc3339',
    'clap', 'structopt', 'argh', 'pico-args', 'lexopt', 'gumdrop', 'abscissa',
    'anyhow', 'thiserror', 'eyre', 'color-eyre', 'snafu', 'failure', 'error-chain',
    'log', 'env_logger', 'tracing', 'tracing-subscriber', 'slog', 'fern', 'flexi_logger',
    'rand', 'getrandom', 'rand_core', 'rand_chacha', 'rand_pcg', 'rand_distr',
    'regex', 'fancy-regex', 'onig', 'pcre2', 'aho-corasick', 'memchr',
    'serde_json', 'toml', 'yaml-rust', 'serde_yaml', 'ron', 'json5', 'hjson',
    'base64', 'hex', 'base32', 'base58', 'base58ck', 'base58monero', 'bech32',
    'sha2', 'sha3', 'blake2', 'blake3', 'md5', 'sha1', 'ripemd', 'whirlpool',
    'ring', 'openssl', 'rustls', 'native-tls', 'schannel', 'security-framework',
    'aes', 'aes-gcm', 'chacha20poly1305', 'xsalsa20poly1305', 'miscreant',
    'ed25519', 'ed25519-dalek', 'x25519-dalek', 'curve25519-dalek', 'schnorrkel',
    'secp256k1', 'k256', 'p256', 'p384', 'p521', 'ecdsa', 'schnorr',
    'rsa', 'rsa-export', 'minisign', 'signatory', 'ring-signature',
    'jsonwebtoken', 'biscuit', 'oauth2', 'openidconnect', 'oxide-auth',
    'argon2', 'pbkdf2', 'scrypt', 'bcrypt', 'sha-crypt', 'passlib',
    'uuid', 'ulid', 'snowflake', 'flakeid', 'ksuid', 'cuid', 'nanoid',
    'url', 'percent-encoding', 'form_urlencoded', 'mime', 'mime_guess',
    'http', 'httparse', 'h2', 'hyper', 'reqwest', 'surf', 'isahc', 'attohttpc',
    'tonic', 'prost', 'grpcio', 'tower', 'tower-http', 'tower-grpc',
    'tokio', 'async-std', 'smol', 'futures', 'futures-lite', 'async-trait',
    'crossbeam', 'rayon', 'parking_lot', 'lock_api', 'spin', 'concurrent-queue',
    'dashmap', 'flurry', 'chashmap', 'evmap', 'contrie', 'im', 'rpds',
    'indexmap', 'hashbrown', 'fnv', 'ahash', 'fxhash', 'seahash', 'wyhash',
    'smallvec', 'tinyvec', 'arrayvec', 'compact_vec', 'thin-vec', 'im-rc',
    'itertools', 'rayon', 'ndarray', 'nalgebra', 'cgmath', 'euclid', 'glam',
    'num', 'num-traits', 'num-derive', 'num-bigint', 'num-complex', 'num-rational',
    'bitflags', 'bitvec', 'bitfield', 'bit-vec', 'fixedbitset', 'hibitset',
    'bytes', 'bytesize', 'bytemuck', 'safe-transmute', 'zerocopy', 'plain',
    'memmap2', 'fs2', 'tempfile', 'dirs', 'directories', 'xdg', 'home',
    'walkdir', 'ignore', 'glob', 'globset', 'globwalk', 'wax', 'nom-glob',
    'notify', 'hotwatch', 'watchexec', 'watchman-client', 'fsevent',
    'tar', 'zip', 'flate2', 'bzip2', 'xz2', 'zstd', 'lz4', 'snap',
    'serde', 'bincode', 'rmp-serde', 'cbor', 'postcard', 'capnp',
    'prost', 'protobuf', 'quick-protobuf', 'nanopb', 'flatbuffers',
    'tonic', 'tarpc', 'capnp-rpc', 'grpcio', 'tower-grpc', 'tarpc',
    'tokio-serde', 'tokio-util', 'tokio-stream', 'tokio-test',
    'futures', 'futures-util', 'futures-channel', 'futures-sink', 'futures-task',
    'async-stream', 'async-channel', 'async-broadcast', 'async-notify', 'async-semaphore',
    'pin-project', 'pin-utils', 'pin-cell', 'pin-project-lite', 'pinned',
    'crossbeam', 'crossbeam-channel', 'crossbeam-queue', 'crossbeam-utils', 'crossbeam-epoch',
    'rayon', 'rayon-core', 'rayon-futures', 'rayon-cond', 'rayon-hash',
    'parking_lot', 'parking_lot_core', 'lock_api', 'spin', 'concurrent-queue',
    'tokio', 'tokio-macros', 'tokio-test', 'tokio-stream', 'tokio-util',
    'async-std', 'async-task', 'async-io', 'async-net', 'async-process', 'async-global-executor',
    'smol', 'smol-potat', 'smol-macros', 'blocking', 'event-listener', 'fastrand',
    'futures-lite', 'futures-intrusive', 'futures-timer', 'futures-retry', 'futures-backoff',
    'hyper', 'hyper-tls', 'hyper-rustls', 'hyper-openssl', 'hyper-proxy', 'hyper-timeout',
    'reqwest', 'surf', 'isahc', 'attohttpc', 'awc', 'ureq', 'minreq', 'httpie',
    'axum', 'actix-web', 'rocket', 'tide', 'warp', 'gotham', 'nickel', 'iron',
    'tower', 'tower-http', 'tower-service', 'tower-layer', 'tower-make', 'tower-test',
    'warp', 'warp-filter', 'warp-reject', 'warp-reply', 'warp-body', 'warp-cors',
    'actix-web', 'actix-http', 'actix-rt', 'actix-service', 'actix-utils', 'actix-codec',
    'rocket', 'rocket_codegen', 'rocket_contrib', 'rocket_http', 'rocket_sync_db_pools',
    'tide', 'tide-websockets', 'tide-rustls', 'tide-acme', 'tide-compress', 'tide-trace',
    'gotham', 'gotham_derive', 'gotham_middleware_diesel', 'gotham_middleware_jwt',
    'diesel', 'diesel_derives', 'diesel_migrations', 'diesel_cli', 'diesel-async',
    'sqlx', 'sqlx-macros', 'sqlx-cli', 'sqlx-migrate', 'sea-orm', 'sea-query',
    'tokio-postgres', 'postgres', 'postgres-types', 'postgres-protocol', 'postgres-native-tls',
    'rusqlite', 'libsqlite3-sys', 'sqlite', 'sqlite3', 'sql-builder', 'sqlite-vfs',
    'mongodb', 'mongodb-internal', 'bson', 'mongodump', 'mongoimport', 'mongoexport',
    'redis', 'redis-async', 'redis-cluster', 'redis-cluster-async', 'redis-module',
    'chrono', 'time', 'humantime', 'dateparser', 'iso8601', 'rfc3339', 'jiff',
    'clap', 'structopt', 'argh', 'pico-args', 'lexopt', 'gumdrop', 'abscissa',
    'anyhow', 'thiserror', 'eyre', 'color-eyre', 'snafu', 'failure', 'error-chain',
    'log', 'env_logger', 'tracing', 'tracing-subscriber', 'slog', 'fern', 'flexi_logger',
  ],
  rubygems: [
    'rails', 'sinatra', 'hanami', 'roda', 'cuba', 'grape', 'padrino', 'lotus',
    'activerecord', 'sequel', 'mongoid', 'rom', 'hanami-model', 'ohm', 'redis-objects',
    'pg', 'mysql2', 'sqlite3', 'mongo', 'redis', 'cassandra-driver', 'neo4j-core',
    'nokogiri', 'loofah', 'sanitize', 'htmlentities', 'html-pipeline', 'reverse_markdown',
    'devise', 'omniauth', 'sorcery', 'authlogic', 'clearance', 'jwt', 'doorkeeper',
    'pundit', 'cancancan', 'access-granted', 'action-policy', 'rolify', 'authority',
    'sidekiq', 'resque', 'delayed-job', 'sucker-punch', 'shoryuken', 'faktory-worker',
    'aws-sdk', 'fog', 'carrierwave', 'paperclip', 'shrine', 'dragonfly', 'refile',
    'mini_magick', 'rmagick', 'vips', 'image_processing', 'fastimage', 'ruby-vips',
    'puma', 'unicorn', 'passenger', 'thin', 'webrick', 'falcon', 'iodine', 'agoo',
    'rspec', 'minitest', 'cucumber', 'capybara', 'factory-bot', 'shoulda-matchers',
    'rubocop', 'reek', 'flay', 'flog', 'brakeman', 'bundler-audit', 'ruby-audit',
    'capistrano', 'mina', 'chef', 'puppet', 'ansible', 'itamae', 'sshkit',
    'vagrant', 'docker-api', 'kubeclient', 'kubernetes-io', 'helm-rb',
    'octokit', 'gitlab', 'bitbucket-rest', 'jira-ruby', 'trello-ruby', 'asana',
    'stripe', 'braintree', 'paypal-sdk', 'squareup', 'adyen', 'checkout-sdk',
    'twilio-ruby', 'sendgrid-ruby', 'mailgun-ruby', 'postmark', 'resend',
    'slack-ruby-client', 'discordrb', 'telegram-bot-ruby', 'twitter', 'tweepy',
    'elasticsearch', 'searchkick', 'sunspot', 'thinking-sphinx', 'pg_search',
    'redis-rails', 'sidekiq', 'resque', 'delayed-job', 'sucker-punch',
    'webpacker', 'jsbundling-rails', 'cssbundling-rails', 'importmap-rails',
    'turbo-rails', 'stimulus-rails', 'hotwire-rails', 'strada', 'native',
    'jbuilder', 'active_model_serializers', 'jsonapi-serializer', 'blueprinter',
    'graphql', 'graphql-ruby', 'apollo-federation-ruby', 'actioncable',
    'solid-cable', 'anycable', 'litecable', 'websocket-rails',
    'kaminari', 'will_paginate', 'pagy', 'cursor_pagination', 'api-pagination',
    'ransack', 'searchkick', 'pg_search', 'scoped_search', 'textacular',
    'aasm', 'state-machines', 'workflow', 'transitions', 'statesman',
    'paper_trail', 'audited', 'paranoia', 'discard', 'soft_deletion',
    'friendly_id', 'slugged', 'babosa', 'stringex', 'normalize-rails',
    'validates_email_format_of', 'email_validator', 'phony_rails', 'validates_zipcode',
    'geocoder', 'geokit', 'rgeo', 'activerecord-postgis-adapter', 'geo_pattern',
    'money', 'monetize', 'currencies', 'eu_central_bank', 'google_currency',
    'whenever', 'clockwork', 'rufus-scheduler', 'sidekiq-cron', 'sucker-punch',
    'letter_opener', 'premailer', 'roadie', 'inky-rb', 'maildown',
    'exception_notification', 'honeybadger', 'bugsnag', 'sentry-ruby', 'airbrake',
    'newrelic_rpm', 'skylight', 'scout_apm', 'appsignal', 'datadog',
    'rack-mini-profiler', 'bullet', 'derailed_benchmarks', 'stackprof', 'ruby-prof',
    'simplecov', 'coveralls', 'codecov', 'codeclimate', 'solargraph',
    'yard', 'rdoc', 'sdoc', 'hanna', 'ronn', 'tomdoc',
    'pry', 'byebug', 'debugger', 'ruby-debug', 'debase', 'ruby-debug-ide',
    'irb', 'ripl', 'hirb', 'awesome_print', 'table_print', 'tty-prompt',
    'thor', 'clamp', 'commander', 'optparse', 'slop', 'trollop',
    'highline', 'inquirer', 'tty', 'pastel', 'tty-color', 'tty-cursor',
    'progress_bar', 'ruby-progressbar', 'powerbar', 'formatador', 'terminal-table',
    'httparty', 'faraday', 'rest-client', 'http', 'excon', 'typhoeus', 'patron',
    'mechanize', 'nokogiri', 'loofah', 'sanitize', 'htmlentities', 'rexml',
  ],
  go: [
    'github.com/gin-gonic/gin', 'github.com/labstack/echo', 'github.com/gofiber/fiber',
    'github.com/go-chi/chi', 'github.com/gorilla/mux', 'github.com/kataras/iris',
    'github.com/beego/beego', 'github.com/revel/revel', 'github.com/go-macaron/macaron',
    'github.com/gocraft/web', 'github.com/go-martini/martini', 'github.com/lunny/tango',
    'gorm.io/gorm', 'github.com/go-xorm/xorm', 'github.com/jinzhu/gorm',
    'github.com/uptrace/bun', 'github.com/go-pg/pg', 'github.com/jmoiron/sqlx',
    'github.com/lib/pq', 'github.com/go-sql-driver/mysql', 'github.com/mattn/go-sqlite3',
    'go.mongodb.org/mongo-driver', 'github.com/gomodule/redigo', 'github.com/go-redis/redis',
    'github.com/sirupsen/logrus', 'go.uber.org/zap', 'github.com/rs/zerolog',
    'github.com/inconshreveable/log15', 'golang.org/x/exp/slog', 'log',
    'github.com/spf13/cobra', 'github.com/spf13/viper', 'github.com/urfave/cli',
    'github.com/alecthomas/kingpin', 'github.com/jessevdk/go-flags', 'github.com/alexflint/go-arg',
    'github.com/stretchr/testify', 'github.com/onsi/ginkgo', 'github.com/onsi/gomega',
    'gotest.tools', 'github.com/go-check/check', 'github.com/smartystreets/goconvey',
    'github.com/golang/mock', 'github.com/vektra/mockery', 'github.com/mocktools/go-smtp-mock',
    'github.com/google/wire', 'github.com/uber-go/fx', 'github.com/facebookgo/inject',
    'github.com/goava/di', 'github.com/defval/inject', 'github.com/sarulabs/di',
    'github.com/gin-gonic/gin', 'github.com/labstack/echo', 'github.com/gofiber/fiber',
    'github.com/go-chi/chi', 'github.com/gorilla/mux', 'github.com/kataras/iris',
    'github.com/beego/beego', 'github.com/revel/revel', 'github.com/go-macaron/macaron',
    'github.com/gocraft/web', 'github.com/go-martini/martini', 'github.com/lunny/tango',
    'github.com/valyala/fasthttp', 'github.com/erikdubbelboer/fasthttp', 'github.com/klauspost/compress',
    'github.com/gobwas/ws', 'github.com/gorilla/websocket', 'github.com/nhooyr/websocket',
    'github.com/lucas-clemente/quic-go', 'github.com/pion/quic', 'github.com/pion/webrtc',
    'google.golang.org/grpc', 'github.com/apache/thrift', 'github.com/gogo/protobuf',
    'github.com/golang/protobuf', 'google.golang.org/protobuf', 'github.com/planetscale/vtprotobuf',
    'github.com/aws/aws-sdk-go', 'github.com/aws/aws-sdk-go-v2', 'cloud.google.com/go',
    'github.com/Azure/azure-sdk-for-go', 'github.com/aliyun/alibaba-cloud-sdk-go',
    'github.com/stripe/stripe-go', 'github.com/braintree-go/braintree-go', 'github.com/paypal/gatt',
    'github.com/sideshow/apns2', 'github.com/firebase/firebase-admin-go', 'github.com/aws/aws-lambda-go',
    'github.com/gin-contrib/cors', 'github.com/rs/cors', 'github.com/go-chi/cors',
    'github.com/ulule/limiter', 'github.com/didip/tollbooth', 'github.com/throttled/throttled',
    'github.com/golang-jwt/jwt', 'github.com/dgrijalva/jwt-go', 'github.com/lestrrat-go/jwx',
    'golang.org/x/crypto', 'github.com/fernet/fernet-go', 'github.com/xdg-go/pbkdf2',
    'github.com/hashicorp/vault', 'github.com/keybase/go-keychain', 'github.com/zalando/go-keyring',
    'github.com/minio/minio-go', 'github.com/aws/aws-sdk-go/service/s3', 'cloud.google.com/go/storage',
    'github.com/ncw/swift', 'github.com/tus/tusd', 'github.com/goftp/server',
    'github.com/jlaffaye/ftp', 'github.com/secsy/goftp', 'github.com/fclairamb/ftpserver',
    'github.com/go-mail/mail', 'github.com/jordan-wright/email', 'github.com/wneessen/go-mail',
    'github.com/sendgrid/sendgrid-go', 'github.com/mailgun/mailgun-go', 'github.com/aws/aws-sdk-go/service/ses',
    'github.com/slack-go/slack', 'github.com/bwmarrin/discordgo', 'github.com/go-telegram-bot-api/telegram-bot-api',
    'github.com/dghubble/go-twitter', 'github.com/g8rswimmer/go-twitter', 'github.com/faiface/beep',
    'github.com/hajimehoshi/oto', 'github.com/gopxl/beep', 'github.com/faiface/beep',
    'github.com/disintegration/imaging', 'github.com/nfnt/resize', 'github.com/anthonynsimon/bild',
    'github.com/fogleman/gg', 'github.com/srwiley/oksvg', 'github.com/srwiley/rasterx',
    'github.com/go-pdf/fpdf', 'github.com/jung-kurt/gofpdf', 'github.com/signintech/gopdf',
    'github.com/skip2/go-qrcode', 'github.com/boombuler/barcode', 'github.com/makiuchi-d/gozxing',
    'github.com/pquerna/otp', 'github.com/xlzd/gotp', 'github.com/sec51/twofactor',
    'github.com/gin-gonic/contrib', 'github.com/gin-contrib', 'github.com/labstack/echo-contrib',
    'github.com/unrolled/render', 'github.com/flosch/pongo2', 'github.com/CloudyKit/jet',
    'html/template', 'text/template', 'github.com/alecthomas/template', 'github.com/cbroglie/mustache',
    'github.com/BurntSushi/toml', 'github.com/pelletier/go-toml', 'gopkg.in/yaml.v3', 'gopkg.in/yaml.v2',
    'github.com/json-iterator/go', 'github.com/tidwall/gjson', 'github.com/tidwall/sjson',
    'encoding/json', 'github.com/mailru/easyjson', 'github.com/pquerna/ffjson',
    'github.com/vmihailenco/msgpack', 'github.com/ugorji/go/codec', 'github.com/tinylib/msgp',
    'github.com/goccy/go-json', 'github.com/bytedance/sonic', 'github.com/json-iterator/go',
    'github.com/golang/snappy', 'github.com/klauspost/compress', 'github.com/andybalholm/brotli',
    'github.com/pierrec/lz4', 'github.com/ulikunitz/xz', 'github.com/klauspost/pgzip',
    'github.com/syndtr/goleveldb', 'github.com/etcd-io/bbolt', 'github.com/dgraph-io/badger',
    'github.com/tidwall/buntdb', 'github.com/hashicorp/go-memdb', 'github.com/hashicorp/golang-lru',
    'github.com/patrickmn/go-cache', 'github.com/bluele/gcache', 'github.com/allegro/bigcache',
    'github.com/go-redis/redis', 'github.com/gomodule/redigo', 'github.com/redis/go-redis',
    'github.com/bsm/redislock', 'github.com/centrifugal/centrifuge-go', 'github.com/nats-io/nats.go',
    'github.com/nats-io/nats-server', 'github.com/nats-io/stan.go', 'github.com/nats-io/nats-streaming-server',
    'github.com/Shopify/sarama', 'github.com/segmentio/kafka-go', 'github.com/confluentinc/confluent-kafka-go',
    'github.com/rabbitmq/amqp091-go', 'github.com/streadway/amqp', 'github.com/assembla/cony',
    'github.com/nsqio/go-nsq', 'github.com/nats-io/nats.go', 'github.com/nats-io/nats-server',
    'github.com/prometheus/client_golang', 'github.com/prometheus/client_model', 'github.com/prometheus/common',
    'github.com/opentracing/opentracing-go', 'github.com/uber/jaeger-client-go', 'github.com/openzipkin/zipkin-go',
    'go.opentelemetry.io/otel', 'go.opentelemetry.io/otel/trace', 'go.opentelemetry.io/otel/sdk',
    'github.com/DataDog/datadog-go', 'github.com/newrelic/go-agent', 'github.com/getsentry/sentry-go',
    'github.com/hashicorp/consul', 'github.com/hashicorp/serf', 'github.com/hashicorp/memberlist',
    'github.com/hashicorp/go-sockaddr', 'github.com/hashicorp/go-multierror', 'github.com/hashicorp/errwrap',
    'github.com/hashicorp/hcl', 'github.com/hashicorp/go-plugin', 'github.com/hashicorp/go-hclog',
    'github.com/hashicorp/terraform', 'github.com/hashicorp/packer', 'github.com/hashicorp/vault',
    'github.com/hashicorp/nomad', 'github.com/hashicorp/boundary', 'github.com/hashicorp/waypoint',
    'github.com/spf13/cobra', 'github.com/spf13/viper', 'github.com/spf13/pflag', 'github.com/spf13/cast',
    'github.com/urfave/cli', 'github.com/alecthomas/kingpin', 'github.com/jessevdk/go-flags',
    'github.com/stretchr/testify', 'github.com/onsi/ginkgo', 'github.com/onsi/gomega',
    'github.com/golang/mock', 'github.com/vektra/mockery', 'github.com/mocktools/go-smtp-mock',
  ],
  packagist: [
    'laravel/framework', 'symfony/symfony', 'codeigniter/framework', 'cakephp/cakephp',
    'zendframework/zendframework', 'slim/slim', 'silex/silex', 'phalcon/cphalcon',
    'yiisoft/yii2', 'fuel/core', 'kohana/core', 'flightphp/core',
    'doctrine/orm', 'doctrine/dbal', 'doctrine/migrations', 'doctrine/collections',
    'eloquent/orm', 'propel/propel', 'redbeanphp', 'paris/orm', 'idiorm/idiorm',
    'illuminate/database', 'illuminate/support', 'illuminate/console', 'illuminate/http',
    'guzzlehttp/guzzle', 'symfony/http-client', 'kriswallsmith/buzz', 'php-http/httplug',
    'monolog/monolog', 'seldaek/monolog', 'psr/log', 'apache/log4php',
    'phpunit/phpunit', 'codeception/codeception', 'behat/behat', 'phpspec/phpspec',
    'phpmd/phpmd', 'squizlabs/php_codesniffer', 'friendsofphp/php-cs-fixer', 'vimeo/psalm',
    'composer/composer', 'composer/installers', 'composer/satis', 'composer/packagist',
    'twig/twig', 'smarty/smarty', 'mustache/mustache', 'phptal/phptal',
    'swiftmailer/swiftmailer', 'phpmailer/phpmailer', 'zendframework/zend-mail', 'symfony/mailer',
    'aws/aws-sdk-php', 'google/apiclient', 'microsoft/microsoft-graph', 'aliyuncs/oss-sdk-php',
    'stripe/stripe-php', 'braintree/braintree_php', 'paypal/rest-api-sdk-php', 'square/square-php-sdk',
    'vlucas/phpdotenv', 'symfony/dotenv', 'josegonzalez/dotenv', 'devcoder-xyz/php-dotenv',
    'predis/predis', 'phpredis/phpredis', 'mongodb/mongodb', 'elasticsearch/elasticsearch',
    'sentry/sentry', 'bugsnag/bugsnag', 'rollbar/rollbar', 'airbrake/phpbrake',
    'league/oauth2-server', 'thephpleague/oauth2-client', 'bshaffer/oauth2-server-php', 'hybridauth/hybridauth',
    'firebase/php-jwt', 'lcobucci/jwt', 'namshi/jose', 'tuupola/slim-jwt-auth',
    'ramsey/uuid', 'ramsey/collection', 'symfony/uid', 'hashids/hashids',
    'intervention/image', 'imagine/imagine', 'phpthumb/phpthumb', 'gregwar/image',
    'phpoffice/phpspreadsheet', 'phpoffice/phpword', 'phpoffice/phppresentation', 'mpdf/mpdf',
    'endroid/qr-code', 'bacon/bacon-qr-code', 'simplesoftwareio/simple-qrcode', 'khanamiryan/qrcode-detector-decoder',
    'knplabs/knp-snappy', 'barryvdh/laravel-snappy', 'h4cc/wkhtmltopdf-amd64', 'wemersonjanuario/wkhtmltopdf',
    'maatwebsite/excel', 'spatie/simple-excel', 'box/spout', 'phpoffice/phpspreadsheet',
    'league/flysystem', 'league/flysystem-aws-s3-v3', 'league/flysystem-azure', 'league/flysystem-google-cloud-storage',
    'symfony/console', 'symfony/process', 'symfony/finder', 'symfony/filesystem',
    'nikic/php-parser', 'phpdocumentor/reflection', 'roave/better-reflection', 'goaop/framework',
    'phpstan/phpstan', 'vimeo/psalm', 'phan/phan', 'squizlabs/php_codesniffer',
    'phpunit/phpunit', 'codeception/codeception', 'behat/behat', 'atoum/atoum',
    'mockery/mockery', 'phpspec/prophecy', 'phpunit/phpunit-mock-objects', 'satooshi/php-coveralls',
    'fzaninotto/faker', 'nelmio/alice', 'theofidry/alice-data-fixtures', 'hautelook/alice-bundle',
    'doctrine/data-fixtures', 'doctrine/doctrine-fixtures-bundle', 'liip/fixtures-bundle', 'h4cc/alice-fixtures',
    'nelmio/cors-bundle', 'nelmio/api-doc-bundle', 'nelmio/security-bundle', 'nelmio/alice',
    'friendsofsymfony/rest-bundle', 'friendsofsymfony/user-bundle', 'friendsofsymfony/oauth-server-bundle',
    'jms/serializer', 'jms/serializer-bundle', 'willdurand/hateoas', 'willdurand/hateoas-bundle',
    'hateoas/hateoas', 'hateoas/hateoas-bundle', 'hautelook/templated-uri-bundle', 'hautelook/templated-uri-router',
    'api-platform/core', 'api-platform/api-pack', 'api-platform/schema-generator', 'api-platform/admin',
    'nelmio/api-doc-bundle', 'zircote/swagger-php', 'swagger-api/swagger-ui', 'darkaonline/l5-swagger',
    'sensio/framework-extra-bundle', 'sensio/generator-bundle', 'sensio/distribution-bundle',
    'symfony/framework-bundle', 'symfony/console', 'symfony/debug', 'symfony/var-dumper',
    'symfony/routing', 'symfony/http-kernel', 'symfony/http-foundation', 'symfony/event-dispatcher',
    'symfony/dependency-injection', 'symfony/config', 'symfony/yaml', 'symfony/expression-language',
    'symfony/security', 'symfony/acl', 'symfony/validator', 'symfony/form',
    'symfony/serializer', 'symfony/property-access', 'symfony/property-info', 'symfony/cache',
    'symfony/translation', 'symfony/intl', 'symfony/locale', 'symfony/i18n',
    'symfony/asset', 'symfony/templating', 'symfony/twig-bridge', 'symfony/twig-bundle',
    'symfony/web-profiler-bundle', 'symfony/debug-bundle', 'symfony/monolog-bundle', 'symfony/swiftmailer-bundle',
    'symfony/phpunit-bridge', 'symfony/browser-kit', 'symfony/css-selector', 'symfony/dom-crawler',
    'symfony/maker-bundle', 'symfony/web-server-bundle', 'symfony/webpack-encore-bundle', 'symfony/ux',
    'laravel/framework', 'laravel/sanctum', 'laravel/socialite', 'laravel/horizon',
    'laravel/telescope', 'laravel/nova', 'laravel/cashier', 'laravel/spark',
    'laravel/passport', 'laravel/scout', 'laravel/cashier-stripe', 'laravel/cashier-paddle',
    'illuminate/support', 'illuminate/database', 'illuminate/console', 'illuminate/http',
    'illuminate/cache', 'illuminate/session', 'illuminate/auth', 'illuminate/broadcasting',
    'illuminate/bus', 'illuminate/config', 'illuminate/container', 'illuminate/contracts',
    'illuminate/cookie', 'illuminate/encryption', 'illuminate/events', 'illuminate/filesystem',
    'illuminate/hashing', 'illuminate/log', 'illuminate/mail', 'illuminate/notifications',
    'illuminate/pagination', 'illuminate/pipeline', 'illuminate/queue', 'illuminate/redis',
    'illuminate/routing', 'illuminate/translation', 'illuminate/validation', 'illuminate/view',
    'spatie/laravel-permission', 'spatie/laravel-backup', 'spatie/laravel-medialibrary', 'spatie/laravel-query-builder',
    'spatie/laravel-fractal', 'spatie/laravel-activitylog', 'spatie/laravel-sitemap', 'spatie/laravel-sluggable',
    'spatie/laravel-tags', 'spatie/laravel-translatable', 'spatie/laravel-settings', 'spatie/laravel-data',
    'spatie/laravel-model-states', 'spatie/laravel-model-info', 'spatie/laravel-package-tools', 'spatie/laravel-ray',
    'spatie/laravel-health', 'spatie/laravel-failed-job-monitor', 'spatie/laravel-schedule-monitor', 'spatie/laravel-pdf',
    'spatie/laravel-html', 'spatie/laravel-markdown', 'spatie/laravel-short-schedule', 'spatie/laravel-flash',
    'spatie/laravel-csp', 'spatie/laravel-honeypot', 'spatie/laravel-cookie-consent', 'spatie/laravel-googletagmanager',
    'spatie/laravel-analytics', 'spatie/laravel-sitemap', 'spatie/laravel-robots-middleware', 'spatie/laravel-cors',
    'spatie/laravel-http-logger', 'spatie/laravel-rate-limited-job-middleware', 'spatie/laravel-queueable-action',
    'spatie/laravel-blade-x', 'spatie/laravel-view-components', 'spatie/laravel-livewire-wizard',
  ],
  nuget: [
    'Newtonsoft.Json', 'System.Text.Json', 'Json.NET', 'Utf8Json', 'Jil', 'MessagePack',
    'Microsoft.EntityFrameworkCore', 'Dapper', 'NHibernate', 'ServiceStack.OrmLite', 'PetaPoco',
    'Microsoft.Data.SqlClient', 'MySql.Data', 'Npgsql', 'Oracle.ManagedDataAccess', 'System.Data.SQLite',
    'StackExchange.Redis', 'ServiceStack.Redis', 'CSRedisCore', 'BeetleX.Redis',
    'MongoDB.Driver', 'MongoDB.Driver.Core', 'MongoDB.Bson', 'MongoDB.Driver.GridFS',
    'Microsoft.AspNetCore', 'Microsoft.AspNetCore.Mvc', 'Microsoft.AspNetCore.Razor', 'Microsoft.AspNetCore.Blazor',
    'Swashbuckle.AspNetCore', 'NSwag', 'Microsoft.AspNetCore.OpenApi', 'AspNetCore.Proxy',
    'Serilog', 'NLog', 'log4net', 'Microsoft.Extensions.Logging', 'LibLog',
    'AutoMapper', 'Mapster', 'ExpressMapper', 'AgileMapper', 'TinyMapper',
    'FluentValidation', 'System.ComponentModel.Annotations', 'DataAnnotationsValidator', 'ValidationAttributes',
    'MediatR', 'MediatR.Extensions.Microsoft.DependencyInjection', 'MediatR.Contracts',
    'MassTransit', 'NServiceBus', 'Rebus', 'EasyNetQ', 'Brighter',
    'Polly', 'Polly.Extensions.Http', 'Polly.Caching.Memory', 'Polly.Contrib',
    'Refit', 'RestSharp', 'Flurl.Http', 'EasyHttp', 'HttpClientFactory',
    'xunit', 'NUnit', 'MSTest', 'Shouldly', 'FluentAssertions', 'Moq', 'NSubstitute', 'FakeItEasy',
    'Microsoft.NET.Test.Sdk', 'coverlet.collector', 'ReportGenerator', 'SonarAnalyzer.CSharp',
    'Microsoft.CodeAnalysis.CSharp', 'StyleCop.Analyzers', 'Roslynator.Analyzers', 'ErrorProne.NET',
    'AWSSDK.Core', 'AWSSDK.S3', 'AWSSDK.DynamoDBv2', 'AWSSDK.Lambda', 'AWSSDK.EC2',
    'Azure.Core', 'Azure.Storage.Blobs', 'Azure.Storage.Queues', 'Azure.Storage.Files.Shares',
    'Microsoft.Azure.Cosmos', 'Microsoft.Azure.ServiceBus', 'Microsoft.Azure.EventHubs', 'Microsoft.Azure.WebJobs',
    'Google.Cloud.Storage.V1', 'Google.Cloud.BigQuery.V2', 'Google.Cloud.PubSub.V1', 'Google.Cloud.Functions.Hosting',
    'Stripe.net', 'Braintree', 'PayPalCheckoutSdk', 'Square', 'Adyen',
    'Twilio', 'SendGrid', 'MailKit', 'MimeKit', 'Mailgun',
    'SlackAPI', 'Discord.Net', 'Telegram.Bot', 'TweetinviAPI', 'Facebook',
    'Microsoft.Identity.Web', 'Microsoft.Identity.Client', 'System.IdentityModel.Tokens.Jwt', 'IdentityServer4',
    'Ocelot', 'YARP', 'Consul', 'Steeltoe.Discovery', 'ServiceFabric',
    'Hangfire', 'Hangfire.Core', 'Hangfire.SqlServer', 'Hangfire.AspNetCore', 'Quartz',
    'RabbitMQ.Client', 'NATS.Client', 'Confluent.Kafka', 'ApachePulsar.Client', 'Azure.Messaging.ServiceBus',
    'OpenTelemetry', 'OpenTelemetry.Exporter.Jaeger', 'OpenTelemetry.Exporter.Zipkin', 'OpenTelemetry.Instrumentation.AspNetCore',
    'Prometheus.Client', 'App.Metrics', 'Datadog.Trace', 'NewRelic.Agent', 'Sentry',
    'SixLabors.ImageSharp', 'Magick.NET-Q16-AnyCPU', 'SkiaSharp', 'System.Drawing.Common',
    'iTextSharp', 'PdfSharp', 'DinkToPdf', 'PuppeteerSharp', 'Playwright',
    'ZXing.Net', 'QRCoder', 'BarcodeLib', 'MessagingToolkit.QRCode',
    'CsvHelper', 'ExcelDataReader', 'EPPlus', 'ClosedXML', 'DocumentFormat.OpenXml',
    'System.Reactive', 'UniRx', 'ReactiveUI', 'DynamicData', 'MoreLinq',
    'BenchmarkDotNet', 'NBench', 'xunit.performance', 'Microsoft.Diagnostics.Tracing.TraceEvent',
    'Humanizer', 'Pluralize.NET', 'Inflector', 'NString', 'CaseExtensions',
    'CSharpFunctionalExtensions', 'LanguageExt.Core', 'Optional', 'Maybe', 'RailwaySharp',
    'Scrutor', 'Autofac', 'Castle.Windsor', 'Ninject', 'StructureMap', 'SimpleInjector',
    'Microsoft.Extensions.DependencyInjection', 'Microsoft.Extensions.Hosting', 'Microsoft.Extensions.Configuration',
    'Microsoft.Extensions.Logging', 'Microsoft.Extensions.Caching.Memory', 'Microsoft.Extensions.Http',
    'Microsoft.Extensions.Options', 'Microsoft.Extensions.Primitives', 'Microsoft.Extensions.FileProviders',
    'Microsoft.Extensions.Localization', 'Microsoft.Extensions.Globalization', 'Microsoft.Extensions.AI',
    'System.IO.Abstractions', 'TestableIO.System.IO.Abstractions', 'System.IO.Abstractions.TestingHelpers',
    'CliWrap', 'CommandLineParser', 'System.CommandLine', 'McMaster.Extensions.CommandLineUtils',
    'Spectre.Console', 'Terminal.Gui', 'Colorful.Console', 'ConsoleTables', 'ShellProgressBar',
  ],
  maven: [
    'org.springframework.boot:spring-boot-starter', 'org.springframework:spring-core', 'org.springframework:spring-web',
    'org.springframework.security:spring-security-core', 'org.springframework.data:spring-data-jpa',
    'org.springframework.cloud:spring-cloud-starter', 'org.springframework.batch:spring-batch-core',
    'org.springframework.integration:spring-integration-core', 'org.springframework.amqp:spring-rabbit',
    'org.springframework.kafka:spring-kafka', 'org.springframework:spring-websocket', 'org.springframework:spring-messaging',
    'org.hibernate:hibernate-core', 'org.hibernate.validator:hibernate-validator', 'org.hibernate:hibernate-entitymanager',
    'jakarta.persistence:jakarta.persistence-api', 'jakarta.validation:jakarta.validation-api', 'jakarta.servlet:jakarta.servlet-api',
    'com.fasterxml.jackson.core:jackson-databind', 'com.fasterxml.jackson.core:jackson-core', 'com.fasterxml.jackson.core:jackson-annotations',
    'com.google.guava:guava', 'com.google.inject:guice', 'com.google.code.gson:gson', 'com.google.protobuf:protobuf-java',
    'org.apache.commons:commons-lang3', 'org.apache.commons:commons-collections4', 'org.apache.commons:commons-io',
    'org.apache.httpcomponents:httpclient', 'org.apache.httpcomponents:httpcore', 'org.apache.httpcomponents.client5:httpclient5',
    'org.apache.kafka:kafka-clients', 'org.apache.zookeeper:zookeeper', 'org.apache.curator:curator-framework',
    'org.apache.logging.log4j:log4j-core', 'org.apache.logging.log4j:log4j-api', 'org.slf4j:slf4j-api',
    'ch.qos.logback:logback-classic', 'ch.qos.logback:logback-core', 'org.slf4j:slf4j-simple',
    'org.junit.jupiter:junit-jupiter', 'org.junit.vintage:junit-vintage-engine', 'org.testng:testng',
    'org.mockito:mockito-core', 'org.mockito:mockito-junit-jupiter', 'org.assertj:assertj-core',
    'io.projectreactor:reactor-core', 'io.projectreactor.netty:reactor-netty', 'io.projectreactor.kafka:reactor-kafka',
    'io.reactivex.rxjava3:rxjava', 'io.reactivex.rxjava2:rxjava', 'io.projectreactor.addons:reactor-extra',
    'org.jetbrains.kotlin:kotlin-stdlib', 'org.jetbrains.kotlin:kotlin-reflect', 'org.jetbrains.kotlinx:kotlinx-coroutines-core',
    'org.jetbrains.kotlinx:kotlinx-serialization-json', 'org.jetbrains.kotlinx:kotlinx-datetime',
    'io.ktor:ktor-server-core', 'io.ktor:ktor-client-core', 'io.ktor:ktor-server-netty', 'io.ktor:ktor-client-cio',
    'io.micronaut:micronaut-core', 'io.micronaut:micronaut-http-server-netty', 'io.micronaut:micronaut-inject',
    'io.quarkus:quarkus-core', 'io.quarkus:quarkus-arc', 'io.quarkus:quarkus-resteasy',
    'io.vertx:vertx-core', 'io.vertx:vertx-web', 'io.vertx:vertx-web-client', 'io.vertx:vertx-kafka-client',
    'com.oracle.database.jdbc:ojdbc11', 'mysql:mysql-connector-java', 'org.postgresql:postgresql',
    'com.h2database:h2', 'org.xerial:sqlite-jdbc', 'com.microsoft.sqlserver:mssql-jdbc',
    'redis.clients:jedis', 'io.lettuce:lettuce-core', 'org.redisson:redisson',
    'org.mongodb:mongodb-driver-sync', 'org.mongodb:mongodb-driver-reactivestreams', 'org.mongodb:bson',
    'com.rabbitmq:amqp-client', 'org.springframework.amqp:spring-rabbit', 'com.rabbitmq:http-client',
    'org.apache.kafka:kafka-clients', 'org.springframework.kafka:spring-kafka', 'io.confluent:kafka-avro-serializer',
    'software.amazon.awssdk:s3', 'software.amazon.awssdk:dynamodb', 'software.amazon.awssdk:lambda',
    'com.amazonaws:aws-java-sdk-s3', 'com.amazonaws:aws-java-sdk-dynamodb', 'com.amazonaws:aws-lambda-java-core',
    'com.azure:azure-storage-blob', 'com.azure:azure-cosmos', 'com.azure:azure-messaging-servicebus',
    'com.google.cloud:google-cloud-storage', 'com.google.cloud:google-cloud-bigquery', 'com.google.cloud:google-cloud-pubsub',
    'com.stripe:stripe-java', 'com.braintreepayments.gateway:braintree-java', 'com.paypal.sdk:rest-api-sdk',
    'com.twilio.sdk:twilio', 'com.sendgrid:sendgrid-java', 'com.sun.mail:jakarta.mail',
    'com.slack.api:slack-api-client', 'net.dv8tion:JDA', 'org.telegram:telegrambots',
    'io.jsonwebtoken:jjwt-api', 'io.jsonwebtoken:jjwt-impl', 'io.jsonwebtoken:jjwt-jackson',
    'org.springframework.security:spring-security-oauth2-client', 'org.springframework.security:spring-security-oauth2-resource-server',
    'com.auth0:java-jwt', 'com.okta.spring:okta-spring-boot-starter', 'com.clevertap.apns:apns-http2',
    'org.elasticsearch.client:elasticsearch-rest-high-level-client', 'org.springframework.data:spring-data-elasticsearch',
    'org.apache.solr:solr-solrj', 'org.apache.lucene:lucene-core',
    'io.micrometer:micrometer-core', 'io.micrometer:micrometer-registry-prometheus', 'io.micrometer:micrometer-registry-cloudwatch',
    'io.opentelemetry:opentelemetry-api', 'io.opentelemetry:opentelemetry-sdk', 'io.opentelemetry.instrumentation:opentelemetry-spring-boot-starter',
    'io.sentry:sentry', 'io.sentry:sentry-spring-boot-starter', 'com.datadoghq:dd-trace-api',
    'org.mapstruct:mapstruct', 'org.modelmapper:modelmapper', 'com.github.dozermapper:dozer-core',
    'org.projectlombok:lombok', 'org.projectlombok:lombok-maven-plugin',
    'org.flywaydb:flyway-core', 'liquibase-core', 'org.springframework.boot:spring-boot-starter-data-jpa',
    'com.querydsl:querydsl-core', 'org.jooq:jooq', 'org.mybatis:mybatis', 'org.mybatis.spring.boot:mybatis-spring-boot-starter',
    'io.springfox:springfox-swagger2', 'org.springdoc:springdoc-openapi-ui', 'io.swagger.core.v3:swagger-annotations',
    'org.openapitools:openapi-generator', 'org.openapitools:openapi-generator-maven-plugin',
    'com.graphql-java:graphql-java', 'com.graphql-java-kickstart:graphql-spring-boot-starter',
    'net.devh:grpc-spring-boot-starter', 'io.grpc:grpc-netty', 'io.grpc:grpc-protobuf', 'io.grpc:grpc-stub',
    'com.google.protobuf:protobuf-java', 'com.google.protobuf:protobuf-java-util', 'io.protostuff:protostuff-core',
    'org.apache.thrift:libthrift', 'com.facebook.thrift:thrift',
    'org.apache.avro:avro', 'io.confluent:kafka-avro-serializer', 'org.apache.avro:avro-compiler',
    'org.msgpack:msgpack-core', 'org.msgpack:jackson-dataformat-msgpack',
    'com.esotericsoftware:kryo', 'de.javakaffee:kryo-serializers',
    'org.redisson:redisson', 'org.redisson:redisson-spring-boot-starter',
    'org.infinispan:infinispan-core', 'org.infinispan:infinispan-spring-boot-starter',
    'org.ehcache:ehcache', 'org.springframework.boot:spring-boot-starter-cache', 'com.github.ben-manes.caffeine:caffeine',
    'org.springframework.session:spring-session-core', 'org.springframework.session:spring-session-data-redis', 'org.springframework.session:spring-session-jdbc',
    'org.springframework.boot:spring-boot-starter-security', 'org.springframework.security:spring-security-oauth2-jose',
    'org.keycloak:keycloak-spring-boot-starter', 'com.okta.spring:okta-spring-boot-starter',
    'org.springframework.boot:spring-boot-starter-webflux', 'org.springframework.boot:spring-boot-starter-reactor-netty',
    'io.projectreactor:reactor-test', 'io.projectreactor.addons:reactor-extra',
    'org.springframework.cloud:spring-cloud-gateway', 'org.springframework.cloud:spring-cloud-starter-netflix-eureka-client',
    'org.springframework.cloud:spring-cloud-starter-netflix-hystrix', 'org.springframework.cloud:spring-cloud-starter-openfeign',
    'org.springframework.cloud:spring-cloud-starter-sleuth', 'org.springframework.cloud:spring-cloud-starter-zipkin',
    'org.springframework.batch:spring-batch-core', 'org.springframework.batch:spring-batch-test', 'org.springframework.batch:spring-batch-integration',
    'org.springframework.integration:spring-integration-core', 'org.springframework.integration:spring-integration-amqp', 'org.springframework.integration:spring-integration-kafka',
    'org.springframework:spring-webmvc', 'org.springframework:spring-webflux', 'org.springframework:spring-websocket',
    'org.springframework:spring-core', 'org.springframework:spring-context', 'org.springframework:spring-beans', 'org.springframework:spring-aop',
    'org.springframework:spring-tx', 'org.springframework:spring-jdbc', 'org.springframework:spring-orm', 'org.springframework:spring-oxm',
    'org.springframework:spring-jms', 'org.springframework:spring-messaging', 'org.springframework:spring-websocket', 'org.springframework:spring-web',
    'org.springframework.security:spring-security-core', 'org.springframework.security:spring-security-web', 'org.springframework.security:spring-security-config',
    'org.springframework.security:spring-security-oauth2-core', 'org.springframework.security:spring-security-oauth2-client', 'org.springframework.security:spring-security-oauth2-resource-server',
    'org.springframework.security:spring-security-oauth2-jose', 'org.springframework.security:spring-security-saml2-service-provider',
    'org.springframework.data:spring-data-commons', 'org.springframework.data:spring-data-jpa', 'org.springframework.data:spring-data-mongodb',
    'org.springframework.data:spring-data-redis', 'org.springframework.data:spring-data-solr', 'org.springframework.data:spring-data-elasticsearch',
    'org.springframework.data:spring-data-rest-core', 'org.springframework.data:spring-data-rest-webmvc', 'org.springframework.data:spring-data-keyvalue',
    'org.springframework.hateoas:spring-hateoas', 'org.springframework.plugin:spring-plugin-core', 'org.springframework.ldap:spring-ldap-core',
    'org.springframework.mobile:spring-mobile-device', 'org.springframework.social:spring-social-core', 'org.springframework.social:spring-social-web',
    'org.springframework.retry:spring-retry', 'org.springframework.cache:spring-cache', 'org.springframework.statemachine:spring-statemachine-core',
    'org.springframework.shell:spring-shell-core', 'org.springframework.shell:spring-shell-standard', 'org.springframework.shell:spring-shell-starter',
  ],
  hex: [
    'phoenix', 'phoenix_live_view', 'phoenix_pubsub', 'phoenix_ecto', 'phoenix_html',
    'ecto', 'ecto_sql', 'ecto_enum', 'ecto_autoslug_field', 'ecto_commons',
    'postgrex', 'myxql', 'tds', 'exqlite', 'mongodb', 'redis',
    'plug', 'plug_cowboy', 'bandit', 'cors_plug', 'plug_canonical_host',
    'absinthe', 'absinthe_plug', 'absinthe_phoenix', 'dataloader', 'graphql',
    'oban', 'exq', 'que', 'honeydew', 'gen_stage', 'broadway',
    'telemetry', 'telemetry_metrics', 'telemetry_poller', 'telemetry_metrics_prometheus',
    'logger_json', 'logster', 'ink', 'bunt', 'credo', 'dialyxir',
    'ex_unit', 'stream_data', 'propcheck', 'excheck', 'espec', 'bypass',
    'httpoison', 'hackney', 'finch', 'req', 'tesla', 'mint', 'gun',
    'jason', 'poison', 'jsx', 'exjsx', 'json', 'tiny', 'thrift',
    'comeonin', 'bcrypt_elixir', 'argon2_elixir', 'pbkdf2_elixir', 'cloak', 'fields',
    'guardian', 'ueberauth', 'pow', 'coherence', 'openmaize', 'authable',
    'ex_aws', 'ex_aws_s3', 'ex_aws_dynamo', 'ex_aws_lambda', 'ex_aws_sts',
    'arc', 'waffle', 'ex_azure', 'gcs', 'cloudex', 'simple_s3',
    'stripity_stripe', 'pay', 'braintree', 'ex_paypal', 'squareup', 'adyen',
    'twilio_elixir', 'ex_twilio', 'sendgrid', 'bamboo', 'swoosh', 'mailgun',
    'slack_ex', 'nadia', 'ex_telegram', 'extwitter', 'facebook',
    'elixir_uuid', 'uuid', 'nanoid', 'ksuid', 'cuid', 'flake_id',
    'timex', 'calendar', 'crontab', 'recurring_events', 'good_times',
    'decimal', 'money', 'currencies', 'monetized', 'ex_money', 'ex_cldr',
    'nimble_csv', 'csv', 'ex_csv', 'csv_lixir', 'csve', 'csv_schema',
    'xlsxir', 'elixlsx', 'excellent', 'xlsx_parser', 'exoffice',
    'pdf_generator', 'chromic_pdf', 'puppeteer_pdf', 'gutenex', 'pdf',
    'qr_code', 'eqrcode', 'ex_qr', 'barlix', 'barcode',
    'nimble_parsec', 'ex_parsec', 'combine', 'erlang_parser', 'parser_combinators',
    'ex_doc', 'earmark', 'earmark_parser', 'makeup', 'makeup_elixir', 'makeup_erlang',
    'distillery', 'mix_release', 'edeliver', 'exrm', 'conform', 'conform_exrm',
    'libcluster', 'swarm', 'horde', 'delta_crdt', 'libring', 'partisan',
    'cachex', 'nebulex', 'con_cache', 'memoize', 'fastglobal', 'persistent_ets',
    'exactor', 'gen_state_machine', 'fsm', 'ex_machine', 'state_mc',
    'flow', 'gen_stage', 'broadway', 'broadway_kafka', 'broadway_rabbitmq', 'broadway_sqs',
    'excoveralls', 'coverex', 'ex_guard', 'mix_test_watch', 'ex_unit_notifier',
    'credo', 'dialyxir', 'sobelow', 'mix_audit', 'hex_audit', 'doctor',
    'ex_check', 'ex_doc', 'inch_ex', 'ex_static', 'ex_debug_toolbar',
    'phoenix_live_reload', 'phoenix_live_dashboard', 'telemetry_metrics_prometheus', 'prometheus_ex',
    'new_relic_agent', 'appsignal', 'sentry', 'honeybadger', 'bugsnag',
    'opentelemetry', 'opentelemetry_api', 'opentelemetry_exporter', 'opentelemetry_phoenix', 'opentelemetry_ecto',
    'ex_queb', 'queryex', 'filterable', 'rummage_ecto', 'ex_sieve',
    'scrivener', 'scrivener_ecto', 'scrivener_html', 'kerosene', 'rummage_phoenix',
    'canary', 'canada', 'bodyguard', 'authorize', 'policy_wonk', 'permit',
    'ex_admin', 'torch', 'ex_cell', 'phx_component_helpers', 'live_admin',
    'surface', 'surface_formatter', 'surface_catalogue', 'live_view_native',
    'petal_components', 'live_beats', 'livebook', 'kino', 'kino_db',
  ],
  pub: [
    'flutter', 'flutter_test', 'flutter_localizations', 'flutter_web_plugins',
    'http', 'dio', 'chopper', 'retrofit', 'graphql_flutter', 'ferry',
    'provider', 'flutter_bloc', 'mobx', 'get', 'riverpod', 'flutter_riverpod', 'hooks_riverpod',
    'sqflite', 'hive', 'shared_preferences', 'flutter_secure_storage', 'drift', 'sembast',
    'firebase_core', 'cloud_firestore', 'firebase_auth', 'firebase_storage', 'firebase_messaging',
    'google_sign_in', 'sign_in_with_apple', 'flutter_facebook_auth', 'twitter_login',
    'image_picker', 'image_cropper', 'cached_network_image', 'flutter_svg', 'lottie', 'rive',
    'google_maps_flutter', 'mapbox_gl', 'flutter_map', 'geolocator', 'geocoding', 'location',
    'local_auth', 'local_auth_android', 'local_auth_ios', 'flutter_secure_storage', 'encrypt',
    'path_provider', 'path', 'permission_handler', 'device_info_plus', 'package_info_plus',
    'share_plus', 'url_launcher', 'webview_flutter', 'flutter_inappwebview', 'app_links',
    'flutter_local_notifications', 'awesome_notifications', 'firebase_messaging',
    'intl', 'flutter_localizations', 'timeago', 'jiffy', 'date_format',
    'logger', 'fimber', 'talker', 'sentry_flutter', 'firebase_crashlytics',
    'flutter_lints', 'very_good_analysis', 'lint', 'custom_lint', 'dart_code_metrics',
    'mockito', 'mocktail', 'bloc_test', 'golden_toolkit', 'alchemist', 'flutter_test',
    'freezed', 'json_serializable', 'built_value', 'equatable', 'copy_with_extension',
    'go_router', 'auto_route', 'beamer', 'fluro', 'routemaster', 'vrouter',
    'flutter_native_splash', 'flutter_launcher_icons', 'rename', 'flutter_gen',
    'flutter_dotenv', 'envied', 'flutter_config', 'global_configuration',
    'flutter_screenutil', 'responsive_framework', 'flutter_responsive', 'sizer',
    'google_fonts', 'flutter_font_icons', 'font_awesome_flutter', 'flutter_vector_icons',
    'shimmer', 'skeletonizer', 'flutter_spinkit', 'loading_animation_widget',
    'flutter_slidable', 'flutter_swipe_action_cell', 'dismissible',
    'pull_to_refresh', 'flutter_easyrefresh', 'liquid_pull_to_refresh',
    'flutter_staggered_grid_view', 'flutter_staggered_animations', 'waterfall_flow',
    'flutter_sticky_header', 'grouped_list', 'scrollable_positioned_list',
    'flutter_html', 'flutter_widget_from_html', 'flutter_markdown', 'markdown',
    'flutter_math_fork', 'math_expressions', 'flutter_tex', 'extended_math',
    'charts_flutter', 'fl_chart', 'graphic', 'syncfusion_flutter_charts',
    'table_calendar', 'syncfusion_flutter_calendar', 'flutter_date_pickers',
    'flutter_typeahead', 'flutter_chips_input', 'flutter_tags', 'textfield_tags',
    'flutter_form_builder', 'formz', 'reactive_forms', 'flutter_validators',
    'flutter_rating_bar', 'flutter_neumorphic', 'glassmorphism', 'clay_containers',
    'flutter_animate', 'animations', 'flutter_sequence_animation', 'simple_animations',
    'confetti', 'flutter_animated_button', 'animated_text_kit', 'flutter_staggered_animations',
    'audioplayers', 'just_audio', 'flutter_sound', 'record', 'assets_audio_player',
    'video_player', 'chewie', 'better_player', 'flick_video_player', 'youtube_player_flutter',
    'camera', 'image_picker', 'photo_manager', 'gallery_saver', 'image_gallery_saver',
    'pdfx', 'native_pdf_view', 'flutter_pdfview', 'printing', 'pdf',
    'share_plus', 'share_extend', 'esys_flutter_share', 'flutter_share',
    'connectivity_plus', 'network_info_plus', 'wifi_info_flutter', 'dio',
    'workmanager', 'background_fetch', 'flutter_background_service', 'awesome_notifications',
    'in_app_purchase', 'purchase_client', 'flutter_inapp_purchase', 'revenuecat_purchases',
    'google_mobile_ads', 'facebook_audience_network', 'unity_ads_plugin', 'applovin_max',
    'flutter_branch_sdk', 'appsflyer_sdk', 'adjust_sdk', 'firebase_analytics',
    'sentry_flutter', 'datadog_flutter_plugin', 'newrelic_mobile', 'flutter_bugfender',
    'flutter_local_notifications', 'awesome_notifications', 'flutter_app_badger',
    'flutter_contacts', 'contacts_service', 'flutter_sms', 'flutter_email_sender',
    'url_launcher', 'maps_launcher', 'share_plus', 'app_links', 'uni_links',
    'flutter_barcode_scanner', 'mobile_scanner', 'qr_code_scanner', 'qr_flutter',
    'nfc_manager', 'flutter_nfc_kit', 'local_auth', 'flutter_secure_storage',
    'battery_plus', 'device_info_plus', 'package_info_plus', 'sensors_plus',
    'flutter_compass', 'flutter_qiblah', 'geocoding', 'geolocator', 'location',
    'google_maps_flutter', 'mapbox_gl', 'flutter_map', 'here_sdk',
    'speech_to_text', 'flutter_tts', 'avatar_glow', 'highlight_text',
  ],
  cpan: [
    'Moose', 'Moo', 'Mouse', 'Class::Accessor', 'Object::Tiny', 'Class::Tiny',
    'DBI', 'DBD::mysql', 'DBD::Pg', 'DBD::SQLite', 'DBIx::Class', 'Rose::DB',
    'Catalyst', 'Mojolicious', 'Dancer', 'Dancer2', 'Plack', 'PSGI',
    'Template::Toolkit', 'Text::Xslate', 'HTML::Template', 'Mason', 'Embperl',
    'LWP', 'HTTP::Tiny', 'Furl', 'WWW::Mechanize', 'Mojo::UserAgent',
    'JSON', 'JSON::XS', 'Cpanel::JSON::XS', 'JSON::PP', 'JSON::MaybeXS',
    'YAML', 'YAML::XS', 'YAML::Syck', 'YAML::PP', 'Config::General',
    'Log::Log4perl', 'Log::Dispatch', 'Log::Any', 'Log::Contextual',
    'Test::More', 'Test::Deep', 'Test::Exception', 'Test::Class', 'Test::BDD::Cucumber',
    'Devel::Cover', 'Devel::NYTProf', 'Perl::Critic', 'Perl::Tidy', 'B::Lint',
    'DateTime', 'Time::Piece', 'Date::Manip', 'Date::Calc', 'Time::Local',
    'Path::Class', 'Path::Tiny', 'File::Spec', 'File::Path', 'File::Temp',
    'Try::Tiny', 'TryCatch', 'autodie', 'Fatal', 'Exception::Class',
    'List::Util', 'List::MoreUtils', 'List::AllUtils', 'Array::Utils',
    'Hash::Merge', 'Hash::Util', 'Tie::Hash', 'Tie::Array',
    'Storable', 'Sereal', 'Data::Dumper', 'Data::Printer', 'YAML',
    'Encode', 'Unicode::Normalize', 'Text::Unidecode', 'Lingua::Translit',
    'Digest::SHA', 'Digest::MD5', 'Crypt::Eksblowfish', 'Crypt::Argon2',
    'IO::Socket::SSL', 'Net::SSLeay', 'Crypt::SSLeay', 'Mozilla::CA',
    'Email::Sender', 'Email::Valid', 'Mail::Sendmail', 'MIME::Lite',
    'Net::SMTP', 'Net::POP3', 'Net::IMAP::Client', 'Email::MIME',
    'XML::LibXML', 'XML::Simple', 'XML::Parser', 'XML::Twig', 'XML::Writer',
    'Spreadsheet::ParseExcel', 'Spreadsheet::WriteExcel', 'Excel::Writer::XLSX',
    'PDF::API2', 'CAM::PDF', 'PDF::Create', 'PDF::Reuse',
    'GD', 'Image::Magick', 'Imager', 'Chart::Gnuplot', 'SVG',
    'Text::CSV', 'Text::CSV_XS', 'Text::CSV_PP', 'Parse::CSV',
    'DBI', 'DBD::mysql', 'DBD::Pg', 'DBD::SQLite', 'DBIx::Class',
    'Redis', 'Redis::Fast', 'Cache::Memcached', 'MongoDB', 'CouchDB::Client',
    'Catalyst', 'Mojolicious', 'Dancer', 'Dancer2', 'Plack',
    'Moose', 'Moo', 'Mouse', 'Class::Accessor', 'Object::Tiny',
    'Carp', 'Carp::Always', 'Carp::Clan', 'warnings', 'strict',
    'Exporter', 'Sub::Exporter', 'Exporter::Tiny', 'Import::Into',
    'Const::Fast', 'Readonly', 'Class::Constant', 'constant',
    'namespace::autoclean', 'namespace::clean', 'Package::Stash',
    'Module::Build', 'ExtUtils::MakeMaker', 'Dist::Zilla', 'Module::Install',
    'Pod::Simple', 'Pod::Parser', 'Pod::Usage', 'Pod::Coverage',
    'App::cpanminus', 'local::lib', 'Carton', 'Pinto', 'CPAN::Mini',
  ],
  cocoapods: [
    'Alamofire', 'AFNetworking', 'Moya', 'URLNavigator', 'RxAlamofire',
    'PromiseKit', 'RxSwift', 'ReactiveCocoa', 'ReactiveSwift', 'Combine',
    'Kingfisher', 'SDWebImage', 'AlamofireImage', 'Nuke', 'PINRemoteImage',
    'SnapKit', 'Masonry', 'Cartography', 'TinyConstraints', 'Stevia',
    'SwiftLint', 'SwiftFormat', 'Tailor', 'IBLinter', 'Periphery',
    'RealmSwift', 'CoreStore', 'GRDB.swift', 'SQLite.swift', 'FMDB',
    'SwiftyJSON', 'ObjectMapper', 'CodableAlamofire', 'JSONEncoder',
    'KeychainAccess', 'Locksmith', 'Valet', 'UICKeyChainStore', 'SAMKeychain',
    'CryptoSwift', 'RNCryptor', 'Sodium', 'IDZSwiftCommonCrypto', 'OpenSSL',
    'Firebase', 'FirebaseCore', 'FirebaseAuth', 'FirebaseFirestore', 'FirebaseStorage',
    'GoogleSignIn', 'FBSDKLoginKit', 'TwitterKit', 'LinkedinSDK',
    'AWSMobileClient', 'AWSS3', 'AWSDynamoDB', 'AWSLambda', 'AWSCognito',
    'Stripe', 'Braintree', 'PayPal-iOS-SDK', 'SquareInAppPaymentsSDK',
    'TwilioVoice', 'TwilioChatClient', 'SendGrid', 'Mailgun',
    'Sentry', 'Bugsnag', 'Fabric', 'Crashlytics', 'FirebaseCrashlytics',
    'Mixpanel', 'Amplitude', 'Segment', 'FirebaseAnalytics', 'AppsFlyer',
    'Charts', 'PNChart', 'JBChartView', 'SwiftCharts', 'ScrollableGraphView',
    'Lottie', 'Spring', 'IBAnimatable', 'Advance', 'Pop', 'Hero',
    'RxSwift', 'RxCocoa', 'RxDataSources', 'RxGesture', 'RxKeyboard',
    'PromiseKit', 'BrightFutures', 'Bolts', 'Then', 'AwaitKit',
    'Swinject', 'Cleanse', 'Dip', 'Typhoon', 'Factory',
    'ReSwift', 'RxSwift', 'Bond', 'ReactiveKit', 'CombineCocoa',
    'Quick', 'Nimble', 'XCTest', 'OHHTTPStubs', 'Cuckoo',
    'SwiftGen', 'R.swift', 'SwiftColorGen', 'Natrium', 'Environ',
    'CocoaLumberjack', 'XCGLogger', 'SwiftyBeaver', 'Willow', 'Log',
    'SVProgressHUD', 'MBProgressHUD', 'PKHUD', 'JGProgressHUD', 'NVActivityIndicatorView',
    'Toast', 'CRToast', 'SwiftMessages', 'NotificationBanner', 'RKDropdownAlert',
    'IQKeyboardManager', 'TPKeyboardAvoiding', 'KeyboardObserver', 'KeyboardLayoutGuide',
    'DZNEmptyDataSet', 'EmptyStateKit', 'Empty', 'StateView',
    'MJRefresh', 'ESPullToRefresh', 'PullToRefreshKit', 'PullToBounk',
    'SDCycleScrollView', 'FSPagerView', 'TYCyclePagerView', 'KASlideShow',
    'FSCalendar', 'JTAppleCalendar', 'CalendarKit', 'DateTools',
    'ActionSheetPicker', 'IQActionSheetPickerView', 'RMPickerViewController',
    'XLForm', 'Eureka', 'Former', 'SwiftForms', 'Form',
    'ImagePicker', 'BSImagePicker', 'DKImagePickerController', 'TLPhotoPicker',
    'MWPhotoBrowser', 'IDMPhotoBrowser', 'SKPhotoBrowser', 'NYTPhotoViewer',
    'SVWebViewController', 'TOWebViewController', 'KINWebBrowser', 'SwiftWebVC',
    'Reachability', 'AlamofireNetworkActivityIndicator', 'NetworkEye', 'ResponseDetective',
    'Fabric', 'Crashlytics', 'FirebaseCrashlytics', 'Sentry', 'Bugsnag',
    'Appirater', 'iRate', 'UAAppReviewManager', 'Armchair', 'RateView',
    'Onboard', 'EAIntroView', 'MYBlurIntroductionView', 'JazzHands',
    'Instructions', 'CoachMarksController', 'MaterialShowcase', 'Gecco',
    'PermissionScope', 'ISHPermissionKit', 'JLPermissions', 'ClusterPrePermissions',
    'SwiftyStoreKit', 'RMStore', 'InAppSettingsKit', 'CargoBay',
    'Google-Mobile-Ads-SDK', 'FBAudienceNetwork', 'MoPub-iOS-SDK', 'AdMob',
    'Branch', 'AppsFlyerFramework', 'Adjust', 'Kochava', 'Tune',
    'Mapbox-iOS-SDK', 'GoogleMaps', 'ArcGIS-Runtime-SDK-iOS', 'HEREMaps',
    'Socket.IO-Client-Swift', 'Starscream', 'SwiftWebSocket', 'SocketRocket',
    'PusherSwift', 'Ably', 'PubNub', 'LayerKit',
  ],
};

// 全パッケージをフラット化
function getAllPackages() {
  const all = [];
  for (const [ecosystem, packages] of Object.entries(PACKAGES)) {
    for (const pkg of packages) {
      all.push({ ecosystem, package: pkg });
    }
  }
  return all;
}

// 状態を読み込み
function loadState() {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  }
  return {
    currentIndex: 0,
    totalPackages: getAllPackages().length,
    results: [],
    errors: [],
    startTime: new Date().toISOString(),
  };
}

// 状態を保存
function saveState(state) {
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  
  // サマリーCSVも更新
  updateSummaryCsv(state);
}

// ログを追記
function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  console.log(line.trim());
  
  // ディレクトリが存在しない場合は作成
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }
  
  appendFileSync(LOG_FILE, line);
}

// RepVetでパッケージを診断
async function diagnosePackage(ecosystem, packageName) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const child = spawn('node', [
      join(ROOT_DIR, 'dist/cli.js'),
      'check',
      packageName,
      '-e', ecosystem,
      '--json'
    ], {
      cwd: ROOT_DIR,
      timeout: 60000, // 60秒タイムアウト
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const executionTime = Date.now() - startTime;
      
      if (code !== 0) {
        reject(new Error(`Exit code ${code}: ${stderr || stdout}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve({
          ...result,
          executionTimeMs: executionTime,
          diagnosedAt: new Date().toISOString(),
        });
      } catch (e) {
        reject(new Error(`Failed to parse JSON: ${e.message}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

// バッチ実行
async function runBatch(batchSize = 10) {
  const state = loadState();
  const allPackages = getAllPackages();
  
  if (state.currentIndex >= allPackages.length) {
    log('✅ All packages diagnosed!');
    return { done: true };
  }

  const batch = allPackages.slice(state.currentIndex, state.currentIndex + batchSize);
  log(`📦 Starting batch: ${state.currentIndex + 1}-${Math.min(state.currentIndex + batchSize, allPackages.length)} / ${allPackages.length}`);

  const results = [];
  const errors = [];

  for (const { ecosystem, package: pkg } of batch) {
    try {
      log(`  🔍 Diagnosing: ${pkg} (${ecosystem})`);
      const result = await diagnosePackage(ecosystem, pkg);
      results.push({
        ecosystem,
        package: pkg,
        ...result,
      });
      log(`    ✅ Score: ${result.score}/100 (${result.riskLevel})`);
    } catch (err) {
      log(`    ❌ Error: ${err.message}`);
      errors.push({
        ecosystem,
        package: pkg,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 結果を保存
  state.results.push(...results);
  state.errors.push(...errors);
  state.currentIndex += batch.length;
  saveState(state);

  // 個別の結果ファイルも作成
  for (const result of results) {
    const filename = `${result.ecosystem}_${result.package.replace(/[\/:@]/g, '_')}.json`;
    writeFileSync(
      join(RESULTS_DIR, filename),
      JSON.stringify(result, null, 2)
    );
  }

  // エラーも保存
  if (errors.length > 0) {
    const errorFile = join(RESULTS_DIR, 'errors.json');
    const existingErrors = existsSync(errorFile) ? JSON.parse(readFileSync(errorFile, 'utf-8')) : [];
    existingErrors.push(...errors);
    writeFileSync(errorFile, JSON.stringify(existingErrors, null, 2));
  }

  log(`📊 Batch complete: ${results.length} success, ${errors.length} errors`);
  log(`📍 Progress: ${state.currentIndex}/${allPackages.length} (${((state.currentIndex / allPackages.length) * 100).toFixed(1)}%)`);

  // バッチ番号を計算
  const batchNumber = Math.floor(state.currentIndex / batchSize) || 1;

  // Gitコミット（変更がある場合）
  await commitResults(batchNumber);

  return {
    done: state.currentIndex >= allPackages.length,
    results,
    errors,
    progress: {
      current: state.currentIndex,
      total: allPackages.length,
      percentage: (state.currentIndex / allPackages.length) * 100,
    },
  };
}

// メイン実行
async function main() {
  const batchSize = parseInt(process.env.BATCH_SIZE || '10', 10);
  
  log('🚀 RepVet Batch Diagnosis Started');
  log(`📋 Batch size: ${batchSize}`);
  
  const result = await runBatch(batchSize);
  
  if (result.done) {
    log('🎉 All batches completed!');
    process.exit(0);
  } else {
    log('⏳ Next batch scheduled in 30 minutes');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
