/**
 * Lock file parsing tests
 */

import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, '../fixtures/lockfiles');

// Import parsing functions (duplicated from cli.ts since they're not exported)

function parsePackageLock(content: string): string[] {
  const lock = JSON.parse(content) as {
    packages?: Record<string, unknown>;
    dependencies?: Record<string, unknown>;
  };
  
  const packagesObj = lock.packages || lock.dependencies || {};
  
  const packages = Object.keys(packagesObj)
    .filter(p => {
      if (!p) return false;
      if (p.startsWith('node_modules/') && p.includes('node_modules/node_modules/')) return false;
      return true;
    })
    .map(p => p.replace(/^node_modules\//, ''))
    .filter(p => p.length > 0);
  
  return [...new Set(packages)];
}

function parseYarnLock(content: string): string[] {
  const packages: string[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith(' ') || line.startsWith('\t')) {
      continue;
    }
    
    // Try scoped package first: "@scope/package@version"
    const scopedMatch = line.match(/^"?(@[^/]+\/[^@\s"]+)@/);
    if (scopedMatch && scopedMatch[1]) {
      packages.push(scopedMatch[1]);
      continue;
    }
    
    // Regular package: "package@version"
    const match = line.match(/^"?([^@\s"]+)@/);
    if (match && match[1]) {
      if (!match[1].startsWith('__')) {
        packages.push(match[1]);
      }
    }
  }
  
  return [...new Set(packages)];
}

function parsePnpmLock(content: string): string[] {
  const packages: string[] = [];
  const lines = content.split('\n');
  let inPackages = false;
  let inDependencies = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (/^packages:\s*$/.test(trimmed)) {
      inPackages = true;
      inDependencies = false;
      continue;
    }
    if (/^(dependencies|devDependencies|optionalDependencies):\s*$/.test(trimmed)) {
      inDependencies = true;
      inPackages = false;
      continue;
    }
    // New top-level section (NOT indented - starts at column 0)
    if (!line.startsWith(' ') && /^[a-zA-Z][a-zA-Z0-9]*:\s*$/.test(trimmed)) {
      inPackages = false;
      inDependencies = false;
      continue;
    }
    
    if (inPackages) {
      const pkgMatch = trimmed.match(/^\/?(@?[^@(]+)[@(]/);
      if (pkgMatch && pkgMatch[1]) {
        const pkg = pkgMatch[1].replace(/^\//, '');
        if (pkg && !pkg.startsWith('/')) {
          packages.push(pkg);
        }
      }
    }
    
    if (inDependencies) {
      // Package names are indented with exactly 2 spaces
      if (line.match(/^  [^ ]/)) {
        const depMatch = line.match(/^  ['"]?(@?[a-zA-Z0-9_@/.-]+)['"]?\s*:/);
        if (depMatch && depMatch[1]) {
          packages.push(depMatch[1]);
        }
      }
    }
  }
  
  return [...new Set(packages)];
}

function parsePoetryLock(content: string): string[] {
  const packages: string[] = [];
  const namePattern = /^name\s*=\s*"([^"]+)"/gm;
  let match;
  
  while ((match = namePattern.exec(content)) !== null) {
    if (match[1]) {
      packages.push(match[1]);
    }
  }
  
  return [...new Set(packages)];
}

function parsePipfileLock(content: string): string[] {
  const lock = JSON.parse(content) as {
    default?: Record<string, unknown>;
    develop?: Record<string, unknown>;
  };
  
  const defaultPkgs = Object.keys(lock.default || {});
  const devPkgs = Object.keys(lock.develop || {});
  
  return [...new Set([...defaultPkgs, ...devPkgs])];
}

function parseCargoLock(content: string): string[] {
  const packages: string[] = [];
  const namePattern = /^name\s*=\s*"([^"]+)"/gm;
  let match;
  
  while ((match = namePattern.exec(content)) !== null) {
    if (match[1]) {
      packages.push(match[1]);
    }
  }
  
  return [...new Set(packages)];
}

