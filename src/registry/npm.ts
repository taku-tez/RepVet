/**
 * npm Registry API
 */

import { OwnershipTransferResult, NO_TRANSFER_DETECTED } from './utils.js';

const NPM_REGISTRY = 'https://registry.npmjs.org';

export interface NpmPackageData {
  name: string;
  version: string;
  maintainers: Array<{ name: string; email?: string }>;
  repository?: { type: string; url: string };
  time?: Record<string, string>;
  ecosystem: 'npm';
  downloads?: number;
  deprecated?: string;
  isSecurityHoldingPackage?: boolean;  // npm replaced malicious package
}

export async function fetchPackageInfo(packageName: string): Promise<NpmPackageData | null> {
  try {
    const response = await fetch(`${NPM_REGISTRY}/${encodeURIComponent(packageName)}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`npm registry error: ${response.status}`);
    }
    const data = await response.json() as Record<string, unknown>;
    
    const latestVersion = (data['dist-tags'] as Record<string, string>)?.['latest'] || '';
    const versions = data['versions'] as Record<string, Record<string, unknown>> || {};
    const latestData = versions[latestVersion] || {};
    
    // Check if latest version is deprecated
    const deprecated = latestData['deprecated'] as string | undefined;
    
    // Check if this is a security holding package (npm replaced malicious package)
    // Indicators: version is 0.0.1-security, description contains "security holding"
    const description = (latestData['description'] as string) || (data['description'] as string) || '';
    const isSecurityHoldingPackage = 
      latestVersion === '0.0.1-security' || 
      latestVersion.endsWith('-security') ||
      description.toLowerCase().includes('security holding') ||
      description.toLowerCase().includes('security placeholder');
    
    return {
      name: data['name'] as string,
      version: latestVersion,
      maintainers: (data['maintainers'] as Array<{name: string; email?: string}>) || [],
      repository: latestData['repository'] as NpmPackageData['repository'],
      time: data['time'] as Record<string, string>,
      ecosystem: 'npm',
      deprecated,
      isSecurityHoldingPackage,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch npm package info: ${message}`);
  }
}

// OwnershipTransferResult is now imported from utils.ts

/**
 * Check if package has suspicious ownership transfer
 * 
 * Improved detection:
 * - Checks for complete maintainer replacement in a short time window
 * - Ignores gradual team changes over years
 * - Flags single-maintainer packages that changed hands
 */
export async function checkOwnershipTransfer(packageName: string): Promise<OwnershipTransferResult> {
  try {
    const response = await fetch(`${NPM_REGISTRY}/${encodeURIComponent(packageName)}`);
    if (!response.ok) return { transferred: false, confidence: 'low' };
    
    const data = await response.json() as Record<string, unknown>;
    const versions = data['versions'] as Record<string, Record<string, unknown>> || {};
    const time = data['time'] as Record<string, string> || {};
    const versionList = Object.keys(versions).filter(v => v !== 'created' && v !== 'modified');
    
    if (versionList.length < 2) return { transferred: false, confidence: 'low' };
    
    // Sort versions by publish time
    const sortedVersions = versionList
      .map(v => ({ version: v, time: new Date(time[v] || 0).getTime() }))
      .sort((a, b) => a.time - b.time);
    
    // Track maintainer changes across versions
    let lastMaintainers: Set<string> = new Set();
    let suspiciousTransfers = 0;
    let transferDetails: string | undefined;
    
    for (let i = 0; i < sortedVersions.length; i++) {
      const v = sortedVersions[i].version;
      const versionData = versions[v] as Record<string, unknown>;
      
      // Get maintainer(s) for this version
      const npmUser = versionData['_npmUser'] as { name: string } | undefined;
      const maintainerList = versionData['maintainers'] as Array<{ name: string }> | undefined;
      
      const currentMaintainers = new Set<string>();
      if (npmUser?.name) currentMaintainers.add(npmUser.name.toLowerCase());
      if (maintainerList) {
        for (const m of maintainerList) {
          if (m.name) currentMaintainers.add(m.name.toLowerCase());
        }
      }
      
      if (currentMaintainers.size === 0) continue;
      
      if (lastMaintainers.size > 0) {
        // Check for complete maintainer replacement
        const overlap = [...lastMaintainers].filter(m => currentMaintainers.has(m));
        
        if (overlap.length === 0 && lastMaintainers.size > 0) {
          // Complete replacement - check time window
          const prevTime = sortedVersions[i - 1]?.time || 0;
          const currTime = sortedVersions[i].time;
          const daysBetween = (currTime - prevTime) / (1000 * 60 * 60 * 24);
          
          // Suspicious if complete replacement within 30 days
          if (daysBetween < 30) {
            suspiciousTransfers++;
            transferDetails = `Complete maintainer change in ${Math.round(daysBetween)} days (${v})`;
          }
          // Also suspicious for single-maintainer packages
          else if (lastMaintainers.size === 1 && currentMaintainers.size === 1) {
            suspiciousTransfers++;
            transferDetails = `Single maintainer replaced at ${v}`;
          }
        }
      }
      
      lastMaintainers = currentMaintainers;
    }
    
    if (suspiciousTransfers > 0) {
      return {
        transferred: true,
        confidence: suspiciousTransfers > 1 ? 'high' : 'medium',
        details: transferDetails,
      };
    }
    
    return { transferred: false, confidence: 'high' };
  } catch {
    return NO_TRANSFER_DETECTED;
  }
}
