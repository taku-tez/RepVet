/**
 * Bun lockfile parser
 * - bun.lock (text-based JSONC format, default since Bun v1.2)
 *
 * bun.lock uses JSONC (JSON with trailing commas).
 * The "packages" section maps package names to arrays:
 *   "name": ["name@version", "registry", {dependencies}, "integrity"]
 * Nested sub-dependencies use path notation: "parent/child"
 */

import { PackageDependency } from '../types.js';

/**
 * Strip trailing commas from JSONC to make it valid JSON.
 * Handles commas before } and ] while respecting strings.
 */
function stripTrailingCommas(text: string): string {
  let result = '';
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      result += ch;
      escape = false;
      continue;
    }

    if (ch === '\\' && inString) {
      result += ch;
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString) {
      result += ch;
      continue;
    }

    // Check for trailing comma: comma followed by whitespace then } or ]
    if (ch === ',') {
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      if (j < text.length && (text[j] === '}' || text[j] === ']')) {
        // Skip the trailing comma
        continue;
      }
    }

    result += ch;
  }

  return result;
}

/**
 * Parse bun.lock (text-based JSONC lockfile)
 * Returns npm packages with resolved versions.
 */
export function parseBunLock(content: string): PackageDependency[] {
  const cleanJson = stripTrailingCommas(content);
  const lock = JSON.parse(cleanJson) as {
    lockfileVersion?: number;
    packages?: Record<string, unknown[]>;
  };

  if (!lock.packages) {
    return [];
  }

  const deps: PackageDependency[] = [];
  const seen = new Set<string>();

  for (const [key, value] of Object.entries(lock.packages)) {
    if (!Array.isArray(value) || value.length === 0) continue;

    const resolved = value[0] as string;
    if (!resolved || typeof resolved !== 'string') continue;

    // resolved is "name@version" or "@scope/name@version"
    // Find the last @ to split name and version
    const lastAt = resolved.lastIndexOf('@');
    if (lastAt <= 0) continue; // No version or only @scope prefix

    const name = resolved.substring(0, lastAt);
    const version = resolved.substring(lastAt + 1);

    if (!name || seen.has(name)) continue;

    // Skip sub-dependency path entries (e.g. "send/ms") if the base package
    // is already added - they represent version overrides for nested deps
    // Use the actual package name from resolved, not the key
    seen.add(name);

    deps.push({ name, version });
  }

  return deps;
}
