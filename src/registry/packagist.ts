/**
 * Packagist (PHP) Registry API
 */

import { PackageInfo } from '../types.js';

const PACKAGIST_API = 'https://packagist.org';

export async function fetchPackagistPackageInfo(packageName: string): Promise<PackageInfo | null> {
  try {
    const response = await fetch(`${PACKAGIST_API}/packages/${encodeURIComponent(packageName)}.json`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Packagist API error: ${response.status}`);
    }
    
    const data = await response.json() as {
      package: {
        name: string;
        description: string;
        maintainers: Array<{ name: string; avatar_url?: string }>;
        versions: Record<string, {
          version: string;
          time: string;
          source?: { url: string };
          homepage?: string;
        }>;
        downloads: {
          total: number;
          monthly: number;
          daily: number;
        };
        repository?: string;
      };
    };
    
    const pkg = data.package;
    const maintainers = pkg.maintainers.map(m => ({ name: m.name }));
    
    // Get versions and build time map
    const versions = Object.keys(pkg.versions);
    const time: Record<string, string> = {};
    let latestVersion = '';
    let latestTime = 0;
    
    for (const [version, versionData] of Object.entries(pkg.versions)) {
      if (versionData.time) {
        time[version] = versionData.time;
        const vTime = new Date(versionData.time).getTime();
        if (vTime > latestTime && !version.includes('dev')) {
          latestTime = vTime;
          latestVersion = version;
        }
      }
    }
    
    // Repository URL
    let repoUrl = pkg.repository;
    if (!repoUrl && versions.length > 0) {
      const firstVersion = pkg.versions[versions[0]];
      repoUrl = firstVersion?.source?.url || firstVersion?.homepage;
    }
    
    return {
      name: pkg.name,
      version: latestVersion || versions[0] || '',
      maintainers,
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'packagist',
      downloads: pkg.downloads?.total,
    };
  } catch (error) {
    throw new Error(`Failed to fetch Packagist package info: ${error}`);
  }
}
