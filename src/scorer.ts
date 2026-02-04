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
import { fetchPyPIPackageInfo, checkPyPIYanked, checkPyPIOwnershipTransfer } from './registry/pypi.js';
import { fetchCratesPackageInfo, checkCratesOwnershipTransfer, checkCratesYanked } from './registry/crates.js';
import { fetchRubyGemsPackageInfo, checkRubyGemsYanked } from './registry/rubygems.js';
import { fetchGoPackageInfo, checkGoDeprecated, checkGoRetracted, GoPackageData } from './registry/golang.js';
import { fetchPackagistPackageInfo, checkPackagistAbandoned, checkPackagistOwnershipTransfer, PackagistPackageData } from './registry/packagist.js';
import { fetchNuGetPackageInfo, checkNuGetDeprecated, checkNuGetOwnershipTransfer, NuGetPackageData } from './registry/nuget.js';
import { fetchMavenPackageInfo } from './registry/maven.js';
import { fetchHexPackageInfo, checkHexRetired, HexPackageData } from './registry/hex.js';
import { fetchPubPackageInfo, checkPubDiscontinued, PubPackageData } from './registry/pub.js';
import { fetchCPANPackageInfo } from './registry/cpan.js';
import { fetchCocoaPodsPackageInfo, checkCocoaPodsDeprecated, CocoaPodsPackageData } from './registry/cocoapods.js';
import { fetchCondaPackageInfo } from './registry/conda.js';
import { parseGitHubUrl, fetchLastCommitDate } from './registry/github.js';
import { hasMalwareHistory, getMalwareDetails } from './malware/known-packages.js';
import { analyzeVulnerabilityHistory, OSVEcosystem } from './osv/client.js';

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
  SECURITY_HOLDING: 50,     // npm replaced this with security placeholder (was malicious)
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
  maven: { downloads: 1000000, releaseCount: 50 },
  hex: { downloads: 1000000, releaseCount: 30 },
  pub: { downloads: 1000000, releaseCount: 30 },
  cpan: { downloads: 100000, releaseCount: 30 },
  cocoapods: { downloads: 1000000, releaseCount: 30 },
  conda: { downloads: 10000000, releaseCount: 100 },  // conda-forge packages have high revision counts
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
    case 'maven':
      return fetchMavenPackageInfo(name);
    case 'hex':
      return fetchHexPackageInfo(name);
    case 'pub':
      return fetchPubPackageInfo(name);
    case 'cpan':
      return fetchCPANPackageInfo(name);
    case 'cocoapods':
      return fetchCocoaPodsPackageInfo(name);
    case 'conda':
      return fetchCondaPackageInfo(name);
    default:
      throw new Error(`Unsupported ecosystem: ${ecosystem}`);
  }
}

