/**
 * Hex.pm (Elixir) Registry API
 * 
 * Supports:
 * - Package info fetch
 * - Retired release detection (via retirement field)
 * - Owner information
 */

import { PackageInfo } from '../types.js';

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
