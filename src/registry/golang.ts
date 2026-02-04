/**
 * Go Modules Registry API (via proxy.golang.org)
 */

import { PackageInfo } from '../types.js';

const GO_PROXY = 'https://proxy.golang.org';

export async function fetchGoPackageInfo(modulePath: string): Promise<PackageInfo | null> {
  try {
    // Normalize module path (handle github.com/user/repo format)
    const normalizedPath = modulePath.replace(/^go:\/\//, '');
    
    // Get latest version info
    const latestResponse = await fetch(`${GO_PROXY}/${encodeURIComponent(normalizedPath)}/@latest`);
    if (!latestResponse.ok) {
      if (latestResponse.status === 404 || latestResponse.status === 410) {
        return null;
      }
      throw new Error(`Go proxy error: ${latestResponse.status}`);
    }
    
    const latestData = await latestResponse.json() as {
      Version: string;
      Time: string;
      Origin?: {
        VCS: string;
        URL: string;
        Hash: string;
        Ref: string;
      };
    };
    
    // Get version list
    const listResponse = await fetch(`${GO_PROXY}/${encodeURIComponent(normalizedPath)}/@v/list`);
    const time: Record<string, string> = {};
    
    if (listResponse.ok) {
      const versionList = (await listResponse.text()).trim().split('\n').filter(Boolean);
      
      // Get timestamps for versions (limit to recent ones to avoid too many requests)
      const recentVersions = versionList.slice(-10);
      for (const version of recentVersions) {
        try {
          const vResponse = await fetch(`${GO_PROXY}/${encodeURIComponent(normalizedPath)}/@v/${version}.info`);
          if (vResponse.ok) {
            const vData = await vResponse.json() as { Time: string };
            time[version] = vData.Time;
          }
        } catch {
          // Skip failed version lookups
        }
      }
    }
    
    // Extract maintainers from module path (github.com/user/repo -> user)
    const maintainers: Array<{ name: string }> = [];
    const githubMatch = normalizedPath.match(/github\.com\/([^\/]+)/);
    if (githubMatch) {
      maintainers.push({ name: githubMatch[1] });
    }
    
    // Repository URL from Origin or inferred from path
    let repoUrl = latestData.Origin?.URL;
    if (!repoUrl && normalizedPath.startsWith('github.com/')) {
      repoUrl = `https://${normalizedPath.split('/').slice(0, 3).join('/')}`;
    }
    
    return {
      name: normalizedPath,
      version: latestData.Version,
      maintainers,
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'go',
    };
  } catch (error) {
    throw new Error(`Failed to fetch Go module info: ${error}`);
  }
}
