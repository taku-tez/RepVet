/**
 * PyPI Registry API
 */

import { PackageInfo } from '../types.js';

const PYPI_API = 'https://pypi.org/pypi';

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
