/**
 * crates.io Registry API
 */

import { PackageInfo } from '../types.js';

const CRATES_API = 'https://crates.io/api/v1/crates';

export async function fetchCratesPackageInfo(packageName: string): Promise<PackageInfo | null> {
  try {
    const response = await fetch(`${CRATES_API}/${encodeURIComponent(packageName)}`, {
      headers: {
        'User-Agent': 'RepVet/0.1.0 (https://github.com/taku-tez/RepVet)',
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
      };
      versions: Array<{
        num: string;
        created_at: string;
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
    };
  } catch (error) {
    throw new Error(`Failed to fetch crates.io package info: ${error}`);
  }
}

/**
 * Check ownership transfer for Rust crates
 */
export async function checkCratesOwnershipTransfer(packageName: string): Promise<{
  transferred: boolean;
  confidence: 'high' | 'medium' | 'low';
  details?: string;
}> {
  try {
    const response = await fetch(`${CRATES_API}/${encodeURIComponent(packageName)}`, {
      headers: {
        'User-Agent': 'RepVet/0.1.0',
      },
    });
    
    if (!response.ok) return { transferred: false, confidence: 'low' };
    
    const data = await response.json() as {
      versions: Array<{
        num: string;
        created_at: string;
        published_by?: { login: string };
      }>;
    };
    
    const versions = data.versions
      .filter(v => v.published_by)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    if (versions.length < 2) return { transferred: false, confidence: 'low' };
    
    // Track publisher changes
    let lastPublisher = versions[0].published_by?.login;
    let transfers = 0;
    let transferDetails: string | undefined;
    
    for (let i = 1; i < versions.length; i++) {
      const currentPublisher = versions[i].published_by?.login;
      if (currentPublisher && lastPublisher && currentPublisher !== lastPublisher) {
        const daysBetween = (
          new Date(versions[i].created_at).getTime() - 
          new Date(versions[i - 1].created_at).getTime()
        ) / (1000 * 60 * 60 * 24);
        
        if (daysBetween < 30) {
          transfers++;
          transferDetails = `Publisher changed from ${lastPublisher} to ${currentPublisher} in ${Math.round(daysBetween)} days`;
        }
      }
      lastPublisher = currentPublisher;
    }
    
    return {
      transferred: transfers > 0,
      confidence: transfers > 1 ? 'high' : 'medium',
      details: transferDetails,
    };
  } catch {
    return { transferred: false, confidence: 'low' };
  }
}
