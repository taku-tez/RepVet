/**
 * Typosquat detector engine
 * Combines similarity algorithms and pattern detection
 */

import { 
  combinedSimilarity, 
  levenshteinSimilarity, 
  damerauLevenshteinSimilarity,
  jaroWinklerSimilarity,
  ngramSimilarity,
  couldBeSimilar,
} from './similarity.js';
import { detectPatterns, PatternMatch } from './patterns.js';
import { getPopularPackages, getHighValueTargets, PopularPackage } from './popular-packages.js';

export interface TyposquatMatch {
  /** The package being checked */
  package: string;
  /** The legitimate package this might be impersonating */
  target: string;
  /** Combined similarity score (0-1) */
  similarity: number;
  /** Individual similarity scores */
  scores: {
    levenshtein: number;
    damerauLevenshtein: number;
    jaroWinkler: number;
    ngram: number;
    combined: number;
  };
  /** Detected manipulation patterns */
  patterns: PatternMatch[];
  /** Risk level based on similarity and patterns */
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Target package info (downloads, etc.) */
  targetInfo?: PopularPackage;
  /** Reason for flagging */
  reason: string;
}

export interface DetectorOptions {
  /** Minimum similarity threshold (0-1), default 0.75 */
  threshold?: number;
  /** Maximum number of matches to return per package */
  maxMatches?: number;
  /** Ecosystem to check against */
  ecosystem?: 'npm' | 'pypi';
  /** Only check against high-value targets */
  highValueOnly?: boolean;
  /** Include pattern-only matches (lower similarity but matching pattern) */
  includePatternMatches?: boolean;
}

const DEFAULT_THRESHOLD = 0.75;
const DEFAULT_MAX_MATCHES = 3;

// Pattern match threshold - if a pattern is detected, accept lower similarity
const PATTERN_MATCH_THRESHOLD = 0.65;

/**
 * Calculate risk level based on similarity, patterns, and target value
 */
function calculateRisk(
  similarity: number, 
  patterns: PatternMatch[], 
  isHighValue: boolean
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  // High-confidence patterns (homoglyph, scope confusion) are most dangerous
  const hasDangerousPattern = patterns.some(p => 
    p.pattern === 'homoglyph' || 
    p.pattern === 'scope-confusion' ||
    (p.pattern === 'character-swap' && p.confidence >= 0.9)
  );
  
  const hasHighConfidencePattern = patterns.some(p => p.confidence >= 0.85);
  const patternCount = patterns.length;
  
  // High-value targets get elevated risk
  const valueMultiplier = isHighValue ? 1 : 0;
  
  // CRITICAL: Very high similarity + dangerous pattern + high-value target
  if (similarity >= 0.92 && hasDangerousPattern) return 'CRITICAL';
  if (similarity >= 0.95 && isHighValue) return 'CRITICAL';
  
  // HIGH: High similarity with patterns or high-value target
  if (similarity >= 0.88 && (hasHighConfidencePattern || isHighValue)) return 'HIGH';
  if (similarity >= 0.9 && patternCount > 0) return 'HIGH';
  
  // MEDIUM: Moderate similarity with patterns
  if (similarity >= 0.8 || (similarity >= 0.75 && patternCount > 0)) return 'MEDIUM';
  if (similarity >= 0.75 && isHighValue) return 'MEDIUM';
  if (similarity >= 0.7 && hasDangerousPattern) return 'MEDIUM';
  
  return 'LOW';
}

/**
 * Generate human-readable reason for the match
 */
function generateReason(match: TyposquatMatch): string {
  const parts: string[] = [];
  
  if (match.patterns.length > 0) {
    const patternNames = match.patterns.map(p => {
      switch (p.pattern) {
        case 'character-swap': return 'swapped characters';
        case 'character-duplicate': return 'duplicated character';
        case 'character-omission': return 'missing character';
        case 'character-insertion': return 'extra character';
        case 'homoglyph': return 'lookalike characters';
        case 'hyphen-manipulation': return 'hyphen manipulation';
        case 'scope-confusion': return 'scope confusion';
        case 'version-suffix': return 'suspicious suffix';
        case 'prefix-suffix': return 'suspicious prefix';
        case 'common-typo': return 'keyboard typo';
        case 'bitsquat': return 'bit flip';
        default: return p.pattern;
      }
    });
    parts.push(`Detected: ${patternNames.join(', ')}`);
  }
  
  parts.push(`${(match.similarity * 100).toFixed(0)}% similar to "${match.target}"`);
  
  if (match.targetInfo?.weeklyDownloads) {
    const dl = match.targetInfo.weeklyDownloads;
    const formatted = dl >= 1000000 ? `${(dl / 1000000).toFixed(0)}M` : `${(dl / 1000).toFixed(0)}K`;
    parts.push(`(${formatted}/week)`);
  }
  
  if (match.targetInfo?.highValue) {
    parts.push('⚠️ High-value target');
  }
  
  return parts.join(' ');
}

