/**
 * GitLab API for repository activity
 */

import { fetchWithRetry } from './utils.js';

export interface GitLabRepoInfo {
  lastActivityAt: string | null;
  daysSinceLastActivity: number | null;
  stars: number | null;
  forks: number | null;
  archived: boolean;
}

/**
 * Get GitLab API headers
 */
function getGitLabHeaders(): Record<string, string> {
  return {
    'Accept': 'application/json',
    'User-Agent': 'RepVet/0.7.2',
    ...(process.env.GITLAB_TOKEN ? { 'PRIVATE-TOKEN': process.env.GITLAB_TOKEN } : {}),
  };
}

/**
 * Fetch repository info from GitLab
 * Uses project ID encoded as URL path (owner%2Frepo)
 */
export async function fetchGitLabRepoInfo(owner: string, repo: string): Promise<GitLabRepoInfo> {
  try {
    // GitLab uses URL-encoded project path: owner%2Frepo
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    
    const response = await fetchWithRetry(
      `https://gitlab.com/api/v4/projects/${projectId}`,
      {
        headers: getGitLabHeaders(),
        timeoutMs: 5000,
      }
    );
    
    if (!response.ok) {
      return {
        lastActivityAt: null,
        daysSinceLastActivity: null,
        stars: null,
        forks: null,
        archived: false,
      };
    }
    
    const data = await response.json() as {
      last_activity_at?: string;
      star_count?: number;
      forks_count?: number;
      archived?: boolean;
    };
    
    let daysSinceLastActivity: number | null = null;
    if (data.last_activity_at) {
      daysSinceLastActivity = Math.floor(
        (Date.now() - new Date(data.last_activity_at).getTime()) / (1000 * 60 * 60 * 24)
      );
    }
    
    return {
      lastActivityAt: data.last_activity_at ?? null,
      daysSinceLastActivity,
      stars: data.star_count ?? null,
      forks: data.forks_count ?? null,
      archived: data.archived ?? false,
    };
  } catch {
    return {
      lastActivityAt: null,
      daysSinceLastActivity: null,
      stars: null,
      forks: null,
      archived: false,
    };
  }
}

/**
 * Parse GitLab URL to extract owner and repo
 */
export function parseGitLabUrl(url: string): { owner: string; repo: string } | null {
  // Handle various GitLab URL formats
  // gitlab.com/owner/repo or gitlab.com/group/subgroup/repo
  const patterns = [
    /gitlab\.com[/:]([\w.-]+(?:\/[\w.-]+)*)\/([\w.-]+?)(?:\.git)?$/,
    /gitlab\.com[/:]([\w.-]+)\/([\w.-]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  }
  return null;
}
