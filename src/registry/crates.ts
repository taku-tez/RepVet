/**
 * crates.io Registry API
 */

import { PackageInfo } from '../types.js';

const CRATES_API = 'https://crates.io/api/v1/crates';

export async function fetchCratesPackageInfo(packageName: string): Promise<PackageInfo | null> {
  try {
    const response = await fetch(`${CRATES_API}/${encodeURIComponent(packageName)}`, {
      headers: {
        'User-Agent': 'RepVet/0.2.0 (https://github.com/taku-tez/RepVet)',
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`crates.io API error: ${response.status}`);
    }
    
    const data = await response.json() as {
      crate: {
        id: string;
        name: string;
        max_version: string;
        repository?: string;
        created_at: string;
        updated_at: string;
        downloads: number;
      };
      versions: Array<{
        num: string;
        created_at: string;
        downloads: number;
        published_by?: { login: string; name?: string };
      }>;
    };
    
    // Get unique publishers as maintainers
    const maintainerMap = new Map<string, { name: string }>();
    for (const version of data.versions) {
      if (version.published_by) {
        maintainerMap.set(version.published_by.login, {
          name: version.published_by.name || version.published_by.login,
        });
      }
    }
    
    // Build time map
    const time: Record<string, string> = {};
    for (const version of data.versions) {
      time[version.num] = version.created_at;
    }
    
    return {
      name: data.crate.name,
      version: data.crate.max_version,
      maintainers: Array.from(maintainerMap.values()),
      repository: data.crate.repository 
        ? { type: 'git', url: data.crate.repository } 
        : undefined,
      time,
      ecosystem: 'crates',
      downloads: data.crate.downloads,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch crates.io package info: ${message}`);
  }
}

/**
 * Check for yanked versions in a Rust crate
 * 
 * Returns information about yanked versions including:
 * - Whether the latest version is yanked
 * - List of yanked versions with their yank messages (if any)
 * - Ratio of yanked versions
 */
export async function checkCratesYanked(packageName: string): Promise<{
  hasYanked: boolean;
  latestIsYanked: boolean;
  yankedVersions: Array<{ version: string; message?: string }>;
  yankedRatio: number;
}> {
  try {
    const response = await fetch(`${CRATES_API}/${encodeURIComponent(packageName)}`, {
      headers: {
        'User-Agent': 'RepVet/0.2.0 (https://github.com/taku-tez/RepVet)',
      },
    });
    
    if (!response.ok) {
      return { hasYanked: false, latestIsYanked: false, yankedVersions: [], yankedRatio: 0 };
    }
    
    const data = await response.json() as {
      crate: {
        max_version: string;
      };
      versions: Array<{
        num: string;
        yanked: boolean;
        yank_message?: string | null;
        created_at: string;
      }>;
    };
    
    // Sort versions by created_at (newest first)
    const sortedVersions = data.versions.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    const yankedVersions = sortedVersions
      .filter(v => v.yanked)
      .map(v => ({
        version: v.num,
        message: v.yank_message || undefined,
      }));
    
    const latestVersion = sortedVersions[0];
    const latestIsYanked = latestVersion?.yanked === true;
    
    return {
      hasYanked: yankedVersions.length > 0,
      latestIsYanked,
      yankedVersions,
      yankedRatio: sortedVersions.length > 0 ? yankedVersions.length / sortedVersions.length : 0,
    };
  } catch {
    return { hasYanked: false, latestIsYanked: false, yankedVersions: [], yankedRatio: 0 };
  }
}

/**
 * Check ownership transfer for Rust crates
 * 
 * Improved: Only flag truly suspicious transfers, not normal maintainer succession
 */
export async function checkCratesOwnershipTransfer(packageName: string): Promise<{
  transferred: boolean;
  confidence: 'high' | 'medium' | 'low';
  details?: string;
}> {
  try {
    const response = await fetch(`${CRATES_API}/${encodeURIComponent(packageName)}`, {
      headers: {
        'User-Agent': 'RepVet/0.2.0',
      },
    });
    
    if (!response.ok) return { transferred: false, confidence: 'low' };
    
    const data = await response.json() as {
      crate: {
        downloads: number;
        created_at: string;
      };
      versions: Array<{
        num: string;
        created_at: string;
        downloads: number;
        published_by?: { login: string };
      }>;
    };
    
    const versions = data.versions
      .filter(v => v.published_by)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    if (versions.length < 2) return { transferred: false, confidence: 'low' };
    
    // Calculate project age
    const projectAgeYears = (Date.now() - new Date(data.crate.created_at).getTime()) / (365 * 24 * 60 * 60 * 1000);
    const isEstablished = projectAgeYears > 2 || data.crate.downloads > 1000000;
    
    // Track publisher changes
    let lastPublisher = versions[0].published_by?.login;
    let transfers = 0;
    let recentTransfers = 0; // Transfers in last 6 months
    let transferDetails: string | undefined;
    
    const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);
    
    for (let i = 1; i < versions.length; i++) {
      const currentPublisher = versions[i].published_by?.login;
      if (currentPublisher && lastPublisher && currentPublisher !== lastPublisher) {
        const versionDate = new Date(versions[i].created_at).getTime();
        const daysBetween = (versionDate - new Date(versions[i - 1].created_at).getTime()) / (1000 * 60 * 60 * 24);
        
        transfers++;
        
        // Only flag recent transfers as suspicious
        if (versionDate > sixMonthsAgo) {
          recentTransfers++;
          if (daysBetween < 7) {
            transferDetails = `Very rapid publisher change: ${lastPublisher} → ${currentPublisher} in ${Math.round(daysBetween)} days`;
          }
        }
      }
      lastPublisher = currentPublisher;
    }
    
    // For established projects, only flag very suspicious patterns
    if (isEstablished) {
      // Multiple transfers is ok for old projects (normal team evolution)
      // Only flag if there's a very recent rapid transfer
      if (recentTransfers > 0 && transferDetails) {
        return {
          transferred: true,
          confidence: 'low', // Low confidence for established projects
          details: transferDetails,
        };
      }
      return { transferred: false, confidence: 'high' };
    }
    
    // For newer projects, flag transfers with higher confidence
    if (transfers > 0) {
      return {
        transferred: true,
        confidence: recentTransfers > 1 ? 'high' : transfers > 2 ? 'medium' : 'low',
        details: transferDetails || `${transfers} publisher change(s) in project history`,
      };
    }
    
    return { transferred: false, confidence: 'high' };
  } catch {
    return { transferred: false, confidence: 'low' };
  }
}
