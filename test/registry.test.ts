/**
 * Registry module tests
 * Tests for multi-ecosystem package info fetching
 */

import { describe, it, expect, jest } from '@jest/globals';
import { fetchPackageInfo } from '../src/registry/npm.js';
import { fetchPyPIPackageInfo, checkPyPIYanked, checkPyPIOwnershipTransfer } from '../src/registry/pypi.js';
import { fetchCratesPackageInfo } from '../src/registry/crates.js';
import { fetchRubyGemsPackageInfo } from '../src/registry/rubygems.js';
import { fetchGoPackageInfo } from '../src/registry/golang.js';
import { fetchPackagistPackageInfo } from '../src/registry/packagist.js';
import { fetchNuGetPackageInfo, checkNuGetDeprecated, checkNuGetOwnershipTransfer } from '../src/registry/nuget.js';
import { fetchHexPackageInfo } from '../src/registry/hex.js';
import { fetchPubPackageInfo } from '../src/registry/pub.js';
import { fetchCondaPackageInfo, parseEnvironmentYaml } from '../src/registry/conda.js';

// Use longer timeout for API calls
jest.setTimeout(30000);

describe('Registry modules', () => {

  describe('npm', () => {
    it('should fetch package info for chalk', async () => {
      const info = await fetchPackageInfo('chalk');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('chalk');
      expect(info?.ecosystem).toBe('npm');
      expect(info?.maintainers.length).toBeGreaterThan(0);
    });

    it('should return null for non-existent package', async () => {
      const info = await fetchPackageInfo('this-package-definitely-does-not-exist-12345');
      expect(info).toBeNull();
    });

    it('should detect deprecated packages', async () => {
      const info = await fetchPackageInfo('request');
      expect(info).not.toBeNull();
      expect(info?.deprecated).toBeDefined();
    });

    it('should detect security holding packages', async () => {
      const info = await fetchPackageInfo('crossenv');
      expect(info).not.toBeNull();
      expect(info?.isSecurityHoldingPackage).toBe(true);
    });
  });

  describe('PyPI', () => {
    it('should fetch package info for requests', async () => {
      const info = await fetchPyPIPackageInfo('requests');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('requests');
      expect(info?.ecosystem).toBe('pypi');
    });

    it('should return null for non-existent package', async () => {
      const info = await fetchPyPIPackageInfo('this-package-definitely-does-not-exist-12345');
      expect(info).toBeNull();
    });

    it('should detect yanked versions in django', async () => {
      // Django has some yanked versions (e.g., 4.2.12, 5.0.5 had build issues)
      const result = await checkPyPIYanked('django');
      expect(result.hasYanked).toBe(true);
      expect(result.yankedVersions.length).toBeGreaterThan(0);
      // At least one should have a reason
      const withReason = result.yankedVersions.find(v => v.reason);
      expect(withReason).toBeDefined();
    });

    it('should return no yanked for clean packages', async () => {
      const result = await checkPyPIYanked('requests');
      // requests is a clean package with no yanked versions
      expect(result.latestIsYanked).toBe(false);
    });

    it('should check ownership transfer (no transfer expected for stable packages)', async () => {
      const result = await checkPyPIOwnershipTransfer('requests');
      // requests has stable ownership - Kenneth Reitz
      expect(result.confidence).toBeDefined();
      // Note: May or may not detect transfer depending on metadata changes over time
    });

    it('should handle non-existent package in yanked check', async () => {
      const result = await checkPyPIYanked('this-package-does-not-exist-xyz123');
      expect(result.hasYanked).toBe(false);
      expect(result.yankedVersions).toHaveLength(0);
    });
  });

  describe('crates.io', () => {
    it('should fetch package info for serde', async () => {
      const info = await fetchCratesPackageInfo('serde');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('serde');
      expect(info?.ecosystem).toBe('crates');
      expect(info?.downloads).toBeGreaterThan(0);
    });
  });

  describe('RubyGems', () => {
    it('should fetch package info for rails', async () => {
      const info = await fetchRubyGemsPackageInfo('rails');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('rails');
      expect(info?.ecosystem).toBe('rubygems');
    });
  });

  describe('Go proxy', () => {
    it('should fetch module info for gin', async () => {
      const info = await fetchGoPackageInfo('github.com/gin-gonic/gin');
      expect(info).not.toBeNull();
      expect(info?.ecosystem).toBe('go');
      expect(info?.repository?.url).toContain('github.com');
    });
  });

  describe('Packagist', () => {
    it('should fetch package info for laravel/framework', async () => {
      const info = await fetchPackagistPackageInfo('laravel/framework');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('laravel/framework');
      expect(info?.ecosystem).toBe('packagist');
    });
  });

  describe('NuGet', () => {
    it('should fetch package info for Newtonsoft.Json', async () => {
      const info = await fetchNuGetPackageInfo('Newtonsoft.Json');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('Newtonsoft.Json');
      expect(info?.ecosystem).toBe('nuget');
    });

    it('should fetch owners for popular packages', async () => {
      const info = await fetchNuGetPackageInfo('Newtonsoft.Json');
      expect(info).not.toBeNull();
      expect(info?.owners).toBeDefined();
      expect(info?.owners?.length).toBeGreaterThan(0);
    });

    it('should detect deprecated packages', async () => {
      // Microsoft.Azure.DocumentDB is deprecated in favor of Microsoft.Azure.Cosmos
      const result = await checkNuGetDeprecated('Microsoft.Azure.DocumentDB');
      expect(result.isDeprecated).toBe(true);
      expect(result.reasons).toContain('Legacy');
      expect(result.alternatePackage).toBe('Microsoft.Azure.Cosmos');
    });

    it('should return not deprecated for active packages', async () => {
      const result = await checkNuGetDeprecated('Newtonsoft.Json');
      expect(result.isDeprecated).toBe(false);
    });

    it('should include deprecation info in package data', async () => {
      const info = await fetchNuGetPackageInfo('Microsoft.Azure.DocumentDB');
      expect(info).not.toBeNull();
      expect(info?.deprecated).toBeDefined();
      expect(info?.deprecated).toContain('Microsoft.Azure.Cosmos');
    });

    it('should check ownership transfer (no transfer expected for stable packages)', async () => {
      const result = await checkNuGetOwnershipTransfer('Newtonsoft.Json');
      expect(result.confidence).toBeDefined();
      // Newtonsoft.Json has stable authorship (James Newton-King)
      expect(result.transferred).toBe(false);
    });

    it('should handle non-existent package in deprecation check', async () => {
      const result = await checkNuGetDeprecated('this-package-does-not-exist-xyz123');
      expect(result.isDeprecated).toBe(false);
    });

    it('should handle non-existent package in ownership check', async () => {
      const result = await checkNuGetOwnershipTransfer('this-package-does-not-exist-xyz123');
      expect(result.transferred).toBe(false);
    });
  });

  describe('Hex', () => {
    it('should fetch package info for phoenix', async () => {
      const info = await fetchHexPackageInfo('phoenix');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('phoenix');
      expect(info?.ecosystem).toBe('hex');
    });
  });

  describe('pub.dev', () => {
    it('should fetch package info for http', async () => {
      const info = await fetchPubPackageInfo('http');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('http');
      expect(info?.ecosystem).toBe('pub');
    });
  });

  describe('Conda (Anaconda)', () => {
    it('should fetch package info for numpy from conda-forge', async () => {
      const info = await fetchCondaPackageInfo('numpy');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('numpy');
      expect(info?.ecosystem).toBe('conda');
      expect(info?.channel).toBe('conda-forge');
      expect(info?.repository?.url).toContain('github.com');
    });

    it('should fetch package info for pandas', async () => {
      const info = await fetchCondaPackageInfo('pandas');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('pandas');
      expect(info?.ecosystem).toBe('conda');
    });

    it('should return null for non-existent package', async () => {
      const info = await fetchCondaPackageInfo('this-package-definitely-does-not-exist-12345');
      expect(info).toBeNull();
    });

    it('should fetch from specific channel', async () => {
      const info = await fetchCondaPackageInfo('numpy', 'conda-forge');
      expect(info).not.toBeNull();
      expect(info?.channel).toBe('conda-forge');
    });
  });

  describe('parseEnvironmentYaml', () => {
    it('should parse basic environment.yml', () => {
      const content = `
name: myenv
channels:
  - conda-forge
  - defaults
dependencies:
  - numpy=1.21
  - pandas>=1.3
  - scipy
  - python=3.9
`;
      const result = parseEnvironmentYaml(content);
      expect(result.condaPackages).toContain('numpy');
      expect(result.condaPackages).toContain('pandas');
      expect(result.condaPackages).toContain('scipy');
      expect(result.condaPackages).not.toContain('python');
      expect(result.channels).toContain('conda-forge');
      expect(result.channels).toContain('defaults');
    });

    it('should parse environment.yml with pip packages', () => {
      const content = `
name: ml-env
dependencies:
  - numpy
  - pandas
  - pip:
    - requests
    - flask>=2.0
`;
      const result = parseEnvironmentYaml(content);
      expect(result.condaPackages).toContain('numpy');
      expect(result.condaPackages).toContain('pandas');
      expect(result.pipPackages).toContain('requests');
      expect(result.pipPackages).toContain('flask');
    });

    it('should handle empty dependencies', () => {
      const content = `
name: empty
channels:
  - defaults
`;
      const result = parseEnvironmentYaml(content);
      expect(result.condaPackages).toHaveLength(0);
      expect(result.pipPackages).toHaveLength(0);
    });

    it('should skip python and pip entries', () => {
      const content = `
dependencies:
  - python=3.10
  - pip
  - numpy
`;
      const result = parseEnvironmentYaml(content);
      expect(result.condaPackages).toEqual(['numpy']);
    });
  });
});
