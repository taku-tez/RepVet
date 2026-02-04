/**
 * Bitbucket API for repository activity
 */

import { fetchWithRetry } from './utils.js';

export interface BitbucketRepoInfo {
  updatedOn: string | null;
  daysSinceLastUpdate: number | null;
  // Note: Bitbucket Cloud doesn't expose star counts publicly
  // forks are available but require authentication for accurate count
  archived: boolean;
}

/**
 * Get Bitbucket API headers
 */
function getBitbucketHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'RepVet/0.7.2',
  };
  
  // Bitbucket uses Basic auth or OAuth2
  if (process.env.BITBUCKET_USERNAME && process.env.BITBUCKET_APP_PASSWORD) {
    const auth = Buffer.from(
      `${process.env.BITBUCKET_USERNAME}:${process.env.BITBUCKET_APP_PASSWORD}`
    ).toString('base64');
    headers['Authorization'] = `Basic ${auth}`;
  }
  
  return headers;
}

/**
 * Fetch repository info from Bitbucket
 */
export async function fetchBitbucketRepoInfo(owner: string, repo: string): Promise<BitbucketRepoInfo> {
  try {
    const response = await fetchWithRetry(
      `https://api.bitbucket.org/2.0/repositories/${owner}/${repo}`,
      {
        headers: getBitbucketHeaders(),
        timeoutMs: 5000,
      }
    );
    
    if (!response.ok) {
      return {
        updatedOn: null,
        daysSinceLastUpdate: null,
        archived: false,
      };
    }
    
    const data = await response.json() as {
      updated_on?: string;
      // Bitbucket doesn't have an explicit "archived" field in v2 API
      // but we can check mainbranch state or project status
      is_private?: boolean;
      has_issues?: boolean;
    };
    
    let daysSinceLastUpdate: number | null = null;
    if (data.updated_on) {
      daysSinceLastUpdate = Math.floor(
        (Date.now() - new Date(data.updated_on).getTime()) / (1000 * 60 * 60 * 24)
      );
    }
    
    return {
      updatedOn: data.updated_on ?? null,
      daysSinceLastUpdate,
      archived: false, // Bitbucket doesn't have explicit archive status in public API
    };
  } catch {
    return {
      updatedOn: null,
      daysSinceLastUpdate: null,
      archived: false,
    };
  }
}

/**
 * Parse Bitbucket URL to extract owner and repo
 */
export function parseBitbucketUrl(url: string): { owner: string; repo: string } | null {
  // Handle various Bitbucket URL formats
  // bitbucket.org/owner/repo
  const patterns = [
    /bitbucket\.org[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/,
    /bitbucket\.org[/:]([\w.-]+)\/([\w.-]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  }
  return null;
}
