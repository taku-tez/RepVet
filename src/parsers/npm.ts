/**
 * npm ecosystem lockfile parsers
 * - package-lock.json / npm-shrinkwrap.json
 * - yarn.lock (v1 and Berry)
 * - pnpm-lock.yaml
 */

import { PackageDependency } from '../types.js';

/**
 * Parse package-lock.json / npm-shrinkwrap.json
 * Supports lockfileVersion 1, 2, and 3
 * Returns package names with versions
 */
export function parsePackageLock(content: string): PackageDependency[] {
  const lock = JSON.parse(content) as {
    packages?: Record<string, { version?: string }>;
    dependencies?: Record<string, { version?: string }>;
  };
  
  // v2/v3 format: "packages" object with "node_modules/pkg" keys
  // v1 format: "dependencies" object with pkg names as keys
  const packagesObj = lock.packages || lock.dependencies || {};
  
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  
  for (const [key, value] of Object.entries(packagesObj)) {
    // Skip empty string key (root package in v2/v3)
    if (!key) continue;
    // Skip workspace packages (local paths)
    if (key.startsWith('node_modules/') && key.includes('node_modules/node_modules/')) continue;
    
    const name = key.replace(/^node_modules\//, '');
    if (!name || seen.has(name)) continue;
    seen.add(name);
    
    deps.push({
      name,
      version: value?.version,
    });
  }
  
  return deps;
}

/**
 * Parse yarn.lock (Yarn Classic v1 and Yarn Berry v2+)
 * Format: "package@version:" or "package@npm:version:"
 * Returns package names with resolved versions
 */
export function parseYarnLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Map<string, string>(); // name -> version
  
  // Match package entries at the start of lines
  // Yarn v1: "package@^1.0.0":
  // Yarn v1 scoped: "@types/node@^20.0.0":
  // Yarn v1 with multiple versions: "package@^1.0.0, package@^1.1.0":
  // Yarn Berry: "package@npm:^1.0.0":
  const lines = content.split('\n');
  
  let currentPackage: string | null = null;
  
  for (const line of lines) {
    // Skip comments
    if (line.startsWith('#')) {
      continue;
    }
    
    // Check for version line (indented with "version")
    if (currentPackage && line.match(/^\s+version\s+["']?([^"'\s]+)["']?/)) {
      const versionMatch = line.match(/^\s+version\s+["']?([^"'\s]+)["']?/);
      if (versionMatch && !seen.has(currentPackage)) {
        seen.set(currentPackage, versionMatch[1]);
      }
      continue;
    }
    
    // Match package declarations (non-indented lines)
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      // Try scoped package first: "@scope/package@version"
      const scopedMatch = line.match(/^"?(@[^/]+\/[^@\s"]+)@/);
      if (scopedMatch && scopedMatch[1]) {
        currentPackage = scopedMatch[1];
        continue;
      }
      
      // Regular package: "package@version"
      const match = line.match(/^"?([^@\s"]+)@/);
      if (match && match[1]) {
        // Skip internal yarn entries
        if (!match[1].startsWith('__')) {
          currentPackage = match[1];
        }
      }
    }
  }
  
  // Convert Map to PackageDependency array
  for (const [name, version] of seen) {
    deps.push({ name, version });
  }
  
  return deps;
}

/**
 * Parse pnpm-lock.yaml
 * Format: YAML with packages/dependencies objects
 * Returns package names with versions from packages section
 */
export function parsePnpmLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  
  // Two-pass parsing: first collect from packages (with versions), then from dependencies
  const lines = content.split('\n');
  
  // Pass 1: Extract packages with versions from packages section
  let inPackages = false;
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (/^packages:\s*$/.test(trimmed)) {
      inPackages = true;
      continue;
    }
    // New top-level section ends packages
    if (!line.startsWith(' ') && /^[a-zA-Z][a-zA-Z0-9]*:\s*$/.test(trimmed)) {
      if (inPackages) break; // Done with packages section
      continue;
    }
    
    if (inPackages) {
      // Match: /package@version: or /@scope/package@version:
      const pkgMatch = trimmed.match(/^\/?(@?[^@(]+)@([^(:]+)/);
      if (pkgMatch && pkgMatch[1] && pkgMatch[2]) {
        const name = pkgMatch[1].replace(/^\//, '');
        const version = pkgMatch[2];
        if (name && !name.startsWith('/') && !seen.has(name)) {
          seen.add(name);
          deps.push({ name, version });
        }
      }
    }
  }
  
  // Pass 2: Add any packages from dependencies section that weren't in packages
  let inDependencies = false;
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (/^(dependencies|devDependencies|optionalDependencies):\s*$/.test(trimmed)) {
      inDependencies = true;
      continue;
    }
    if (/^packages:\s*$/.test(trimmed)) {
      inDependencies = false;
      continue;
    }
    if (!line.startsWith(' ') && /^[a-zA-Z][a-zA-Z0-9]*:\s*$/.test(trimmed)) {
      inDependencies = false;
      continue;
    }
    
    if (inDependencies && line.match(/^ {2}[^ ]/)) {
      const depMatch = line.match(/^ {2}['"]?(@?[a-zA-Z0-9_@/.-]+)['"]?\s*:/);
      if (depMatch && depMatch[1] && !seen.has(depMatch[1])) {
        seen.add(depMatch[1]);
        deps.push({ name: depMatch[1] });
      }
    }
  }
  
  return deps;
}
