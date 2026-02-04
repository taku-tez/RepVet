/**
 * pub.dev (Dart/Flutter) Registry API
 */

import { PackageInfo } from '../types.js';
import { fetchWithRetry } from './utils.js';

const PUB_API = 'https://pub.dev/api';

export interface PubPackageData extends PackageInfo {
  ecosystem: 'pub';
  isDiscontinued?: boolean;
  replacedBy?: string;
  isUnlisted?: boolean;
}

export interface PubDiscontinuedResult {
  isDiscontinued: boolean;
  isUnlisted: boolean;
  replacedBy?: string;
}

export async function fetchPubPackageInfo(packageName: string): Promise<PubPackageData | null> {
  try {
    const response = await fetch(`${PUB_API}/packages/${encodeURIComponent(packageName)}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`pub.dev API error: ${response.status}`);
    }
    
    const data = await response.json() as {
      name: string;
      isDiscontinued?: boolean;
      replacedBy?: string;
      isUnlisted?: boolean;
      latest: {
        version: string;
        pubspec: {
          name: string;
          version: string;
          author?: string;
          authors?: string[];
          homepage?: string;
          repository?: string;
        };
      };
      versions: Array<{
        version: string;
        published: string;
      }>;
    };
    
    // Get maintainers
    const maintainers: Array<{ name: string }> = [];
    const pubspec = data.latest.pubspec;
    
    // Try pubspec authors first
    if (pubspec.authors) {
      for (const author of pubspec.authors) {
        const nameMatch = author.match(/^([^<]+)/);
        if (nameMatch) {
          maintainers.push({ name: nameMatch[1].trim() });
        }
      }
    } else if (pubspec.author) {
      const nameMatch = pubspec.author.match(/^([^<]+)/);
      if (nameMatch) {
        maintainers.push({ name: nameMatch[1].trim() });
      }
    }
    
    // If no maintainers from pubspec, try publisher endpoint
    if (maintainers.length === 0) {
      try {
        const publisherResponse = await fetch(`${PUB_API}/packages/${encodeURIComponent(packageName)}/publisher`);
        if (publisherResponse.ok) {
          const publisherData = await publisherResponse.json() as { publisherId?: string };
          if (publisherData.publisherId) {
            maintainers.push({ name: publisherData.publisherId });
          }
        }
      } catch {
        // Ignore publisher fetch errors
      }
    }
    
    // If still no maintainers, try to extract from repository URL
    if (maintainers.length === 0) {
      const repoUrl = pubspec.repository || pubspec.homepage || '';
      const githubMatch = repoUrl.match(/github\.com\/([^/]+)/);
      if (githubMatch) {
        maintainers.push({ name: githubMatch[1] });
      }
    }
    
    // Build time map
    const time: Record<string, string> = {};
    for (const version of data.versions) {
      time[version.version] = version.published;
    }
    
    // Repository URL
    let repoUrl = pubspec.repository || pubspec.homepage;
    if (repoUrl && !repoUrl.includes('github.com') && !repoUrl.includes('gitlab.com')) {
      repoUrl = undefined;
    }
    
    return {
      name: data.name,
      version: data.latest.version,
      maintainers,
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'pub',
      isDiscontinued: data.isDiscontinued,
      replacedBy: data.replacedBy,
      isUnlisted: data.isUnlisted,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch pub.dev package info: ${message}`);
  }
}

/**
 * Check if a pub.dev package is discontinued or unlisted
 * 
 * pub.dev has two status flags:
 * - isDiscontinued: Package is discontinued, optionally with replacedBy suggestion
 * - isUnlisted: Package is hidden from search results (still downloadable)
 * 
 * Examples of discontinued packages:
 * - pedantic (replaced by: lints)
 * - angular (deprecated)
 */
export async function checkPubDiscontinued(packageName: string): Promise<PubDiscontinuedResult> {
  try {
    const response = await fetchWithRetry(
      `${PUB_API}/packages/${encodeURIComponent(packageName)}`,
      { timeoutMs: 5000 }
    );
    
    if (!response.ok) {
      return { isDiscontinued: false, isUnlisted: false };
    }
    
    const data = await response.json() as {
      isDiscontinued?: boolean;
      replacedBy?: string;
      isUnlisted?: boolean;
    };
    
    return {
      isDiscontinued: data.isDiscontinued ?? false,
      isUnlisted: data.isUnlisted ?? false,
      replacedBy: data.replacedBy,
    };
  } catch {
    return { isDiscontinued: false, isUnlisted: false };
  }
}