/**
 * Check if two packages are in the same npm scope
 */
function isSameScope(a: string, b: string): boolean {
  const scopeA = a.startsWith('@') ? a.split('/')[0] : null;
  const scopeB = b.startsWith('@') ? b.split('/')[0] : null;
  return scopeA !== null && scopeA === scopeB;
}

/**
 * Known legitimate package pairs that are NOT typosquats
 * These are related packages (old/new versions, different maintainers, etc.)
 */
const LEGITIMATE_PAIRS: Array<[string, string]> = [
  // Scoped vs unscoped versions
  ['@babel/core', 'babel-core'],
  ['@babel/preset-env', 'babel-preset-env'],
  ['@babel/cli', 'babel-cli'],
  ['@jest/core', 'jest-core'],
  ['@apollo/client', 'apollo-client'],
  ['@apollo/server', 'apollo-server'],
  ['@types/node', 'node'],
  ['@types/react', 'react'],
  ['@types/lodash', 'lodash'],
  
  // Related but different packages
  ['tmpl', 'tmp'],  // template vs temp files
  ['chalk', 'charlike'],
  ['got', 'go'],  // Different languages
  ['ora', 'ora-classic'],
  ['inquirer', 'enquirer'], // Both are legitimate CLI prompt libs
  
  // Version/variant pairs
  ['mysql', 'mysql2'],
  ['psycopg2', 'psycopg2-binary'],
  
  // Ecosystem packages
  ['vue', 'vuex'],
  ['vue', 'vue-router'],
  ['react', 'redux'],
  ['react', 'react-dom'],
  ['react', 'react-router'],
  ['vite', 'vitest'],
  
  // CLI extensions
  ['webpack', 'webpack-cli'],
  ['webpack', 'webpack-dev-server'],
  ['eslint', 'eslint-plugin-react'],
  ['eslint', 'eslint-plugin-import'],
  
  // Short name collisions
  ['nest', 'next'],
  ['nest', 'jest'],
  ['koa', 'coa'],
  ['got', 'get'],
  ['tap', 'tape'],
  ['nconf', 'conf'],    // nconf = hierarchical config, conf = simple config store
  ['clsx', 'xlsx'],     // clsx = classname utility, xlsx = spreadsheet parser
  ['color', 'colors'],  // Both legitimate - color manipulation libs
  ['socks', 'sockjs'],  // socks = SOCKS proxy client, sockjs = WebSocket emulation
  ['preact', 'react'],  // Preact is a legitimate lightweight React alternative
  ['scrypt', 'bcrypt'], // Both are legitimate crypto hashing algorithms
  ['tslint', 'eslint'], // Both are legitimate linters (tslint deprecated but real)
  ['@emotion/react', 'emotion'],   // Scoped emotion packages
  ['@emotion/styled', 'emotion'],  // Scoped emotion packages
  ['@vue/cli', 'vue'],             // Vue CLI tooling
  ['@aws-sdk/client-s3', 'aws-sdk'], // AWS SDK v3 scoped packages
  ['@prisma/client', 'prisma'],    // Prisma ORM scoped package
  ['mysql', 'mssql'],              // MySQL vs MS SQL - different databases
  
  // Lodash ESM variant vs method packages
  ['lodash-es', 'lodash.get'],
  ['lodash-es', 'lodash.set'],
  ['lodash-es', 'lodash.merge'],
  
  // Lodash family
  ['lodash', 'lodash.get'],
  ['lodash', 'lodash.set'],
  ['lodash', 'lodash.merge'],
  ['lodash', 'lodash.debounce'],
  ['lodash', 'lodash.throttle'],
  ['lodash.get', 'lodash.set'],
  ['lodash.get', 'lodash.merge'],
  ['lodash.set', 'lodash.merge'],
  ['lodash.debounce', 'lodash.throttle'],
  
  // Testing libraries
  ['jest', 'jest-cli'],
  ['mocha', 'chai'],
  ['pytest', 'pytest-cov'],
  ['pytest', 'pytest-mock'],
  ['pytest', 'pytest-asyncio'],
  ['pytest-cov', 'pytest-mock'],
  
  // React ecosystem
  ['react-router', 'react-router-dom'],
  
  // ESLint plugins (all legitimate)
  ['eslint-plugin-react', 'eslint-plugin-import'],
  
  // Short names that are legitimately similar
  ['tap', 'tar'],
  ['next', 'nuxt'],
  ['mock', 'nock'],    // mock = general mocking lib, nock = HTTP mocking
  ['arc', 'arg'],      // Both legitimate short-name packages
  ['art', 'arg'],      // art = ASCII art, arg = CLI argument parser
  ['drizzle', 'drizzle-orm'],  // drizzle is the core of drizzle-orm
  
  // Glob variants
  ['glob', 'globby'],
  
  // Crypto/auth pairs
  ['bcrypt', 'bcryptjs'],
  ['passport', 'passport-jwt'],
  ['passport', 'passport-local'],
  
  // GraphQL ecosystem
  ['graphql', 'graphql-tag'],
  ['graphql', 'graphql-tools'],
  ['graphql-tag', 'graphql-tools'],
  
  // Commander family
  ['commander', 'commander-js'],
  
  // Jest family
  ['jest', 'jestjs'],
  ['jose', 'jestjs'], // jose (JWT lib) vs jestjs (jest wrapper) - unrelated
  ['nestjs', 'jestjs'], // NestJS framework vs Jest wrapper - unrelated
  
  // ESLint plugins (all legitimate ecosystem plugins)
  ['eslint-plugin-vue', 'eslint-plugin-react'],
  ['eslint-plugin-jest', 'eslint-plugin-react'],
  ['eslint-plugin-jest', 'eslint-plugin-import'],
  ['eslint-plugin-vue', 'eslint-plugin-import'],
  ['eslint-plugin-jest', 'eslint-plugin-vue'],
  
  // Task runner variants
  ['listr', 'listr2'], // listr2 is the maintained successor of listr
  
  // ESM variants
  ['lodash', 'lodash-es'],
  
  // Express ecosystem
  ['express', 'express-ws'],
  ['express', 'expressions'], // expressions is a math expression parser
  
  // Pypi pairs
  ['request', 'requests'], // Different ecosystems - npm request vs pypi requests
  
  // UUID variants
  ['short-uuid', 'shortid'],  // short-uuid = UUID shortener, shortid = ID generator
  
  // Python web servers (both are legitimate WSGI/ASGI servers)
  ['uvicorn', 'gunicorn'],
  
  // Python Redis
  ['redis-py', 'rpds-py'],  // redis-py = Redis client, rpds-py = Rust persistent data structures
  
  // Unrelated packages with coincidental similarity
  ['destr', 'destroy'],     // destr = safe JSON parse, destroy = stream destroy
  ['prismjs', 'prisma'],    // PrismJS = syntax highlighter, Prisma = ORM
  
  // British/American spelling variants
  ['colors', 'colours'],  // colours is the British spelling variant
  ['color', 'colour'],
  ['favorite', 'favourite'],
  ['center', 'centre'],
  
  // Popular legitimate variants
  ['dotenv', 'dotenvx'],   // dotenvx is a legitimate dotenv successor
  ['express', 'expression'],
  ['express', 'expressive'],
  ['moment', 'momently'],
  ['commander', 'commands'],
  ['color', 'colord'],     // colord is a legitimate color manipulation lib
  ['request', 'requested'],
  ['mongoose', 'mongodb'],
  ['passport', 'passports'],
  ['tensorflow', 'tensorflow-gpu'],
  ['beautifulsoup4', 'beautiful-soup'],
  ['pycryptodome', 'pycrypto'],  // pycrypto is the predecessor
  ['rich', 'riches'],
  ['cors', 'core'],        // Completely different packages
  ['vuex', 'vues'],        // vuex is vue state management
  ['nestjs', 'nextjs'],    // NestJS vs NextJS - completely different frameworks
  ['uuid', 'uuidv4'],     // uuidv4 is a legitimate uuid v4 generator
  ['colors', 'colour'],   // colour is British spelling
  ['colors', 'colord'],   // colord is a legitimate color lib
  ['passport', 'passport-jwt'],
  ['pil', 'pip'],         // PIL (Python Imaging Library) vs pip
  ['crypto', 'bcrypt'],   // crypto is Node.js builtin, bcrypt is hashing lib
  ['request', 'requests2'], // requests2 is a legitimate fork
  ['expression', 'express-session'],
  ['expression', 'compression'],
  
  // Similar but legitimate short packages
  ['arg', 'args'],        // Both are legitimate CLI argument parsers
  ['yargs', 'args'],      // args is a separate legitimate package
  
  // YAML ecosystem
  ['yaml', 'yamljs'],     // yamljs is a legitimate YAML parser
  ['yaml', 'js-yaml'],
  
  // Babel migration pairs (old unscoped → new scoped)
  ['@babel/plugin-transform-runtime', 'babel-plugin-transform-runtime'],
  ['@babel/plugin-proposal-class-properties', 'babel-plugin-transform-class-properties'],
  ['@babel/plugin-proposal-object-rest-spread', 'babel-plugin-transform-object-rest-spread'],
  ['@babel/register', 'babel-register'],
  ['@babel/polyfill', 'babel-polyfill'],
  ['@babel/runtime', 'babel-runtime'],
  ['@babel/template', 'babel-template'],
  ['@babel/traverse', 'babel-traverse'],
  ['@babel/types', 'babel-types'],
  ['@babel/generator', 'babel-generator'],
  ['@babel/helpers', 'babel-helpers'],
  ['@babel/code-frame', 'babel-code-frame'],
];

