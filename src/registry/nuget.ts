/**
 * NuGet (.NET) Registry API
 */

import { PackageInfo } from '../types.js';

const NUGET_API = 'https://api.nuget.org/v3';

interface NuGetCatalogEntry {
  version: string;
  published: string;
  authors?: string;
  projectUrl?: string;
  repository?: string;
}

interface NuGetPage {
  '@id': string;
  items?: Array<{ catalogEntry: NuGetCatalogEntry }>;
  count: number;
  lower: string;
  upper: string;
}

interface NuGetRegistration {
  items: NuGetPage[];
}

export async function fetchNuGetPackageInfo(packageName: string): Promise<PackageInfo | null> {
  try {
    // Get package registration (lowercase required)
    const lowerName = packageName.toLowerCase();
    const response = await fetch(
      `${NUGET_API}/registration5-semver1/${lowerName}/index.json`
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`NuGet API error: ${response.status}`);
    }
    
    const data = await response.json() as NuGetRegistration;
    
    if (!data.items || data.items.length === 0) {
      return null;
    }
    
    // Get the last page (contains latest versions)
    const lastPageRef = data.items[data.items.length - 1];
    
    // Check if items are inline or need to be fetched
    let pageItems: Array<{ catalogEntry: NuGetCatalogEntry }>;
    
    if (lastPageRef.items) {
      // Items are inline
      pageItems = lastPageRef.items;
    } else {
      // Need to fetch the page
      const pageResponse = await fetch(lastPageRef['@id']);
      if (!pageResponse.ok) {
        return null;
      }
      const pageData = await pageResponse.json() as NuGetPage;
      pageItems = pageData.items || [];
    }
    
    if (pageItems.length === 0) {
      return null;
    }
    
    // Get latest non-prerelease version if possible
    let latest: NuGetCatalogEntry | undefined;
    for (let i = pageItems.length - 1; i >= 0; i--) {
      const entry = pageItems[i].catalogEntry;
      if (!entry.version.includes('-')) {
        latest = entry;
        break;
      }
    }
    // Fallback to absolute latest
    if (!latest) {
      latest = pageItems[pageItems.length - 1].catalogEntry;
    }
    
    // Parse authors (comma or space separated)
    const authorList = latest.authors
      ? latest.authors.split(/[,]+/).map(a => a.trim()).filter(a => a.length > 0)
      : [];
    const maintainers = authorList.map(name => ({ name }));
    
    // Build time map from current page
    const time: Record<string, string> = {};
    for (const item of pageItems) {
      const entry = item.catalogEntry;
      if (entry.version && entry.published) {
        time[entry.version] = entry.published;
      }
    }
    
    // Repository URL
    let repoUrl = latest.repository || latest.projectUrl;
    if (repoUrl) {
      // Clean up repository URL
      if (!repoUrl.includes('github.com') && !repoUrl.includes('gitlab.com')) {
        repoUrl = undefined;
      }
    }
    
    return {
      name: packageName,
      version: latest.version,
      maintainers,
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'nuget',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch NuGet package info: ${message}`);
  }
}
