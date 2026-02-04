/**
 * Hex.pm (Elixir) Registry API
 */

import { PackageInfo } from '../types.js';

const HEX_API = 'https://hex.pm/api';

export async function fetchHexPackageInfo(packageName: string): Promise<PackageInfo | null> {
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
      }>;
      meta?: {
        maintainers?: string[];
        links?: Record<string, string>;
      };
      downloads: {
        all: number;
      };
      owners?: Array<{ username: string }>;
    };
    
    // Get maintainers from owners or meta
    const maintainers: Array<{ name: string }> = [];
    if (data.owners) {
      for (const owner of data.owners) {
        maintainers.push({ name: owner.username });
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
    
    // Get latest version
    const latestVersion = data.releases[0]?.version || '';
    
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
    
    return {
      name: data.name,
      version: latestVersion,
      maintainers,
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'hex',
      downloads: data.downloads?.all,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch Hex package info: ${message}`);
  }
}
