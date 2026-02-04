/**
 * MetaCPAN (Perl) Registry API
 */

import { PackageInfo } from '../types.js';
import { fetchWithRetry, OwnershipTransferResult, NO_TRANSFER_DETECTED } from './utils.js';

const METACPAN_API = 'https://fastapi.metacpan.org/v1';

/**
 * CPAN deprecated result
 */
export interface CPANDeprecatedResult {
  deprecated: boolean;
  reason?: string;  // Reason if available
}

/**
 * Extended CPAN package data with deprecated info
 */
export interface CPANPackageData extends PackageInfo {
  ecosystem: 'cpan';
  deprecated?: string;  // Deprecation message for compatibility with npm pattern
  maturity?: string;    // 'released' | 'developer'
}

export async function fetchCPANPackageInfo(packageName: string): Promise<CPANPackageData | null> {
  try {
    // MetaCPAN uses distribution names (e.g., "Moose" not "Moose::Util")
    const distName = packageName.replace(/::/g, '-');
    
    const response = await fetchWithRetry(
      `${METACPAN_API}/release/${encodeURIComponent(distName)}`,
      { timeoutMs: 10000 }
    );
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
      deprecated?: boolean;
      maturity?: string;
      abstract?: string;
      resources?: {
        repository?: {
          url?: string;
          web?: string;
        };
      };
      metadata?: {
        author?: string[];
        x_deprecated?: string | boolean;
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
      const historyResponse = await fetchWithRetry(
        `${METACPAN_API}/release/_search?q=distribution:${encodeURIComponent(distName)}&size=100&fields=version,date`,
        { timeoutMs: 10000 }
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
    
    // Check deprecated status
    let deprecated: string | undefined;
    if (data.deprecated === true) {
      // Check for x_deprecated in metadata for reason
      if (data.metadata?.x_deprecated) {
        deprecated = typeof data.metadata.x_deprecated === 'string'
          ? data.metadata.x_deprecated
          : 'Module marked as deprecated';
      } else {
        deprecated = 'Module marked as deprecated';
      }
    }
    
    return {
      name: data.distribution,
      version: data.version,
      maintainers,
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'cpan',
      deprecated,
      maturity: data.maturity,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch CPAN package info: ${message}`);
  }
}

/**
 * Check for ownership transfer in CPAN packages
 * 
 * Uses MetaCPAN release history to detect author changes between versions.
 * CPAN has the concept of PAUSE ID (author) per release.
 */
export async function checkCPANOwnershipTransfer(
  packageName: string
): Promise<OwnershipTransferResult> {
  try {
    const distName = packageName.replace(/::/g, '-');
    
    // Fetch release history with author info
    const response = await fetchWithRetry(
      `${METACPAN_API}/release/_search?q=distribution:${encodeURIComponent(distName)}&sort=date:desc&size=50`,
      { timeoutMs: 10000 }
    );
    
    if (!response.ok) {
      return NO_TRANSFER_DETECTED;
    }
    
    const data = await response.json() as {
      hits: {
        hits: Array<{
          _source: {
            author: string;
            date: string;
            version: string;
          };
        }>;
      };
    };
    
    const releases = data.hits.hits
      .map(h => h._source)
      .filter(r => r.author && r.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (releases.length < 2) {
      return NO_TRANSFER_DETECTED;
    }
    
    // Track author changes
    const authors = new Set<string>();
    let lastAuthor: string | undefined;
    let authorChanges = 0;
    let lastChangeDetails: string | undefined;
    
    for (let i = releases.length - 1; i >= 0; i--) {
      const release = releases[i];
      const author = release.author.toUpperCase(); // PAUSE IDs are case-insensitive
      authors.add(author);
      
      if (lastAuthor && author !== lastAuthor) {
        authorChanges++;
        lastChangeDetails = `Author changed from ${lastAuthor} to ${author} at version ${release.version}`;
      }
      lastAuthor = author;
    }
    
    // Single author change might be legitimate transfer (co-maint, etc.)
    // Multiple changes are more suspicious
    if (authorChanges > 0) {
      // Check if the most recent change was very recent (within 30 days)
      const latestRelease = releases[0];
      const previousRelease = releases.find(r => r.author !== latestRelease.author);
      
      if (previousRelease) {
        const daysBetween = (new Date(latestRelease.date).getTime() - 
          new Date(previousRelease.date).getTime()) / (1000 * 60 * 60 * 24);
        
        // Quick author change after long gap is suspicious
        if (daysBetween < 30 && releases[0].author !== releases[1].author) {
          return {
            transferred: true,
            confidence: 'high',
            details: `Author changed to ${latestRelease.author} within ${Math.round(daysBetween)} days`,
          };
        }
      }
      
      // Multiple author changes are suspicious
      if (authorChanges > 1) {
        return {
          transferred: true,
          confidence: 'medium',
          details: `${authors.size} different authors across release history`,
        };
      }
      
      // Single change - low confidence
      if (authorChanges === 1) {
        return {
          transferred: true,
          confidence: 'low',
          details: lastChangeDetails,
        };
      }
    }
    
    return { transferred: false, confidence: 'high' };
  } catch {
    return NO_TRANSFER_DETECTED;
  }
}

/**
 * Check if a CPAN module is deprecated
 * 
 * MetaCPAN tracks deprecated status in the release document
 * Also checks for x_deprecated in metadata
 */
export async function checkCPANDeprecated(packageName: string): Promise<CPANDeprecatedResult> {
  try {
    const distName = packageName.replace(/::/g, '-');
    
    const response = await fetchWithRetry(
      `${METACPAN_API}/release/${encodeURIComponent(distName)}`,
      { timeoutMs: 10000 }
    );
    
    if (!response.ok) {
      return { deprecated: false };
    }
    
    const data = await response.json() as {
      deprecated?: boolean;
      metadata?: {
        x_deprecated?: string | boolean;
      };
    };
    
    if (data.deprecated === true) {
      // Try to get reason from x_deprecated
      let reason: string | undefined;
      if (data.metadata?.x_deprecated) {
        reason = typeof data.metadata.x_deprecated === 'string'
          ? data.metadata.x_deprecated
          : undefined;
      }
      return { deprecated: true, reason };
    }
    
    return { deprecated: false };
  } catch {
    return { deprecated: false };
  }
}
