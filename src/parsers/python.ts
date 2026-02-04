/**
 * Python ecosystem parsers
 * - requirements.txt
 * - poetry.lock
 * - Pipfile.lock
 * - pyproject.toml
 */

import { PackageDependency } from '../types.js';

/**
 * Parse requirements.txt with support for:
 * - -r (recursive includes) - follows and parses included files
 * - -c (constraint files) - follows and parses constraint files
 * - VCS URLs (git+https://..., etc.)
 * - Comments and blank lines
 * - Editable installs (-e)
 */
export function parseRequirementsTxt(content: string, filePath?: string, visitedPaths?: Set<string>): string[] {
  const packages: string[] = [];
  const lines = content.split('\n');
  
  // Track visited files to prevent circular includes
  const visited = visitedPaths ?? new Set<string>();
  if (filePath) {
    visited.add(filePath);
  }
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    // Handle recursive includes (-r) and constraint files (-c)
    if (trimmed.startsWith('-r ') || trimmed.startsWith('-c ')) {
      const includedFile = trimmed.replace(/^-[rc]\s+/, '').trim();
      
      if (filePath && includedFile) {
        try {
          // Import fs and path synchronously for recursive parsing
          const fsModule = require('fs');
          const pathModule = require('path');
          
          // Resolve relative path based on current file's directory
          const baseDir = pathModule.dirname(filePath);
          const includedPath = pathModule.resolve(baseDir, includedFile);
          
          // Skip if already visited (prevent circular includes)
          if (!visited.has(includedPath)) {
            if (fsModule.existsSync(includedPath)) {
              const includedContent = fsModule.readFileSync(includedPath, 'utf-8');
              const includedPackages = parseRequirementsTxt(includedContent, includedPath, visited);
              packages.push(...includedPackages);
            }
          }
        } catch {
          // Silently skip if file cannot be read
        }
      }
      continue;
    }
    
    // Handle editable installs: -e git+https://...#egg=package_name
    if (trimmed.startsWith('-e ')) {
      const eggMatch = trimmed.match(/#egg=([a-zA-Z0-9_-]+)/);
      if (eggMatch) {
        packages.push(eggMatch[1]);
      }
      continue;
    }
    
    // Skip other pip options (-i, --index-url, etc.)
    if (trimmed.startsWith('-') || trimmed.startsWith('--')) {
      continue;
    }
    
    // Handle VCS URLs: git+https://github.com/user/repo.git@tag#egg=package_name
    if (trimmed.match(/^(git|hg|svn|bzr)\+/)) {
      const eggMatch = trimmed.match(/#egg=([a-zA-Z0-9_-]+)/);
      if (eggMatch) {
        packages.push(eggMatch[1]);
      }
      continue;
    }
    
    // Standard package specification: package==1.0.0, package>=1.0, package[extra]>=1.0
    const match = trimmed.match(/^([a-zA-Z0-9][a-zA-Z0-9._-]*)(?:\[.*?\])?/);
    if (match) {
      packages.push(match[1]);
    }
  }
  
  return [...new Set(packages)]; // Deduplicate
}

/**
 * Parse poetry.lock (TOML format)
 * Format: [[package]] sections with name = "package" and version = "..."
 * Returns package names with versions
 */
export function parsePoetryLock(content: string): PackageDependency[] {
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

/**
 * Parse Pipfile.lock (JSON format)
 * Format: {"default": {...}, "develop": {...}}
 * Returns package names with versions
 */
export function parsePipfileLock(content: string): PackageDependency[] {
  const lock = JSON.parse(content) as {
    default?: Record<string, { version?: string }>;
    develop?: Record<string, { version?: string }>;
  };
  
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  
  // Process both default and develop dependencies
  for (const section of [lock.default, lock.develop]) {
    if (!section) continue;
    for (const [name, info] of Object.entries(section)) {
      if (seen.has(name)) continue;
      seen.add(name);
      // Pipfile.lock stores version as "==1.0.0", strip the prefix
      const version = info?.version?.replace(/^==/, '');
      deps.push({ name, version });
    }
  }
  
  return deps;
}

/**
 * Parse pyproject.toml with support for:
 * - PEP 621: project.dependencies array
 * - PEP 621: project.optional-dependencies.*
 * - Poetry: tool.poetry.dependencies
 * - Poetry: tool.poetry.dev-dependencies
 * - Poetry: tool.poetry.group.*.dependencies
 */
export function parsePyprojectToml(content: string): string[] {
  const packages: string[] = [];
  
  // Helper to extract package name from PEP 508 requirement string
  // Examples: "requests>=2.28.0", "flask[async]>=2.0", "django~=4.0"
  const extractPkgName = (req: string): string | null => {
    const match = req.match(/^([a-zA-Z0-9][a-zA-Z0-9._-]*)(?:\[.*?\])?/);
    return match ? match[1] : null;
  };
  
  // ========== PEP 621 format ==========
  // [project]
  // dependencies = ["requests>=2.28.0", "flask[async]>=2.0"]
  
  // Match project.dependencies array (multi-line)
  // Use \n\s*\] to match closing bracket on its own line (avoids matching [extras] in deps)
  const projectDepsRegex = /\[project\][\s\S]*?dependencies\s*=\s*\[([\s\S]*?)\n\s*\]/;
  const projectDepsMatch = content.match(projectDepsRegex);
  if (projectDepsMatch) {
    const depsArray = projectDepsMatch[1];
    // Extract quoted strings from array
    const depStrings = depsArray.match(/"([^"]+)"/g) || [];
    for (const quoted of depStrings) {
      const dep = quoted.replace(/"/g, '');
      const pkgName = extractPkgName(dep);
      if (pkgName) packages.push(pkgName);
    }
  }
  
  // Match project.optional-dependencies.* arrays
  const optionalDepsRegex = /\[project\.optional-dependencies\]([\s\S]*?)(?=\n\[|$)/;
  const optionalMatch = content.match(optionalDepsRegex);
  if (optionalMatch) {
    const section = optionalMatch[1];
    // Find all arrays in this section
    const arrayRegex = /\w+\s*=\s*\[([\s\S]*?)\]/g;
    let arrayMatch;
    while ((arrayMatch = arrayRegex.exec(section)) !== null) {
      const depStrings = arrayMatch[1].match(/"([^"]+)"/g) || [];
      for (const quoted of depStrings) {
        const dep = quoted.replace(/"/g, '');
        const pkgName = extractPkgName(dep);
        if (pkgName) packages.push(pkgName);
      }
    }
  }
  
  // ========== Poetry format ==========
  // [tool.poetry.dependencies]
  // requests = "^2.28.0"
  // flask = {version = "^2.0", extras = ["async"]}
  
  const poetrySections = [
    /\[tool\.poetry\.dependencies\]([\s\S]*?)(?=\n\[|$)/,
    /\[tool\.poetry\.dev-dependencies\]([\s\S]*?)(?=\n\[|$)/,
  ];
  
  for (const regex of poetrySections) {
    const match = content.match(regex);
    if (match) {
      const section = match[1];
      const lines = section.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip comments
        if (trimmed.startsWith('#')) continue;
        // Match: package = "version" or package = { ... }
        const pkgMatch = trimmed.match(/^([a-zA-Z0-9][a-zA-Z0-9._-]*)\s*=/);
        if (pkgMatch && pkgMatch[1] !== 'python') {
          packages.push(pkgMatch[1]);
        }
      }
    }
  }
  
  // Poetry group dependencies: [tool.poetry.group.dev.dependencies]
  const groupRegex = /\[tool\.poetry\.group\.\w+\.dependencies\]([\s\S]*?)(?=\n\[|$)/g;
  let groupMatch;
  while ((groupMatch = groupRegex.exec(content)) !== null) {
    const section = groupMatch[1];
    const lines = section.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) continue;
      const pkgMatch = trimmed.match(/^([a-zA-Z0-9][a-zA-Z0-9._-]*)\s*=/);
      if (pkgMatch && pkgMatch[1] !== 'python') {
        packages.push(pkgMatch[1]);
      }
    }
  }
  
  return [...new Set(packages)];
}
