/**
 * PHP ecosystem parser
 * - composer.lock
 */

import { PackageDependency } from '../types.js';

/**
 * Parse composer.lock
 * Format: JSON with "packages" and "packages-dev" arrays
 * Each package has "name" and "version" fields
 * Returns package names with versions
 */
export function parseComposerLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  
  try {
    const lock = JSON.parse(content) as {
      packages?: Array<{ name: string; version: string }>;
      'packages-dev'?: Array<{ name: string; version: string }>;
    };
    
    // Combine packages and packages-dev
    const allPackages = [
      ...(lock.packages || []),
      ...(lock['packages-dev'] || []),
    ];
    
    for (const pkg of allPackages) {
      if (!pkg.name || seen.has(pkg.name)) continue;
      
      // Skip PHP extensions (ext-*) and PHP version constraints
      // Only skip exact 'php' package or ext-* extensions, not packages like 'phpunit/phpunit'
      if (pkg.name === 'php' || pkg.name.startsWith('ext-')) continue;
      
      seen.add(pkg.name);
      
      // Version might have 'v' prefix (e.g., "v1.2.3"), normalize to "1.2.3"
      const version = pkg.version?.replace(/^v/, '');
      
      deps.push({
        name: pkg.name,
        version,
      });
    }
  } catch {
    // Invalid JSON, return empty
    return [];
  }
  
  return deps;
}
