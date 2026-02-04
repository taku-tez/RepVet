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
    throw new Error(`Failed to fetch RubyGems package info: ${error}`);
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
    
    const owners = await ownersResponse.json() as Array<{
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
