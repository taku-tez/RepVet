/**
 * MetaCPAN (Perl) Registry API
 */

import { PackageInfo } from '../types.js';

const METACPAN_API = 'https://fastapi.metacpan.org/v1';

export async function fetchCPANPackageInfo(packageName: string): Promise<PackageInfo | null> {
  try {
    // MetaCPAN uses distribution names (e.g., "Moose" not "Moose::Util")
    const distName = packageName.replace(/::/g, '-');
    
    const response = await fetch(`${METACPAN_API}/release/${encodeURIComponent(distName)}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`MetaCPAN API error: ${response.status}`);
    }
    
    const data = await response.json() as {
      distribution: string;
      version: string;
      author: string;
      date: string;
      resources?: {
        repository?: {
          url?: string;
          web?: string;
        };
      };
      metadata?: {
        author?: string[];
      };
    };
    
    // Get maintainers
    const maintainers: Array<{ name: string }> = [];
    if (data.metadata?.author) {
      for (const author of data.metadata.author) {
        // Parse "Name <email>" format
        const nameMatch = author.match(/^([^<]+)/);
        if (nameMatch) {
          maintainers.push({ name: nameMatch[1].trim() });
        }
      }
    }
    if (maintainers.length === 0 && data.author) {
      maintainers.push({ name: data.author });
    }
    
    // Get version history
    const time: Record<string, string> = {};
    try {
      const historyResponse = await fetch(
        `${METACPAN_API}/release/_search?q=distribution:${encodeURIComponent(distName)}&size=100&fields=version,date`
      );
      if (historyResponse.ok) {
        const historyData = await historyResponse.json() as {
          hits: {
            hits: Array<{
              fields: {
                version: string[];
                date: string[];
              };
            }>;
          };
        };
        for (const hit of historyData.hits.hits) {
          if (hit.fields?.version?.[0] && hit.fields?.date?.[0]) {
            time[hit.fields.version[0]] = hit.fields.date[0];
          }
        }
      }
    } catch {
      // Fallback to just current version
      time[data.version] = data.date;
    }
    
    // Repository URL
    let repoUrl = data.resources?.repository?.web || data.resources?.repository?.url;
    if (repoUrl) {
      // Clean up git:// URLs
      repoUrl = repoUrl.replace(/^git:\/\//, 'https://').replace(/\.git$/, '');
      if (!repoUrl.includes('github.com') && !repoUrl.includes('gitlab.com')) {
        repoUrl = undefined;
      }
    }
    
    return {
      name: data.distribution,
      version: data.version,
      maintainers,
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'cpan',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch CPAN package info: ${message}`);
  }
}
