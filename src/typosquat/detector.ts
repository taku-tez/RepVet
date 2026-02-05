/**
 * Typosquat detector engine
 * Combines similarity algorithms and pattern detection
 */

import { combinedSimilarity, levenshteinSimilarity, jaroWinklerSimilarity } from './similarity.js';
import { detectPatterns, PatternMatch, TyposquatPattern } from './patterns.js';
import { getPopularPackages, getPopularPackageInfo, PopularPackage } from './popular-packages.js';

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
    jaroWinkler: number;
    combined: number;
  };
  /** Detected manipulation patterns */
  patterns: PatternMatch[];
  /** Risk level based on similarity and patterns */
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Target package info (downloads, etc.) */
  targetInfo?: PopularPackage;
}

export interface DetectorOptions {
  /** Minimum similarity threshold (0-1), default 0.8 */
  threshold?: number;
  /** Maximum number of matches to return per package */
  maxMatches?: number;
  /** Ecosystem to check against */
  ecosystem?: 'npm' | 'pypi';
}

const DEFAULT_THRESHOLD = 0.8;
const DEFAULT_MAX_MATCHES = 3;

/**
 * Calculate risk level based on similarity and patterns
 */
function calculateRisk(similarity: number, patterns: PatternMatch[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  // High-confidence patterns with high similarity = CRITICAL
  const hasHighConfidencePattern = patterns.some(p => p.confidence >= 0.9);
  
  if (similarity >= 0.95 && hasHighConfidencePattern) return 'CRITICAL';
  if (similarity >= 0.9 && patterns.length > 0) return 'HIGH';
  if (similarity >= 0.85 || (similarity >= 0.8 && patterns.length > 0)) return 'MEDIUM';
  return 'LOW';
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
  } = options;
  
  const popularPackages = getPopularPackages(ecosystem);
  const matches: TyposquatMatch[] = [];
  
  for (const target of popularPackages) {
    // Skip if checking against itself
    if (packageName.toLowerCase() === target.name.toLowerCase()) continue;
    
    // Quick length check to skip obviously different packages
    const lenDiff = Math.abs(packageName.length - target.name.length);
    if (lenDiff > 3) continue;
    
    // Calculate similarities
    const levSim = levenshteinSimilarity(packageName.toLowerCase(), target.name.toLowerCase());
    const jwSim = jaroWinklerSimilarity(packageName.toLowerCase(), target.name.toLowerCase());
    const combined = combinedSimilarity(packageName.toLowerCase(), target.name.toLowerCase());
    
    // Skip if below threshold
    if (combined < threshold) continue;
    
    // Detect patterns
    const patterns = detectPatterns(packageName, target.name);
    
    // Calculate risk
    const risk = calculateRisk(combined, patterns);
    
    matches.push({
      package: packageName,
      target: target.name,
      similarity: combined,
      scores: {
        levenshtein: levSim,
        jaroWinkler: jwSim,
        combined,
      },
      patterns,
      risk,
      targetInfo: target,
    });
  }
  
  // Sort by similarity (descending) and return top matches
  return matches
    .sort((a, b) => b.similarity - a.similarity)
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
 * Format typosquat match for display
 */
export function formatTyposquatMatch(match: TyposquatMatch): string {
  const riskColors: Record<string, string> = {
    LOW: '🟢',
    MEDIUM: '🟡',
    HIGH: '🟠',
    CRITICAL: '🔴',
  };
  
  const lines: string[] = [];
  
  lines.push(`${riskColors[match.risk]} ${match.package} → similar to "${match.target}"`);
  lines.push(`   Similarity: ${(match.similarity * 100).toFixed(1)}%`);
  
  if (match.targetInfo?.weeklyDownloads) {
    const downloads = match.targetInfo.weeklyDownloads;
    const formatted = downloads >= 1000000 
      ? `${(downloads / 1000000).toFixed(1)}M`
      : `${(downloads / 1000).toFixed(0)}K`;
    lines.push(`   Target downloads: ${formatted}/week`);
  }
  
  if (match.patterns.length > 0) {
    const patternNames = match.patterns.map(p => p.pattern).join(', ');
    lines.push(`   Patterns: ${patternNames}`);
  }
  
  lines.push(`   Risk: ${match.risk}`);
  
  return lines.join('\n');
}
