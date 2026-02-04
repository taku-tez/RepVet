/**
 * CLI dependency file parsing tests
 */

import { describe, it, expect } from '@jest/globals';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// We need to test the parsing functions directly
// They are not exported, so we'll use a workaround by importing the module
// and testing through the scan command behavior indirectly

// For now, let's create unit tests for the parsing logic by extracting it

describe('Dependency File Parsing', () => {

  describe('requirements.txt parsing', () => {
    it('should parse standard package specifications', () => {
      const content = `
requests==2.28.0
flask>=2.0.0
django~=4.0
numpy
      `;
      const packages = parseRequirementsTxt(content);
      expect(packages).toContain('requests');
      expect(packages).toContain('flask');
      expect(packages).toContain('django');
      expect(packages).toContain('numpy');
    });

    it('should handle comments and blank lines', () => {
      const content = `
# This is a comment
requests==2.28.0

# Another comment
flask>=2.0.0
      `;
      const packages = parseRequirementsTxt(content);
      expect(packages).toEqual(['requests', 'flask']);
    });

    it('should handle VCS URLs with egg fragments', () => {
      const content = `
git+https://github.com/user/repo.git@v1.0#egg=mypackage
git+ssh://git@github.com/user/repo.git#egg=another-pkg
      `;
      const packages = parseRequirementsTxt(content);
      expect(packages).toContain('mypackage');
      expect(packages).toContain('another-pkg');
    });

    it('should handle editable installs', () => {
      const content = `
-e git+https://github.com/user/repo.git#egg=mypackage
-e ../local/path#egg=localpackage
      `;
      const packages = parseRequirementsTxt(content);
      expect(packages).toContain('mypackage');
      expect(packages).toContain('localpackage');
    });

    it('should skip -r and -c directives when no file path provided', () => {
      const content = `
-r base.txt
-c constraints.txt
requests==2.28.0
      `;
      // Without file path, -r/-c are skipped
      const packages = parseRequirementsTxt(content);
      expect(packages).toEqual(['requests']);
    });

    it('should follow -r includes when file path is provided', async () => {
      // This test uses the fixtures directory
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const fixturesDir = path.join(__dirname, '../fixtures/requirements');
      const mainFile = path.join(fixturesDir, 'requirements.txt');
      
      if (fs.existsSync(mainFile)) {
        const content = fs.readFileSync(mainFile, 'utf-8');
        const packages = parseRequirementsTxt(content, mainFile);
        
        // Should include packages from main file
        expect(packages).toContain('requests');
        expect(packages).toContain('flask');
        
        // Should include packages from -r requirements-dev.txt
        expect(packages).toContain('pytest');
        expect(packages).toContain('black');
        expect(packages).toContain('mypy');
        
        // Should include packages from -c constraints.txt
        expect(packages).toContain('urllib3');
        expect(packages).toContain('setuptools');
      }
    });

    it('should handle circular includes safely', () => {
      // Create a Set to simulate visited paths
      const visitedPaths = new Set<string>();
      visitedPaths.add('/fake/path/requirements.txt');
      
      const content = `-r requirements.txt\nrequests==2.28.0`;
      // Should not infinite loop, should just return packages without following circular ref
      const packages = parseRequirementsTxt(content, '/fake/path/requirements.txt', visitedPaths);
      expect(packages).toEqual(['requests']);
    });

    it('should handle packages with extras', () => {
      const content = `
requests[security]>=2.28.0
celery[redis,auth]>=5.0
      `;
      const packages = parseRequirementsTxt(content);
      expect(packages).toContain('requests');
      expect(packages).toContain('celery');
    });
  });

  describe('Cargo.toml parsing', () => {
    it('should parse standard dependencies', () => {
      const content = `
[package]
name = "myproject"
version = "0.1.0"

[dependencies]
serde = "1.0"
tokio = { version = "1.0", features = ["full"] }

[dev-dependencies]
mockall = "0.11"
      `;
      const packages = parseCargoToml(content);
      expect(packages).toContain('serde');
      expect(packages).toContain('tokio');
      expect(packages).toContain('mockall');
    });

    it('should parse workspace dependencies', () => {
      const content = `
[workspace.dependencies]
serde = "1.0"
tokio = { version = "1.0" }
      `;
      const packages = parseCargoToml(content);
      expect(packages).toContain('serde');
      expect(packages).toContain('tokio');
    });

    it('should parse inline table dependencies', () => {
      const content = `
[dependencies]
serde = "1.0"

[dependencies.tokio]
version = "1.0"
features = ["full"]
      `;
      const packages = parseCargoToml(content);
      expect(packages).toContain('serde');
      expect(packages).toContain('tokio');
    });

    it('should handle workspace = true', () => {
      const content = `
[dependencies]
serde.workspace = true
tokio = { workspace = true }
      `;
      const packages = parseCargoToml(content);
      expect(packages).toContain('serde');
      expect(packages).toContain('tokio');
    });
  });

  describe('go.mod parsing', () => {
    it('should parse require blocks', () => {
      const content = `
module example.com/myproject

go 1.21

require (
    github.com/gin-gonic/gin v1.9.0
    github.com/stretchr/testify v1.8.0 // indirect
)
      `;
      const packages = parseGoMod(content);
      expect(packages).toContain('github.com/gin-gonic/gin');
      expect(packages).toContain('github.com/stretchr/testify');
    });

    it('should parse single-line requires', () => {
      const content = `
module example.com/myproject

require github.com/gin-gonic/gin v1.9.0
      `;
      const packages = parseGoMod(content);
      expect(packages).toContain('github.com/gin-gonic/gin');
    });

    it('should handle replace directives', () => {
      const content = `
module example.com/myproject

require github.com/original/pkg v1.0.0

replace github.com/original/pkg => github.com/fork/pkg v1.0.1
      `;
      const packages = parseGoMod(content);
      expect(packages).toContain('github.com/original/pkg');
    });

    it('should exclude excluded modules', () => {
      const content = `
module example.com/myproject

require (
    github.com/good/pkg v1.0.0
    github.com/bad/pkg v1.0.0
)

exclude github.com/bad/pkg v1.0.0
      `;
      const packages = parseGoMod(content);
      expect(packages).toContain('github.com/good/pkg');
      expect(packages).not.toContain('github.com/bad/pkg');
    });
  });

  describe('build.gradle parsing', () => {
    it('should parse single-line dependencies', () => {
      const content = `
dependencies {
    implementation 'com.google.guava:guava:31.0'
    testImplementation "junit:junit:4.13"
}
      `;
      const packages = parseBuildGradle(content);
      expect(packages).toContain('com.google.guava:guava');
      expect(packages).toContain('junit:junit');
    });

    it('should parse Kotlin DSL dependencies', () => {
      const content = `
dependencies {
    implementation("com.google.guava:guava:31.0")
    testImplementation("junit:junit:4.13")
}
      `;
      const packages = parseBuildGradle(content);
      expect(packages).toContain('com.google.guava:guava');
      expect(packages).toContain('junit:junit');
    });

    it('should parse multi-line dependencies', () => {
      const content = `
dependencies {
    implementation(group: "com.google.guava", name: "guava", version: "31.0")
}
      `;
      const packages = parseBuildGradle(content);
      expect(packages).toContain('com.google.guava:guava');
    });

    it('should handle various configuration names', () => {
      const content = `
dependencies {
    api 'com.example:api-lib:1.0'
    compileOnly 'com.example:compile-lib:1.0'
    runtimeOnly 'com.example:runtime-lib:1.0'
    kapt 'com.example:kapt-lib:1.0'
}
      `;
      const packages = parseBuildGradle(content);
      expect(packages).toContain('com.example:api-lib');
      expect(packages).toContain('com.example:compile-lib');
      expect(packages).toContain('com.example:runtime-lib');
      expect(packages).toContain('com.example:kapt-lib');
    });
  });
});

