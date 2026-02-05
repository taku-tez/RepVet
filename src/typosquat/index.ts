/**
 * Typosquat detection module
 */

// Similarity algorithms
export { 
  levenshteinDistance, 
  levenshteinSimilarity, 
  damerauLevenshteinDistance,
  damerauLevenshteinSimilarity,
  jaroSimilarity, 
  jaroWinklerSimilarity, 
  ngramSimilarity,
  soundex,
  phoneticSimilarity,
  combinedSimilarity,
  couldBeSimilar,
} from './similarity.js';

// Pattern detection
export { detectPatterns, generateTyposquatVariants } from './patterns.js';
export type { PatternMatch, TyposquatPattern } from './patterns.js';

// Popular packages database
export { getPopularPackages, getPopularPackageInfo, getPopularPackageNames, getHighValueTargets, NPM_POPULAR_PACKAGES } from './popular-packages.js';
export type { PopularPackage } from './popular-packages.js';

// Detector
export { checkTyposquat, checkTyposquatBatch, formatTyposquatMatch, getTyposquatSummary } from './detector.js';
export type { TyposquatMatch, DetectorOptions } from './detector.js';
