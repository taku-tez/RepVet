/**
 * Lock file parsing tests - with version extraction
 * Tests that lock parsers correctly extract both name and version
 */

import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, '../fixtures/lockfiles');

interface PackageDependency {
  name: string;
  version?: string;
}

// Copy of parsing functions from cli.ts with version extraction

function parsePackageLock(content: string): PackageDependency[] {
  const lock = JSON.parse(content) as {
    packages?: Record<string, { version?: string }>;
    dependencies?: Record<string, { version?: string }>;
  };
  
  const packagesObj = lock.packages || lock.dependencies || {};
  
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  
  for (const [key, value] of Object.entries(packagesObj)) {
    if (!key) continue;
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

function parseYarnLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Map<string, string>();
  
  const lines = content.split('\n');
  let currentPackage: string | null = null;
  
  for (const line of lines) {
    if (line.startsWith('#')) continue;
    
    if (currentPackage && line.match(/^\s+version\s+["']?([^"'\s]+)["']?/)) {
      const versionMatch = line.match(/^\s+version\s+["']?([^"'\s]+)["']?/);
      if (versionMatch && !seen.has(currentPackage)) {
        seen.set(currentPackage, versionMatch[1]);
      }
      continue;
    }
    
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      const scopedMatch = line.match(/^"?(@[^/]+\/[^@\s"]+)@/);
      if (scopedMatch && scopedMatch[1]) {
        currentPackage = scopedMatch[1];
        continue;
      }
      
      const match = line.match(/^"?([^@\s"]+)@/);
      if (match && match[1] && !match[1].startsWith('__')) {
        currentPackage = match[1];
      }
    }
  }
  
  for (const [name, version] of seen) {
    deps.push({ name, version });
  }
  
  return deps;
}

function parsePnpmLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  
  const lines = content.split('\n');
  
  // Pass 1: Extract packages with versions from packages section
  let inPackages = false;
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (/^packages:\s*$/.test(trimmed)) {
      inPackages = true;
      continue;
    }
    if (!line.startsWith(' ') && /^[a-zA-Z][a-zA-Z0-9]*:\s*$/.test(trimmed)) {
      if (inPackages) break;
      continue;
    }
    
    if (inPackages) {
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
    
    if (inDependencies && line.match(/^  [^ ]/)) {
      const depMatch = line.match(/^  ['"]?(@?[a-zA-Z0-9_@/.-]+)['"]?\s*:/);
      if (depMatch && depMatch[1] && !seen.has(depMatch[1])) {
        seen.add(depMatch[1]);
        deps.push({ name: depMatch[1] });
      }
    }
  }
  
  return deps;
}

function parsePoetryLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  
  const lines = content.split('\n');
  let currentName: string | null = null;
  let currentVersion: string | null = null;
  
  for (const line of lines) {
    if (line.trim() === '[[package]]') {
      if (currentName && !seen.has(currentName)) {
        seen.add(currentName);
        deps.push({ name: currentName, version: currentVersion || undefined });
      }
      currentName = null;
      currentVersion = null;
      continue;
    }
    
    const nameMatch = line.match(/^name\s*=\s*"([^"]+)"/);
    if (nameMatch) {
      currentName = nameMatch[1];
      continue;
    }
    
    const versionMatch = line.match(/^version\s*=\s*"([^"]+)"/);
    if (versionMatch) {
      currentVersion = versionMatch[1];
      continue;
    }
  }
  
  if (currentName && !seen.has(currentName)) {
    deps.push({ name: currentName, version: currentVersion || undefined });
  }
  
  return deps;
}

function parsePipfileLock(content: string): PackageDependency[] {
  const lock = JSON.parse(content) as {
    default?: Record<string, { version?: string }>;
    develop?: Record<string, { version?: string }>;
  };
  
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  
  for (const section of [lock.default, lock.develop]) {
    if (!section) continue;
    for (const [name, info] of Object.entries(section)) {
      if (seen.has(name)) continue;
      seen.add(name);
      const version = info?.version?.replace(/^==/, '');
      deps.push({ name, version });
    }
  }
  
  return deps;
}

function parseCargoLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  
  const lines = content.split('\n');
  let currentName: string | null = null;
  let currentVersion: string | null = null;
  
  for (const line of lines) {
    if (line.trim() === '[[package]]') {
      if (currentName && !seen.has(currentName)) {
        seen.add(currentName);
        deps.push({ name: currentName, version: currentVersion || undefined });
      }
      currentName = null;
      currentVersion = null;
      continue;
    }
    
    const nameMatch = line.match(/^name\s*=\s*"([^"]+)"/);
    if (nameMatch) {
      currentName = nameMatch[1];
      continue;
    }
    
    const versionMatch = line.match(/^version\s*=\s*"([^"]+)"/);
    if (versionMatch) {
      currentVersion = versionMatch[1];
      continue;
    }
  }
  
  if (currentName && !seen.has(currentName)) {
    deps.push({ name: currentName, version: currentVersion || undefined });
  }
  
  return deps;
}

function parseGemfileLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
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
      const gemMatch = line.match(/^    ([a-zA-Z0-9_-]+)\s+\(([^)]+)\)/);
      if (gemMatch && gemMatch[1] && !seen.has(gemMatch[1])) {
        seen.add(gemMatch[1]);
        deps.push({ name: gemMatch[1], version: gemMatch[2] });
      }
    }
  }
  
  return deps;
}