/**
 * Check if a pair is a known legitimate combination
 */
/** Well-known legitimate suffixes that create variant packages */
const LEGITIMATE_SUFFIXES = ['-es', '-esm', '-cjs', '-cli', '-core', '-lite', '-next', '-ng', '-js', '-ts', '-io', '-api', '-app', '-dev', '-pro', '-plus', '-hub', '-kit', '-lib', '-sdk', '-utils', '-helpers', '-tools', '-common'];

/**
 * Check if two names differ only by a common legitimate variation pattern.
 * Returns true if the difference looks like a normal ecosystem variant rather than a typosquat.
 */
function isLegitimateVariation(a: string, b: string, knownNames?: Set<string>): boolean {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  
  // Plural: one is the other + 's' — but only exempt if the plural form is itself
  // a known popular package (e.g., "colors" vs "color" is legit because both exist,
  // but "lodashs" vs "lodash" is suspicious because "lodashs" is not a real package)
  if (aLower === bLower + 's' || bLower === aLower + 's') {
    // Only exempt if it doesn't create a double-letter ending
    const longer = aLower.length > bLower.length ? aLower : bLower;
    if (longer.length >= 2 && longer[longer.length - 1] === 's' && longer[longer.length - 2] !== 's') {
      // Only exempt if the plural form is a known popular package
      if (knownNames && knownNames.has(longer)) {
        return true;
      }
      // If no known names provided, skip exemption (conservative)
      if (!knownNames) return true;
    }
  }
  
  // Dot-separated method packages (e.g., "lodash.get" should not match "lodash.set")
  if (aLower.includes('.') && bLower.includes('.')) {
    const [aBase] = aLower.split('.');
    const [bBase] = bLower.split('.');
    if (aBase === bBase) return true;
  }
  
  // Hyphenated sub-packages sharing same prefix (e.g., "babel-cli" vs "babel-core")
  if (aLower.includes('-') && bLower.includes('-')) {
    const aParts = aLower.split('-');
    const bParts = bLower.split('-');
    if (aParts[0] === bParts[0] && aParts.length > 1 && bParts.length > 1) return true;
  }
  
  // Version suffix patterns (e.g., "mysql2" vs "mysql", "requests2" vs "requests")
  const versionSuffixRe = /^(.+?)(\d+)$/;
  const aMatch = aLower.match(versionSuffixRe);
  const bMatch = bLower.match(versionSuffixRe);
  if (aMatch && aMatch[1] === bLower) return true;
  if (bMatch && bMatch[1] === aLower) return true;
  
  // Common non-hyphenated suffixes (e.g., "knexjs" vs "knex", "nextjs" vs "next")
  const nonHyphenSuffixes = ['js', 'ts', 'io', 'py', 'rs', 'go', 'rb'];
  for (const sfx of nonHyphenSuffixes) {
    if (aLower === bLower + sfx || bLower === aLower + sfx) return true;
  }
  
  // Hyphen vs no-hyphen for compound words (e.g., "dot-env" vs "dotenv", "socket-io" vs "socketio")
  if (aLower.replace(/-/g, '') === bLower.replace(/-/g, '')) return true;
  
  // Dot vs hyphen vs concatenation (e.g., "socket.io" vs "socketio" vs "socket-io")
  const normalize = (s: string) => s.replace(/[-_.]/g, '');
  if (normalize(aLower) === normalize(bLower)) return true;
  
  return false;
}

