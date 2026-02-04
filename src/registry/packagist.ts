/**
 * Packagist (PHP) Registry API
 */

import { PackageInfo } from '../types.js';
import { OwnershipTransferResult, NO_TRANSFER_DETECTED, fetchWithRetry, daysBetween } from './utils.js';

const PACKAGIST_API = 'https://packagist.org';
const PACKAGIST_P2_API = 'https://repo.packagist.org/p2';

export interface PackagistPackageData extends PackageInfo {
  ecosystem: 'packagist';
  abandoned?: boolean;
  abandonedReplacement?: string;
}

/**
 * Result of abandoned package check
 */
export interface AbandonedResult {
  abandoned: boolean;
  replacement?: string;  // Suggested replacement package
}

export async function fetchPackagistPackageInfo(packageName: string): Promise<PackagistPackageData | null> {
  try {
    const response = await fetchWithRetry(
      `${PACKAGIST_API}/packages/${encodeURIComponent(packageName)}.json`,
      { timeoutMs: 5000 }
    );
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
          abandoned?: boolean | string;
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
    
    // Check for abandoned status in latest version
    const latestVersionData = pkg.versions[latestVersion];
    let abandoned = false;
    let abandonedReplacement: string | undefined;
    
    if (latestVersionData?.abandoned) {
      abandoned = true;
      if (typeof latestVersionData.abandoned === 'string') {
        abandonedReplacement = latestVersionData.abandoned;
      }
    }
    
    return {
      name: pkg.name,
      version: latestVersion || versions[0] || '',
      maintainers,
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'packagist',
      downloads: pkg.downloads?.total,
      abandoned,
      abandonedReplacement,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch Packagist package info: ${message}`);
  }
}

/**
 * Check if package is marked as abandoned
 * Uses p2 API for more reliable abandoned flag detection
 */
export async function checkPackagistAbandoned(packageName: string): Promise<AbandonedResult> {
  try {
    // p2 API has more reliable abandoned info in latest version entry
    const response = await fetchWithRetry(
      `${PACKAGIST_P2_API}/${encodeURIComponent(packageName)}.json`,
      { timeoutMs: 5000 }
    );
    
    if (!response.ok) {
      return { abandoned: false };
    }
    
    const data = await response.json() as {
      packages: Record<string, Array<{
        version: string;
        abandoned?: boolean | string;
      }>>;
    };
    
    // Get the first (latest) version entry
    const versions = data.packages[packageName];
    if (!versions || versions.length === 0) {
      return { abandoned: false };
    }
    
    const latestVersion = versions[0];
    if (latestVersion.abandoned) {
      return {
        abandoned: true,
        replacement: typeof latestVersion.abandoned === 'string' 
          ? latestVersion.abandoned 
          : undefined,
      };
    }
    
    return { abandoned: false };
  } catch {
    return { abandoned: false };
  }
}

/**
 * Check for suspicious ownership/author changes across versions
 * 
 * Detection strategy:
 * - Compares authors between versions
 * - Flags complete author replacement within a short time window
 * - Considers single-author packages changing hands as suspicious
 */
export async function checkPackagistOwnershipTransfer(packageName: string): Promise<OwnershipTransferResult> {
  try {
    const response = await fetchWithRetry(
      `${PACKAGIST_API}/packages/${encodeURIComponent(packageName)}.json`,
      { timeoutMs: 5000 }
    );
    
    if (!response.ok) {
      return NO_TRANSFER_DETECTED;
    }
    
    const data = await response.json() as {
      package: {
        versions: Record<string, {
          version: string;
          time?: string;
          authors?: Array<{ name: string; email?: string }>;
        }>;
      };
    };
    
    const versions = data.package.versions;
    const versionList = Object.keys(versions)
      .filter(v => !v.includes('dev') && !v.includes('-'))  // Filter out dev versions
      .slice(0, 50);  // Limit to recent 50 versions
    
    if (versionList.length < 2) {
      return NO_TRANSFER_DETECTED;
    }
    
    // Sort versions by publish time
    const sortedVersions = versionList
      .map(v => ({
        version: v,
        time: versions[v].time ? new Date(versions[v].time!).getTime() : 0,
        authors: versions[v].authors || [],
      }))
      .filter(v => v.time > 0)
      .sort((a, b) => a.time - b.time);
    
    if (sortedVersions.length < 2) {
      return NO_TRANSFER_DETECTED;
    }
    
    // Track author changes across versions
    let lastAuthors: Set<string> = new Set();
    let suspiciousTransfers = 0;
    let transferDetails: string | undefined;
    
    for (let i = 0; i < sortedVersions.length; i++) {
      const v = sortedVersions[i];
      
      // Normalize author names (lowercase, email prefix)
      const currentAuthors = new Set<string>();
      for (const author of v.authors) {
        if (author.name) {
          currentAuthors.add(author.name.toLowerCase());
        }
        if (author.email) {
          // Also track by email prefix for better matching
          const emailPrefix = author.email.split('@')[0].toLowerCase();
          currentAuthors.add(emailPrefix);
        }
      }
      
      if (currentAuthors.size === 0) continue;
      
      if (lastAuthors.size > 0) {
        // Check for complete author replacement
        const overlap = [...lastAuthors].filter(a => currentAuthors.has(a));
        
        if (overlap.length === 0) {
          // Complete replacement - check time window
          const prevTime = sortedVersions[i - 1]?.time || 0;
          const currTime = v.time;
          const daysBetweenVersions = (currTime - prevTime) / (1000 * 60 * 60 * 24);
          
          // Suspicious if complete replacement within 30 days
          if (daysBetweenVersions < 30) {
            suspiciousTransfers++;
            transferDetails = `Complete author change in ${Math.round(daysBetweenVersions)} days (${v.version})`;
          }
          // Also suspicious for single-author packages
          else if (lastAuthors.size <= 2 && currentAuthors.size <= 2) {
            suspiciousTransfers++;
            transferDetails = `Author replaced at ${v.version}`;
          }
        }
      }
      
      lastAuthors = currentAuthors;
    }
    
    if (suspiciousTransfers > 0) {
      return {
        transferred: true,
        confidence: suspiciousTransfers > 1 ? 'high' : 'medium',
        details: transferDetails,
      };
    }
    
    return { transferred: false, confidence: 'high' };
  } catch {
    return NO_TRANSFER_DETECTED;
  }
}
