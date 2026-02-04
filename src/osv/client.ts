/**
 * OSV (Open Source Vulnerabilities) API Client
 * https://osv.dev/
 */

import { fetchWithRetry } from '../registry/utils.js';

/**
 * Extract CVSS base score from CVSS vector string
 * Supports CVSS v2, v3.0, v3.1, and v4.0 formats
 * 
 * Example inputs:
 * - "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" -> 9.8 (calculated)
 * - "AV:N/AC:L/Au:N/C:P/I:P/A:P" -> 7.5 (CVSS v2)
 * - "9.8" -> 9.8 (direct score)
 */
function extractCvssScore(vectorOrScore: string): number {
  // If it's already a numeric score, return it
  const directScore = parseFloat(vectorOrScore);
  if (!isNaN(directScore) && directScore >= 0 && directScore <= 10) {
    return directScore;
  }
  
  // Check for CVSS v2 vector (no "CVSS:" prefix, has "Au:" metric)
  if (!vectorOrScore.startsWith('CVSS:') && vectorOrScore.includes('Au:')) {
    return extractCvssV2Score(vectorOrScore);
  }
  
  // Parse CVSS 3.x/4.x vector string
  if (!vectorOrScore.startsWith('CVSS:')) {
    return 0;
  }
  
  // CVSS 3.x scoring (simplified calculation based on metrics)
  // This is an approximation - full CVSS calculation is complex
  const metrics: Record<string, string> = {};
  const parts = vectorOrScore.split('/');
  for (const part of parts.slice(1)) {
    const [key, value] = part.split(':');
    if (key && value) {
      metrics[key] = value;
    }
  }
  
  // Attack Vector (AV): N=1.0, A=0.9, L=0.6, P=0.2
  // Attack Complexity (AC): L=1.0, H=0.6
  // Privileges Required (PR): N=1.0, L=0.6, H=0.3
  // User Interaction (UI): N=1.0, R=0.6
  // Scope (S): U=unchanged, C=changed
  // Impact (C/I/A): H=1.0, L=0.5, N=0.0
  
  const avScore = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 }[metrics.AV] || 0.5;
  const acScore = { L: 0.77, H: 0.44 }[metrics.AC] || 0.5;
  const prScore = metrics.S === 'C' 
    ? { N: 0.85, L: 0.68, H: 0.5 }[metrics.PR] || 0.5
    : { N: 0.85, L: 0.62, H: 0.27 }[metrics.PR] || 0.5;
  const uiScore = { N: 0.85, R: 0.62 }[metrics.UI] || 0.5;
  
  const cScore = { H: 0.56, L: 0.22, N: 0 }[metrics.C] || 0;
  const iScore = { H: 0.56, L: 0.22, N: 0 }[metrics.I] || 0;
  const aScore = { H: 0.56, L: 0.22, N: 0 }[metrics.A] || 0;
  
  // Simplified impact and exploitability
  const impact = 1 - (1 - cScore) * (1 - iScore) * (1 - aScore);
  const exploitability = 8.22 * avScore * acScore * prScore * uiScore;
  
  if (impact <= 0) return 0;
  
  // Simplified score calculation
  const scopeChanged = metrics.S === 'C';
  const impactScore = scopeChanged ? 7.52 * (impact - 0.029) - 3.25 * Math.pow(impact - 0.02, 15) : 6.42 * impact;
  
  if (impactScore <= 0) return 0;
  
  const baseScore = scopeChanged
    ? Math.min(1.08 * (impactScore + exploitability), 10)
    : Math.min(impactScore + exploitability, 10);
  
  return Math.round(baseScore * 10) / 10;
}

/**
 * Extract CVSS v2 score from vector string
 * CVSS v2 format: AV:N/AC:L/Au:N/C:P/I:P/A:P
 */
