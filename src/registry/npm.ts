/**
 * npm Registry API
 */

import { PackageInfo } from '../types.js';

const NPM_REGISTRY = 'https://registry.npmjs.org';

export async function fetchPackageInfo(packageName: string): Promise<PackageInfo | null> {
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
    
    return {
      name: data['name'] as string,
      version: latestVersion,
      maintainers: (data['maintainers'] as Array<{name: string; email?: string}>) || [],
      repository: latestData['repository'] as PackageInfo['repository'],
      time: data['time'] as Record<string, string>,
      ecosystem: 'npm',
    };
  } catch (error) {
    throw new Error(`Failed to fetch package info: ${error}`);
  }
}

export interface OwnershipTransferResult {
  transferred: boolean;
  confidence: 'high' | 'medium' | 'low';
  details?: string;
}

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
    return { transferred: false, confidence: 'low' };
  }
}
