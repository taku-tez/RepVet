/**
 * Registry Utilities
 * Common functions shared across ecosystem registry modules
 */

import { PackageInfo, Maintainer } from '../types.js';

/**
 * Ownership transfer result
 */
export interface OwnershipTransferResult {
  transferred: boolean;
  confidence: 'high' | 'medium' | 'low';
  details?: string;
}

/**
 * Default result for ownership transfer when not detectable
 */
export const NO_TRANSFER_DETECTED: OwnershipTransferResult = {
  transferred: false,
  confidence: 'low',
};

/**
 * Safely fetch JSON from a URL with proper error handling
 * Returns null for 404, throws for other errors
 */
export async function fetchJsonOrNull<T>(
  url: string,
  options: RequestInit = {}
): Promise<T | null> {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`HTTP ${response.status}`);
  }
  
  return response.json() as Promise<T>;
}

/**
 * Check if a URL is a valid repository URL (GitHub, GitLab, etc.)
 */
export function isValidRepoUrl(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('github.com') ||
    url.includes('gitlab.com') ||
    url.includes('bitbucket.org')
  );
}

/**
 * Clean and validate repository URL
 * Returns undefined if not a valid repo URL
 */
export function cleanRepoUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  
  // Clean up git:// URLs
  let cleaned = url
    .replace(/^git:\/\//, 'https://')
    .replace(/\.git$/, '');
  
  return isValidRepoUrl(cleaned) ? cleaned : undefined;
}

/**
 * Parse maintainer string that may contain name and email
 * e.g., "John Doe <john@example.com>" -> { name: "John Doe", email: "john@example.com" }
 */
export function parseMaintainerString(text: string): Maintainer {
  const match = text.match(/^([^<]+)(?:<([^>]+)>)?/);
  if (match) {
    return {
      name: match[1].trim(),
      email: match[2]?.trim(),
    };
  }
  return { name: text.trim() };
}

/**
 * Split comma/and-separated maintainer string into array
 * e.g., "Alice, Bob and Charlie" -> ["Alice", "Bob", "Charlie"]
 */
export function splitMaintainerList(text: string): string[] {
  if (!text) return [];
  
  return text
    .split(/,|\s+and\s+|\s+&\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Create a PackageInfo object with common defaults
 */
export function createPackageInfo(
  name: string,
  version: string,
  ecosystem: PackageInfo['ecosystem'],
  opts: {
    maintainers?: Maintainer[];
    repository?: string;
    time?: Record<string, string>;
    downloads?: number;
  } = {}
): PackageInfo {
  return {
    name,
    version,
    ecosystem,
    maintainers: opts.maintainers || [],
    repository: opts.repository ? { type: 'git', url: opts.repository } : undefined,
    time: opts.time,
    downloads: opts.downloads,
  };
}

/**
 * Wrap an async registry fetch with consistent error handling
 */
export async function wrapRegistryFetch<T>(
  ecosystem: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  try {
    return await fetchFn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch ${ecosystem} package info: ${message}`);
  }
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  return Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Get a User-Agent header for API requests
 */
export function getDefaultHeaders(): HeadersInit {
  return {
    'User-Agent': 'RepVet/0.7.0 (https://github.com/taku-tez/RepVet)',
  };
}
