/**
 * uv ecosystem parser
 * - uv.lock (Astral's Python package manager)
 *
 * Format: Human-readable TOML with [[package]] sections
 *
 * version = 1
 * requires-python = ">=3.12"
 *
 * [[package]]
 * name = "requests"
 * version = "2.32.4"
 * source = { registry = "https://pypi.org/simple" }
 * dependencies = [
 *   { name = "certifi" },
 *   { name = "charset-normalizer" },
 * ]
 *
 * [[package]]
 * name = "my-project"
 * version = "0.1.0"
 * source = { virtual = "." }
 *
 * We skip packages with source = { virtual = "." } or { editable = "." }
 * as these are local project references, not registry packages.
 */

import { PackageDependency } from '../types.js';

/**
 * Parse uv.lock (Python/uv)
 *
 * Extracts package names and versions from [[package]] blocks.
 * Skips local/virtual/editable packages (the project itself).
 */
export function parseUvLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();

  // Split content into [[package]] blocks
  // Each block starts with [[package]] and ends at the next [[package]] or end of file
  const blocks = content.split(/^\[\[package\]\]\s*$/m);

  for (const block of blocks) {
    // First block is the preamble (version, requires-python, etc.) - skip it
    // Empty blocks - skip
    if (!block.trim()) continue;

    // Extract name
    const nameMatch = block.match(/^name\s*=\s*"([^"]+)"/m);
    if (!nameMatch) continue;

    const name = nameMatch[1];

    // Skip local/virtual/editable packages (the project itself)
    if (/^source\s*=\s*\{[^}]*(?:virtual|editable|path)\s*=/m.test(block)) {
      continue;
    }

    // Extract version (optional - some entries may not have it)
    const versionMatch = block.match(/^version\s*=\s*"([^"]+)"/m);
    const version = versionMatch ? versionMatch[1] : undefined;

    if (!seen.has(name)) {
      seen.add(name);
      deps.push({ name, version });
    }
  }

  return deps;
}
