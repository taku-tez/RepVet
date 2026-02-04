/**
 * Ruby ecosystem parser
 * - Gemfile.lock
 */

import { PackageDependency } from '../types.js';

/**
 * Parse Gemfile.lock
 * Format: GEM section with specs, each gem indented with name (version)
 * Returns package names with versions
 */
export function parseGemfileLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  const lines = content.split('\n');
  
  let inSpecs = false;
  
  for (const line of lines) {
    // Detect specs section (indented under GEM remote)
    if (line === '  specs:') {
      inSpecs = true;
      continue;
    }
    
    // End of specs section (new top-level section)
    if (inSpecs && line.match(/^[A-Z]/)) {
      inSpecs = false;
      continue;
    }
    
    if (inSpecs) {
      // Match gem entries: "    gem_name (version)"
      // Top-level gems have 4 spaces, dependencies have 6+
      const gemMatch = line.match(/^ {4}([a-zA-Z0-9_-]+)\s+\(([^)]+)\)/);
      if (gemMatch && gemMatch[1] && !seen.has(gemMatch[1])) {
        seen.add(gemMatch[1]);
        deps.push({ name: gemMatch[1], version: gemMatch[2] });
      }
    }
  }
  
  return deps;
}
