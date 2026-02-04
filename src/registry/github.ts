/**
 * GitHub API for repository activity
 */

export interface GitHubCommitInfo {
  lastCommitDate: string | null;
  daysSinceLastCommit: number | null;
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
 * Fetch last commit date from GitHub repository
 */
export async function fetchLastCommitDate(owner: string, repo: string): Promise<GitHubCommitInfo> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'RepVet/0.1.0',
          ...(process.env.GITHUB_TOKEN ? { 'Authorization': `token ${process.env.GITHUB_TOKEN}` } : {}),
        },
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
