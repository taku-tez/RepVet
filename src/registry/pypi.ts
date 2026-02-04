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
      };
      releases: Record<string, Array<{ upload_time: string }>>;
    };
    
    const maintainers: Array<{ name: string; email?: string }> = [];
    
    if (data.info.maintainer) {
      maintainers.push({ 
        name: data.info.maintainer, 
        email: data.info.maintainer_email 
      });
    }
    if (data.info.author && data.info.author !== data.info.maintainer) {
      maintainers.push({ 
        name: data.info.author, 
        email: data.info.author_email 
      });
    }
    
    // Extract repository URL
    let repoUrl: string | undefined;
    const projectUrls = data.info.project_urls || {};
    for (const [key, url] of Object.entries(projectUrls)) {
      if (key.toLowerCase().includes('source') || 
          key.toLowerCase().includes('repository') ||
          key.toLowerCase().includes('github')) {
        repoUrl = url;
        break;
      }
    }
    if (!repoUrl && data.info.home_page?.includes('github.com')) {
      repoUrl = data.info.home_page;
    }
    
    // Build time map from releases
    const time: Record<string, string> = {};
    for (const [version, files] of Object.entries(data.releases)) {
      if (files.length > 0) {
        time[version] = files[0].upload_time;
      }
    }
    
    return {
      name: data.info.name,
      version: data.info.version,
      maintainers,
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'pypi',
    };
  } catch (error) {
    throw new Error(`Failed to fetch PyPI package info: ${error}`);
  }
}
