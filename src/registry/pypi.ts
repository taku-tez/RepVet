/**
 * PyPI Registry API
 */

import { PackageInfo } from '../types.js';

const PYPI_API = 'https://pypi.org/pypi';

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
    
    const maintainers: Array<{ name: string; email?: string }> = [];
    
    // Try maintainer first, then author
    if (data.info.maintainer && data.info.maintainer.trim()) {
      maintainers.push({ 
        name: data.info.maintainer.trim(), 
        email: data.info.maintainer_email?.trim()
      });
    }
    
    if (data.info.author && data.info.author.trim() && 
        data.info.author.trim() !== data.info.maintainer?.trim()) {
      maintainers.push({ 
        name: data.info.author.trim(), 
        email: data.info.author_email?.trim()
      });
    }
    
    // If still no maintainers, try to extract from author_email
    if (maintainers.length === 0 && data.info.author_email) {
      const emailMatch = data.info.author_email.match(/^([^<@]+)/);
      if (emailMatch) {
        maintainers.push({ name: emailMatch[1].trim(), email: data.info.author_email });
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
    
    // Estimate downloads from release count or use classifiers
    let downloads = 0;
    const releaseCount = Object.keys(data.releases).length;
    if (releaseCount > 100) downloads = 10000000; // Large project indicator
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
    throw new Error(`Failed to fetch PyPI package info: ${error}`);
  }
}