describe('Lock File Parsing with Version Extraction', () => {

  describe('package-lock.json version extraction', () => {
    it('should extract versions from lockfileVersion 3 format', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'package-lock.json'), 'utf-8');
      const packages = parsePackageLock(content);
      
      const chalk = packages.find(p => p.name === 'chalk');
      expect(chalk).toBeDefined();
      expect(chalk?.version).toBe('5.3.0');
      
      const commander = packages.find(p => p.name === 'commander');
      expect(commander?.version).toBe('11.0.0');
      
      const typesNode = packages.find(p => p.name === '@types/node');
      expect(typesNode?.version).toBe('20.0.0');
    });

    it('should extract versions from lockfileVersion 1 format', () => {
      const content = JSON.stringify({
        name: 'test',
        lockfileVersion: 1,
        dependencies: {
          'lodash': { version: '4.17.21' },
          'chalk': { version: '5.0.0' }
        }
      });
      const packages = parsePackageLock(content);
      
      expect(packages.find(p => p.name === 'lodash')?.version).toBe('4.17.21');
      expect(packages.find(p => p.name === 'chalk')?.version).toBe('5.0.0');
    });
  });

  describe('yarn.lock version extraction', () => {
    it('should extract resolved versions', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'yarn.lock'), 'utf-8');
      const packages = parseYarnLock(content);
      
      const chalk = packages.find(p => p.name === 'chalk');
      expect(chalk).toBeDefined();
      expect(chalk?.version).toBe('5.3.0');
    });

    it('should handle multiple version constraints resolving to one version', () => {
      const content = `
lodash@^4.0.0, lodash@^4.17.0:
  version "4.17.21"
`;
      const packages = parseYarnLock(content);
      expect(packages.find(p => p.name === 'lodash')?.version).toBe('4.17.21');
    });
  });

  describe('pnpm-lock.yaml version extraction', () => {
    it('should extract versions from packages section', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'pnpm-lock.yaml'), 'utf-8');
      const packages = parsePnpmLock(content);
      
      const chalk = packages.find(p => p.name === 'chalk');
      expect(chalk).toBeDefined();
      expect(chalk?.version).toBeDefined();
    });
  });

  describe('poetry.lock version extraction', () => {
    it('should extract versions from TOML package sections', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'poetry.lock'), 'utf-8');
      const packages = parsePoetryLock(content);
      
      const requests = packages.find(p => p.name === 'requests');
      expect(requests).toBeDefined();
      expect(requests?.version).toBeDefined();
    });

    it('should correctly parse TOML format', () => {
      const content = `
[[package]]
name = "django"
version = "4.2.0"

[[package]]
name = "gunicorn"
version = "21.0.0"
`;
      const packages = parsePoetryLock(content);
      
      expect(packages.find(p => p.name === 'django')?.version).toBe('4.2.0');
      expect(packages.find(p => p.name === 'gunicorn')?.version).toBe('21.0.0');
    });
  });

  describe('Pipfile.lock version extraction', () => {
    it('should extract versions and strip == prefix', () => {
      const content = JSON.stringify({
        default: {
          'flask': { version: '==2.3.2' },
          'requests': { version: '==2.31.0' }
        },
        develop: {
          'pytest': { version: '==7.4.0' }
        }
      });
      const packages = parsePipfileLock(content);
      
      expect(packages.find(p => p.name === 'flask')?.version).toBe('2.3.2');
      expect(packages.find(p => p.name === 'requests')?.version).toBe('2.31.0');
      expect(packages.find(p => p.name === 'pytest')?.version).toBe('7.4.0');
    });
  });

  describe('Cargo.lock version extraction', () => {
    it('should extract versions from TOML package sections', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'Cargo.lock'), 'utf-8');
      const packages = parseCargoLock(content);
      
      const serde = packages.find(p => p.name === 'serde');
      expect(serde).toBeDefined();
      expect(serde?.version).toBeDefined();
    });

    it('should correctly parse TOML format', () => {
      const content = `
[[package]]
name = "rand"
version = "0.8.5"

[[package]]
name = "rand_core"
version = "0.6.4"
`;
      const packages = parseCargoLock(content);
      
      expect(packages.find(p => p.name === 'rand')?.version).toBe('0.8.5');
      expect(packages.find(p => p.name === 'rand_core')?.version).toBe('0.6.4');
    });
  });

  describe('Gemfile.lock version extraction', () => {
    it('should extract versions from specs section', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'Gemfile.lock'), 'utf-8');
      const packages = parseGemfileLock(content);
      
      const rails = packages.find(p => p.name === 'rails');
      expect(rails).toBeDefined();
      expect(rails?.version).toBeDefined();
    });

    it('should correctly parse gem (version) format', () => {
      const content = `
GEM
  remote: https://rubygems.org/
  specs:
    rack (2.2.7)
    rails (7.0.5)
      rack (~> 2.2)

PLATFORMS
  ruby
`;
      const packages = parseGemfileLock(content);
      
      expect(packages.find(p => p.name === 'rack')?.version).toBe('2.2.7');
      expect(packages.find(p => p.name === 'rails')?.version).toBe('7.0.5');
    });
  });

});
