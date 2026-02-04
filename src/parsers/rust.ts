/**
 * Rust ecosystem parsers
 * - Cargo.toml
 * - Cargo.lock
 */

import { PackageDependency } from '../types.js';

/**
 * Parse Cargo.toml with support for:
 * - [dependencies]
 * - [dev-dependencies]
 * - [build-dependencies]
 * - [workspace.dependencies]
 * - Inline tables and multi-line specifications
 */
export function parseCargoToml(content: string): string[] {
  const packages: string[] = [];
  
  // Match all dependency sections including workspace
  const depSections = [
    /\[dependencies\]([\s\S]*?)(?=\n\[|$)/g,
    /\[dev-dependencies\]([\s\S]*?)(?=\n\[|$)/g,
    /\[build-dependencies\]([\s\S]*?)(?=\n\[|$)/g,
    /\[workspace\.dependencies\]([\s\S]*?)(?=\n\[|$)/g,
  ];
  
  for (const regex of depSections) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const section = match[1];
      const lines = section.split('\n');
      
      for (const line of lines) {
        // Skip comments
        if (line.trim().startsWith('#')) continue;
        
        // Match package name (supports dotted names like foo.bar)
        // Examples:
        //   serde = "1.0"
        //   serde = { version = "1.0", features = ["derive"] }
        //   tokio.workspace = true
        const pkgMatch = line.match(/^([a-zA-Z0-9_-]+)(?:\.[a-zA-Z_]+)?\s*=/);
        if (pkgMatch) {
          packages.push(pkgMatch[1]);
        }
      }
    }
  }
  
  // Also match [dependencies.package_name] style
  const inlineDepRegex = /\[(?:dev-)?dependencies\.([a-zA-Z0-9_-]+)\]/g;
  let inlineMatch;
  while ((inlineMatch = inlineDepRegex.exec(content)) !== null) {
    packages.push(inlineMatch[1]);
  }
  
  return [...new Set(packages)]; // Deduplicate
}

/**
 * Parse Cargo.lock (TOML format)
 * Format: [[package]] sections with name = "package" and version = "..."
 * Returns package names with versions
 */
export function parseCargoLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  
  // Split into [[package]] blocks and parse each
  const lines = content.split('\n');
  let currentName: string | null = null;
  let currentVersion: string | null = null;
  
  for (const line of lines) {
    // New package block
    if (line.trim() === '[[package]]') {
      // Save previous package if exists
      if (currentName && !seen.has(currentName)) {
        seen.add(currentName);
        deps.push({ name: currentName, version: currentVersion || undefined });
      }
      currentName = null;
      currentVersion = null;
      continue;
    }
    
    // Match name = "..."
    const nameMatch = line.match(/^name\s*=\s*"([^"]+)"/);
    if (nameMatch) {
      currentName = nameMatch[1];
      continue;
    }
    
    // Match version = "..."
    const versionMatch = line.match(/^version\s*=\s*"([^"]+)"/);
    if (versionMatch) {
      currentVersion = versionMatch[1];
      continue;
    }
  }
  
  // Don't forget the last package
  if (currentName && !seen.has(currentName)) {
    deps.push({ name: currentName, version: currentVersion || undefined });
  }
  
  return deps;
}
