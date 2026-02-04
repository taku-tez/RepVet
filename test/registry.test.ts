/**
 * Registry module tests
 * Tests for multi-ecosystem package info fetching
 */

import { describe, it, expect, jest } from '@jest/globals';
import { fetchPackageInfo } from '../src/registry/npm.js';
import { fetchPyPIPackageInfo, checkPyPIYanked, checkPyPIOwnershipTransfer } from '../src/registry/pypi.js';
import { fetchCratesPackageInfo } from '../src/registry/crates.js';
import { fetchRubyGemsPackageInfo } from '../src/registry/rubygems.js';
import { fetchGoPackageInfo, checkGoDeprecated, checkGoRetracted } from '../src/registry/golang.js';
import { fetchPackagistPackageInfo, checkPackagistAbandoned, checkPackagistOwnershipTransfer } from '../src/registry/packagist.js';
import { fetchNuGetPackageInfo, checkNuGetDeprecated, checkNuGetOwnershipTransfer } from '../src/registry/nuget.js';
import { fetchHexPackageInfo, checkHexRetired, HexPackageData } from '../src/registry/hex.js';
import { fetchPubPackageInfo, checkPubDiscontinued, PubPackageData } from '../src/registry/pub.js';
import { fetchCondaPackageInfo, parseEnvironmentYaml } from '../src/registry/conda.js';
import { fetchCocoaPodsPackageInfo, checkCocoaPodsDeprecated, CocoaPodsPackageData } from '../src/registry/cocoapods.js';

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

    it('should detect deprecated modules', async () => {
      // github.com/golang/protobuf is deprecated in favor of google.golang.org/protobuf
      const result = await checkGoDeprecated('github.com/golang/protobuf');
      expect(result.deprecated).toBe(true);
      expect(result.message).toContain('google.golang.org/protobuf');
    });

    it('should return not deprecated for active modules', async () => {
      const result = await checkGoDeprecated('github.com/gin-gonic/gin');
      expect(result.deprecated).toBe(false);
    });

    it('should detect retracted versions', async () => {
      // github.com/hashicorp/consul/api has retracted v1.28.0
      const result = await checkGoRetracted('github.com/hashicorp/consul/api');
      expect(result.hasRetractions).toBe(true);
      expect(result.retractions.length).toBeGreaterThan(0);
      // Should have a reason for at least one retraction
      const withReason = result.retractions.find(r => r.reason);
      expect(withReason).toBeDefined();
    });

    it('should return no retractions for clean modules', async () => {
      const result = await checkGoRetracted('github.com/gin-gonic/gin');
      expect(result.hasRetractions).toBe(false);
      expect(result.latestRetracted).toBe(false);
    });

    it('should handle non-existent module in deprecation check', async () => {
      const result = await checkGoDeprecated('github.com/nonexistent/module-xyz123');
      expect(result.deprecated).toBe(false);
    });

    it('should handle non-existent module in retracted check', async () => {
      const result = await checkGoRetracted('github.com/nonexistent/module-xyz123');
      expect(result.hasRetractions).toBe(false);
    });
  });

  describe('Packagist', () => {
    it('should fetch package info for laravel/framework', async () => {
      const info = await fetchPackagistPackageInfo('laravel/framework');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('laravel/framework');
      expect(info?.ecosystem).toBe('packagist');
    });

    it('should detect abandoned packages', async () => {
      // phpunit/php-token-stream is marked as abandoned
      const result = await checkPackagistAbandoned('phpunit/php-token-stream');
      expect(result.abandoned).toBe(true);
    });

    it('should detect abandoned packages with replacement', async () => {
      // swiftmailer/swiftmailer is abandoned in favor of symfony/mailer
      const result = await checkPackagistAbandoned('swiftmailer/swiftmailer');
      expect(result.abandoned).toBe(true);
      expect(result.replacement).toBe('symfony/mailer');
    });

    it('should return not abandoned for active packages', async () => {
      const result = await checkPackagistAbandoned('laravel/framework');
      expect(result.abandoned).toBe(false);
    });

    it('should include abandoned info in package data', async () => {
      const info = await fetchPackagistPackageInfo('phpunit/php-token-stream');
      expect(info).not.toBeNull();
      expect(info?.abandoned).toBe(true);
    });

    it('should check ownership transfer (no transfer expected for stable packages)', async () => {
      const result = await checkPackagistOwnershipTransfer('laravel/framework');
      expect(result.confidence).toBeDefined();
      // laravel/framework has stable authorship (Taylor Otwell)
      expect(result.transferred).toBe(false);
    });

    it('should handle non-existent package in abandoned check', async () => {
      const result = await checkPackagistAbandoned('this-vendor/does-not-exist-xyz123');
      expect(result.abandoned).toBe(false);
    });

    it('should handle non-existent package in ownership check', async () => {
      const result = await checkPackagistOwnershipTransfer('this-vendor/does-not-exist-xyz123');
      expect(result.transferred).toBe(false);
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

    it('should fetch owners for popular packages', async () => {
      const info = await fetchHexPackageInfo('phoenix') as HexPackageData;
      expect(info).not.toBeNull();
      expect(info?.owners).toBeDefined();
      expect(info?.owners?.length).toBeGreaterThan(0);
      // Phoenix has well-known maintainers
      expect(info?.owners).toContain('chrismccord');
    });

    it('should return null for non-existent package', async () => {
      const info = await fetchHexPackageInfo('this-package-definitely-does-not-exist-12345');
      expect(info).toBeNull();
    });

    it('should check retired releases (no retirements expected for phoenix)', async () => {
      const result = await checkHexRetired('phoenix');
      expect(result.latestIsRetired).toBe(false);
      // Phoenix is actively maintained, should have no/few retired releases
    });

    it('should handle non-existent package in retired check', async () => {
      const result = await checkHexRetired('this-package-does-not-exist-xyz123');
      expect(result.hasRetiredReleases).toBe(false);
      expect(result.latestIsRetired).toBe(false);
      expect(result.retiredReleases).toHaveLength(0);
    });

    it('should detect retired releases when present', async () => {
      // Note: This test verifies the checkHexRetired function works correctly
      // If a package with retired releases is found, this test can be updated
      // Currently testing the structure of the return value
      const result = await checkHexRetired('hackney');
      expect(typeof result.hasRetiredReleases).toBe('boolean');
      expect(typeof result.latestIsRetired).toBe('boolean');
      expect(Array.isArray(result.retiredReleases)).toBe(true);
    });
  });

  describe('pub.dev', () => {
    it('should fetch package info for http', async () => {
      const info = await fetchPubPackageInfo('http');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('http');
      expect(info?.ecosystem).toBe('pub');
    });

    it('should detect discontinued package (pedantic)', async () => {
      const info = await fetchPubPackageInfo('pedantic');
      expect(info).not.toBeNull();
      expect(info?.isDiscontinued).toBe(true);
      expect(info?.replacedBy).toBe('lints');
    });

    it('should use checkPubDiscontinued for discontinued detection', async () => {
      const result = await checkPubDiscontinued('pedantic');
      expect(result.isDiscontinued).toBe(true);
      expect(result.replacedBy).toBe('lints');
    });

    it('should return not discontinued for active package', async () => {
      const result = await checkPubDiscontinued('http');
      expect(result.isDiscontinued).toBe(false);
    });

    it('should return null for non-existent package', async () => {
      const info = await fetchPubPackageInfo('this-package-definitely-does-not-exist-12345');
      expect(info).toBeNull();
    });
  });

  describe('CocoaPods', () => {
    it('should fetch package info for Alamofire', async () => {
      const info = await fetchCocoaPodsPackageInfo('Alamofire');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('Alamofire');
      expect(info?.ecosystem).toBe('cocoapods');
      expect(info?.maintainers.length).toBeGreaterThan(0);
    });

    it('should return null for non-existent package', async () => {
      const info = await fetchCocoaPodsPackageInfo('this-package-definitely-does-not-exist-12345');
      expect(info).toBeNull();
    });

    it('should detect deprecated packages (AFNetworking)', async () => {
      // AFNetworking is deprecated in favor of Alamofire
      const info = await fetchCocoaPodsPackageInfo('AFNetworking') as CocoaPodsPackageData;
      expect(info).not.toBeNull();
      expect(info?.deprecated).toBeDefined();
      expect(info?.deprecatedInFavorOf).toBe('Alamofire');
    });

    it('should use checkCocoaPodsDeprecated for deprecation detection', async () => {
      const result = await checkCocoaPodsDeprecated('AFNetworking');
      expect(result.deprecated).toBe(true);
      expect(result.replacement).toBe('Alamofire');
    });

    it('should return not deprecated for active packages', async () => {
      const result = await checkCocoaPodsDeprecated('Alamofire');
      expect(result.deprecated).toBe(false);
    });

    it('should handle non-existent package in deprecated check', async () => {
      const result = await checkCocoaPodsDeprecated('this-package-does-not-exist-xyz123');
      expect(result.deprecated).toBe(false);
    });

    it('should include repository URL when available', async () => {
      const info = await fetchCocoaPodsPackageInfo('AFNetworking');
      expect(info).not.toBeNull();
      expect(info?.repository?.url).toContain('github.com');
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
