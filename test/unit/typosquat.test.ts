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

  it('detects short-name typosquats of high-value targets', () => {
    // axos → axios (4 chars, highValue target)
    const matches = checkTyposquat('axos');
    const med = matches.filter(m => m.risk !== 'LOW');
    expect(med.length).toBeGreaterThan(0);
    expect(med[0].target).toBe('axios');
  });

  it('detects typosquats of newly-flagged high-value targets', () => {
    // chawk → chalk (highValue)
    const matches = checkTyposquat('chawk');
    const med = matches.filter(m => m.risk !== 'LOW');
    expect(med.length).toBeGreaterThan(0);
    expect(med[0].target).toBe('chalk');
  });

  it('treats -es/-esm/-cli suffixed variants as legitimate (no MEDIUM+ flags)', () => {
    for (const pkg of ['lodash-es', 'moment-es', 'debug-js', 'commander-js']) {
      const matches = checkTyposquat(pkg);
      const actionable = matches.filter(m => m.risk !== 'LOW');
      expect(actionable).toHaveLength(0);
    }
  });

  it('detects fake plural typosquats (e.g., lodashs, expresss)', () => {
    // "lodashs" is not a real package — should be flagged as typosquat of "lodash"
    const lodashs = checkTyposquat('lodashs');
    expect(lodashs.length).toBeGreaterThan(0);
    expect(lodashs[0].target).toBe('lodash');
    expect(lodashs[0].risk).not.toBe('LOW');

    // "expresss" (triple s) should be flagged
    const expresss = checkTyposquat('expresss');
    expect(expresss.length).toBeGreaterThan(0);
    expect(expresss[0].target).toBe('express');
  });

  it('does not flag real plural packages (e.g., requests, colors)', () => {
    // "requests" and "colors" are real popular packages — should not be flagged
    const requests = checkTyposquat('requests', { ecosystem: 'pypi' });
    expect(requests).toHaveLength(0);

    const colors = checkTyposquat('colors', { ecosystem: 'npm' });
    expect(colors).toHaveLength(0);
  });
});
