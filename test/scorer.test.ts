/**
 * Scorer tests
 */

import { describe, it, expect } from '@jest/globals';
import { checkPackageReputation } from '../src/scorer.js';

describe('Scorer', () => {
  // Use longer timeout for API calls
  jest.setTimeout(30000);

  describe('npm packages', () => {
    it('should score a healthy package highly', async () => {
      const result = await checkPackageReputation('chalk', 'npm');
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.riskLevel).toBe('LOW');
    });

    it('should detect malware history', async () => {
      const result = await checkPackageReputation('event-stream', 'npm');
      expect(result.hasMalwareHistory).toBe(true);
      expect(result.score).toBeLessThan(50);
      expect(result.riskLevel).toBe('CRITICAL');
    });

    it('should detect deprecated packages', async () => {
      const result = await checkPackageReputation('request', 'npm');
      const hasDeprecation = result.deductions.some(d => 
        d.reason.toLowerCase().includes('deprecated')
      );
      expect(hasDeprecation).toBe(true);
    });
  });

  describe('PyPI packages', () => {
    it('should score a healthy Python package', async () => {
      const result = await checkPackageReputation('requests', 'pypi');
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.ecosystem).toBe('pypi');
    });

    it('should handle multiple maintainers in author field', async () => {
      const result = await checkPackageReputation('pytest', 'pypi');
      expect(result.maintainers.length).toBeGreaterThan(1);
      expect(result.score).toBe(100);
    });
  });

  describe('crates.io packages', () => {
    it('should score a healthy Rust crate', async () => {
      const result = await checkPackageReputation('serde', 'crates');
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.ecosystem).toBe('crates');
    });

    it('should not false-positive on established projects', async () => {
      const result = await checkPackageReputation('tokio', 'crates');
      expect(result.score).toBe(100);
      expect(result.hasOwnershipTransfer).toBe(false);
    });
  });

  describe('risk levels', () => {
    it('should assign correct risk levels', async () => {
      // HIGH risk (malware)
      const eventStream = await checkPackageReputation('event-stream', 'npm');
      expect(['HIGH', 'CRITICAL']).toContain(eventStream.riskLevel);

      // LOW risk (healthy)
      const lodash = await checkPackageReputation('lodash', 'npm');
      expect(lodash.riskLevel).toBe('LOW');
    });
  });
});
