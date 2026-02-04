/**
 * Go Modules Registry API (via proxy.golang.org)
 * 
 * Supports:
 * - Package info fetch
 * - Deprecated module detection (// Deprecated: comment in go.mod)
 * - Retracted version detection (retract directive in go.mod)
 */

import { PackageInfo } from '../types.js';

const GO_PROXY = 'https://proxy.golang.org';

export interface GoPackageData extends PackageInfo {
  deprecated?: string;      // Deprecation message if module is deprecated
  retracted?: string[];     // List of retracted versions
  retractedReasons?: Record<string, string>; // Version -> reason mapping
}

interface LatestInfo {
  Version: string;
  Time: string;
  Origin?: {
    VCS: string;
    URL: string;
    Hash: string;
    Ref: string;
  };
}

/**
 * Parse go.mod content for deprecated and retract directives
 */
function parseGoMod(content: string): {
  deprecated?: string;
  retracts: Array<{ version: string; reason?: string }>;
} {
  const lines = content.split('\n');
  let deprecated: string | undefined;
  const retracts: Array<{ version: string; reason?: string }> = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check for Deprecated comment (must be at module level)
    // Format: // Deprecated: message
    if (trimmed.startsWith('// Deprecated:')) {
      deprecated = trimmed.replace(/^\/\/\s*Deprecated:\s*/, '').trim();
    }
    
    // Check for retract directive
    // Formats:
    // retract v1.0.0 // reason
    // retract [v1.0.0, v1.1.0] // reason
    // retract (
    //   v1.0.0 // reason
    //   [v1.1.0, v1.2.0]
    // )
    const retractMatch = trimmed.match(/^retract\s+(.+)/);
    if (retractMatch) {
      const retractPart = retractMatch[1];
      
      // Check if it's a block start
      if (retractPart === '(') {
        // Block mode - handle in subsequent lines
        continue;
      }
      
      // Single retract
      parseRetractLine(retractPart, retracts);
    }
    
    // Inside retract block (starts with version pattern)
    if (trimmed.match(/^v\d|^\[v\d/)) {
      parseRetractLine(trimmed, retracts);
    }
  }
  
  return { deprecated, retracts };
}

/**
 * Parse a single retract line
 */
function parseRetractLine(line: string, retracts: Array<{ version: string; reason?: string }>): void {
  // Extract reason from comment
  const reasonMatch = line.match(/\/\/\s*(.+)$/);
  const reason = reasonMatch ? reasonMatch[1].trim() : undefined;
  
  // Remove comment
  const versionPart = line.replace(/\/\/.*$/, '').trim();
  
  // Check for version range [v1.0.0, v1.1.0]
  const rangeMatch = versionPart.match(/\[([^\]]+)\]/);
  if (rangeMatch) {
    const versions = rangeMatch[1].split(',').map(v => v.trim());
    // For ranges, we store the range as a single entry
    if (versions.length === 2) {
      retracts.push({ version: `${versions[0]}..${versions[1]}`, reason });
    }
  } else {
    // Single version
    const versionMatch = versionPart.match(/^(v[\d.]+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?)/);
    if (versionMatch) {
      retracts.push({ version: versionMatch[1], reason });
    }
  }
}

