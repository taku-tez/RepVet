/**
 * PyPI Registry API
 */

import { PackageInfo } from '../types.js';
import { OwnershipTransferResult, NO_TRANSFER_DETECTED, fetchWithRetry } from './utils.js';

const PYPI_API = 'https://pypi.org/pypi';

/**
 * Yanked version result
 */
export interface YankedResult {
  hasYanked: boolean;
  yankedVersions: Array<{ version: string; reason?: string }>;
  yankedRatio: number;  // 0-1
  latestIsYanked: boolean;
}

/**
 * Decode MIME encoded-word (RFC 2047) commonly found in email headers
 * e.g., "=?utf-8?q?Sebasti=C3=A1n?=" -> "Sebastián"
 */
function decodeMimeWord(text: string): string {
  if (!text) return text;
  
  // Match encoded-word pattern: =?charset?encoding?text?=
  const mimePattern = /=\?([^?]+)\?([qQbB])\?([^?]*)\?=/g;
  
  return text.replace(mimePattern, (match, charset, encoding, encodedText) => {
    try {
      if (encoding.toLowerCase() === 'q') {
        // Quoted-printable: replace _ with space, =XX with char
        const decoded = encodedText
          .replace(/_/g, ' ')
          .replace(/=([0-9A-Fa-f]{2})/g, (_: string, hex: string) => 
            String.fromCharCode(parseInt(hex, 16))
          );
        // Handle UTF-8 bytes
        return decodeURIComponent(escape(decoded));
      } else if (encoding.toLowerCase() === 'b') {
        // Base64
        return Buffer.from(encodedText, 'base64').toString('utf-8');
      }
    } catch {
      // If decoding fails, return original
    }
    return match;
  });
}

/**
 * Split maintainer string that contains multiple names
 * e.g., "Alice, Bob, Charlie" -> ["Alice", "Bob", "Charlie"]
 */
function splitMaintainers(text: string): string[] {
  if (!text) return [];
  
  // Decode first
  const decoded = decodeMimeWord(text.trim());
  
  // Check for common patterns indicating multiple maintainers
  // "Name1, Name2, Name3" or "Name1 and Name2" or "Name1 & Name2"
  if (decoded.includes(',') || decoded.includes(' and ') || decoded.includes(' & ')) {
    return decoded
      .split(/,|\s+and\s+|\s+&\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.match(/^\(.*\)$/)); // Filter out parenthetical notes
  }
  
  return [decoded];
}

