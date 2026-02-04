/**
 * pub.dev (Dart/Flutter) Registry API
 */

import { PackageInfo } from '../types.js';

const PUB_API = 'https://pub.dev/api';

export async function fetchPubPackageInfo(packageName: string): Promise<PackageInfo | null> {
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
    
    if (pubspec.authors) {
      for (const author of pubspec.authors) {
        // Parse "Name <email>" format
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
    };
  } catch (error) {
    throw new Error(`Failed to fetch pub.dev package info: ${error}`);
  }
}