function extractCvssV2Score(vector: string): number {
  const metrics: Record<string, string> = {};
  const parts = vector.split('/');
  
  for (const part of parts) {
    const [key, value] = part.split(':');
    if (key && value) {
      metrics[key] = value;
    }
  }
  
  // CVSS v2 metrics
  // Access Vector (AV): L=0.395, A=0.646, N=1.0
  // Access Complexity (AC): H=0.35, M=0.61, L=0.71
  // Authentication (Au): M=0.45, S=0.56, N=0.704
  // Confidentiality Impact (C): N=0, P=0.275, C=0.660
  // Integrity Impact (I): N=0, P=0.275, C=0.660
  // Availability Impact (A): N=0, P=0.275, C=0.660
  
  const avScore = { L: 0.395, A: 0.646, N: 1.0 }[metrics.AV] || 0.5;
  const acScore = { H: 0.35, M: 0.61, L: 0.71 }[metrics.AC] || 0.5;
  const auScore = { M: 0.45, S: 0.56, N: 0.704 }[metrics.Au] || 0.5;
  
  const cScore = { N: 0, P: 0.275, C: 0.660 }[metrics.C] || 0;
  const iScore = { N: 0, P: 0.275, C: 0.660 }[metrics.I] || 0;
  const aScore = { N: 0, P: 0.275, C: 0.660 }[metrics.A] || 0;
  
  // CVSS v2 base score formula
  const impact = 10.41 * (1 - (1 - cScore) * (1 - iScore) * (1 - aScore));
  const exploitability = 20 * avScore * acScore * auScore;
  
  const fImpact = impact === 0 ? 0 : 1.176;
  const baseScore = ((0.6 * impact) + (0.4 * exploitability) - 1.5) * fImpact;
  
  return Math.round(Math.max(0, Math.min(10, baseScore)) * 10) / 10;
}

export interface OSVVulnerability {
  id: string;
  summary?: string;
  details?: string;
  severity?: Array<{
    type: string;
    score: string;
  }>;
  database_specific?: {
    severity?: string; // e.g., "CRITICAL", "HIGH", "MEDIUM", "LOW"
    cvss?: number | string | { score?: number; vectorString?: string };
    cvss_v2?: number | string | { score?: number; vectorString?: string };
    cvss_v3?: number | string | { score?: number; vectorString?: string };
    cwe_ids?: string[];
    github_reviewed?: boolean;
    // NVD format
    nvd_published_at?: string;
  };
  affected: Array<{
    package: {
      ecosystem: string;
      name: string;
    };
    ranges?: Array<{
      type: string;
      events: Array<{ introduced?: string; fixed?: string }>;
    }>;
  }>;
  published?: string;
  modified?: string;
}

export interface OSVQueryResult {
  vulns?: OSVVulnerability[];
}

const OSV_API = 'https://api.osv.dev/v1';

/**
 * Query OSV for vulnerabilities affecting a package
 */
type OSVEcosystem = 'npm' | 'PyPI' | 'crates.io' | 'Go' | 'RubyGems' | 'Packagist' | 'NuGet' | 'Maven' | 'Hex' | 'Pub' | 'CPAN' | 'CocoaPods';

