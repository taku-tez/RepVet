/**
 * Reputation Scorer
 * 
 * Scoring: Start at 100, apply deductions only
 */

import { Deduction, ReputationResult, PackageInfo } from './types.js';
import { fetchPackageInfo, checkOwnershipTransfer } from './registry/npm.js';
import { parseGitHubUrl, fetchLastCommitDate } from './registry/github.js';
import { hasMalwareHistory, getMalwareDetails } from './malware/known-packages.js';

const BASE_SCORE = 100;

// Deduction points
const DEDUCTIONS = {
  STALE_COMMIT: 10,        // 最終コミット1年以上前
  OWNERSHIP_TRANSFER: 20,  // パッケージ所有権移転歴
  MALWARE_HISTORY: 50,     // 過去にマルウェア混入
};

export async function checkPackageReputation(packageName: string): Promise<ReputationResult> {
  const deductions: Deduction[] = [];
  let score = BASE_SCORE;
  
  // Fetch package info from npm
  const packageInfo = await fetchPackageInfo(packageName);
  if (!packageInfo) {
    throw new Error(`Package not found: ${packageName}`);
  }
  
  const maintainers = packageInfo.maintainers.map(m => m.name);
  let lastCommitDate: string | undefined;
  let hasOwnershipTransfer = false;
  let hasMalware = false;
  
  // Check 1: Malware history (-50)
  if (hasMalwareHistory(packageName)) {
    hasMalware = true;
    const details = getMalwareDetails(packageName);
    deductions.push({
      reason: `Past malware incident${details ? `: ${details}` : ''}`,
      points: DEDUCTIONS.MALWARE_HISTORY,
    });
    score -= DEDUCTIONS.MALWARE_HISTORY;
  }
  
  // Check 2: Ownership transfer (-20)
  hasOwnershipTransfer = await checkOwnershipTransfer(packageName);
  if (hasOwnershipTransfer) {
    deductions.push({
      reason: 'Package ownership has been transferred',
      points: DEDUCTIONS.OWNERSHIP_TRANSFER,
    });
    score -= DEDUCTIONS.OWNERSHIP_TRANSFER;
  }
  
  // Check 3: Last commit > 1 year (-10)
  if (packageInfo.repository?.url) {
    const githubInfo = parseGitHubUrl(packageInfo.repository.url);
    if (githubInfo) {
      const commitInfo = await fetchLastCommitDate(githubInfo.owner, githubInfo.repo);
      if (commitInfo.lastCommitDate) {
        lastCommitDate = commitInfo.lastCommitDate;
        if (commitInfo.daysSinceLastCommit !== null && commitInfo.daysSinceLastCommit > 365) {
          deductions.push({
            reason: `Last commit over 1 year ago (${commitInfo.daysSinceLastCommit} days)`,
            points: DEDUCTIONS.STALE_COMMIT,
          });
          score -= DEDUCTIONS.STALE_COMMIT;
        }
      }
    }
  }
  
  return {
    package: packageName,
    score: Math.max(0, score),
    deductions,
    maintainers,
    lastCommitDate,
    hasOwnershipTransfer,
    hasMalwareHistory: hasMalware,
  };
}