function isLegitimatePair(a: string, b: string, knownNames?: Set<string>): boolean {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  
  // Check explicit pairs
  if (LEGITIMATE_PAIRS.some(([x, y]) => 
    (aLower === x.toLowerCase() && bLower === y.toLowerCase()) ||
    (aLower === y.toLowerCase() && bLower === x.toLowerCase())
  )) return true;
  
  // Check if one is the other + a well-known suffix
  for (const suffix of LEGITIMATE_SUFFIXES) {
    if (aLower === bLower + suffix || bLower === aLower + suffix) return true;
  }
  
  // Check common legitimate variation patterns
  if (isLegitimateVariation(a, b, knownNames)) return true;
  
  return false;
}

/**
 * Check if a package name could be a typosquat of a popular package
 */
export function checkTyposquat(
  packageName: string,
  options: DetectorOptions = {}
): TyposquatMatch[] {
  const {
    threshold = DEFAULT_THRESHOLD,
    maxMatches = DEFAULT_MAX_MATCHES,
    ecosystem = 'npm',
    highValueOnly = false,
    includePatternMatches = true,
  } = options;
  
  const rawPackages = highValueOnly 
    ? getHighValueTargets(ecosystem) 
    : getPopularPackages(ecosystem);
  
  // Dedup popular packages by name (keep the one with most info)
  const seenNames = new Set<string>();
  const popularPackages: typeof rawPackages = [];
  for (const pkg of rawPackages) {
    const key = pkg.name.toLowerCase();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      popularPackages.push(pkg);
    }
  }
  
  const matches: TyposquatMatch[] = [];
  const nameLower = packageName.toLowerCase();
  
  // Adjust threshold for short package names (more prone to false positives)
  const bareNameLen = nameLower.replace(/@[^/]+\//, '').length;
  const shortNameThreshold = bareNameLen <= 4 
    ? Math.max(threshold, 0.9) 
    : threshold;
  
  for (const target of popularPackages) {
    const targetLower = target.name.toLowerCase();
    
    // Skip if checking against itself
    if (nameLower === targetLower) continue;
    
    // Skip if the package being checked is itself a popular/legitimate package
    // (e.g., numpy should not be flagged as typosquat of numppy, cors should not flag as typosquat of core)
    const isPackagePopular = popularPackages.some(p => p.name.toLowerCase() === nameLower);
    if (isPackagePopular) continue;
    
    // Skip if same npm scope (e.g., @typescript-eslint/types vs @typescript-eslint/parser)
    // These are related packages, not typosquats
    if (isSameScope(packageName, target.name)) continue;
    
    // Skip known legitimate package pairs
    if (isLegitimatePair(packageName, target.name, seenNames)) continue;
    
    // Quick filter for performance
    // Bypass for potential scope-confusion (scoped vs unscoped)
    const isScopeConfusionCandidate = nameLower.startsWith('@') && !targetLower.startsWith('@');
    if (!isScopeConfusionCandidate && !couldBeSimilar(nameLower, targetLower, shortNameThreshold * 0.8)) continue;
    
    // Calculate all similarity scores
    const levSim = levenshteinSimilarity(nameLower, targetLower);
    const damSim = damerauLevenshteinSimilarity(nameLower, targetLower);
    const jwSim = jaroWinklerSimilarity(nameLower, targetLower);
    const ngramSim = ngramSimilarity(nameLower, targetLower, 2);
    const combined = combinedSimilarity(nameLower, targetLower);
    
    // Detect patterns
    const patterns = detectPatterns(packageName, target.name);
    
    // Determine if this is a match
    // Use higher threshold for short names to reduce false positives
    // But relax for high-value targets (axios, react, chalk etc.) since typosquatting risk is higher
    const isHighValue = target.highValue ?? false;
    const baseThreshold = bareNameLen <= 4 
      ? (isHighValue ? Math.max(threshold, 0.8) : shortNameThreshold) 
      : threshold;
    const effectiveThreshold = (includePatternMatches && patterns.length > 0) 
      ? Math.min(baseThreshold, PATTERN_MATCH_THRESHOLD)
      : baseThreshold;
    
    if (combined < effectiveThreshold && patterns.length === 0) continue;
    
    // Skip if similarity is too low even with patterns
    if (combined < 0.5) continue;
    
    // Calculate risk
    const risk = calculateRisk(combined, patterns, isHighValue);
    
    const match: TyposquatMatch = {
      package: packageName,
      target: target.name,
      similarity: combined,
      scores: {
        levenshtein: levSim,
        damerauLevenshtein: damSim,
        jaroWinkler: jwSim,
        ngram: ngramSim,
        combined,
      },
      patterns,
      risk,
      targetInfo: target,
      reason: '', // Will be set below
    };
    
    match.reason = generateReason(match);
    matches.push(match);
  }
  
  // Sort by risk level first, then similarity
  const riskOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
  return matches
    .sort((a, b) => {
      const riskDiff = riskOrder[a.risk] - riskOrder[b.risk];
      if (riskDiff !== 0) return riskDiff;
      return b.similarity - a.similarity;
    })
    .slice(0, maxMatches);
}