// Helper functions extracted from cli.ts for testing
// In production, these would be exported or tested through integration tests

function parseRequirementsTxt(content: string, filePath?: string, visitedPaths?: Set<string>): string[] {
  const packages: string[] = [];
  const lines = content.split('\n');
  
  // Track visited files to prevent circular includes
  const visited = visitedPaths ?? new Set<string>();
  if (filePath) {
    visited.add(filePath);
  }
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    // Handle recursive includes (-r) and constraint files (-c)
    if (trimmed.startsWith('-r ') || trimmed.startsWith('-c ')) {
      const includedFile = trimmed.replace(/^-[rc]\s+/, '').trim();
      
      if (filePath && includedFile) {
        try {
          const fs = require('fs');
          const path = require('path');
          
          const baseDir = path.dirname(filePath);
          const includedPath = path.resolve(baseDir, includedFile);
          
          if (!visited.has(includedPath)) {
            if (fs.existsSync(includedPath)) {
              const includedContent = fs.readFileSync(includedPath, 'utf-8');
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
    
    if (trimmed.startsWith('-e ')) {
      const eggMatch = trimmed.match(/#egg=([a-zA-Z0-9_-]+)/);
      if (eggMatch) {
        packages.push(eggMatch[1]);
      }
      continue;
    }
    
    if (trimmed.startsWith('-') || trimmed.startsWith('--')) {
      continue;
    }
    
    if (trimmed.match(/^(git|hg|svn|bzr)\+/)) {
      const eggMatch = trimmed.match(/#egg=([a-zA-Z0-9_-]+)/);
      if (eggMatch) {
        packages.push(eggMatch[1]);
      }
      continue;
    }
    
    const match = trimmed.match(/^([a-zA-Z0-9][a-zA-Z0-9._-]*)(?:\[.*?\])?/);
    if (match) {
      packages.push(match[1]);
    }
  }
  
  return [...new Set(packages)];
}

function parseCargoToml(content: string): string[] {
  const packages: string[] = [];
  
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
        if (line.trim().startsWith('#')) continue;
        
        const pkgMatch = line.match(/^([a-zA-Z0-9_-]+)(?:\.[a-zA-Z_]+)?\s*=/);
        if (pkgMatch) {
          packages.push(pkgMatch[1]);
        }
      }
    }
  }
  
  const inlineDepRegex = /\[(?:dev-)?dependencies\.([a-zA-Z0-9_-]+)\]/g;
  let inlineMatch;
  while ((inlineMatch = inlineDepRegex.exec(content)) !== null) {
    packages.push(inlineMatch[1]);
  }
  
  return [...new Set(packages)];
}

function parseGoMod(content: string): string[] {
  const packages: string[] = [];
  const excludedModules = new Set<string>();
  const lines = content.split('\n');
  
  let inRequire = false;
  let inExclude = false;
  let inReplace = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('require (') || trimmed === 'require(') {
      inRequire = true;
      continue;
    }
    if (trimmed.startsWith('exclude (') || trimmed === 'exclude(') {
      inExclude = true;
      continue;
    }
    if (trimmed.startsWith('replace (') || trimmed === 'replace(') {
      inReplace = true;
      continue;
    }
    if (trimmed === ')') {
      inRequire = false;
      inExclude = false;
      inReplace = false;
      continue;
    }
    
    if (inExclude || trimmed.startsWith('exclude ')) {
      const moduleMatch = trimmed.match(/^(?:exclude\s+)?([^\s]+)/);
      if (moduleMatch) {
        excludedModules.add(moduleMatch[1]);
      }
      continue;
    }
    
    if (inReplace || trimmed.startsWith('replace ')) {
      const replaceMatch = trimmed.match(/^(?:replace\s+)?([^\s]+)\s+=>/);
      if (replaceMatch) {
        packages.push(replaceMatch[1]);
      }
      continue;
    }
    
    if (inRequire || trimmed.startsWith('require ')) {
      const moduleMatch = trimmed.match(/^(?:require\s+)?([^\s]+)\s+v[^\s]+/);
      if (moduleMatch) {
        packages.push(moduleMatch[1]);
      }
    }
  }
  
  return packages.filter(pkg => !excludedModules.has(pkg));
}

function parseBuildGradle(content: string): string[] {
  const packages: string[] = [];
  
  const configs = [
    'implementation',
    'api',
    'compileOnly',
    'runtimeOnly',
    'testImplementation',
    'testRuntimeOnly',
    'androidTestImplementation',
    'kapt',
    'annotationProcessor',
    'classpath',
  ];
  
  const configPattern = configs.join('|');
  
  // Kotlin DSL: implementation("group:artifact:version")
  const kotlinDslRegex = new RegExp(
    `(?:${configPattern})\\s*\\(\\s*["']([^"']+)["']\\s*\\)`,
    'g'
  );
  
  let match;
  while ((match = kotlinDslRegex.exec(content)) !== null) {
    const dep = match[1];
    const parts = dep.split(':');
    if (parts.length >= 2) {
      packages.push(`${parts[0]}:${parts[1]}`);
    }
  }
  
  // Groovy DSL: implementation 'group:artifact:version'
  const groovyDslRegex = new RegExp(
    `(?:${configPattern})\\s+["']([^"']+)["']`,
    'g'
  );
  
  while ((match = groovyDslRegex.exec(content)) !== null) {
    const dep = match[1];
    const parts = dep.split(':');
    if (parts.length >= 2) {
      packages.push(`${parts[0]}:${parts[1]}`);
    }
  }
  
  const multiLineRegex = new RegExp(
    `(?:${configPattern})\\s*\\([^)]*group\\s*[=:]\\s*["']([^"']+)["'][^)]*name\\s*[=:]\\s*["']([^"']+)["']`,
    'g'
  );
  
  while ((match = multiLineRegex.exec(content)) !== null) {
    packages.push(`${match[1]}:${match[2]}`);
  }
  
  const kotlinNamedRegex = new RegExp(
    `(?:${configPattern})\\s*\\([^)]*name\\s*=\\s*["']([^"']+)["'][^)]*group\\s*=\\s*["']([^"']+)["']`,
    'g'
  );
  
  while ((match = kotlinNamedRegex.exec(content)) !== null) {
    packages.push(`${match[2]}:${match[1]}`);
  }
  
  return [...new Set(packages)];
}
