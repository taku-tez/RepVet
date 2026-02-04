/**
 * Utils module tests
 */

import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isValidRepoUrl,
  cleanRepoUrl,
  parseMaintainerString,
  splitMaintainerList,
  daysBetween,
  getDefaultHeaders,
} from '../../src/registry/utils.js';

// Load package.json for version check
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));

describe('Registry Utils', () => {

  describe('isValidRepoUrl', () => {
    it('should validate GitHub URLs', () => {
      expect(isValidRepoUrl('https://github.com/user/repo')).toBe(true);
      expect(isValidRepoUrl('https://github.com/user/repo.git')).toBe(true);
    });

    it('should validate GitLab URLs', () => {
      expect(isValidRepoUrl('https://gitlab.com/user/repo')).toBe(true);
    });

    it('should validate Bitbucket URLs', () => {
      expect(isValidRepoUrl('https://bitbucket.org/user/repo')).toBe(true);
    });

    it('should reject non-repo URLs', () => {
      expect(isValidRepoUrl('https://example.com')).toBe(false);
      expect(isValidRepoUrl('https://npmjs.com/package/foo')).toBe(false);
      expect(isValidRepoUrl(undefined)).toBe(false);
      expect(isValidRepoUrl('')).toBe(false);
    });
  });

  describe('cleanRepoUrl', () => {
    it('should clean git:// URLs', () => {
      expect(cleanRepoUrl('git://github.com/user/repo.git'))
        .toBe('https://github.com/user/repo');
    });

    it('should remove .git suffix', () => {
      expect(cleanRepoUrl('https://github.com/user/repo.git'))
        .toBe('https://github.com/user/repo');
    });

    it('should return undefined for invalid URLs', () => {
      expect(cleanRepoUrl('https://example.com')).toBeUndefined();
      expect(cleanRepoUrl(undefined)).toBeUndefined();
    });
  });

  describe('parseMaintainerString', () => {
    it('should parse name and email', () => {
      const result = parseMaintainerString('John Doe <john@example.com>');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
    });

    it('should parse name only', () => {
      const result = parseMaintainerString('John Doe');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBeUndefined();
    });

    it('should handle empty strings', () => {
      const result = parseMaintainerString('');
      expect(result.name).toBe('');
    });
  });

  describe('splitMaintainerList', () => {
    it('should split comma-separated names', () => {
      expect(splitMaintainerList('Alice, Bob, Charlie'))
        .toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should split "and" separated names', () => {
      expect(splitMaintainerList('Alice and Bob'))
        .toEqual(['Alice', 'Bob']);
    });

    it('should split "&" separated names', () => {
      expect(splitMaintainerList('Alice & Bob'))
        .toEqual(['Alice', 'Bob']);
    });

    it('should handle empty strings', () => {
      expect(splitMaintainerList('')).toEqual([]);
    });
  });

  describe('daysBetween', () => {
    it('should calculate days between dates', () => {
      const d1 = new Date('2024-01-01');
      const d2 = new Date('2024-01-08');
      expect(daysBetween(d1, d2)).toBe(7);
    });

    it('should handle string dates', () => {
      expect(daysBetween('2024-01-01', '2024-01-08')).toBe(7);
    });

    it('should return positive value regardless of order', () => {
      expect(daysBetween('2024-01-08', '2024-01-01')).toBe(7);
    });
  });

  describe('getDefaultHeaders', () => {
    it('should return User-Agent with current version', () => {
      const headers = getDefaultHeaders();
      expect(headers['User-Agent']).toBe(`RepVet/${packageJson.version} (https://github.com/taku-tez/RepVet)`);
    });

    it('should have User-Agent matching package.json version', () => {
      const headers = getDefaultHeaders();
      const match = headers['User-Agent'].match(/RepVet\/(\d+\.\d+\.\d+)/);
      expect(match).not.toBeNull();
      expect(match![1]).toBe(packageJson.version);
    });
  });
});
