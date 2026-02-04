/**
 * GitHub API for repository activity
 */

import { fetchWithRetry } from './utils.js';

export interface GitHubCommitInfo {
  lastCommitDate: string | null;
  daysSinceLastCommit: number | null;
}

export interface GitHubRepoInfo {
  stars: number | null;
  forks: number | null;
  openIssues: number | null;
  archived: boolean;
  lastCommitDate: string | null;
  daysSinceLastCommit: number | null;
}

/**
 * Get GitHub API headers
 */
function getGitHubHeaders(): Record<string, string> {
  return {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'RepVet/0.7.2',
    ...(process.env.GITHUB_TOKEN ? { 'Authorization': `token ${process.env.GITHUB_TOKEN}` } : {}),
  };
}

/**
 * Extract GitHub owner/repo from repository URL
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // Handle various GitHub URL formats
  const patterns = [
    /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/,
    /github\.com[/:]([\w.-]+)\/([\w.-]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  }
  return null;
}

/**
 * Fetch repository info including stars from GitHub
 */
export async function fetchRepoInfo(owner: string, repo: string): Promise<GitHubRepoInfo> {
  try {
    const response = await fetchWithRetry(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: getGitHubHeaders(),
        timeoutMs: 5000,
      }
    );
    
    if (!response.ok) {
      return {
        stars: null,
        forks: null,
        openIssues: null,
        archived: false,
        lastCommitDate: null,
        daysSinceLastCommit: null,
      };
    }
    
    const data = await response.json() as {
      stargazers_count?: number;
      forks_count?: number;
      open_issues_count?: number;
      archived?: boolean;
      pushed_at?: string;
    };
    
    let daysSinceLastCommit: number | null = null;
    if (data.pushed_at) {
      daysSinceLastCommit = Math.floor(
        (Date.now() - new Date(data.pushed_at).getTime()) / (1000 * 60 * 60 * 24)
      );
    }
    
    return {
      stars: data.stargazers_count ?? null,
      forks: data.forks_count ?? null,
      openIssues: data.open_issues_count ?? null,
      archived: data.archived ?? false,
      lastCommitDate: data.pushed_at ?? null,
      daysSinceLastCommit,
    };
  } catch {
    return {
      stars: null,
      forks: null,
      openIssues: null,
      archived: false,
      lastCommitDate: null,
      daysSinceLastCommit: null,
    };
  }
}

/**
 * Fetch last commit date from GitHub repository
 */
export async function fetchLastCommitDate(owner: string, repo: string): Promise<GitHubCommitInfo> {
  try {
    const response = await fetchWithRetry(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
      {
        headers: getGitHubHeaders(),
        timeoutMs: 5000,
      }
    );
    
    if (!response.ok) {
      return { lastCommitDate: null, daysSinceLastCommit: null };
    }
    
    const commits = await response.json() as Array<{ commit: { committer: { date: string } } }>;
    if (!commits.length) {
      return { lastCommitDate: null, daysSinceLastCommit: null };
    }
    
    const lastCommitDate = commits[0].commit.committer.date;
    const daysSinceLastCommit = Math.floor(
      (Date.now() - new Date(lastCommitDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return { lastCommitDate, daysSinceLastCommit };
  } catch {
    return { lastCommitDate: null, daysSinceLastCommit: null };
  }
}

/**
 * Fetch GitHub stars for a repository
 */
export async function fetchGitHubStars(owner: string, repo: string): Promise<number | null> {
  const info = await fetchRepoInfo(owner, repo);
  return info.stars;
}
