/**
 * Reputation Scorer
 * 
 * Scoring: Start at 100, apply deductions only
 * 
 * Deduction points adjusted by confidence:
 * - High confidence: full points
 * - Medium confidence: 75% of points
 * - Low confidence: 50% of points
 */

import { Deduction, ReputationResult, PackageInfo, Ecosystem, VulnerabilityStats } from './types.js';
import { fetchPackageInfo, checkOwnershipTransfer } from './registry/npm.js';
import { fetchPyPIPackageInfo } from './registry/pypi.js';
import { fetchCratesPackageInfo, checkCratesOwnershipTransfer } from './registry/crates.js';
import { parseGitHubUrl, fetchLastCommitDate } from './registry/github.js';
import { hasMalwareHistory, getMalwareDetails } from './malware/known-packages.js';
import { analyzeVulnerabilityHistory } from './osv/client.js';

const BASE_SCORE = 100;

// Deduction points (maximum values)
const DEDUCTIONS = {
  // Activity
  STALE_1_YEAR: 5,         // 最終コミット1年以上前
  STALE_2_YEARS: 10,       // 最終コミット2年以上前
  STALE_3_YEARS: 15,       // 最終コミット3年以上前
  
  // Ownership
  OWNERSHIP_TRANSFER: 15,   // パッケージ所有権移転（急激な変更）
  SINGLE_MAINTAINER: 5,     // 単一メンテナ（バス係数リスク）
  
  // Security history
  MALWARE_HISTORY: 50,      // 過去にマルウェア混入
  
  // Vulnerabilities (from OSV)
  VULN_CRITICAL: 15,        // Critical脆弱性あり
  VULN_HIGH: 10,            // High脆弱性あり  
  VULN_UNFIXED: 10,         // 未修正の脆弱性あり
  VULN_RECENT_MANY: 5,      // 直近1年に3件以上の脆弱性
};

function applyConfidence(points: number, confidence: 'high' | 'medium' | 'low'): number {
  const multipliers = { high: 1.0, medium: 0.75, low: 0.5 };
  return Math.round(points * multipliers[confidence]);
}

function getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score >= 80) return 'LOW';
  if (score >= 60) return 'MEDIUM';
  if (score >= 40) return 'HIGH';
  return 'CRITICAL';
}

async function fetchPackageByEcosystem(name: string, ecosystem: Ecosystem): Promise<PackageInfo | null> {
  switch (ecosystem) {
    case 'npm':
      return fetchPackageInfo(name);
    case 'pypi':
      return fetchPyPIPackageInfo(name);
    case 'crates':
      return fetchCratesPackageInfo(name);
    default:
      throw new Error(`Unsupported ecosystem: ${ecosystem}`);
  }
}

function mapEcosystemToOSV(ecosystem: Ecosystem): 'npm' | 'PyPI' | 'crates.io' | 'Go' {
  const mapping: Record<Ecosystem, 'npm' | 'PyPI' | 'crates.io' | 'Go'> = {
    npm: 'npm',
    pypi: 'PyPI',
    crates: 'crates.io',
    go: 'Go',
  };
  return mapping[ecosystem];
}

