/**
 * CocoaPods (Swift/Objective-C) Registry API
 */

import { PackageInfo } from '../types.js';

const COCOAPODS_API = 'https://cdn.cocoapods.org';
const COCOAPODS_TRUNK = 'https://trunk.cocoapods.org/api/v1/pods';

export async function fetchCocoaPodsPackageInfo(packageName: string): Promise<PackageInfo | null> {
  try {
    // Try trunk API first
    const response = await fetch(`${COCOAPODS_TRUNK}/${encodeURIComponent(packageName)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`CocoaPods API error: ${response.status}`);
    }
    
    const data = await response.json() as {
      name: string;
      versions: Array<{
        name: string;
        created_at: string;
      }>;
      owners: Array<{
        name: string;
        email: string;
      }>;
    };
    
    // Get maintainers from owners
    const maintainers = data.owners.map(o => ({ name: o.name || o.email.split('@')[0] }));
    
    // Build time map
    const time: Record<string, string> = {};
    for (const version of data.versions) {
      time[version.name] = version.created_at;
    }
    
    // Latest version
    const latestVersion = data.versions[0]?.name || '';
    
    // Try to get podspec for repository URL
    let repoUrl: string | undefined;
    try {
      // CocoaPods specs are stored in a specific structure
      const firstLetter = packageName.charAt(0).toLowerCase();
      const specUrl = `${COCOAPODS_API}/Specs/${firstLetter}/${firstLetter}/${firstLetter}/${packageName}/${latestVersion}/${packageName}.podspec.json`;
      const specResponse = await fetch(specUrl);
      
      if (specResponse.ok) {
        const spec = await specResponse.json() as {
          source?: {
            git?: string;
          };
          homepage?: string;
        };
        
        repoUrl = spec.source?.git || spec.homepage;
        if (repoUrl && !repoUrl.includes('github.com') && !repoUrl.includes('gitlab.com')) {
          repoUrl = undefined;
        }
      }
    } catch {
      // Ignore spec fetch errors
    }
    
    return {
      name: data.name,
      version: latestVersion,
      maintainers,
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'cocoapods',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch CocoaPods package info: ${message}`);
  }
}
