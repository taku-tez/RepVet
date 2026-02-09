/**
 * CLI --quiet and --verbose option tests
 */


import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const CLI_PATH = join(process.cwd(), 'dist', 'cli.js');

function runCli(args: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node ${CLI_PATH} ${args}`, {
      encoding: 'utf-8',
      timeout: 30000,
      env: { ...process.env, NO_COLOR: '1' },
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: unknown) {
    const e = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout || '',
      stderr: e.stderr || '',
      exitCode: e.status || 1,
    };
  }
}

// Create a minimal test fixture
function createTestDir(): string {
  const dir = join(tmpdir(), `repvet-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  // Use a tiny package.json with a well-known package
  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    dependencies: { 'is-number': '^7.0.0' },
  }));
  return dir;
}

describe('CLI --quiet option', () => {
  it('should suppress normal output with --quiet', () => {
    const dir = createTestDir();
    try {
      const normal = runCli(`scan ${dir} --json`);
      const quiet = runCli(`scan ${dir} --quiet`);
      
      // --quiet should produce no output (or minimal)
      // Normal (non-json, non-quiet) would produce scanning messages
      expect(quiet.stdout.trim()).toBe('');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should still exit with error code when --fail-under is triggered with --quiet', () => {
    const dir = createTestDir();
    try {
      const result = runCli(`scan ${dir} --quiet --fail-under 101`);
      // Even with --quiet, exit code should reflect --fail-under
      expect(result.exitCode).toBe(1);
      // But output should be suppressed
      expect(result.stdout.trim()).toBe('');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should not affect --json output', () => {
    const dir = createTestDir();
    try {
      const jsonOnly = runCli(`scan ${dir} --json`);
      const jsonQuiet = runCli(`scan ${dir} --json --quiet`);
      
      // --quiet should not affect --json output
      const parsed1 = JSON.parse(jsonOnly.stdout);
      const parsed2 = JSON.parse(jsonQuiet.stdout);
      expect(parsed1.mode).toBe(parsed2.mode);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('CLI --verbose option', () => {
  it('should show all packages with --verbose', () => {
    const dir = createTestDir();
    try {
      const result = runCli(`scan ${dir} --verbose`);
      // Verbose should include "All packages" header
      expect(result.stdout).toContain('All packages');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should show skipped packages with --verbose (same as --show-skipped)', () => {
    const dir = createTestDir();
    // Add a non-existent package to trigger skipped
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      dependencies: { 'this-package-definitely-does-not-exist-xyz-999': '^1.0.0' },
    }));
    try {
      const result = runCli(`scan ${dir} --verbose`);
      // Should show skipped info
      expect(result.stdout).toContain('Skipped');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should show completion timestamp with --verbose', () => {
    const dir = createTestDir();
    try {
      const result = runCli(`scan ${dir} --verbose`);
      expect(result.stdout).toContain('Completed at:');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