export async function checkPackageReputation(
  packageName: string, 
  ecosystem: Ecosystem = 'npm'
): Promise<ReputationResult> {
  const deductions: Deduction[] = [];
  let score = BASE_SCORE;
  
  // Fetch package info
  const packageInfo = await fetchPackageByEcosystem(packageName, ecosystem);
  if (!packageInfo) {
    throw new Error(`Package not found: ${packageName} (${ecosystem})`);
  }
  
  const maintainers = packageInfo.maintainers.map(m => m.name);
  let lastCommitDate: string | undefined;
  let hasOwnershipTransfer = false;
  let hasMalware = false;
  let vulnerabilityStats: VulnerabilityStats | undefined;
  
  // Check 1: Malware history (-50) - npm only for now
  if (ecosystem === 'npm' && hasMalwareHistory(packageName)) {
    hasMalware = true;
    const details = getMalwareDetails(packageName);
    const points = DEDUCTIONS.MALWARE_HISTORY;
    deductions.push({
      reason: `Past malware incident${details ? `: ${details}` : ''}`,
      points,
      confidence: 'high',
    });
    score -= points;
  }
  
  // Check 2: Ownership transfer (improved detection)
  if (ecosystem === 'npm') {
    const transferResult = await checkOwnershipTransfer(packageName);
    if (transferResult.transferred) {
      hasOwnershipTransfer = true;
      const points = applyConfidence(DEDUCTIONS.OWNERSHIP_TRANSFER, transferResult.confidence);
      deductions.push({
        reason: transferResult.details || 'Suspicious ownership transfer detected',
        points,
        confidence: transferResult.confidence,
      });
      score -= points;
    }
  } else if (ecosystem === 'crates') {
    const transferResult = await checkCratesOwnershipTransfer(packageName);
    if (transferResult.transferred) {
      hasOwnershipTransfer = true;
      const points = applyConfidence(DEDUCTIONS.OWNERSHIP_TRANSFER, transferResult.confidence);
      deductions.push({
        reason: transferResult.details || 'Publisher change detected',
        points,
        confidence: transferResult.confidence,
      });
      score -= points;
    }
  }
  
  // Check 3: Single maintainer risk
  if (maintainers.length === 1) {
    deductions.push({
      reason: 'Single maintainer (bus factor risk)',
      points: DEDUCTIONS.SINGLE_MAINTAINER,
      confidence: 'high',
    });
    score -= DEDUCTIONS.SINGLE_MAINTAINER;
  }
  
  // Check 4: Last commit staleness
  if (packageInfo.repository?.url) {
    const githubInfo = parseGitHubUrl(packageInfo.repository.url);
    if (githubInfo) {
      const commitInfo = await fetchLastCommitDate(githubInfo.owner, githubInfo.repo);
      if (commitInfo.lastCommitDate) {
        lastCommitDate = commitInfo.lastCommitDate;
        const days = commitInfo.daysSinceLastCommit;
        
        if (days !== null) {
          if (days > 365 * 3) {
            deductions.push({
              reason: `Last commit over 3 years ago (${Math.round(days / 365)} years)`,
              points: DEDUCTIONS.STALE_3_YEARS,
              confidence: 'high',
            });
            score -= DEDUCTIONS.STALE_3_YEARS;
          } else if (days > 365 * 2) {
            deductions.push({
              reason: `Last commit over 2 years ago (${Math.round(days / 365)} years)`,
              points: DEDUCTIONS.STALE_2_YEARS,
              confidence: 'high',
            });
            score -= DEDUCTIONS.STALE_2_YEARS;
          } else if (days > 365) {
            deductions.push({
              reason: `Last commit over 1 year ago (${days} days)`,
              points: DEDUCTIONS.STALE_1_YEAR,
              confidence: 'high',
            });
            score -= DEDUCTIONS.STALE_1_YEAR;
          }
        }
      }
    }
  }
  
  // Check 5: Vulnerability history (OSV)
  try {
    const vulnAnalysis = await analyzeVulnerabilityHistory(
      mapEcosystemToOSV(ecosystem),
      packageName
    );
    
    if (vulnAnalysis.totalVulns > 0) {
      vulnerabilityStats = {
        total: vulnAnalysis.totalVulns,
        critical: vulnAnalysis.criticalCount,
        high: vulnAnalysis.highCount,
        recent: vulnAnalysis.recentVulns,
        hasUnfixed: vulnAnalysis.hasUnfixedVulns,
      };
      
      if (vulnAnalysis.criticalCount > 0) {
        deductions.push({
          reason: `${vulnAnalysis.criticalCount} critical vulnerability(ies) in history`,
          points: DEDUCTIONS.VULN_CRITICAL,
          confidence: 'high',
        });
        score -= DEDUCTIONS.VULN_CRITICAL;
      }
      
      if (vulnAnalysis.highCount > 0) {
        deductions.push({
          reason: `${vulnAnalysis.highCount} high severity vulnerability(ies) in history`,
          points: DEDUCTIONS.VULN_HIGH,
          confidence: 'high',
        });
        score -= DEDUCTIONS.VULN_HIGH;
      }
      
      if (vulnAnalysis.hasUnfixedVulns) {
        deductions.push({
          reason: 'Has unfixed vulnerabilities',
          points: DEDUCTIONS.VULN_UNFIXED,
          confidence: 'medium',
        });
        score -= applyConfidence(DEDUCTIONS.VULN_UNFIXED, 'medium');
      }
      
      if (vulnAnalysis.recentVulns >= 3) {
        deductions.push({
          reason: `${vulnAnalysis.recentVulns} vulnerabilities in the past year`,
          points: DEDUCTIONS.VULN_RECENT_MANY,
          confidence: 'high',
        });
        score -= DEDUCTIONS.VULN_RECENT_MANY;
      }
    }
  } catch {
    // OSV query failed, continue without vulnerability data
  }
  
  const finalScore = Math.max(0, score);
  
  return {
    package: packageName,
    ecosystem,
    score: finalScore,
    riskLevel: getRiskLevel(finalScore),
    deductions,
    maintainers,
    lastCommitDate,
    hasOwnershipTransfer,
    hasMalwareHistory: hasMalware,
    vulnerabilityStats,
  };
}
