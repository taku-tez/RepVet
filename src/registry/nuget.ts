/**
 * NuGet (.NET) Registry API
 */

import { PackageInfo } from '../types.js';
import { OwnershipTransferResult, NO_TRANSFER_DETECTED, fetchWithRetry } from './utils.js';

const NUGET_API = 'https://api.nuget.org/v3';
const NUGET_SEARCH_API = 'https://azuresearch-usnc.nuget.org';

interface NuGetDeprecation {
  '@id': string;
  '@type': string;
  reasons?: string[];  // e.g., ["Legacy", "CriticalBugs", "Other"]
  message?: string;
  alternatePackage?: {
    id: string;
    range?: string;
  };
}

interface NuGetCatalogEntry {
  version: string;
  published: string;
  authors?: string;
  projectUrl?: string;
  repository?: string;
  deprecation?: NuGetDeprecation;
  listed?: boolean;
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

interface NuGetSearchResult {
  data: Array<{
    id: string;
    version: string;
    owners?: string[];
    authors?: string[];
  }>;
}

/**
 * NuGet deprecation result
 */
export interface NuGetDeprecationResult {
  isDeprecated: boolean;
  reasons?: string[];
  message?: string;
  alternatePackage?: string;
}

/**
 * Extended NuGet package data with deprecation info
 */
export interface NuGetPackageData extends PackageInfo {
  ecosystem: 'nuget';
  deprecated?: string;  // Deprecation message for compatibility with npm pattern
  owners?: string[];    // Current package owners
}

export async function fetchNuGetPackageInfo(packageName: string): Promise<NuGetPackageData | null> {
  try {
    // Get package registration (lowercase required)
    // Use registration5-gz-semver2 for deprecation info (with gzip support)
    const lowerName = packageName.toLowerCase();
    const response = await fetchWithRetry(
      `${NUGET_API}/registration5-gz-semver2/${lowerName}/index.json`,
      { 
        timeoutMs: 10000,
        headers: { 'Accept-Encoding': 'gzip' }
      }
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
      const pageResponse = await fetchWithRetry(lastPageRef['@id'], { timeoutMs: 10000 });
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
    
    // Check deprecation on latest version
    let deprecated: string | undefined;
    if (latest.deprecation) {
      const reasons = latest.deprecation.reasons?.join(', ') || 'Deprecated';
      const message = latest.deprecation.message;
      const alternate = latest.deprecation.alternatePackage?.id;
      
      deprecated = message 
        ? message.slice(0, 200)  // Truncate long messages
        : alternate 
          ? `${reasons} - Use ${alternate} instead`
          : reasons;
    }
    
    // Fetch current owners from search API
    let owners: string[] | undefined;
    try {
      const searchResponse = await fetchWithRetry(
        `${NUGET_SEARCH_API}/query?q=packageid:${encodeURIComponent(packageName)}&take=1`,
        { timeoutMs: 5000 }
      );
      if (searchResponse.ok) {
        const searchData = await searchResponse.json() as NuGetSearchResult;
        if (searchData.data?.[0]?.owners) {
          owners = searchData.data[0].owners;
        }
      }
    } catch {
      // Owners are optional, continue without them
    }
    
    return {
      name: packageName,
      version: latest.version,
      maintainers,
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'nuget',
      deprecated,
      owners,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch NuGet package info: ${message}`);
  }
}

/**
 * Check if a NuGet package is deprecated
 * Uses registration5-gz-semver2 API which includes deprecation metadata
 */
export async function checkNuGetDeprecated(packageName: string): Promise<NuGetDeprecationResult> {
  try {
    const lowerName = packageName.toLowerCase();
    const response = await fetchWithRetry(
      `${NUGET_API}/registration5-gz-semver2/${lowerName}/index.json`,
      { 
        timeoutMs: 10000,
        headers: { 'Accept-Encoding': 'gzip' }
      }
    );
    
    if (!response.ok) {
      return { isDeprecated: false };
    }
    
    const data = await response.json() as NuGetRegistration;
    if (!data.items || data.items.length === 0) {
      return { isDeprecated: false };
    }
    
    // Get the last page
    const lastPageRef = data.items[data.items.length - 1];
    let pageItems: Array<{ catalogEntry: NuGetCatalogEntry }>;
    
    if (lastPageRef.items) {
      pageItems = lastPageRef.items;
    } else {
      const pageResponse = await fetchWithRetry(lastPageRef['@id'], { timeoutMs: 10000 });
      if (!pageResponse.ok) {
        return { isDeprecated: false };
      }
      const pageData = await pageResponse.json() as NuGetPage;
      pageItems = pageData.items || [];
    }
    
    if (pageItems.length === 0) {
      return { isDeprecated: false };
    }
    
    // Get latest non-prerelease version
    let latest: NuGetCatalogEntry | undefined;
    for (let i = pageItems.length - 1; i >= 0; i--) {
      const entry = pageItems[i].catalogEntry;
      if (!entry.version.includes('-')) {
        latest = entry;
        break;
      }
    }
    if (!latest) {
      latest = pageItems[pageItems.length - 1].catalogEntry;
    }
    
    if (!latest.deprecation) {
      return { isDeprecated: false };
    }
    
    return {
      isDeprecated: true,
      reasons: latest.deprecation.reasons,
      message: latest.deprecation.message,
      alternatePackage: latest.deprecation.alternatePackage?.id,
    };
  } catch {
    return { isDeprecated: false };
  }
}

/**
 * Check for ownership transfer in NuGet package
 * Compares authors across early and recent versions
 */
export async function checkNuGetOwnershipTransfer(packageName: string): Promise<OwnershipTransferResult> {
  try {
    const lowerName = packageName.toLowerCase();
    const response = await fetchWithRetry(
      `${NUGET_API}/registration5-gz-semver2/${lowerName}/index.json`,
      { 
        timeoutMs: 10000,
        headers: { 'Accept-Encoding': 'gzip' }
      }
    );
    
    if (!response.ok) {
      return NO_TRANSFER_DETECTED;
    }
    
    const data = await response.json() as NuGetRegistration;
    if (!data.items || data.items.length === 0) {
      return NO_TRANSFER_DETECTED;
    }
    
    // Get first page (oldest versions)
    const firstPageRef = data.items[0];
    let firstPageItems: Array<{ catalogEntry: NuGetCatalogEntry }>;
    
    if (firstPageRef.items) {
      firstPageItems = firstPageRef.items;
    } else {
      const pageResponse = await fetchWithRetry(firstPageRef['@id'], { timeoutMs: 10000 });
      if (!pageResponse.ok) {
        return NO_TRANSFER_DETECTED;
      }
      const pageData = await pageResponse.json() as NuGetPage;
      firstPageItems = pageData.items || [];
    }
    
    // Get last page (newest versions)
    const lastPageRef = data.items[data.items.length - 1];
    let lastPageItems: Array<{ catalogEntry: NuGetCatalogEntry }>;
    
    if (lastPageRef.items) {
      lastPageItems = lastPageRef.items;
    } else {
      const pageResponse = await fetchWithRetry(lastPageRef['@id'], { timeoutMs: 10000 });
      if (!pageResponse.ok) {
        return NO_TRANSFER_DETECTED;
      }
      const pageData = await pageResponse.json() as NuGetPage;
      lastPageItems = pageData.items || [];
    }
    
    if (firstPageItems.length === 0 || lastPageItems.length === 0) {
      return NO_TRANSFER_DETECTED;
    }
    
    // Get first version's author
    const firstEntry = firstPageItems[0].catalogEntry;
    const firstAuthors = parseAuthors(firstEntry.authors);
    
    // Get latest version's author
    let latestEntry: NuGetCatalogEntry | undefined;
    for (let i = lastPageItems.length - 1; i >= 0; i--) {
      const entry = lastPageItems[i].catalogEntry;
      if (!entry.version.includes('-')) {
        latestEntry = entry;
        break;
      }
    }
    if (!latestEntry) {
      latestEntry = lastPageItems[lastPageItems.length - 1].catalogEntry;
    }
    const latestAuthors = parseAuthors(latestEntry.authors);
    
    if (firstAuthors.size === 0 || latestAuthors.size === 0) {
      return NO_TRANSFER_DETECTED;
    }
    
    // Check for complete author replacement (no overlap)
    const hasOverlap = [...firstAuthors].some(a => latestAuthors.has(a));
    
    if (!hasOverlap) {
      // Calculate time between versions
      const firstTime = new Date(firstEntry.published).getTime();
      const latestTime = new Date(latestEntry.published).getTime();
      const daysBetween = (latestTime - firstTime) / (1000 * 60 * 60 * 24);
      
      // Determine confidence based on time span
      // Quick changes are more suspicious
      const confidence: 'high' | 'medium' | 'low' = 
        daysBetween < 30 ? 'high' :
        daysBetween < 365 ? 'medium' : 'low';
      
      const firstAuthorStr = [...firstAuthors].slice(0, 2).join(', ');
      const latestAuthorStr = [...latestAuthors].slice(0, 2).join(', ');
      
      return {
        transferred: true,
        confidence,
        details: `Author changed from "${firstAuthorStr}" to "${latestAuthorStr}"`,
      };
    }
    
    return { transferred: false, confidence: 'high' };
  } catch {
    return NO_TRANSFER_DETECTED;
  }
}

/**
 * Parse comma-separated authors string into normalized Set
 */
function parseAuthors(authors?: string): Set<string> {
  if (!authors) return new Set();
  
  return new Set(
    authors
      .split(/[,]+/)
      .map(a => a.trim().toLowerCase())
      .filter(a => a.length > 0)
  );
}