export async function queryPackageVulnerabilities(
  ecosystem: OSVEcosystem,
  packageName: string
): Promise<OSVVulnerability[]> {
  try {
    const response = await fetchWithRetry(`${OSV_API}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package: {
          ecosystem,
          name: packageName,
        },
      }),
      timeoutMs: 5000,
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json() as OSVQueryResult;
    return data.vulns || [];
  } catch {
    return [];
  }
}

/**
 * Get vulnerability details by ID
 */
export async function getVulnerabilityById(id: string): Promise<OSVVulnerability | null> {
  try {
    const response = await fetchWithRetry(`${OSV_API}/vulns/${id}`, { timeoutMs: 5000 });
    if (!response.ok) return null;
    return await response.json() as OSVVulnerability;
  } catch {
    return null;
  }
}

/**
 * Extract CVSS score from database_specific field
 * Handles various formats used by different databases
 */
function extractDatabaseSpecificCvss(dbSpecific: OSVVulnerability['database_specific']): number {
  if (!dbSpecific) return 0;
  
  // Try cvss_v3 first (preferred)
  if (dbSpecific.cvss_v3) {
    if (typeof dbSpecific.cvss_v3 === 'number') {
      return dbSpecific.cvss_v3;
    }
    if (typeof dbSpecific.cvss_v3 === 'string') {
      return extractCvssScore(dbSpecific.cvss_v3);
    }
    if (typeof dbSpecific.cvss_v3 === 'object') {
      if (dbSpecific.cvss_v3.score) return dbSpecific.cvss_v3.score;
      if (dbSpecific.cvss_v3.vectorString) return extractCvssScore(dbSpecific.cvss_v3.vectorString);
    }
  }
  
  // Try generic cvss field
  if (dbSpecific.cvss) {
    if (typeof dbSpecific.cvss === 'number') {
      return dbSpecific.cvss;
    }
    if (typeof dbSpecific.cvss === 'string') {
      return extractCvssScore(dbSpecific.cvss);
    }
    if (typeof dbSpecific.cvss === 'object') {
      if (dbSpecific.cvss.score) return dbSpecific.cvss.score;
      if (dbSpecific.cvss.vectorString) return extractCvssScore(dbSpecific.cvss.vectorString);
    }
  }
  
  // Fallback to cvss_v2
  if (dbSpecific.cvss_v2) {
    if (typeof dbSpecific.cvss_v2 === 'number') {
      return dbSpecific.cvss_v2;
    }
    if (typeof dbSpecific.cvss_v2 === 'string') {
      return extractCvssScore(dbSpecific.cvss_v2);
    }
    if (typeof dbSpecific.cvss_v2 === 'object') {
      if (dbSpecific.cvss_v2.score) return dbSpecific.cvss_v2.score;
      if (dbSpecific.cvss_v2.vectorString) return extractCvssScore(dbSpecific.cvss_v2.vectorString);
    }
  }
  
  return 0;
}

/**
 * Analyze vulnerability history for a package
 */
export interface VulnerabilityAnalysis {
  totalVulns: number;
  criticalCount: number;
  highCount: number;
  recentVulns: number; // Within last year
  hasUnfixedVulns: boolean;
  vulnIds: string[];
}

export async function analyzeVulnerabilityHistory(
  ecosystem: OSVEcosystem,
  packageName: string
): Promise<VulnerabilityAnalysis> {
  const vulns = await queryPackageVulnerabilities(ecosystem, packageName);
  
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  
  let criticalCount = 0;
  let highCount = 0;
  let recentVulns = 0;
  let hasUnfixedVulns = false;
  
  for (const vuln of vulns) {
    // Check severity - try multiple sources in order of preference
    let severityScore = 0;
    
    // 1. Try database_specific.severity (GitHub Advisory format)
    const dbSeverity = vuln.database_specific?.severity?.toUpperCase();
    if (dbSeverity === 'CRITICAL') {
      severityScore = 9.5;
    } else if (dbSeverity === 'HIGH') {
      severityScore = 8.0;
    } else if (dbSeverity === 'MEDIUM' || dbSeverity === 'MODERATE') {
      severityScore = 5.0;
    } else if (dbSeverity === 'LOW') {
      severityScore = 2.0;
    }
    
    // 2. Try CVSS vector parsing from severity array (CVSS v3/v4 preferred)
    for (const sev of vuln.severity || []) {
      if (sev.type === 'CVSS_V3' || sev.type === 'CVSS_V4') {
        const cvssScore = extractCvssScore(sev.score);
        if (cvssScore > severityScore) {
          severityScore = cvssScore;
        }
      }
    }
    
    // 3. Try CVSS v2 from severity array if no v3/v4
    if (severityScore === 0 || severityScore < 7) {
      for (const sev of vuln.severity || []) {
        if (sev.type === 'CVSS_V2') {
          const cvssScore = extractCvssScore(sev.score);
          if (cvssScore > severityScore) {
            severityScore = cvssScore;
          }
        }
      }
    }
    
    // 4. Try database_specific.cvss fields (various formats)
    if (severityScore === 0 || severityScore < 7) {
      const dbCvss = extractDatabaseSpecificCvss(vuln.database_specific);
      if (dbCvss > severityScore) {
        severityScore = dbCvss;
      }
    }
    
    // 5. Count based on final severity
    if (severityScore >= 9.0) criticalCount++;
    else if (severityScore >= 7.0) highCount++;
    
    // Check if recent
    if (vuln.published) {
      const publishDate = new Date(vuln.published).getTime();
      if (publishDate > oneYearAgo) {
        recentVulns++;
      }
    }
    
    // Check if unfixed
    for (const affected of vuln.affected) {
      for (const range of affected.ranges || []) {
        const hasFixed = range.events.some(e => e.fixed);
        if (!hasFixed) {
          hasUnfixedVulns = true;
        }
      }
    }
  }
  
  return {
    totalVulns: vulns.length,
    criticalCount,
    highCount,
    recentVulns,
    hasUnfixedVulns,
    vulnIds: vulns.map(v => v.id),
  };
}