function parseGemfileLock(content: string): string[] {
  const packages: string[] = [];
  const lines = content.split('\n');
  let inSpecs = false;
  
  for (const line of lines) {
    if (line === '  specs:') {
      inSpecs = true;
      continue;
    }
    
    if (inSpecs && line.match(/^[A-Z]/)) {
      inSpecs = false;
      continue;
    }
    
    if (inSpecs) {
      const gemMatch = line.match(/^    ([a-zA-Z0-9_-]+)\s+\(/);
      if (gemMatch && gemMatch[1]) {
        packages.push(gemMatch[1]);
      }
    }
  }
  
  return [...new Set(packages)];
}

describe('Lock File Parsing', () => {

  describe('package-lock.json parsing', () => {
    it('should parse lockfileVersion 3 format', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'package-lock.json'), 'utf-8');
      const packages = parsePackageLock(content);
      
      expect(packages).toContain('chalk');
      expect(packages).toContain('commander');
      expect(packages).toContain('@types/node');
    });

    it('should skip root package entry', () => {
      const content = JSON.stringify({
        name: 'test',
        lockfileVersion: 3,
        packages: {
          '': { name: 'test' },
          'node_modules/lodash': { version: '4.17.21' }
        }
      });
      const packages = parsePackageLock(content);
      expect(packages).toEqual(['lodash']);
    });

    it('should handle lockfileVersion 1 format', () => {
      const content = JSON.stringify({
        name: 'test',
        lockfileVersion: 1,
        dependencies: {
          'lodash': { version: '4.17.21' },
          'chalk': { version: '5.0.0' }
        }
      });
      const packages = parsePackageLock(content);
      expect(packages).toContain('lodash');
      expect(packages).toContain('chalk');
    });
  });

  describe('yarn.lock parsing', () => {
    it('should parse yarn v1 format', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'yarn.lock'), 'utf-8');
      const packages = parseYarnLock(content);
      
      expect(packages).toContain('chalk');
      expect(packages).toContain('commander');
      expect(packages).toContain('@types/node');
      expect(packages).toContain('lodash');
    });

    it('should skip comments', () => {
      const content = `# yarn lockfile v1

chalk@^5.0.0:
  version "5.3.0"
`;
      const packages = parseYarnLock(content);
      expect(packages).toEqual(['chalk']);
    });

    it('should handle multiple version ranges for same package', () => {
      const content = `
lodash@^4.0.0, lodash@^4.17.0:
  version "4.17.21"

lodash@^3.0.0:
  version "3.10.1"
`;
      const packages = parseYarnLock(content);
      expect(packages).toEqual(['lodash']);
    });
  });

  describe('pnpm-lock.yaml parsing', () => {
    it('should parse pnpm lockfile format', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'pnpm-lock.yaml'), 'utf-8');
      const packages = parsePnpmLock(content);
      
      expect(packages).toContain('chalk');
      expect(packages).toContain('commander');
      expect(packages).toContain('@types/node');
      expect(packages).toContain('typescript');
    });

    it('should handle dependencies section', () => {
      const content = `
lockfileVersion: '6.0'

dependencies:
  express:
    specifier: ^4.18.0
    version: 4.18.2
`;
      const packages = parsePnpmLock(content);
      expect(packages).toContain('express');
    });
  });

  describe('poetry.lock parsing', () => {
    it('should parse poetry lockfile', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'poetry.lock'), 'utf-8');
      const packages = parsePoetryLock(content);
      
      expect(packages).toContain('requests');
      expect(packages).toContain('urllib3');
      expect(packages).toContain('certifi');
    });

    it('should handle TOML format', () => {
      const content = `
[[package]]
name = "django"
version = "4.2.0"

[[package]]
name = "gunicorn"
version = "21.0.0"
`;
      const packages = parsePoetryLock(content);
      expect(packages).toContain('django');
      expect(packages).toContain('gunicorn');
    });
  });

  describe('Pipfile.lock parsing', () => {
    it('should parse Pipfile.lock', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'Pipfile.lock'), 'utf-8');
      const packages = parsePipfileLock(content);
      
      expect(packages).toContain('requests');
      expect(packages).toContain('urllib3');
      expect(packages).toContain('pytest');
      expect(packages).toContain('black');
    });

    it('should handle default and develop sections', () => {
      const content = JSON.stringify({
        default: { 'flask': {} },
        develop: { 'pytest': {} }
      });
      const packages = parsePipfileLock(content);
      expect(packages).toContain('flask');
      expect(packages).toContain('pytest');
    });
  });

  describe('Cargo.lock parsing', () => {
    it('should parse Cargo.lock', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'Cargo.lock'), 'utf-8');
      const packages = parseCargoLock(content);
      
      expect(packages).toContain('serde');
      expect(packages).toContain('serde_derive');
      expect(packages).toContain('tokio');
    });

    it('should handle TOML package sections', () => {
      const content = `
[[package]]
name = "rand"
version = "0.8.5"

[[package]]
name = "rand_core"
version = "0.6.4"
`;
      const packages = parseCargoLock(content);
      expect(packages).toContain('rand');
      expect(packages).toContain('rand_core');
    });
  });

  describe('Gemfile.lock parsing', () => {
    it('should parse Gemfile.lock', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'Gemfile.lock'), 'utf-8');
      const packages = parseGemfileLock(content);
      
      expect(packages).toContain('rails');
      expect(packages).toContain('actioncable');
      expect(packages).toContain('actionpack');
      expect(packages).toContain('rack');
      expect(packages).toContain('puma');
      expect(packages).toContain('nio4r');
    });

    it('should only parse top-level gems (4 spaces indent)', () => {
      const content = `
GEM
  remote: https://rubygems.org/
  specs:
    main-gem (1.0.0)
      dependency-gem (~> 2.0)
    other-gem (2.0.0)

PLATFORMS
  ruby
`;
      const packages = parseGemfileLock(content);
      expect(packages).toContain('main-gem');
      expect(packages).toContain('other-gem');
      expect(packages).not.toContain('dependency-gem');
    });
  });

  describe('mix.lock parsing', () => {
    function parseMixLock(content: string): string[] {
      const deps: string[] = [];
      const seen = new Set<string>();
      const hexPattern = /"([^"]+)":\s*\{:hex,\s*:[\w]+,\s*"([^"]+)"/g;
      let match: RegExpExecArray | null;
      while ((match = hexPattern.exec(content)) !== null) {
        const name = match[1];
        if (name && !seen.has(name)) {
          seen.add(name);
          deps.push(name);
        }
      }
      return deps;
    }

    it('should parse mix.lock from fixture', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'mix.lock'), 'utf-8');
      const packages = parseMixLock(content);
      expect(packages.length).toBeGreaterThanOrEqual(10);
      expect(packages).toContain('phoenix');
      expect(packages).toContain('ecto');
      expect(packages).toContain('jason');
      expect(packages).toContain('postgrex');
    });

    it('should only include hex packages, not git or path deps', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'mix.lock'), 'utf-8');
      const packages = parseMixLock(content);
      expect(packages).not.toContain('my_git_dep');
      expect(packages).not.toContain('local_dep');
    });

    it('should handle inline format', () => {
      const content = `%{"plug": {:hex, :plug, "1.15.3", "hash", [:mix], [], "hexpm", "sha"}, "cowboy": {:hex, :cowboy, "2.12.0", "hash", [:rebar3], [], "hexpm", "sha"}}`;
      const packages = parseMixLock(content);
      expect(packages).toContain('plug');
      expect(packages).toContain('cowboy');
      expect(packages).toHaveLength(2);
    });

    it('should skip git dependencies', () => {
      const content = `%{
  "hex_pkg": {:hex, :hex_pkg, "1.0.0", "hash", [:mix], [], "hexpm", "sha"},
  "git_dep": {:git, "https://github.com/user/repo.git", "abc123", [branch: "main"]},
}`;
      const packages = parseMixLock(content);
      expect(packages).toContain('hex_pkg');
      expect(packages).not.toContain('git_dep');
    });

    it('should skip path dependencies', () => {
      const content = `%{
  "hex_pkg": {:hex, :hex_pkg, "2.0.0", "hash", [:mix], [], "hexpm", "sha"},
  "path_dep": {:path, "../local"},
}`;
      const packages = parseMixLock(content);
      expect(packages).toContain('hex_pkg');
      expect(packages).not.toContain('path_dep');
    });
  });

  describe('pubspec.lock parsing', () => {
    function parsePubspecLock(content: string): string[] {
      const deps: string[] = [];
      const seen = new Set<string>();
      const lines = content.split('\n');

      let inPackages = false;
      let currentPackage: string | null = null;
      let currentSource: string | null = null;

      for (const line of lines) {
        if (/^packages:\s*$/.test(line)) {
          inPackages = true;
          continue;
        }
        if (inPackages && /^[a-z]/.test(line) && !line.startsWith(' ')) {
          if (currentPackage && currentSource === 'hosted' && !seen.has(currentPackage)) {
            seen.add(currentPackage);
            deps.push(currentPackage);
          }
          inPackages = false;
          currentPackage = null;
          currentSource = null;
          continue;
        }
        if (!inPackages) continue;

        const pkgMatch = line.match(/^  ([a-zA-Z0-9_]+):\s*$/);
        if (pkgMatch) {
          if (currentPackage && currentSource === 'hosted' && !seen.has(currentPackage)) {
            seen.add(currentPackage);
            deps.push(currentPackage);
          }
          currentPackage = pkgMatch[1];
          currentSource = null;
          continue;
        }

        const sourceMatch = line.match(/^\s+source:\s*(\S+)/);
        if (sourceMatch) {
          currentSource = sourceMatch[1];
          continue;
        }
      }

      // Flush last package
      if (currentPackage && currentSource === 'hosted' && !seen.has(currentPackage)) {
        seen.add(currentPackage);
        deps.push(currentPackage);
      }

      return deps;
    }

    it('should parse pubspec.lock from fixture', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'pubspec.lock'), 'utf-8');
      const packages = parsePubspecLock(content);
      expect(packages).toContain('http');
      expect(packages).toContain('provider');
      expect(packages).toContain('json_annotation');
      expect(packages).toContain('async');
      expect(packages).toContain('collection');
      expect(packages).toContain('meta');
      expect(packages).toContain('path');
    });

    it('should only include hosted packages (not sdk, path, git)', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'pubspec.lock'), 'utf-8');
      const packages = parsePubspecLock(content);
      // SDK packages
      expect(packages).not.toContain('flutter');
      expect(packages).not.toContain('flutter_test');
      // Path packages
      expect(packages).not.toContain('my_local_pkg');
      // Git packages
      expect(packages).not.toContain('my_git_dep');
    });

    it('should extract correct count of hosted packages', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'pubspec.lock'), 'utf-8');
      const packages = parsePubspecLock(content);
      // 10 hosted packages in fixture (async, collection, cupertino_icons, http, http_parser, json_annotation, matcher, meta, path, provider)
      expect(packages).toHaveLength(10);
    });

    it('should handle minimal pubspec.lock', () => {
      const content = `packages:
  http:
    dependency: "direct main"
    description:
      name: http
      url: "https://pub.dev"
    source: hosted
    version: "1.2.0"
sdks:
  dart: ">=3.0.0 <4.0.0"
`;
      const packages = parsePubspecLock(content);
      expect(packages).toContain('http');
      expect(packages).toHaveLength(1);
    });

    it('should handle empty packages section', () => {
      const content = `packages:
sdks:
  dart: ">=3.0.0 <4.0.0"
`;
      const packages = parsePubspecLock(content);
      expect(packages).toHaveLength(0);
    });

    it('should skip sdk dependencies', () => {
      const content = `packages:
  flutter:
    dependency: "direct main"
    description: flutter
    source: sdk
    version: "0.0.0"
  http:
    dependency: "direct main"
    description:
      name: http
      url: "https://pub.dev"
    source: hosted
    version: "1.2.0"
sdks:
  dart: ">=3.0.0"
`;
      const packages = parsePubspecLock(content);
      expect(packages).toContain('http');
      expect(packages).not.toContain('flutter');
    });
  });

  describe('Podfile.lock parsing', () => {
    function parsePodfileLock(content: string): string[] {
      const deps: string[] = [];
      const seen = new Set<string>();
      const lines = content.split('\n');

      let inPods = false;

      for (const line of lines) {
        if (line === 'PODS:') {
          inPods = true;
          continue;
        }

        if (inPods && /^[A-Z]/.test(line)) {
          break;
        }

        if (!inPods) continue;

        const podMatch = line.match(/^ {2}- ([^\s(]+)\s+\(([^)]+)\)/);
        if (!podMatch || !podMatch[1]) continue;

        const fullName = podMatch[1];
        const rootName = fullName.includes('/') ? fullName.split('/')[0] : fullName;

        if (!rootName || seen.has(rootName)) continue;
        seen.add(rootName);

        deps.push(rootName);
      }

      return deps;
    }

    it('should parse Podfile.lock from fixture', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'Podfile.lock'), 'utf-8');
      const packages = parsePodfileLock(content);
      expect(packages).toContain('Alamofire');
      expect(packages).toContain('Firebase');
      expect(packages).toContain('Kingfisher');
      expect(packages).toContain('Moya');
      expect(packages).toContain('SDWebImage');
      expect(packages).toContain('SnapKit');
      expect(packages).toContain('SwiftyJSON');
    });

    it('should deduplicate subspecs', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'Podfile.lock'), 'utf-8');
      const packages = parsePodfileLock(content);
      // Firebase and Firebase/Core should be deduplicated to Firebase
      expect(packages.filter(p => p === 'Firebase')).toHaveLength(1);
      // GoogleUtilities has many subspecs — one entry
      expect(packages.filter(p => p === 'GoogleUtilities')).toHaveLength(1);
    });

    it('should extract correct root pod count', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'Podfile.lock'), 'utf-8');
      const packages = parsePodfileLock(content);
      expect(packages).toHaveLength(11);
    });

    it('should handle empty PODS section', () => {
      const content = `PODS:

DEPENDENCIES:

COCOAPODS: 1.15.2
`;
      const packages = parsePodfileLock(content);
      expect(packages).toHaveLength(0);
    });

    it('should parse simple Podfile.lock', () => {
      const content = `PODS:
  - AFNetworking (4.0.1)
  - MBProgressHUD (1.2.0)

DEPENDENCIES:
  - AFNetworking (~> 4.0)
  - MBProgressHUD (~> 1.2)

COCOAPODS: 1.15.2
`;
      const packages = parsePodfileLock(content);
      expect(packages).toHaveLength(2);
      expect(packages).toContain('AFNetworking');
      expect(packages).toContain('MBProgressHUD');
    });
  });

});
