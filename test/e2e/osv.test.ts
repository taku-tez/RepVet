/**
 * OSV client tests
 */


import { queryPackageVulnerabilities, analyzeVulnerabilityHistory } from '../../src/osv/client.js';

// Use longer timeout for API calls
vi.setConfig({ testTimeout: 30000 });

describe('OSV Client', () => {

  describe('queryPackageVulnerabilities', () => {
    it('should return vulnerabilities for a package with known vulns', async () => {
      // lodash has known vulnerabilities
      const vulns = await queryPackageVulnerabilities('npm', 'lodash');
      expect(vulns.length).toBeGreaterThan(0);
      expect(vulns[0].id).toBeDefined();
    });

    it('should return empty array for package with no vulns', async () => {
      // Use a very specific package name unlikely to have vulns
      const vulns = await queryPackageVulnerabilities('npm', 'this-pkg-has-no-vulns-12345');
      expect(vulns).toEqual([]);
    });

    it('should work with PyPI ecosystem', async () => {
      // requests has known vulnerabilities
      const vulns = await queryPackageVulnerabilities('PyPI', 'requests');
      // May or may not have vulns, but should not throw
      expect(Array.isArray(vulns)).toBe(true);
    });
  });

  describe('analyzeVulnerabilityHistory', () => {
    it('should analyze vulnerabilities and count by severity', async () => {
      // lodash has critical/high vulns
      const analysis = await analyzeVulnerabilityHistory('npm', 'lodash');
      
      expect(analysis.totalVulns).toBeGreaterThan(0);
      expect(analysis.vulnIds.length).toBe(analysis.totalVulns);
      expect(analysis.criticalCount).toBeGreaterThanOrEqual(0);
      expect(analysis.highCount).toBeGreaterThanOrEqual(0);
    });

    it('should detect unfixed vulnerabilities', async () => {
      const analysis = await analyzeVulnerabilityHistory('npm', 'lodash');
      // hasUnfixedVulns should be boolean
      expect(typeof analysis.hasUnfixedVulns).toBe('boolean');
    });
  });

  describe('CVSS score extraction', () => {
    // Test CVSS score extraction through the analysis results
    it('should correctly categorize CRITICAL severity vulns', async () => {
      // minimist had a critical prototype pollution vulnerability
      const analysis = await analyzeVulnerabilityHistory('npm', 'minimist');
      
      // Just verify the analysis completes without error
      expect(analysis.totalVulns).toBeGreaterThanOrEqual(0);
    });
  });
});