/**
 * Check multiple packages for typosquatting
 */
export function checkTyposquatBatch(
  packageNames: string[],
  options: DetectorOptions = {}
): Map<string, TyposquatMatch[]> {
  const results = new Map<string, TyposquatMatch[]>();
  
  for (const name of packageNames) {
    const matches = checkTyposquat(name, options);
    if (matches.length > 0) {
      results.set(name, matches);
    }
  }
  
  return results;
}

/**
 * Get summary statistics for a batch check
 */
export function getTyposquatSummary(results: Map<string, TyposquatMatch[]>): {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  topTargets: string[];
} {
  let critical = 0, high = 0, medium = 0, low = 0;
  const targetCounts = new Map<string, number>();
  
  for (const matches of results.values()) {
    for (const match of matches) {
      switch (match.risk) {
        case 'CRITICAL': critical++; break;
        case 'HIGH': high++; break;
        case 'MEDIUM': medium++; break;
        case 'LOW': low++; break;
      }
      targetCounts.set(match.target, (targetCounts.get(match.target) || 0) + 1);
    }
  }
  
  const topTargets = Array.from(targetCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([target]) => target);
  
  return {
    total: critical + high + medium + low,
    critical,
    high,
    medium,
    low,
    topTargets,
  };
}

/**
 * Format typosquat match for display
 */
