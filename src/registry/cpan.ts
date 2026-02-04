/**
 * MetaCPAN (Perl) Registry API
 */

import { PackageInfo } from '../types.js';
import { fetchWithRetry } from './utils.js';

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