export async function fetchPyPIPackageInfo(packageName: string): Promise<PackageInfo | null> {
  try {
    const response = await fetch(`${PYPI_API}/${encodeURIComponent(packageName)}/json`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`PyPI API error: ${response.status}`);
    }
    
    const data = await response.json() as {
      info: {
        name: string;
        version: string;
        author: string;
        author_email?: string;
        maintainer?: string;
        maintainer_email?: string;
        project_urls?: Record<string, string>;
        home_page?: string;
        classifiers?: string[];
        download_url?: string;
        downloads?: { last_day: number; last_month: number; last_week: number };
      };
      releases: Record<string, Array<{ upload_time: string; upload_time_iso_8601?: string }>>;
      urls?: Array<{ upload_time_iso_8601?: string }>;
    };
    
    const maintainerSet = new Set<string>();
    const maintainers: Array<{ name: string; email?: string }> = [];
    
    // Process maintainer field (may contain multiple names)
    if (data.info.maintainer && data.info.maintainer.trim()) {
      for (const name of splitMaintainers(data.info.maintainer)) {
        if (!maintainerSet.has(name.toLowerCase())) {
          maintainerSet.add(name.toLowerCase());
          maintainers.push({ name });
        }
      }
    }
    
    // Process author field
    if (data.info.author && data.info.author.trim()) {
      for (const name of splitMaintainers(data.info.author)) {
        if (!maintainerSet.has(name.toLowerCase())) {
          maintainerSet.add(name.toLowerCase());
          maintainers.push({ 
            name,
            email: data.info.author_email?.trim()
          });
        }
      }
    }
    
    // If still no maintainers, try to extract from author_email
    if (maintainers.length === 0 && data.info.author_email) {
      const decoded = decodeMimeWord(data.info.author_email);
      const emailMatch = decoded.match(/^([^<@]+)/);
      if (emailMatch) {
        maintainers.push({ name: emailMatch[1].trim(), email: decoded });
      }
    }
    
    // Extract repository URL
    let repoUrl: string | undefined;
    const projectUrls = data.info.project_urls || {};
    
    // Priority order for finding repo
    const urlKeys = ['Source', 'Source Code', 'Repository', 'GitHub', 'Code', 'Homepage'];
    for (const key of urlKeys) {
      for (const [urlKey, url] of Object.entries(projectUrls)) {
        if (urlKey.toLowerCase().includes(key.toLowerCase())) {
          if (url.includes('github.com') || url.includes('gitlab.com') || url.includes('bitbucket.org')) {
            repoUrl = url;
            break;
          }
        }
      }
      if (repoUrl) break;
    }
    
    // Fallback to home_page if it's a code hosting site
    if (!repoUrl && data.info.home_page) {
      if (data.info.home_page.includes('github.com') || 
          data.info.home_page.includes('gitlab.com')) {
        repoUrl = data.info.home_page;
      }
    }
    
    // Build time map from releases
    const time: Record<string, string> = {};
    for (const [version, files] of Object.entries(data.releases)) {
      if (files.length > 0 && files[0].upload_time) {
        time[version] = files[0].upload_time_iso_8601 || files[0].upload_time;
      }
    }
    
    // Estimate downloads from release count
    let downloads = 0;
    const releaseCount = Object.keys(data.releases).length;
    if (releaseCount > 100) downloads = 10000000;
    else if (releaseCount > 50) downloads = 1000000;
    else if (releaseCount > 20) downloads = 100000;
    
    return {
      name: data.info.name,
      version: data.info.version,
      maintainers,
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'pypi',
      downloads,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch PyPI package info: ${message}`);
  }
}

/**
 * Check for yanked versions in PyPI package
 * Yanked versions are marked as deprecated/problematic by maintainers
 */
export async function checkPyPIYanked(packageName: string): Promise<YankedResult> {
  try {
    const response = await fetchWithRetry(
      `${PYPI_API}/${encodeURIComponent(packageName)}/json`,
      { timeoutMs: 5000 }
    );
    
    if (!response.ok) {
      return { hasYanked: false, yankedVersions: [], yankedRatio: 0, latestIsYanked: false };
    }
    
    const data = await response.json() as {
      info: { version: string };
      releases: Record<string, Array<{ yanked: boolean; yanked_reason?: string | null }>>;
    };
    
    const yankedVersions: Array<{ version: string; reason?: string }> = [];
    let totalVersions = 0;
    const latestVersion = data.info.version;
    let latestIsYanked = false;
    
    for (const [version, files] of Object.entries(data.releases)) {
      // Skip versions with no files
      if (files.length === 0) continue;
      
      totalVersions++;
      
      // Check if any file in this version is yanked
      const isYanked = files.some(f => f.yanked);
      if (isYanked) {
        const reason = files.find(f => f.yanked_reason)?.yanked_reason || undefined;
        yankedVersions.push({ version, reason: reason ?? undefined });
        
        if (version === latestVersion) {
          latestIsYanked = true;
        }
      }
    }
    
    return {
      hasYanked: yankedVersions.length > 0,
      yankedVersions,
      yankedRatio: totalVersions > 0 ? yankedVersions.length / totalVersions : 0,
      latestIsYanked,
    };
  } catch {
    return { hasYanked: false, yankedVersions: [], yankedRatio: 0, latestIsYanked: false };
  }
}

/**
 * Check for ownership transfer in PyPI package
 * Compares author/maintainer across version history
 */
export async function checkPyPIOwnershipTransfer(packageName: string): Promise<OwnershipTransferResult> {
  try {
    // First, get the package overview to find versions
    const overviewResponse = await fetchWithRetry(
      `${PYPI_API}/${encodeURIComponent(packageName)}/json`,
      { timeoutMs: 5000 }
    );
    
    if (!overviewResponse.ok) return NO_TRANSFER_DETECTED;
    
    const overview = await overviewResponse.json() as {
      info: { version: string };
      releases: Record<string, Array<{ upload_time_iso_8601?: string }>>;
    };
    
    // Get sorted list of versions with release times
    const versions = Object.entries(overview.releases)
      .filter(([_, files]) => files.length > 0)
      .map(([version, files]) => ({
        version,
        time: files[0].upload_time_iso_8601 ? new Date(files[0].upload_time_iso_8601).getTime() : 0,
      }))
      .sort((a, b) => a.time - b.time);
    
    if (versions.length < 2) return NO_TRANSFER_DETECTED;
    
    // Sample versions: first, ~middle, and latest
    const sampleVersions = [
      versions[0].version,  // First version
      versions[Math.floor(versions.length / 2)].version,  // Middle
      versions[versions.length - 1].version,  // Latest
    ].filter((v, i, arr) => arr.indexOf(v) === i);  // Unique
    
    // Fetch author/maintainer info for each sampled version
    const authorHistory: Array<{
      version: string;
      author?: string;
      maintainer?: string;
      time: number;
    }> = [];
    
    for (const version of sampleVersions) {
      try {
        const versionResponse = await fetchWithRetry(
          `${PYPI_API}/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}/json`,
          { timeoutMs: 3000 }
        );
        
        if (versionResponse.ok) {
          const versionData = await versionResponse.json() as {
            info: {
              author?: string;
              maintainer?: string;
              author_email?: string;
              maintainer_email?: string;
            };
          };
          
          const timeEntry = versions.find(v => v.version === version);
          authorHistory.push({
            version,
            author: normalizeAuthor(versionData.info.author, versionData.info.author_email),
            maintainer: normalizeAuthor(versionData.info.maintainer, versionData.info.maintainer_email),
            time: timeEntry?.time || 0,
          });
        }
      } catch {
        // Skip this version on error
      }
    }
    
    if (authorHistory.length < 2) return NO_TRANSFER_DETECTED;
    
    // Sort by time
    authorHistory.sort((a, b) => a.time - b.time);
    
    // Check for ownership changes
    const first = authorHistory[0];
    const last = authorHistory[authorHistory.length - 1];
    
    const firstOwner = first.maintainer || first.author;
    const lastOwner = last.maintainer || last.author;
    
    // If no owner info available, can't detect
    if (!firstOwner || !lastOwner) return NO_TRANSFER_DETECTED;
    
    // Normalize and compare
    if (firstOwner.toLowerCase() !== lastOwner.toLowerCase()) {
      // Check if it's a complete change or just an addition
      const firstOwners = splitMaintainers(firstOwner).map(o => o.toLowerCase());
      const lastOwners = splitMaintainers(lastOwner).map(o => o.toLowerCase());
      
      // Any overlap means gradual transition (not suspicious)
      const hasOverlap = firstOwners.some(o => lastOwners.includes(o));
      
      if (!hasOverlap) {
        // Time between first and last version
        const daysBetween = (last.time - first.time) / (1000 * 60 * 60 * 24);
        
        // More suspicious if change happened quickly for an established package
        const confidence: 'high' | 'medium' | 'low' = 
          daysBetween < 30 ? 'high' :
          daysBetween < 365 ? 'medium' : 'low';
        
        return {
          transferred: true,
          confidence,
          details: `Author changed from "${firstOwner}" to "${lastOwner}"`,
        };
      }
    }
    
    return { transferred: false, confidence: 'high' };
  } catch {
    return NO_TRANSFER_DETECTED;
  }
}

/**
 * Normalize author string for comparison
 * Uses email domain as fallback identifier
 */
function normalizeAuthor(name?: string, email?: string): string | undefined {
  if (name && name.trim()) {
    return decodeMimeWord(name.trim());
  }
  
  // Extract name from email if available
  if (email) {
    const decoded = decodeMimeWord(email);
    const match = decoded.match(/^([^<@]+)/);
    if (match) {
      return match[1].trim();
    }
  }
  
  return undefined;
}
