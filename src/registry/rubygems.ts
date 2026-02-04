/**
 * RubyGems Registry API
 */

import { PackageInfo } from '../types.js';

const RUBYGEMS_API = 'https://rubygems.org/api/v1';

export async function fetchRubyGemsPackageInfo(packageName: string): Promise<PackageInfo | null> {
  try {
    const response = await fetch(`${RUBYGEMS_API}/gems/${encodeURIComponent(packageName)}.json`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`RubyGems API error: ${response.status}`);
    }
    
    const data = await response.json() as {
      name: string;
      version: string;
      authors: string;
      homepage_uri?: string;
      source_code_uri?: string;
      project_uri?: string;
      downloads: number;
      version_created_at?: string;
      created_at?: string;
    };
    
    // Parse authors (comma-separated string)
    const authorList = data.authors
      ? data.authors.split(',').map(a => a.trim()).filter(Boolean)
      : [];
    
    const maintainers = authorList.map(name => ({ name }));
    
    // Find repository URL
    let repoUrl: string | undefined;
    if (data.source_code_uri?.includes('github.com') || data.source_code_uri?.includes('gitlab.com')) {
      repoUrl = data.source_code_uri;
    } else if (data.homepage_uri?.includes('github.com')) {
      repoUrl = data.homepage_uri;
    }
    
    // Get version history for time map
    const versionsResponse = await fetch(`${RUBYGEMS_API}/versions/${encodeURIComponent(packageName)}.json`);
    const time: Record<string, string> = {};
    
    if (versionsResponse.ok) {
      const versions = await versionsResponse.json() as Array<{
        number: string;
        created_at: string;
      }>;
      for (const v of versions) {
        time[v.number] = v.created_at;
      }
    }
    
    return {
      name: data.name,
      version: data.version,
      maintainers,
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'rubygems',
      downloads: data.downloads,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch RubyGems package info: ${message}`);
  }
}

/**
 * Check for yanked versions in a Ruby gem
 * 
 * Note: RubyGems API returns yanked versions separately.
 * The versions endpoint may include 'yanked' field for each version.
 */
export async function checkRubyGemsYanked(packageName: string): Promise<{
  hasYanked: boolean;
  latestIsYanked: boolean;
  yankedVersions: Array<{ version: string }>;
  yankedRatio: number;
}> {
  try {
    const versionsResponse = await fetch(`${RUBYGEMS_API}/versions/${encodeURIComponent(packageName)}.json`);
    
    if (!versionsResponse.ok) {
      return { hasYanked: false, latestIsYanked: false, yankedVersions: [], yankedRatio: 0 };
    }
    
    const versions = await versionsResponse.json() as Array<{
      number: string;
      created_at: string;
      yanked?: boolean | null;
      prerelease?: boolean;
    }>;
    
    // Sort by created_at (newest first)
    const sortedVersions = versions.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // Filter yanked versions (yanked can be true, false, or null/undefined)
    const yankedVersions = sortedVersions
      .filter(v => v.yanked === true)
      .map(v => ({ version: v.number }));
    
    // Find latest non-prerelease version, or just latest if all are prerelease
    const latestStable = sortedVersions.find(v => !v.prerelease) || sortedVersions[0];
    const latestIsYanked = latestStable?.yanked === true;
    
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
 * Check ownership transfer for Ruby gems
 */
export async function checkRubyGemsOwnershipTransfer(packageName: string): Promise<{
  transferred: boolean;
  confidence: 'high' | 'medium' | 'low';
  details?: string;
}> {
  try {
    // Get gem owners
    const ownersResponse = await fetch(`${RUBYGEMS_API}/gems/${encodeURIComponent(packageName)}/owners.json`);
    
    if (!ownersResponse.ok) {
      return { transferred: false, confidence: 'low' };
    }
    
    // Parse owners to verify API response
    const _owners = await ownersResponse.json() as Array<{
      id: number;
      handle: string;
    }>;
    
    // RubyGems doesn't provide historical owner data publicly
    // We can only check current state
    // For now, just return false - could enhance with version author comparison
    return { transferred: false, confidence: 'low' };
  } catch {
    return { transferred: false, confidence: 'low' };
  }
}
