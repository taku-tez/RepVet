/**
 * CocoaPods (Swift/Objective-C) Registry API
 */

import { createHash } from 'crypto';
import { PackageInfo } from '../types.js';
import { fetchWithRetry, cleanRepoUrl } from './utils.js';

const COCOAPODS_TRUNK = 'https://trunk.cocoapods.org/api/v1/pods';
const COCOAPODS_SPECS_CDN = 'https://cdn.jsdelivr.net/cocoa/Specs';
const COCOAPODS_SPECS_GITHUB = 'https://raw.githubusercontent.com/CocoaPods/Specs/master/Specs';

/**
 * CocoaPods deprecation result
 */
export interface CocoaPodsDeprecationResult {
  deprecated: boolean;
  message?: string;
  replacement?: string;  // deprecated_in_favor_of value
}

/**
 * Extended CocoaPods package data with deprecation info
 */
export interface CocoaPodsPackageData extends PackageInfo {
  ecosystem: 'cocoapods';
  deprecated?: string;           // Deprecation message for compatibility with npm pattern
  deprecatedInFavorOf?: string;  // Replacement package name
}

/**
 * podspec.json structure (partial)
 */
interface PodSpec {
  name: string;
  version: string;
  summary?: string;
  homepage?: string;
  deprecated?: boolean | string;
  deprecated_in_favor_of?: string;
  source?: {
    git?: string;
    http?: string;
  };
  authors?: Record<string, string> | string;
}

/**
 * Calculate MD5 hash prefix for CocoaPods Specs path
 * The Specs repo uses first 3 characters of MD5 hash as directory structure
 */
function getSpecsPathPrefix(podName: string): string {
  const hash = createHash('md5').update(podName).digest('hex');
  return `${hash[0]}/${hash[1]}/${hash[2]}`;
}

/**
 * Fetch podspec.json from CDN or GitHub
 */
async function fetchPodSpec(
  podName: string,
  version: string
): Promise<PodSpec | null> {
  const pathPrefix = getSpecsPathPrefix(podName);
  const specPath = `${pathPrefix}/${podName}/${version}/${podName}.podspec.json`;
  
  // Try jsdelivr CDN first (faster)
  try {
    const cdnResponse = await fetchWithRetry(
      `${COCOAPODS_SPECS_CDN}/${specPath}`,
      { timeoutMs: 5000 }
    );
    
    if (cdnResponse.ok) {
      return await cdnResponse.json() as PodSpec;
    }
  } catch {
    // Fall through to GitHub
  }
  
  // Fallback to GitHub raw
  try {
    const ghResponse = await fetchWithRetry(
      `${COCOAPODS_SPECS_GITHUB}/${specPath}`,
      { timeoutMs: 5000 }
    );
    
    if (ghResponse.ok) {
      return await ghResponse.json() as PodSpec;
    }
  } catch {
    // Ignore
  }
  
  return null;
}

export async function fetchCocoaPodsPackageInfo(packageName: string): Promise<CocoaPodsPackageData | null> {
  try {
    // Try trunk API first for basic info
    const response = await fetchWithRetry(
      `${COCOAPODS_TRUNK}/${encodeURIComponent(packageName)}`,
      { timeoutMs: 10000 }
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`CocoaPods API error: ${response.status}`);
    }
    
    const data = await response.json() as {
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
    
    // Latest version (find the most recent by created_at)
    const sortedVersions = [...data.versions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const latestVersion = sortedVersions[0]?.name || '';
    
    // Fetch podspec for repository URL and deprecation info
    let repoUrl: string | undefined;
    let deprecated: string | undefined;
    let deprecatedInFavorOf: string | undefined;
    
    if (latestVersion) {
      const podspec = await fetchPodSpec(packageName, latestVersion);
      
      if (podspec) {
        // Repository URL
        repoUrl = cleanRepoUrl(podspec.source?.git || podspec.homepage);
        
        // Deprecation info
        if (podspec.deprecated_in_favor_of) {
          deprecatedInFavorOf = podspec.deprecated_in_favor_of;
          deprecated = `Deprecated in favor of ${podspec.deprecated_in_favor_of}`;
        } else if (podspec.deprecated) {
          deprecated = typeof podspec.deprecated === 'string' 
            ? podspec.deprecated 
            : 'Package marked as deprecated';
        }
      }
    }
    
    return {
      name: packageName,
      version: latestVersion,
      maintainers,
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'cocoapods',
      deprecated,
      deprecatedInFavorOf,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch CocoaPods package info: ${message}`);
  }
}

/**
 * Check if a CocoaPods package is deprecated
 * Fetches the latest podspec and checks for deprecated/deprecated_in_favor_of fields
 */
export async function checkCocoaPodsDeprecated(
  packageName: string
): Promise<CocoaPodsDeprecationResult> {
  try {
    // First get version list from trunk API
    const response = await fetchWithRetry(
      `${COCOAPODS_TRUNK}/${encodeURIComponent(packageName)}`,
      { timeoutMs: 10000 }
    );
    
    if (!response.ok) {
      return { deprecated: false };
    }
    
    const data = await response.json() as {
      versions: Array<{
        name: string;
        created_at: string;
      }>;
    };
    
    if (!data.versions || data.versions.length === 0) {
      return { deprecated: false };
    }
    
    // Get latest version
    const sortedVersions = [...data.versions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const latestVersion = sortedVersions[0]?.name;
    
    if (!latestVersion) {
      return { deprecated: false };
    }
    
    // Fetch podspec
    const podspec = await fetchPodSpec(packageName, latestVersion);
    
    if (!podspec) {
      return { deprecated: false };
    }
    
    // Check deprecation fields
    if (podspec.deprecated_in_favor_of) {
      return {
        deprecated: true,
        replacement: podspec.deprecated_in_favor_of,
        message: `Use ${podspec.deprecated_in_favor_of} instead`,
      };
    }
    
    if (podspec.deprecated) {
      return {
        deprecated: true,
        message: typeof podspec.deprecated === 'string' 
          ? podspec.deprecated 
          : 'Package marked as deprecated',
      };
    }
    
    return { deprecated: false };
  } catch {
    // Error fetching - assume not deprecated
    return { deprecated: false };
  }
}
