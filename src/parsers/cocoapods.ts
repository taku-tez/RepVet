/**
 * CocoaPods ecosystem parser
 * - Podfile.lock
 */

import { PackageDependency } from '../types.js';

/**
 * Parse Podfile.lock
 *
 * Format:
 *   PODS:
 *     - Alamofire (5.6.2)
 *     - Firebase (10.0.0):
 *       - Firebase/Core (= 10.0.0)
 *     - SDWebImage/Core (5.15.0)
 *
 *   DEPENDENCIES:
 *     ...
 *
 * Top-level entries in PODS have 2-space indent + "- ".
 * Subspecs (e.g., "Firebase/Core") are resolved to their root pod name ("Firebase").
 * Returns deduplicated package names with versions.
 */
export function parsePodfileLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  const lines = content.split('\n');

  let inPods = false;

  for (const line of lines) {
    // Detect PODS section
    if (line === 'PODS:') {
      inPods = true;
      continue;
    }

    // End of PODS section: next top-level section or empty line followed by section
    if (inPods && /^[A-Z]/.test(line)) {
      break;
    }

    if (!inPods) continue;

    // Match top-level pod entries: "  - PodName (version)" or "  - PodName (version):"
    // Top-level entries have exactly 2-space indent
    const podMatch = line.match(/^ {2}- ([^\s(]+)\s+\(([^)]+)\)/);
    if (!podMatch || !podMatch[1]) continue;

    // Resolve subspecs: "Firebase/Core" → "Firebase"
    const fullName = podMatch[1];
    const rootName = fullName.includes('/') ? fullName.split('/')[0] : fullName;
    const version = podMatch[2];

    if (!rootName || seen.has(rootName)) continue;
    seen.add(rootName);

    deps.push({ name: rootName, version });
  }

  return deps;
}
