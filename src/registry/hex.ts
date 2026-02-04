/**
 * Hex.pm (Elixir) Registry API
 * 
 * Supports:
 * - Package info fetch
 * - Retired release detection (via retirement field)
 * - Owner information
 */

import { PackageInfo } from '../types.js';
import { fetchWithRetry, OwnershipTransferResult, NO_TRANSFER_DETECTED } from './utils.js';

const HEX_API = 'https://hex.pm/api';

/**
 * Retirement reasons as defined by Hex.pm
 * @see https://hexdocs.pm/hex/Mix.Tasks.Hex.Retire.html
 */
export type HexRetirementReason = 'deprecated' | 'renamed' | 'security' | 'invalid' | 'other';

export interface HexRetirement {
  reason: HexRetirementReason;
  message?: string;
}

export interface HexPackageData extends PackageInfo {
  /** If the latest version is retired */
  retired?: boolean;
  /** Retirement reason for latest version */
  retirementReason?: HexRetirementReason;
  /** Retirement message */
  retirementMessage?: string;
  /** List of owners (usernames) */
  owners?: string[];
}

export async function fetchHexPackageInfo(packageName: string): Promise<HexPackageData | null> {
  try {
    const response = await fetch(`${HEX_API}/packages/${encodeURIComponent(packageName)}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Hex API error: ${response.status}`);
    }
    
    const data = await response.json() as {
      name: string;
      releases: Array<{
        version: string;
        inserted_at: string;
        retirement?: HexRetirement;
      }>;
      meta?: {
        maintainers?: string[];
        links?: Record<string, string>;
      };
      downloads: {
        all: number;
      };
      owners?: Array<{ username: string; email?: string }>;
    };
    
    // Get maintainers from owners or meta
    const maintainers: Array<{ name: string }> = [];
    const ownerUsernames: string[] = [];
    if (data.owners) {
      for (const owner of data.owners) {
        maintainers.push({ name: owner.username });
        ownerUsernames.push(owner.username);
      }
    } else if (data.meta?.maintainers) {
      for (const m of data.meta.maintainers) {
        maintainers.push({ name: m });
      }
    }
    
    // Build time map
    const time: Record<string, string> = {};
    for (const release of data.releases) {
      time[release.version] = release.inserted_at;
    }
    
    // Get latest version and check retirement
    const latestRelease = data.releases[0];
    const latestVersion = latestRelease?.version || '';
    
    // Repository URL
    let repoUrl: string | undefined;
    if (data.meta?.links) {
      for (const [_key, url] of Object.entries(data.meta.links)) {
        if (url.includes('github.com') || url.includes('gitlab.com')) {
          repoUrl = url;
          break;
        }
      }
    }
    
    const result: HexPackageData = {
      name: data.name,
      version: latestVersion,
      maintainers,
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'hex',
      downloads: data.downloads?.all,
    };
    
    // Add owners if available
    if (ownerUsernames.length > 0) {
      result.owners = ownerUsernames;
    }
    
    // Add retirement info if latest version is retired
    if (latestRelease?.retirement) {
      result.retired = true;
      result.retirementReason = latestRelease.retirement.reason;
      result.retirementMessage = latestRelease.retirement.message;
    }
    
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch Hex package info: ${message}`);
  }
}

/**
 * Check if a Hex package has retired releases
 * 
 * Retirement reasons:
 * - deprecated: Package has been deprecated
 * - renamed: Package has been renamed
 * - security: Security issues with the package
 * - invalid: Package is invalid (e.g., doesn't compile)
 * - other: Any other reason
 * 
 * @returns Information about retired releases
 */
export async function checkHexRetired(packageName: string): Promise<{
  hasRetiredReleases: boolean;
  latestIsRetired: boolean;
  retiredReleases: Array<{
    version: string;
    reason: HexRetirementReason;
    message?: string;
  }>;
}> {
  try {
    const response = await fetch(`${HEX_API}/packages/${encodeURIComponent(packageName)}`);
    if (!response.ok) {
      return { hasRetiredReleases: false, latestIsRetired: false, retiredReleases: [] };
    }
    
    const data = await response.json() as {
      releases: Array<{
        version: string;
        retirement?: HexRetirement;
      }>;
    };
    
    const retiredReleases: Array<{
      version: string;
      reason: HexRetirementReason;
      message?: string;
    }> = [];
    
    for (const release of data.releases) {
      if (release.retirement) {
        retiredReleases.push({
          version: release.version,
          reason: release.retirement.reason,
          message: release.retirement.message,
        });
      }
    }
    
    const latestIsRetired = data.releases[0]?.retirement !== undefined;
    
    return {
      hasRetiredReleases: retiredReleases.length > 0,
      latestIsRetired,
      retiredReleases,
    };
  } catch {
    return { hasRetiredReleases: false, latestIsRetired: false, retiredReleases: [] };
  }
}

/**
 * Check for ownership transfer indicators in a Hex package
 * 
 * Detection methods:
 * 1. Check version history for long gaps followed by new activity
 * 2. Single owner check (potential single-point-of-failure)
 * 3. Repository URL ownership mismatch
 * 
 * Note: Hex.pm API doesn't provide owner addition timestamps,
 * so detection is heuristic-based.
 */
export async function checkHexOwnershipTransfer(
  packageName: string
): Promise<OwnershipTransferResult> {
  try {
    const response = await fetchWithRetry(
      `${HEX_API}/packages/${encodeURIComponent(packageName)}`,
      { timeoutMs: 10000 }
    );
    
    if (!response.ok) {
      return NO_TRANSFER_DETECTED;
    }
    
    const data = await response.json() as {
      name: string;
      releases: Array<{
        version: string;
        inserted_at: string;
      }>;
      owners?: Array<{ username: string; email?: string }>;
      meta?: {
        links?: Record<string, string>;
      };
    };
    
    const owners = data.owners || [];
    const releases = data.releases || [];
    
    if (releases.length < 2) {
      // New package, no transfer possible
      return { transferred: false, confidence: 'high' };
    }
    
    // Sort releases by date (oldest first)
    const sortedReleases = [...releases].sort(
      (a, b) => new Date(a.inserted_at).getTime() - new Date(b.inserted_at).getTime()
    );
    
    // Check for suspicious gap patterns:
    // Long dormancy (>365 days) followed by recent activity (<30 days)
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const yearMs = 365 * 24 * 60 * 60 * 1000;
    
    let maxGapMs = 0;
    let gapEndedRecently = false;
    
    for (let i = 1; i < sortedReleases.length; i++) {
      const prevDate = new Date(sortedReleases[i - 1].inserted_at).getTime();
      const currDate = new Date(sortedReleases[i].inserted_at).getTime();
      const gap = currDate - prevDate;
      
      if (gap > maxGapMs) {
        maxGapMs = gap;
        // Check if this gap ended recently (within 30 days of now)
        gapEndedRecently = (now - currDate) < thirtyDaysMs;
      }
    }
    
    // Pattern: Long dormancy > 1 year, then sudden activity
    if (maxGapMs > yearMs && gapEndedRecently) {
      return {
        transferred: true,
        confidence: 'medium',
        details: `Package dormant for ${Math.round(maxGapMs / yearMs)} year(s), then suddenly active`,
      };
    }
    
    // Check for repository ownership mismatch
    // If GitHub owner doesn't match any Hex owner, potential flag
    // BUT: Skip this check if there are multiple Hex owners (likely an org with individual maintainers)
    const repoUrl = data.meta?.links?.GitHub || 
                    data.meta?.links?.github ||
                    Object.values(data.meta?.links || {}).find(u => u.includes('github.com'));
    
    // Only flag mismatch for single-owner packages (more suspicious)
    // Multi-owner packages often have org repos with individual maintainers
    if (repoUrl && owners.length === 1) {
      const githubMatch = repoUrl.match(/github\.com\/([^/]+)/i);
      if (githubMatch) {
        const githubOwner = githubMatch[1].toLowerCase();
        const hexOwner = owners[0].username.toLowerCase();
        
        // Check if owner matches
        const ownerMatches = 
          hexOwner === githubOwner || 
          githubOwner.includes(hexOwner) || 
          hexOwner.includes(githubOwner);
        
        if (!ownerMatches) {
          return {
            transferred: true,
            confidence: 'low',
            details: `Repository owner (${githubOwner}) doesn't match Hex owner (${hexOwner})`,
          };
        }
      }
    }
    
    // Single owner can be a risk indicator (not necessarily transfer)
    if (owners.length === 1 && releases.length > 10) {
      // Established package with single owner - note but don't flag as transfer
      return {
        transferred: false,
        confidence: 'medium',
        details: `Single owner (${owners[0].username}) for established package`,
      };
    }
    
    return { transferred: false, confidence: 'high' };
  } catch {
    return NO_TRANSFER_DETECTED;
  }
}
