/**
 * Typosquat detection tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  levenshteinDistance,
  levenshteinSimilarity,
  jaroWinklerSimilarity,
  combinedSimilarity,
  detectPatterns,
  checkTyposquat,
} from '../../src/typosquat/index.js';

describe('Similarity algorithms', () => {
  describe('levenshteinDistance', () => {
    it('returns 0 for identical strings', () => {
      expect(levenshteinDistance('lodash', 'lodash')).toBe(0);
    });
    
    it('returns 1 for single character difference', () => {
      expect(levenshteinDistance('lodash', 'lodahs')).toBe(2); // swap = 2 edits
      expect(levenshteinDistance('lodash', 'lodas')).toBe(1);  // deletion
      expect(levenshteinDistance('lodash', 'lodassh')).toBe(1); // insertion
    });
    
    it('returns correct distance for different strings', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    });
  });
  
  describe('levenshteinSimilarity', () => {
    it('returns 1 for identical strings', () => {
      expect(levenshteinSimilarity('lodash', 'lodash')).toBe(1);
    });
    
    it('returns 0 for completely different strings', () => {
      expect(levenshteinSimilarity('abc', 'xyz')).toBe(0);
    });
    
    it('returns high similarity for typos', () => {
      expect(levenshteinSimilarity('express', 'expresss')).toBeGreaterThan(0.8);
    });
  });
  
  describe('jaroWinklerSimilarity', () => {
    it('returns 1 for identical strings', () => {
      expect(jaroWinklerSimilarity('lodash', 'lodash')).toBe(1);
    });
    
    it('returns high similarity for common prefix', () => {
      const sim = jaroWinklerSimilarity('express', 'expresss');
      expect(sim).toBeGreaterThan(0.9);
    });
  });
  
  describe('combinedSimilarity', () => {
    it('returns 1 for identical strings', () => {
      expect(combinedSimilarity('lodash', 'lodash')).toBe(1);
    });
    
    it('returns high similarity for typos', () => {
      expect(combinedSimilarity('lodash', 'lodahs')).toBeGreaterThan(0.8);
      expect(combinedSimilarity('express', 'expresss')).toBeGreaterThan(0.9);
    });
  });
});

describe('Pattern detection', () => {
  it('detects character swap', () => {
    const patterns = detectPatterns('lodahs', 'lodash');
    expect(patterns.some(p => p.pattern === 'character-swap')).toBe(true);
  });
  
  it('detects character duplication', () => {
    const patterns = detectPatterns('expresss', 'express');
    expect(patterns.some(p => p.pattern === 'character-duplicate')).toBe(true);
  });
  
  it('detects character omission', () => {
    const patterns = detectPatterns('expres', 'express');
    expect(patterns.some(p => p.pattern === 'character-omission')).toBe(true);
  });
  
  it('detects character insertion', () => {
    const patterns = detectPatterns('expresxs', 'express');
    expect(patterns.some(p => p.pattern === 'character-insertion')).toBe(true);
  });
  
  it('detects hyphen manipulation', () => {
    const patterns = detectPatterns('reactdom', 'react-dom');
    expect(patterns.some(p => p.pattern === 'hyphen-manipulation')).toBe(true);
  });
  
  it('detects scope confusion', () => {
    const patterns = detectPatterns('babel-core', '@babel/core');
    expect(patterns.some(p => p.pattern === 'scope-confusion')).toBe(true);
  });
  
  it('detects version suffix', () => {
    const patterns = detectPatterns('lodash2', 'lodash');
    expect(patterns.some(p => p.pattern === 'version-suffix')).toBe(true);
    
    const patterns2 = detectPatterns('lodashjs', 'lodash');
    expect(patterns2.some(p => p.pattern === 'version-suffix')).toBe(true);
  });
  
  it('returns empty array for identical strings', () => {
    const patterns = detectPatterns('lodash', 'lodash');
    expect(patterns).toHaveLength(0);
  });
  
  it('returns empty array for very different strings', () => {
    const patterns = detectPatterns('completely-different', 'lodash');
    expect(patterns).toHaveLength(0);
  });
});

describe('Typosquat detection', () => {
  it('detects typosquats of popular packages', () => {
    const matches = checkTyposquat('lodahs');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].target).toBe('lodash');
  });
  
  it('returns empty array for legitimate packages', () => {
    const matches = checkTyposquat('lodash');
    expect(matches).toHaveLength(0);
  });

  it('does not flag legitimate similar packages as typosquats', () => {
    // These are all real, legitimate packages that should NOT trigger
    const legitimatePackages = [
      'react-router', 'react-router-dom', 'eslint-plugin-react',
      'eslint-plugin-import', 'globby', 'bcryptjs', 'bcrypt',
      'passport-jwt', 'graphql-tag', 'next', 'nuxt', 'tap',
    ];
    for (const pkg of legitimatePackages) {
      const matches = checkTyposquat(pkg, { threshold: 0.75 });
      expect(matches).toHaveLength(0);
    }
  });
  
  it('respects threshold option', () => {
    const highThreshold = checkTyposquat('lodahs', { threshold: 0.95 });
    const lowThreshold = checkTyposquat('lodahs', { threshold: 0.7 });
    
    expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);
  });
  
  it('assigns appropriate risk levels', () => {
    const matches = checkTyposquat('expresss');
    expect(matches.length).toBeGreaterThan(0);
    expect(['MEDIUM', 'HIGH', 'CRITICAL']).toContain(matches[0].risk);
  });
  
  it('includes target package info', () => {
    const matches = checkTyposquat('expresss');
    expect(matches[0].targetInfo).toBeDefined();
    expect(matches[0].targetInfo?.weeklyDownloads).toBeGreaterThan(0);
  });
});