export function formatTyposquatMatch(match: TyposquatMatch): string {
  const riskIcons: Record<string, string> = {
    LOW: '🟢',
    MEDIUM: '🟡',
    HIGH: '🟠',
    CRITICAL: '🔴',
  };
  
  const lines: string[] = [];
  
  lines.push(`${riskIcons[match.risk]} ${match.package} → similar to "${match.target}"`);
  lines.push(`   Similarity: ${(match.similarity * 100).toFixed(1)}%`);
  
  if (match.targetInfo?.weeklyDownloads) {
    const downloads = match.targetInfo.weeklyDownloads;
    const formatted = downloads >= 1000000 
      ? `${(downloads / 1000000).toFixed(1)}M`
      : `${(downloads / 1000).toFixed(0)}K`;
    lines.push(`   Target downloads: ${formatted}/week`);
  }
  
  if (match.patterns.length > 0) {
    const patternDescs = match.patterns.map(p => `${p.pattern} (${(p.confidence * 100).toFixed(0)}%)`);
    lines.push(`   Patterns: ${patternDescs.join(', ')}`);
  }
  
  if (match.targetInfo?.highValue) {
    lines.push(`   ⚠️  High-value security target`);
  }
  
  lines.push(`   Risk: ${match.risk}`);
  
  return lines.join('\n');
}
