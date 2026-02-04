/**
 * pub.dev (Dart/Flutter) Registry API
 */

import { PackageInfo } from '../types.js';
import { fetchWithRetry, OwnershipTransferResult, NO_TRANSFER_DETECTED } from './utils.js';

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

/**
 * Check for ownership transfer indicators in a pub.dev package
 * 
 * Detection methods:
 * 1. Check version history for long gaps followed by new activity
 * 2. Publisher verification status
 * 3. Repository URL ownership mismatch
 * 
 * Note: pub.dev doesn't provide historical publisher data,
 * so detection is heuristic-based on current state.
 */
export async function checkPubOwnershipTransfer(
  packageName: string
): Promise<OwnershipTransferResult> {
  try {
    // Fetch package info
    const packageResponse = await fetchWithRetry(
      `${PUB_API}/packages/${encodeURIComponent(packageName)}`,
      { timeoutMs: 10000 }
    );
    
    if (!packageResponse.ok) {
      return NO_TRANSFER_DETECTED;
    }
    
    const packageData = await packageResponse.json() as {
      name: string;
      versions: Array<{
        version: string;
        published: string;
      }>;
      latest: {
        pubspec: {
          homepage?: string;
          repository?: string;
          author?: string;
          authors?: string[];
        };
      };
    };
    
    // Fetch publisher info
    let publisherId: string | undefined;
    try {
      const publisherResponse = await fetchWithRetry(
        `${PUB_API}/packages/${encodeURIComponent(packageName)}/publisher`,
        { timeoutMs: 5000 }
      );
      if (publisherResponse.ok) {
        const publisherData = await publisherResponse.json() as { publisherId?: string };
        publisherId = publisherData.publisherId;
      }
    } catch {
      // Publisher endpoint may fail for packages without verified publisher
    }
    
    const versions = packageData.versions || [];
    
    if (versions.length < 2) {
      return { transferred: false, confidence: 'high' };
    }
    
    // Sort versions by publish date (oldest first)
    const sortedVersions = [...versions].sort(
      (a, b) => new Date(a.published).getTime() - new Date(b.published).getTime()
    );
    
    // Check for suspicious gap patterns
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const yearMs = 365 * 24 * 60 * 60 * 1000;
    
    let maxGapMs = 0;
    let gapEndedRecently = false;
    
    for (let i = 1; i < sortedVersions.length; i++) {
      const prevDate = new Date(sortedVersions[i - 1].published).getTime();
      const currDate = new Date(sortedVersions[i].published).getTime();
      const gap = currDate - prevDate;
      
      if (gap > maxGapMs) {
        maxGapMs = gap;
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
    const pubspec = packageData.latest?.pubspec;
    const repoUrl = pubspec?.repository || pubspec?.homepage;
    
    if (repoUrl && publisherId) {
      const githubMatch = repoUrl.match(/github\.com\/([^/]+)/i);
      if (githubMatch) {
        const githubOwner = githubMatch[1].toLowerCase();
        const pubOwner = publisherId.toLowerCase().replace(/\..*$/, ''); // Remove domain part
        
        // Check if GitHub owner matches publisher
        const ownerMatches = 
          pubOwner.includes(githubOwner) || 
          githubOwner.includes(pubOwner) ||
          pubOwner === githubOwner;
        
        if (!ownerMatches) {
          return {
            transferred: true,
            confidence: 'low',
            details: `Repository owner (${githubOwner}) doesn't match publisher (${publisherId})`,
          };
        }
      }
    }
    
    // Check if package has no verified publisher (higher risk)
    if (!publisherId && versions.length > 5) {
      return {
        transferred: false,
        confidence: 'medium',
        details: 'No verified publisher for established package',
      };
    }
    
    return { transferred: false, confidence: 'high' };
  } catch {
    return NO_TRANSFER_DETECTED;
  }
}
