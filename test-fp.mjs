/**
 * False positive test: check legitimate npm packages against typosquat detector
 * These are REAL packages - they should NOT be flagged as typosquats
 */
import { checkTyposquat } from './dist/typosquat/detector.js';

// Real, legitimate npm packages that might look similar to popular ones
const LEGITIMATE_PACKAGES = [
  // Real packages with similar names to popular ones
  'execa',       // not "express" typo
  'got',         // short, real HTTP client
  'ky',          // short, real HTTP client
  'pify',        // real promisify lib
  'meow',        // real CLI helper
  'yargs',       // real CLI parser
  'mri',         // real arg parser
  'cac',         // real CLI framework
  'degit',       // real git clone tool
  'defu',        // real deep defaults
  'ohash',       // real hash lib
  'ufo',         // real URL lib
  'exif',        // real EXIF parser
  'conf',        // real config store (vs nconf)
  'nconf',       // real hierarchical config
  'wrap-ansi',   // real ANSI text wrapper
  'ansi-styles', // real ANSI styling
  'strip-ansi',  // real ANSI stripping
  'normalize-url', // real URL normalizer
  'p-map',       // real promise mapper
  'p-limit',     // real promise limiter
  'p-queue',     // real promise queue
  'p-retry',     // real promise retry
  'del',         // real file deletion
  'globby',      // real glob lib
  'chokidar',    // real file watcher
  'fast-glob',   // real fast glob
  'pathe',       // real path utils (not "path" typo)
  'mlly',        // real ESM utils
  'jiti',        // real TS/ESM runtime
  'nitro',       // real server engine
  'h3',          // real HTTP framework
  'ofetch',      // real fetch lib
  'hookable',    // real hook system
  'unenv',       // real env polyfill
  'unstorage',   // real storage abstraction
  'radix3',      // real router
  'citty',       // real CLI builder
  'giget',       // real git downloader
  'listhen',     // real HTTP listener
  'untyped',     // real schema builder
  'pkg-types',   // real package type utils
  'kolorist',    // real color lib (not "colors" typo)
  'picocolors',  // real color lib
  'kleur',       // real color lib
  'nanoid',      // real ID generator
  'cuid',        // real ID generator
  'ulid',        // real ID generator
  'zod',         // real validator
  'yup',         // real validator
  'joi',         // real validator
  'ajv',         // real JSON schema
  'pino',        // real logger
  'bunyan',      // real logger
  'lru-cache',   // real LRU cache
  'keyv',        // real KV store
  'ioredis',     // real Redis client
  'knex',        // real SQL builder
  'drizzle-orm', // real ORM
  'kysely',      // real query builder
  'hono',        // real web framework
  'elysia',      // real web framework
  'fastify',     // real web framework
  'koa',         // real web framework
  'nest',        // real(ish) - NestJS related
  'nuxt',        // real Vue meta-framework
  'svelte',      // real framework
  'solid-js',    // real framework
  'preact',      // real React alternative
  'inferno',     // real React-like
  'mithril',     // real framework
  'alpinejs',    // real framework
  'petite-vue',  // real Vue subset
  'htm',         // real JSX alternative
  'tsx',         // real TS executor
  'tsup',        // real TS bundler
  'tslib',       // real TS runtime lib
  'ts-node',     // real TS node runtime
  'consola',     // real elegant console logger
  'destr',       // real JSON parser
  'scule',       // real string case utils
  'perfect-debounce', // real debounce
  'unimport',    // real auto-import
  'unplugin',    // real universal plugin system
  'c12',         // real config loader
  'rc9',         // real RC file loader
  'changelogen', // real changelog generator
  'pkg-pr-new',  // real PR-based publishing
  'sirv',        // real static file server
  'tinypool',    // real worker pool
  'tinybench',   // real benchmarking
  'tinyspy',     // real spy library
  'vitest',      // real test runner
  'playwright',  // real browser automation
  'cypress',     // real E2E testing
  'puppeteer',   // real browser automation
  'cheerio',     // real HTML parser
  'jsdom',       // real DOM implementation
  'linkedom',    // real DOM implementation
  'undom',       // real minimal DOM
  'dompurify',   // real HTML sanitizer
  'marked',      // real markdown parser
  'shiki',       // real syntax highlighter
  'prismjs',     // real syntax highlighter
  'rehype',      // real HTML processor
  'remark',      // real markdown processor
  'mdast',       // real markdown AST
  'hast',        // real HTML AST
  'estree',      // real JS AST spec
  'recast',      // real AST transformer
  'acorn',       // real JS parser
  'esprima',     // real JS parser
  'meriyah',     // real JS parser
  'sucrase',     // real fast TS/JSX compiler
  'oxc',         // real Rust-based JS tools
  'biome',       // real linter/formatter
  'oxlint',      // real linter
  'dprint',      // real formatter
];

let falsePositives = 0;
let total = LEGITIMATE_PACKAGES.length;
const fpList = [];

for (const pkg of LEGITIMATE_PACKAGES) {
  const matches = checkTyposquat(pkg);
  if (matches.length > 0) {
    falsePositives++;
    const topMatch = matches[0];
    fpList.push({
      package: pkg,
      matchedTo: topMatch.target,
      similarity: topMatch.similarity.toFixed(3),
      risk: topMatch.risk,
      patterns: topMatch.patterns.map(p => p.pattern).join(', '),
    });
  }
}

console.log(`\n=== False Positive Test Results ===`);
console.log(`Tested: ${total} legitimate packages`);
console.log(`False positives: ${falsePositives} (${(falsePositives/total*100).toFixed(1)}%)`);
console.log(`Precision: ${((1 - falsePositives/total)*100).toFixed(1)}%\n`);

if (fpList.length > 0) {
  console.log('False positives detail:');
  for (const fp of fpList) {
    console.log(`  ${fp.package} → ${fp.matchedTo} (sim=${fp.similarity}, risk=${fp.risk}${fp.patterns ? ', patterns=' + fp.patterns : ''})`);
  }
}
