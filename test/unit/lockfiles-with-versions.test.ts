/**
 * Lock file parsing tests - with version extraction
 * Tests that lock parsers correctly extract both name and version
 */


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

function parseComposerLock(content: string): PackageDependency[] {
  const deps: PackageDependency[] = [];
  const seen = new Set<string>();
  
  try {
    const lock = JSON.parse(content) as {
      packages?: Array<{ name: string; version: string }>;
      'packages-dev'?: Array<{ name: string; version: string }>;
    };
    
    const allPackages = [
      ...(lock.packages || []),
      ...(lock['packages-dev'] || []),
    ];
    
    for (const pkg of allPackages) {
      if (!pkg.name || seen.has(pkg.name)) continue;
      // Skip PHP version constraints and extensions, not packages like 'phpunit/phpunit'
      if (pkg.name === 'php' || pkg.name.startsWith('ext-')) continue;
      
      seen.add(pkg.name);
      const version = pkg.version?.replace(/^v/, '');
      
      deps.push({ name: pkg.name, version });
    }
  } catch {
    return [];
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

  describe('composer.lock version extraction', () => {
    it('should extract versions from fixture file', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'composer.lock'), 'utf-8');
      const packages = parseComposerLock(content);
      
      const monolog = packages.find(p => p.name === 'monolog/monolog');
      expect(monolog).toBeDefined();
      expect(monolog?.version).toBe('3.5.0');
      
      // Symfony console has 'v' prefix that should be stripped
      const symfony = packages.find(p => p.name === 'symfony/console');
      expect(symfony).toBeDefined();
      expect(symfony?.version).toBe('6.4.3');
    });

    it('should include packages-dev', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'composer.lock'), 'utf-8');
      const packages = parseComposerLock(content);
      
      const phpunit = packages.find(p => p.name === 'phpunit/phpunit');
      expect(phpunit).toBeDefined();
      expect(phpunit?.version).toBe('10.5.5');
    });

    it('should correctly parse JSON format', () => {
      const content = JSON.stringify({
        packages: [
          { name: 'laravel/framework', version: 'v10.0.0' },
          { name: 'guzzlehttp/guzzle', version: '7.8.0' }
        ],
        'packages-dev': [
          { name: 'mockery/mockery', version: '1.6.0' }
        ]
      });
      const packages = parseComposerLock(content);
      
      expect(packages.find(p => p.name === 'laravel/framework')?.version).toBe('10.0.0');
      expect(packages.find(p => p.name === 'guzzlehttp/guzzle')?.version).toBe('7.8.0');
      expect(packages.find(p => p.name === 'mockery/mockery')?.version).toBe('1.6.0');
    });

    it('should handle empty lock file', () => {
      const content = JSON.stringify({ packages: [], 'packages-dev': [] });
      const packages = parseComposerLock(content);
      expect(packages).toEqual([]);
    });
  });

  describe('mix.lock version extraction', () => {
    function parseMixLock(content: string): PackageDependency[] {
      const deps: PackageDependency[] = [];
      const seen = new Set<string>();
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

    it('should extract versions from fixture file', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'mix.lock'), 'utf-8');
      const packages = parseMixLock(content);

      const phoenix = packages.find(p => p.name === 'phoenix');
      expect(phoenix).toBeDefined();
      expect(phoenix?.version).toBe('1.7.10');

      const ecto = packages.find(p => p.name === 'ecto');
      expect(ecto).toBeDefined();
      expect(ecto?.version).toBe('3.11.1');

      const jason = packages.find(p => p.name === 'jason');
      expect(jason).toBeDefined();
      expect(jason?.version).toBe('1.4.1');
    });

    it('should extract correct package count (hex only)', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'mix.lock'), 'utf-8');
      const packages = parseMixLock(content);
      // 13 hex packages, excluding git and path deps
      expect(packages).toHaveLength(13);
    });

    it('should handle packages with underscore names', () => {
      const content = `%{
  "db_connection": {:hex, :db_connection, "2.6.0", "hash", [:mix], [], "hexpm", "sha"},
  "ecto_sql": {:hex, :ecto_sql, "3.11.1", "hash", [:mix], [], "hexpm", "sha"},
  "phoenix_pubsub": {:hex, :phoenix_pubsub, "2.1.3", "hash", [:mix], [], "hexpm", "sha"},
}`;
      const packages = parseMixLock(content);
      expect(packages.find(p => p.name === 'db_connection')?.version).toBe('2.6.0');
      expect(packages.find(p => p.name === 'ecto_sql')?.version).toBe('3.11.1');
      expect(packages.find(p => p.name === 'phoenix_pubsub')?.version).toBe('2.1.3');
    });

    it('should handle empty mix.lock', () => {
      const content = '%{}';
      const packages = parseMixLock(content);
      expect(packages).toEqual([]);
    });
  });

  describe('pubspec.lock version extraction', () => {
    function parsePubspecLock(content: string): PackageDependency[] {
      const deps: PackageDependency[] = [];
      const seen = new Set<string>();
      const lines = content.split('\n');

      let inPackages = false;
      let currentPackage: string | null = null;
      let currentVersion: string | null = null;
      let currentSource: string | null = null;

      for (const line of lines) {
        if (/^packages:\s*$/.test(line)) {
          inPackages = true;
          continue;
        }
        if (inPackages && /^[a-z]/.test(line) && !line.startsWith(' ')) {
          if (currentPackage && currentSource === 'hosted' && !seen.has(currentPackage)) {
            seen.add(currentPackage);
            deps.push({ name: currentPackage, version: currentVersion || undefined });
          }
          inPackages = false;
          currentPackage = null;
          currentVersion = null;
          currentSource = null;
          continue;
        }
        if (!inPackages) continue;

        const pkgMatch = line.match(/^  ([a-zA-Z0-9_]+):\s*$/);
        if (pkgMatch) {
          if (currentPackage && currentSource === 'hosted' && !seen.has(currentPackage)) {
            seen.add(currentPackage);
            deps.push({ name: currentPackage, version: currentVersion || undefined });
          }
          currentPackage = pkgMatch[1];
          currentVersion = null;
          currentSource = null;
          continue;
        }

        const sourceMatch = line.match(/^\s+source:\s*(\S+)/);
        if (sourceMatch) {
          currentSource = sourceMatch[1];
          continue;
        }

        const versionMatch = line.match(/^\s+version:\s*"([^"]+)"/);
        if (versionMatch) {
          currentVersion = versionMatch[1];
          continue;
        }
      }

      if (currentPackage && currentSource === 'hosted' && !seen.has(currentPackage)) {
        seen.add(currentPackage);
        deps.push({ name: currentPackage, version: currentVersion || undefined });
      }

      return deps;
    }

    it('should extract versions from fixture file', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'pubspec.lock'), 'utf-8');
      const packages = parsePubspecLock(content);

      const http = packages.find(p => p.name === 'http');
      expect(http).toBeDefined();
      expect(http?.version).toBe('1.2.0');

      const provider = packages.find(p => p.name === 'provider');
      expect(provider).toBeDefined();
      expect(provider?.version).toBe('6.1.1');

      const async_ = packages.find(p => p.name === 'async');
      expect(async_).toBeDefined();
      expect(async_?.version).toBe('2.11.0');
    });

    it('should extract correct hosted package count', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'pubspec.lock'), 'utf-8');
      const packages = parsePubspecLock(content);
      // 10 hosted, excluding sdk/path/git deps
      expect(packages).toHaveLength(10);
    });

    it('should not include sdk/path/git packages', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'pubspec.lock'), 'utf-8');
      const packages = parsePubspecLock(content);
      expect(packages.find(p => p.name === 'flutter')).toBeUndefined();
      expect(packages.find(p => p.name === 'flutter_test')).toBeUndefined();
      expect(packages.find(p => p.name === 'my_local_pkg')).toBeUndefined();
      expect(packages.find(p => p.name === 'my_git_dep')).toBeUndefined();
    });

    it('should handle inline version/source', () => {
      const content = `packages:
  http:
    dependency: "direct main"
    description:
      name: http
      url: "https://pub.dev"
    source: hosted
    version: "1.2.0"
  path:
    dependency: transitive
    description:
      name: path
      url: "https://pub.dev"
    source: hosted
    version: "1.9.0"
sdks:
  dart: ">=3.0.0"
`;
      const packages = parsePubspecLock(content);
      expect(packages.find(p => p.name === 'http')?.version).toBe('1.2.0');
      expect(packages.find(p => p.name === 'path')?.version).toBe('1.9.0');
    });
  });

  describe('Podfile.lock (CocoaPods)', () => {
    function parsePodfileLock(content: string): PackageDependency[] {
      const deps: PackageDependency[] = [];
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
        const version = podMatch[2];

        if (!rootName || seen.has(rootName)) continue;
        seen.add(rootName);

        deps.push({ name: rootName, version });
      }

      return deps;
    }

    it('should extract versions from fixture file', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'Podfile.lock'), 'utf-8');
      const packages = parsePodfileLock(content);

      const alamofire = packages.find(p => p.name === 'Alamofire');
      expect(alamofire).toBeDefined();
      expect(alamofire?.version).toBe('5.9.1');

      const firebase = packages.find(p => p.name === 'Firebase');
      expect(firebase).toBeDefined();
      expect(firebase?.version).toBe('10.24.0');

      const snapkit = packages.find(p => p.name === 'SnapKit');
      expect(snapkit).toBeDefined();
      expect(snapkit?.version).toBe('5.7.1');
    });

    it('should deduplicate subspecs to root pod name', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'Podfile.lock'), 'utf-8');
      const packages = parsePodfileLock(content);

      // Firebase appears as Firebase, Firebase/Core — should be deduplicated
      const firebaseEntries = packages.filter(p => p.name === 'Firebase');
      expect(firebaseEntries).toHaveLength(1);

      // SDWebImage appears as SDWebImage, SDWebImage/Core — should be deduplicated
      const sdwebEntries = packages.filter(p => p.name === 'SDWebImage');
      expect(sdwebEntries).toHaveLength(1);

      // GoogleUtilities has many subspecs — should be one entry
      const guEntries = packages.filter(p => p.name === 'GoogleUtilities');
      expect(guEntries).toHaveLength(1);
    });

    it('should extract correct unique root pod count', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'Podfile.lock'), 'utf-8');
      const packages = parsePodfileLock(content);
      // Root pods: Alamofire, Firebase, FirebaseAnalytics, GoogleAppMeasurement,
      //            GoogleUtilities, Kingfisher, Moya, R.swift, SDWebImage, SnapKit, SwiftyJSON
      expect(packages).toHaveLength(11);
    });

    it('should handle simple Podfile.lock', () => {
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
      expect(packages[0]?.name).toBe('AFNetworking');
      expect(packages[0]?.version).toBe('4.0.1');
      expect(packages[1]?.name).toBe('MBProgressHUD');
      expect(packages[1]?.version).toBe('1.2.0');
    });

    it('should handle empty PODS section', () => {
      const content = `PODS:

DEPENDENCIES:

COCOAPODS: 1.15.2
`;
      const packages = parsePodfileLock(content);
      expect(packages).toHaveLength(0);
    });

    it('should not include sub-dependencies', () => {
      const content = `PODS:
  - Moya (15.0.0):
    - Moya/Core (= 15.0.0)
  - Moya/Core (15.0.0):
    - Alamofire (~> 5.0)

DEPENDENCIES:
  - Moya (~> 15.0)

COCOAPODS: 1.15.2
`;
      const packages = parsePodfileLock(content);
      // Moya and Moya/Core both resolve to "Moya", should be one entry
      // Alamofire listed as sub-dep under Moya/Core should not be extracted
      // (it's indented 4 spaces, not 2)
      expect(packages).toHaveLength(1);
      expect(packages[0]?.name).toBe('Moya');
    });
  });

  describe('bun.lock (with versions)', () => {
    function stripTrailingCommas(text: string): string {
      let result = '';
      let inString = false;
      let escape = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (escape) { result += ch; escape = false; continue; }
        if (ch === '\\' && inString) { result += ch; escape = true; continue; }
        if (ch === '"') { inString = !inString; result += ch; continue; }
        if (inString) { result += ch; continue; }
        if (ch === ',') {
          let j = i + 1;
          while (j < text.length && /\s/.test(text[j])) j++;
          if (j < text.length && (text[j] === '}' || text[j] === ']')) continue;
        }
        result += ch;
      }
      return result;
    }

    function parseBunLock(content: string): PackageDependency[] {
      const cleanJson = stripTrailingCommas(content);
      const lock = JSON.parse(cleanJson) as {
        packages?: Record<string, unknown[]>;
      };
      if (!lock.packages) return [];

      const deps: PackageDependency[] = [];
      const seen = new Set<string>();

      for (const [_key, value] of Object.entries(lock.packages)) {
        if (!Array.isArray(value) || value.length === 0) continue;
        const resolved = value[0] as string;
        if (!resolved || typeof resolved !== 'string') continue;
        const lastAt = resolved.lastIndexOf('@');
        if (lastAt <= 0) continue;
        const name = resolved.substring(0, lastAt);
        const version = resolved.substring(lastAt + 1);
        if (!name || seen.has(name)) continue;
        seen.add(name);
        deps.push({ name, version });
      }
      return deps;
    }

    it('should parse bun.lock with versions from fixture', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bun.lock'), 'utf-8');
      const packages = parseBunLock(content);

      const chalk = packages.find(p => p.name === 'chalk');
      expect(chalk).toBeDefined();
      expect(chalk?.version).toBe('5.6.2');

      const commander = packages.find(p => p.name === 'commander');
      expect(commander).toBeDefined();
      expect(commander?.version).toBe('12.1.0');

      const express = packages.find(p => p.name === 'express');
      expect(express).toBeDefined();
      expect(express?.version).toBe('4.22.1');
    });

    it('should extract scoped package versions', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bun.lock'), 'utf-8');
      const packages = parseBunLock(content);

      const typesNode = packages.find(p => p.name === '@types/node');
      expect(typesNode).toBeDefined();
      expect(typesNode?.version).toBe('22.19.9');
    });

    it('should extract version from nested path entries', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bun.lock'), 'utf-8');
      const packages = parseBunLock(content);

      // "send/ms" → resolved as "ms@2.1.3"
      const ms = packages.find(p => p.name === 'ms');
      expect(ms).toBeDefined();
      expect(ms?.version).toBe('2.1.3');
    });

    it('should handle empty lockfile', () => {
      const content = `{
  "lockfileVersion": 1,
  "packages": {}
}`;
      const packages = parseBunLock(content);
      expect(packages).toHaveLength(0);
    });

    it('should handle missing packages section', () => {
      const content = `{
  "lockfileVersion": 1,
  "workspaces": {}
}`;
      const packages = parseBunLock(content);
      expect(packages).toHaveLength(0);
    });

    it('should extract correct package count', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'bun.lock'), 'utf-8');
      const packages = parseBunLock(content);
      // 9 entries: @types/node, accepts, chalk, commander, express, body-parser, bytes, undici-types, ms
      expect(packages).toHaveLength(9);
    });
  });

  describe('uv.lock (with versions)', () => {
    function parseUvLock(content: string): PackageDependency[] {
      const deps: PackageDependency[] = [];
      const seen = new Set<string>();
      const blocks = content.split(/^\[\[package\]\]\s*$/m);

      for (const block of blocks) {
        if (!block.trim()) continue;
        const nameMatch = block.match(/^name\s*=\s*"([^"]+)"/m);
        if (!nameMatch) continue;
        const name = nameMatch[1];
        if (/^source\s*=\s*\{[^}]*(?:virtual|editable|path)\s*=/m.test(block)) continue;
        const versionMatch = block.match(/^version\s*=\s*"([^"]+)"/m);
        const version = versionMatch ? versionMatch[1] : undefined;
        if (!seen.has(name)) {
          seen.add(name);
          deps.push({ name, version });
        }
      }
      return deps;
    }

    it('should parse uv.lock with versions from fixture', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'uv.lock'), 'utf-8');
      const packages = parseUvLock(content);

      const requests = packages.find(p => p.name === 'requests');
      expect(requests).toBeDefined();
      expect(requests?.version).toBe('2.32.4');

      const flask = packages.find(p => p.name === 'flask');
      expect(flask).toBeDefined();
      expect(flask?.version).toBe('3.1.0');

      const certifi = packages.find(p => p.name === 'certifi');
      expect(certifi).toBeDefined();
      expect(certifi?.version).toBe('2024.12.14');
    });

    it('should skip virtual project (no version extracted)', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'uv.lock'), 'utf-8');
      const packages = parseUvLock(content);
      expect(packages.find(p => p.name === 'my-project')).toBeUndefined();
    });

    it('should extract all non-virtual package versions', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'uv.lock'), 'utf-8');
      const packages = parseUvLock(content);
      // All registry packages should have versions
      for (const pkg of packages) {
        expect(pkg.version).toBeDefined();
      }
    });

    it('should handle package without version', () => {
      const content = `version = 1

[[package]]
name = "mystery"
source = { registry = "https://pypi.org/simple" }
`;
      const packages = parseUvLock(content);
      expect(packages).toHaveLength(1);
      expect(packages[0]?.name).toBe('mystery');
      expect(packages[0]?.version).toBeUndefined();
    });

    it('should extract correct count', () => {
      const content = fs.readFileSync(path.join(fixturesDir, 'uv.lock'), 'utf-8');
      const packages = parseUvLock(content);
      // 13 total - 1 virtual = 12 registry packages
      expect(packages).toHaveLength(12);
    });
  });

});
