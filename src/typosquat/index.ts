/**
 * Typosquat detection module
 */

export { levenshteinDistance, levenshteinSimilarity, jaroSimilarity, jaroWinklerSimilarity, combinedSimilarity } from './similarity.js';
export { detectPatterns } from './patterns.js';
export type { PatternMatch, TyposquatPattern } from './patterns.js';
export { getPopularPackages, getPopularPackageInfo, getPopularPackageNames, NPM_POPULAR_PACKAGES } from './popular-packages.js';
export type { PopularPackage } from './popular-packages.js';
export { checkTyposquat, checkTyposquatBatch, formatTyposquatMatch } from './detector.js';
export type { TyposquatMatch, DetectorOptions } from './detector.js';