export async function fetchGoPackageInfo(modulePath: string): Promise<GoPackageData | null> {
  try {
    // Normalize module path (handle github.com/user/repo format)
    const normalizedPath = modulePath.replace(/^go:\/\//, '');
    
    // Get latest version info
    const latestResponse = await fetch(`${GO_PROXY}/${encodeURIComponent(normalizedPath)}/@latest`);
    if (!latestResponse.ok) {
      if (latestResponse.status === 404 || latestResponse.status === 410) {
        return null;
      }
      throw new Error(`Go proxy error: ${latestResponse.status}`);
    }
    
    const latestData = await latestResponse.json() as LatestInfo;
    
    // Get version list
    const listResponse = await fetch(`${GO_PROXY}/${encodeURIComponent(normalizedPath)}/@v/list`);
    const time: Record<string, string> = {};
    
    if (listResponse.ok) {
      const versionList = (await listResponse.text()).trim().split('\n').filter(Boolean);
      
      // Get timestamps for versions (limit to recent ones to avoid too many requests)
      const recentVersions = versionList.slice(-10);
      for (const version of recentVersions) {
        try {
          const vResponse = await fetch(`${GO_PROXY}/${encodeURIComponent(normalizedPath)}/@v/${version}.info`);
          if (vResponse.ok) {
            const vData = await vResponse.json() as { Time: string };
            time[version] = vData.Time;
          }
        } catch {
          // Skip failed version lookups
        }
      }
    }
    
    // Extract maintainers from module path (github.com/user/repo -> user)
    const maintainers: Array<{ name: string }> = [];
    const githubMatch = normalizedPath.match(/github\.com\/([^/]+)/);
    if (githubMatch) {
      maintainers.push({ name: githubMatch[1] });
    }
    
    // Repository URL from Origin or inferred from path
    let repoUrl = latestData.Origin?.URL;
    if (!repoUrl && normalizedPath.startsWith('github.com/')) {
      repoUrl = `https://${normalizedPath.split('/').slice(0, 3).join('/')}`;
    }
    
    return {
      name: normalizedPath,
      version: latestData.Version,
      maintainers,
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'go',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch Go module info: ${message}`);
  }
}

/**
 * Check if a Go module is deprecated
 * 
 * Deprecated modules have a "// Deprecated:" comment in their go.mod file
 */
export async function checkGoDeprecated(modulePath: string): Promise<{
  deprecated: boolean;
  message?: string;
}> {
  try {
    const normalizedPath = modulePath.replace(/^go:\/\//, '');
    
    // First get latest version
    const latestResponse = await fetch(`${GO_PROXY}/${encodeURIComponent(normalizedPath)}/@latest`);
    if (!latestResponse.ok) {
      return { deprecated: false };
    }
    
    const latestData = await latestResponse.json() as LatestInfo;
    const version = latestData.Version;
    
    // Fetch go.mod for the latest version
    const modResponse = await fetch(`${GO_PROXY}/${encodeURIComponent(normalizedPath)}/@v/${version}.mod`);
    if (!modResponse.ok) {
      return { deprecated: false };
    }
    
    const modContent = await modResponse.text();
    const parsed = parseGoMod(modContent);
    
    if (parsed.deprecated) {
      return {
        deprecated: true,
        message: parsed.deprecated,
      };
    }
    
    return { deprecated: false };
  } catch {
    return { deprecated: false };
  }
}

/**
 * Check if a Go module has retracted versions
 * 
 * Retracted versions are specified via "retract" directives in go.mod
 */
export async function checkGoRetracted(modulePath: string): Promise<{
  hasRetractions: boolean;
  latestRetracted: boolean;
  retractions: Array<{ version: string; reason?: string }>;
}> {
  try {
    const normalizedPath = modulePath.replace(/^go:\/\//, '');
    
    // Get latest version
    const latestResponse = await fetch(`${GO_PROXY}/${encodeURIComponent(normalizedPath)}/@latest`);
    if (!latestResponse.ok) {
      return { hasRetractions: false, latestRetracted: false, retractions: [] };
    }
    
    const latestData = await latestResponse.json() as LatestInfo;
    const latestVersion = latestData.Version;
    
    // Fetch go.mod for the latest version
    const modResponse = await fetch(`${GO_PROXY}/${encodeURIComponent(normalizedPath)}/@v/${latestVersion}.mod`);
    if (!modResponse.ok) {
      return { hasRetractions: false, latestRetracted: false, retractions: [] };
    }
    
    const modContent = await modResponse.text();
    const parsed = parseGoMod(modContent);
    
    if (parsed.retracts.length === 0) {
      return { hasRetractions: false, latestRetracted: false, retractions: [] };
    }
    
    // Check if latest version is retracted
    const latestRetracted = parsed.retracts.some(r => {
      if (r.version.includes('..')) {
        // Version range
        const [start, end] = r.version.split('..');
        return latestVersion >= start && latestVersion <= end;
      }
      return r.version === latestVersion;
    });
    
    return {
      hasRetractions: true,
      latestRetracted,
      retractions: parsed.retracts,
    };
  } catch {
    return { hasRetractions: false, latestRetracted: false, retractions: [] };
  }
}

/**
 * Get full Go module info including deprecation and retraction status
 */
export async function getGoModuleFullInfo(modulePath: string): Promise<GoPackageData | null> {
  const packageInfo = await fetchGoPackageInfo(modulePath);
  if (!packageInfo) return null;
  
  // Check for deprecation
  const deprecationResult = await checkGoDeprecated(modulePath);
  if (deprecationResult.deprecated) {
    packageInfo.deprecated = deprecationResult.message;
  }
  
  // Check for retractions
  const retractionResult = await checkGoRetracted(modulePath);
  if (retractionResult.hasRetractions) {
    packageInfo.retracted = retractionResult.retractions.map(r => r.version);
    packageInfo.retractedReasons = {};
    for (const r of retractionResult.retractions) {
      if (r.reason) {
        packageInfo.retractedReasons[r.version] = r.reason;
      }
    }
  }
  
  return packageInfo;
}