function mapEcosystemToOSV(ecosystem: Ecosystem): OSVEcosystem | null {
  const mapping: Record<Ecosystem, OSVEcosystem | null> = {
    npm: 'npm',
    pypi: 'PyPI',
    crates: 'crates.io',
    go: 'Go',
    rubygems: 'RubyGems',
    packagist: 'Packagist',
    nuget: 'NuGet',
    maven: 'Maven',
    hex: 'Hex',
    pub: 'Pub',
    cpan: 'CPAN',
    cocoapods: 'CocoaPods',
    conda: null,  // OSV doesn't support Conda ecosystem yet
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
  
  // Check for known malware FIRST (before registry lookup)
  // This allows detection of removed/deleted malicious packages
  const isMalwareKnown = hasMalwareHistory(packageName);
  const malwareDetails = isMalwareKnown ? getMalwareDetails(packageName) : null;
  
  // Fetch package info
  const packageInfo = await fetchPackageByEcosystem(packageName, ecosystem);
  if (!packageInfo) {
    // If package is deleted but known malware, return special result
    if (isMalwareKnown) {
      return {
        package: packageName,
        ecosystem,
        score: 0,
        riskLevel: 'CRITICAL',
        deductions: [{
          reason: `REMOVED/DELETED malicious package${malwareDetails ? `: ${malwareDetails}` : ''}`,
          points: BASE_SCORE,
          confidence: 'high',
        }],
        maintainers: [],
        hasOwnershipTransfer: false,
        hasMalwareHistory: true,
        isDeleted: true,
      };
    }
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
    
    // Check 0.5: Security holding package (npm replaced malicious package)
    if (npmData.isSecurityHoldingPackage) {
      deductions.push({
        reason: 'Security holding package - npm removed malicious versions',
        points: DEDUCTIONS.SECURITY_HOLDING,
        confidence: 'high',
      });
      score -= DEDUCTIONS.SECURITY_HOLDING;
    }
  } else if (ecosystem === 'nuget') {
    // Check for NuGet deprecation (already fetched in packageInfo)
    const nugetData = packageInfo as NuGetPackageData;
    if (nugetData.deprecated) {
      deductions.push({
        reason: `Package deprecated: ${nugetData.deprecated.slice(0, 100)}${nugetData.deprecated.length > 100 ? '...' : ''}`,
        points: DEDUCTIONS.DEPRECATED,
        confidence: 'high',
      });
      score -= DEDUCTIONS.DEPRECATED;
    }
  } else if (ecosystem === 'pypi') {
    // Check for yanked versions (PyPI's equivalent of deprecation)
    const yankedResult = await checkPyPIYanked(packageName);
    if (yankedResult.latestIsYanked) {
      // Latest version is yanked - high severity
      deductions.push({
        reason: `Latest version is yanked${yankedResult.yankedVersions.find(v => v.reason)?.reason ? `: ${yankedResult.yankedVersions.find(v => v.reason)?.reason}` : ''}`,
        points: DEDUCTIONS.DEPRECATED,
        confidence: 'high',
      });
      score -= DEDUCTIONS.DEPRECATED;
    } else if (yankedResult.yankedRatio > 0.3) {
      // Many versions yanked (>30%) - suspicious
      deductions.push({
        reason: `High yanked version ratio (${yankedResult.yankedVersions.length} yanked versions)`,
        points: Math.round(DEDUCTIONS.DEPRECATED * 0.5),
        confidence: 'medium',
      });
      score -= Math.round(DEDUCTIONS.DEPRECATED * 0.5);
    }
  } else if (ecosystem === 'crates') {
    // Check for yanked versions (crates.io's deprecation mechanism)
    const yankedResult = await checkCratesYanked(packageName);
    if (yankedResult.latestIsYanked) {
      // Latest version is yanked - high severity
      const yankMessage = yankedResult.yankedVersions[0]?.message;
      deductions.push({
        reason: `Latest version is yanked${yankMessage ? `: ${yankMessage.slice(0, 100)}${yankMessage.length > 100 ? '...' : ''}` : ''}`,
        points: DEDUCTIONS.DEPRECATED,
        confidence: 'high',
      });
      score -= DEDUCTIONS.DEPRECATED;
    } else if (yankedResult.yankedRatio > 0.3) {
      // Many versions yanked (>30%) - suspicious
      deductions.push({
        reason: `High yanked version ratio (${yankedResult.yankedVersions.length} yanked versions)`,
        points: Math.round(DEDUCTIONS.DEPRECATED * 0.5),
        confidence: 'medium',
      });
      score -= Math.round(DEDUCTIONS.DEPRECATED * 0.5);
    }
  } else if (ecosystem === 'rubygems') {
    // Check for yanked versions in RubyGems
    const yankedResult = await checkRubyGemsYanked(packageName);
    if (yankedResult.latestIsYanked) {
      // Latest version is yanked - high severity
      deductions.push({
        reason: 'Latest version is yanked',
        points: DEDUCTIONS.DEPRECATED,
        confidence: 'high',
      });
      score -= DEDUCTIONS.DEPRECATED;
    } else if (yankedResult.yankedRatio > 0.3) {
      // Many versions yanked (>30%) - suspicious
      deductions.push({
        reason: `High yanked version ratio (${yankedResult.yankedVersions.length} yanked versions)`,
        points: Math.round(DEDUCTIONS.DEPRECATED * 0.5),
        confidence: 'medium',
      });
      score -= Math.round(DEDUCTIONS.DEPRECATED * 0.5);
    }
  } else if (ecosystem === 'packagist') {
    // Check for abandoned package (Packagist's deprecation equivalent)
    const packagistData = packageInfo as PackagistPackageData;
    // First check if already detected in fetchPackagistPackageInfo
    if (packagistData.abandoned) {
      const msg = packagistData.abandonedReplacement 
        ? `Package abandoned, use ${packagistData.abandonedReplacement} instead`
        : 'Package marked as abandoned';
      deductions.push({
        reason: msg,
        points: DEDUCTIONS.DEPRECATED,
        confidence: 'high',
      });
      score -= DEDUCTIONS.DEPRECATED;
    } else {
      // Double-check with p2 API for more reliable detection
      const abandonedResult = await checkPackagistAbandoned(packageName);
      if (abandonedResult.abandoned) {
        const msg = abandonedResult.replacement
          ? `Package abandoned, use ${abandonedResult.replacement} instead`
          : 'Package marked as abandoned';
        deductions.push({
          reason: msg,
          points: DEDUCTIONS.DEPRECATED,
          confidence: 'high',
        });
        score -= DEDUCTIONS.DEPRECATED;
      }
    }
  } else if (ecosystem === 'go') {
    // Check for Go module deprecation (// Deprecated: comment in go.mod)
    const deprecatedResult = await checkGoDeprecated(packageName);
    if (deprecatedResult.deprecated) {
      const msg = deprecatedResult.message 
        ? `Module deprecated: ${deprecatedResult.message.slice(0, 100)}${deprecatedResult.message.length > 100 ? '...' : ''}`
        : 'Module marked as deprecated';
      deductions.push({
        reason: msg,
        points: DEDUCTIONS.DEPRECATED,
        confidence: 'high',
      });
      score -= DEDUCTIONS.DEPRECATED;
    }
    
    // Check for retracted versions (retract directive in go.mod)
    const retractedResult = await checkGoRetracted(packageName);
    if (retractedResult.latestRetracted) {
      // Latest version is retracted - high severity
      deductions.push({
        reason: 'Latest version is retracted',
        points: DEDUCTIONS.DEPRECATED,
        confidence: 'high',
      });
      score -= DEDUCTIONS.DEPRECATED;
    } else if (retractedResult.hasRetractions && retractedResult.retractions.length > 2) {
      // Many retracted versions - suspicious
      deductions.push({
        reason: `Multiple versions retracted (${retractedResult.retractions.length})`,
        points: Math.round(DEDUCTIONS.DEPRECATED * 0.5),
        confidence: 'medium',
      });
      score -= Math.round(DEDUCTIONS.DEPRECATED * 0.5);
    }
  } else if (ecosystem === 'hex') {
    // Check for Hex retired releases
    const hexData = packageInfo as HexPackageData;
    // First check if already detected in fetchHexPackageInfo
    if (hexData.retired) {
      const reasonMap: Record<string, string> = {
        deprecated: 'Package deprecated',
        renamed: 'Package renamed',
        security: 'Security issues',
        invalid: 'Invalid package',
        other: 'Retired',
      };
      const reasonText = reasonMap[hexData.retirementReason || 'other'] || 'Retired';
      const msg = hexData.retirementMessage
        ? `${reasonText}: ${hexData.retirementMessage.slice(0, 100)}${hexData.retirementMessage.length > 100 ? '...' : ''}`
        : reasonText;
      
      // Security-related retirements get higher severity
      const points = hexData.retirementReason === 'security'
        ? DEDUCTIONS.DEPRECATED * 2
        : DEDUCTIONS.DEPRECATED;
      
      deductions.push({
        reason: msg,
        points,
        confidence: 'high',
      });
      score -= points;
    } else {
      // Double-check with checkHexRetired for full retirement info
      const retiredResult = await checkHexRetired(packageName);
      if (retiredResult.latestIsRetired) {
        const latest = retiredResult.retiredReleases[0];
        const reasonMap: Record<string, string> = {
          deprecated: 'Package deprecated',
          renamed: 'Package renamed',
          security: 'Security issues',
          invalid: 'Invalid package',
          other: 'Retired',
        };
        const reasonText = reasonMap[latest?.reason || 'other'] || 'Retired';
        const msg = latest?.message
          ? `${reasonText}: ${latest.message.slice(0, 100)}${latest.message.length > 100 ? '...' : ''}`
          : reasonText;
        
        // Security-related retirements get higher severity
        const points = latest?.reason === 'security'
          ? DEDUCTIONS.DEPRECATED * 2
          : DEDUCTIONS.DEPRECATED;
        
        deductions.push({
          reason: msg,
          points,
          confidence: 'high',
        });
        score -= points;
      } else if (retiredResult.hasRetiredReleases && retiredResult.retiredReleases.length > 2) {
        // Many retired releases - suspicious
        deductions.push({
          reason: `Multiple versions retired (${retiredResult.retiredReleases.length})`,
          points: Math.round(DEDUCTIONS.DEPRECATED * 0.5),
          confidence: 'medium',
        });
        score -= Math.round(DEDUCTIONS.DEPRECATED * 0.5);
      }
    }
  } else if (ecosystem === 'pub') {
    // Check for pub.dev discontinued/unlisted packages
    const pubData = packageInfo as PubPackageData;
    // First check if already detected in fetchPubPackageInfo
    if (pubData.isDiscontinued) {
      const msg = pubData.replacedBy
        ? `Package discontinued, use ${pubData.replacedBy} instead`
        : 'Package marked as discontinued';
      deductions.push({
        reason: msg,
        points: DEDUCTIONS.DEPRECATED,
        confidence: 'high',
      });
      score -= DEDUCTIONS.DEPRECATED;
    } else {
      // Double-check with checkPubDiscontinued for reliability
      const discontinuedResult = await checkPubDiscontinued(packageName);
      if (discontinuedResult.isDiscontinued) {
        const msg = discontinuedResult.replacedBy
          ? `Package discontinued, use ${discontinuedResult.replacedBy} instead`
          : 'Package marked as discontinued';
        deductions.push({
          reason: msg,
          points: DEDUCTIONS.DEPRECATED,
          confidence: 'high',
        });
        score -= DEDUCTIONS.DEPRECATED;
      }
    }
    
    // Check for unlisted packages (hidden from search, but still downloadable)
    // Lower severity than discontinued - could be intentional hiding
    if (pubData.isUnlisted) {
      deductions.push({
        reason: 'Package is unlisted (hidden from search)',
        points: Math.round(DEDUCTIONS.DEPRECATED * 0.5),
        confidence: 'medium',
      });
      score -= Math.round(DEDUCTIONS.DEPRECATED * 0.5);
    }
  } else if (ecosystem === 'cocoapods') {
    // Check for CocoaPods deprecated packages
    const cocoapodsData = packageInfo as CocoaPodsPackageData;
    // First check if already detected in fetchCocoaPodsPackageInfo
    if (cocoapodsData.deprecated) {
      const msg = cocoapodsData.deprecatedInFavorOf
        ? `Package deprecated in favor of ${cocoapodsData.deprecatedInFavorOf}`
        : `Package deprecated: ${cocoapodsData.deprecated.slice(0, 100)}${cocoapodsData.deprecated.length > 100 ? '...' : ''}`;
      deductions.push({
        reason: msg,
        points: DEDUCTIONS.DEPRECATED,
        confidence: 'high',
      });
      score -= DEDUCTIONS.DEPRECATED;
    } else {
      // Double-check with checkCocoaPodsDeprecated for reliability
      const deprecatedResult = await checkCocoaPodsDeprecated(packageName);
      if (deprecatedResult.deprecated) {
        const msg = deprecatedResult.replacement
          ? `Package deprecated in favor of ${deprecatedResult.replacement}`
          : deprecatedResult.message || 'Package marked as deprecated';
        deductions.push({
          reason: msg,
          points: DEDUCTIONS.DEPRECATED,
          confidence: 'high',
        });
        score -= DEDUCTIONS.DEPRECATED;
      }
    }
  }
  
  // Check 1: Malware history (-50) - all ecosystems
  if (hasMalwareHistory(packageName)) {
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
  } else if (ecosystem === 'pypi') {
    const transferResult = await checkPyPIOwnershipTransfer(packageName);
    if (transferResult.transferred) {
      hasOwnershipTransfer = true;
      const points = applyConfidence(DEDUCTIONS.OWNERSHIP_TRANSFER, transferResult.confidence);
      deductions.push({
        reason: transferResult.details || 'Author/maintainer change detected',
        points,
        confidence: transferResult.confidence,
      });
      score -= points;
    }
  } else if (ecosystem === 'nuget') {
    const transferResult = await checkNuGetOwnershipTransfer(packageName);
    if (transferResult.transferred) {
      hasOwnershipTransfer = true;
      const points = applyConfidence(DEDUCTIONS.OWNERSHIP_TRANSFER, transferResult.confidence);
      deductions.push({
        reason: transferResult.details || 'Author change detected',
        points,
        confidence: transferResult.confidence,
      });
      score -= points;
    }
  } else if (ecosystem === 'packagist') {
    const transferResult = await checkPackagistOwnershipTransfer(packageName);
    if (transferResult.transferred) {
      hasOwnershipTransfer = true;
      const points = applyConfidence(DEDUCTIONS.OWNERSHIP_TRANSFER, transferResult.confidence);
      deductions.push({
        reason: transferResult.details || 'Author change detected',
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
  // Note: Some ecosystems (e.g., conda) are not supported by OSV
  const osvEcosystem = mapEcosystemToOSV(ecosystem);
  try {
    if (!osvEcosystem) {
      // Skip OSV check for unsupported ecosystems
      throw new Error('OSV not supported for this ecosystem');
    }
    const vulnAnalysis = await analyzeVulnerabilityHistory(
      osvEcosystem,
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
