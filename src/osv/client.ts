/**
 * OSV (Open Source Vulnerabilities) API Client
 * https://osv.dev/
 */

export interface OSVVulnerability {
  id: string;
  summary?: string;
  details?: string;
  severity?: Array<{
    type: string;
    score: string;
  }>;
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
export async function queryPackageVulnerabilities(
  ecosystem: 'npm' | 'PyPI' | 'crates.io' | 'Go',
  packageName: string
): Promise<OSVVulnerability[]> {
  try {
    const response = await fetch(`${OSV_API}/query`, {
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
    const response = await fetch(`${OSV_API}/vulns/${id}`);
    if (!response.ok) return null;
    return await response.json() as OSVVulnerability;
  } catch {
    return null;
  }
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
  ecosystem: 'npm' | 'PyPI' | 'crates.io' | 'Go',
  packageName: string
): Promise<VulnerabilityAnalysis> {
  const vulns = await queryPackageVulnerabilities(ecosystem, packageName);
  
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  
  let criticalCount = 0;
  let highCount = 0;
  let recentVulns = 0;
  let hasUnfixedVulns = false;
  
  for (const vuln of vulns) {
    // Check severity
    for (const sev of vuln.severity || []) {
      const score = parseFloat(sev.score);
      if (score >= 9.0) criticalCount++;
      else if (score >= 7.0) highCount++;
    }
    
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
