/**
 * Reputation Scorer
 * 
 * Scoring: Start at 100, apply deductions only
 * 
 * Deduction points adjusted by:
 * - Confidence (high/medium/low)
 * - Project maturity (established projects get leniency)
 */

import { Deduction, ReputationResult, PackageInfo, Ecosystem, VulnerabilityStats } from './types.js';
import { fetchPackageInfo, checkOwnershipTransfer, NpmPackageData } from './registry/npm.js';
import { fetchPyPIPackageInfo } from './registry/pypi.js';
import { fetchCratesPackageInfo, checkCratesOwnershipTransfer } from './registry/crates.js';
import { fetchRubyGemsPackageInfo } from './registry/rubygems.js';
import { fetchGoPackageInfo } from './registry/golang.js';
import { fetchPackagistPackageInfo } from './registry/packagist.js';
import { fetchNuGetPackageInfo } from './registry/nuget.js';
import { parseGitHubUrl, fetchLastCommitDate } from './registry/github.js';
import { hasMalwareHistory, getMalwareDetails } from './malware/known-packages.js';
import { analyzeVulnerabilityHistory } from './osv/client.js';

const BASE_SCORE = 100;

// Deduction points (maximum values)
const DEDUCTIONS = {
  // Activity
  STALE_1_YEAR: 5,
  STALE_2_YEARS: 10,
  STALE_3_YEARS: 15,
  
  // Ownership
  OWNERSHIP_TRANSFER: 15,
  SINGLE_MAINTAINER: 5,
  
  // Security history
  MALWARE_HISTORY: 50,
  DEPRECATED: 10,           // Package marked as deprecated
  
  // Vulnerabilities
  VULN_CRITICAL: 15,
  VULN_HIGH: 10,
  VULN_UNFIXED: 10,
  VULN_RECENT_MANY: 5,
};

// Thresholds for "established" projects
const ESTABLISHED_THRESHOLDS = {
  npm: { downloads: 1000000, releaseCount: 50 },
  pypi: { downloads: 100000, releaseCount: 50 },
  crates: { downloads: 1000000, releaseCount: 30 },
  go: { downloads: 100000, releaseCount: 20 },
  rubygems: { downloads: 10000000, releaseCount: 50 },
  packagist: { downloads: 10000000, releaseCount: 100 },
  nuget: { downloads: 10000000, releaseCount: 50 },
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
    case 'rubygems':
      return fetchRubyGemsPackageInfo(name);
    case 'go':
      return fetchGoPackageInfo(name);
    case 'packagist':
      return fetchPackagistPackageInfo(name);
    case 'nuget':
      return fetchNuGetPackageInfo(name);
    default:
      throw new Error(`Unsupported ecosystem: ${ecosystem}`);
  }
}

function mapEcosystemToOSV(ecosystem: Ecosystem): 'npm' | 'PyPI' | 'crates.io' | 'Go' | 'RubyGems' | 'Packagist' | 'NuGet' {
  const mapping: Record<Ecosystem, 'npm' | 'PyPI' | 'crates.io' | 'Go' | 'RubyGems' | 'Packagist' | 'NuGet'> = {
    npm: 'npm',
    pypi: 'PyPI',
    crates: 'crates.io',
    go: 'Go',
    rubygems: 'RubyGems',
    packagist: 'Packagist',
    nuget: 'NuGet',
  };
  return mapping[ecosystem];
}

function isEstablishedProject(packageInfo: PackageInfo): boolean {
  const thresholds = ESTABLISHED_THRESHOLDS[packageInfo.ecosystem];
  const releaseCount = packageInfo.time ? Object.keys(packageInfo.time).length : 0;
  
  return (packageInfo.downloads || 0) >= thresholds.downloads || 
         releaseCount >= thresholds.releaseCount;
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
  
  const maintainers = packageInfo.maintainers.map(m => m.name).filter(Boolean);
  let lastCommitDate: string | undefined;
  let hasOwnershipTransfer = false;
  let hasMalware = false;
  let vulnerabilityStats: VulnerabilityStats | undefined;
  
  const isEstablished = isEstablishedProject(packageInfo);
  
  // Check 0: Deprecated package
  if (ecosystem === 'npm') {
    const npmData = packageInfo as NpmPackageData;
    if (npmData.deprecated) {
      deductions.push({
        reason: `Package deprecated: ${npmData.deprecated.slice(0, 100)}${npmData.deprecated.length > 100 ? '...' : ''}`,
        points: DEDUCTIONS.DEPRECATED,
        confidence: 'high',
      });
      score -= DEDUCTIONS.DEPRECATED;
    }
  }
  
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
  
  // Check 2: Ownership transfer
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
  
  // Check 3: Single maintainer risk (skip for established projects with org maintainers)
  const hasOrgMaintainer = maintainers.some(m => 
    m.toLowerCase().includes('inc') || 
    m.toLowerCase().includes('llc') ||
    m.toLowerCase().includes('team') ||
    m.toLowerCase().includes('foundation') ||
    m.toLowerCase() === 'google' ||
    m.toLowerCase() === 'amazon' ||
    m.toLowerCase() === 'microsoft' ||
    m.toLowerCase() === 'facebook' ||
    m.toLowerCase() === 'meta'
  );
  
  if (maintainers.length === 1 && !hasOrgMaintainer) {
    // For established projects, lower confidence
    const confidence = isEstablished ? 'low' : 'high';
    const points = applyConfidence(DEDUCTIONS.SINGLE_MAINTAINER, confidence);
    if (points > 0) {
      deductions.push({
        reason: 'Single maintainer (bus factor risk)',
        points,
        confidence,
      });
      score -= points;
    }
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
      
      // For established projects with many historical vulns, be more lenient
      // They have long histories, so more vulns is expected
      const vulnConfidence = isEstablished && vulnAnalysis.totalVulns > 20 ? 'low' : 'high';
      
      if (vulnAnalysis.criticalCount > 0) {
        const points = applyConfidence(DEDUCTIONS.VULN_CRITICAL, vulnConfidence);
        deductions.push({
          reason: `${vulnAnalysis.criticalCount} critical vulnerability(ies) in history`,
          points,
          confidence: vulnConfidence,
        });
        score -= points;
      }
      
      if (vulnAnalysis.highCount > 0 && vulnConfidence === 'high') {
        deductions.push({
          reason: `${vulnAnalysis.highCount} high severity vulnerability(ies) in history`,
          points: DEDUCTIONS.VULN_HIGH,
          confidence: 'high',
        });
        score -= DEDUCTIONS.VULN_HIGH;
      }
      
      // Only flag unfixed vulns for non-established projects
      // Large projects often have advisory entries that aren't really "unfixed"
      if (vulnAnalysis.hasUnfixedVulns && !isEstablished) {
        const points = applyConfidence(DEDUCTIONS.VULN_UNFIXED, 'medium');
        deductions.push({
          reason: 'Has unfixed vulnerabilities',
          points,
          confidence: 'medium',
        });
        score -= points;
      }
      
      // Many recent vulns threshold scales with project size
      const recentVulnThreshold = isEstablished ? 10 : 3;
      if (vulnAnalysis.recentVulns >= recentVulnThreshold) {
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
    maintainers: maintainers.length > 0 ? maintainers : ['Unknown'],
    lastCommitDate,
    hasOwnershipTransfer,
    hasMalwareHistory: hasMalware,
    vulnerabilityStats,
  };
}
