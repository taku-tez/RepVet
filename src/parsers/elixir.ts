/**
 * Elixir ecosystem parser
 * - mix.lock
 */

import { PackageDependency } from '../types.js';

/**
 * Parse mix.lock (Elixir/Hex)
 *
 * Format: Elixir map literal
 * %{
 *   "package_name": {:hex, :package_name, "version", "hash", [:mix], [...deps...], "hexpm", "sha256"},
 *   "git_dep": {:git, "url", "ref", [opts]},
 *   "path_dep": {:path, "../local"},
 * }
 *
 * We only extract :hex packages (from hex.pm registry).
 * Git and path dependencies are skipped since they don't have registry metadata.
 */
export function parseMixLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();

  // Match hex package entries:
  //   "package_name": {:hex, :package_name, "version", ...
  // The key is the dependency name as a string, version is the third element.
  const hexPattern = /"([^"]+)":\s*\{:hex,\s*:[\w]+,\s*"([^"]+)"/g;

  let match: RegExpExecArray | null;
  while ((match = hexPattern.exec(content)) !== null) {
    const name = match[1];
    const version = match[2];
    if (name && !seen.has(name)) {
      seen.add(name);
      deps.push({ name, version });
    }
  }

  return deps;
}
