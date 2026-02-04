/**
 * npm Registry API
 */

import { PackageInfo } from '../types.js';

const NPM_REGISTRY = 'https://registry.npmjs.org';

export async function fetchPackageInfo(packageName: string): Promise<PackageInfo | null> {
  try {
    const response = await fetch(`${NPM_REGISTRY}/${encodeURIComponent(packageName)}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`npm registry error: ${response.status}`);
    }
    const data = await response.json() as Record<string, unknown>;
    
    const latestVersion = (data['dist-tags'] as Record<string, string>)?.['latest'] || '';
    const versions = data['versions'] as Record<string, Record<string, unknown>> || {};
    const latestData = versions[latestVersion] || {};
    
    return {
      name: data['name'] as string,
      version: latestVersion,
      maintainers: (data['maintainers'] as Array<{name: string; email?: string}>) || [],
      repository: latestData['repository'] as PackageInfo['repository'],
      time: data['time'] as Record<string, string>,
    };
  } catch (error) {
    throw new Error(`Failed to fetch package info: ${error}`);
  }
}

/**
 * Check if package has ownership transfer history
 * (simplified: check if maintainers changed between versions)
 */
export async function checkOwnershipTransfer(packageName: string): Promise<boolean> {
  try {
    const response = await fetch(`${NPM_REGISTRY}/${encodeURIComponent(packageName)}`);
    if (!response.ok) return false;
    
    const data = await response.json() as Record<string, unknown>;
    const versions = data['versions'] as Record<string, Record<string, unknown>> || {};
    const versionList = Object.keys(versions);
    
    if (versionList.length < 2) return false;
    
    // Get maintainers from first and last version
    const firstVersion = versions[versionList[0]] as Record<string, unknown>;
    const lastVersion = versions[versionList[versionList.length - 1]] as Record<string, unknown>;
    
    const firstMaintainers = new Set(
      ((firstVersion?.['maintainers'] || firstVersion?.['_npmUser']) as Array<{name: string}> || [])
        .map(m => m.name?.toLowerCase())
        .filter(Boolean)
    );
    
    const lastMaintainers = new Set(
      ((lastVersion?.['maintainers'] || lastVersion?.['_npmUser']) as Array<{name: string}> || [])
        .map(m => m.name?.toLowerCase())
        .filter(Boolean)
    );
    
    // If maintainer sets are completely different, ownership likely transferred
    if (firstMaintainers.size === 0 || lastMaintainers.size === 0) return false;
    
    const intersection = [...firstMaintainers].filter(m => lastMaintainers.has(m));
    return intersection.length === 0;
  } catch {
    return false;
  }
}
