/**
 * CSV output formatter tests
 */

import { toCsv, getCsvHeaders } from '../../src/csv.js';
import { ReputationResult } from '../../src/types.js';

describe('CSV output', () => {
  const makeResult = (overrides: Partial<ReputationResult> = {}): ReputationResult => ({
    package: 'test-pkg',
    ecosystem: 'npm',
    score: 100,
    riskLevel: 'LOW',
    deductions: [],
    maintainers: ['alice'],
    hasOwnershipTransfer: false,
    hasMalwareHistory: false,
    ...overrides,
  });

  test('produces valid CSV header row', () => {
    const csv = toCsv([makeResult()]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'package,ecosystem,score,risk_level,maintainers,deduction_count,' +
      'deduction_reasons,deduction_points_total,vuln_total,vuln_critical,' +
      'vuln_high,vuln_recent,vuln_unfixed,has_ownership_transfer,' +
      'has_malware_history,is_deleted,last_commit_date'
    );
  });

  test('exports getCsvHeaders function', () => {
    const headers = getCsvHeaders();
    expect(headers).toContain('package');
    expect(headers).toContain('ecosystem');
    expect(headers).toContain('score');
    expect(headers).toContain('risk_level');
  });

  test('can exclude header row', () => {
    const csv = toCsv([makeResult()], false);
    const lines = csv.split('\n');
    expect(lines[0]).not.toContain('package,ecosystem');
    expect(lines[0]).toContain('test-pkg');
  });

  test('includes basic package info in data row', () => {
    const csv = toCsv([makeResult()]);
    const lines = csv.split('\n');
    expect(lines.length).toBe(2); // header + 1 data row
    expect(lines[1]).toContain('test-pkg');
    expect(lines[1]).toContain('npm');
    expect(lines[1]).toContain('100');
    expect(lines[1]).toContain('LOW');
  });

  test('handles multiple maintainers', () => {
    const csv = toCsv([makeResult({ maintainers: ['alice', 'bob', 'charlie'] })]);
    const lines = csv.split('\n');
    expect(lines[1]).toContain('alice; bob; charlie');
  });

  test('escapes fields with commas', () => {
    const csv = toCsv([makeResult({ package: 'test,pkg' })]);
    const lines = csv.split('\n');
    expect(lines[1]).toContain('"test,pkg"');
  });

  test('escapes fields with double quotes', () => {
    const csv = toCsv([makeResult({ package: 'test"pkg' })]);
    const lines = csv.split('\n');
    expect(lines[1]).toContain('"test""pkg"');
  });

  test('escapes fields with newlines', () => {
    const csv = toCsv([makeResult({ 
      deductions: [{ reason: 'Line1\nLine2', points: 10, confidence: 'high' }]
    })]);
    const lines = csv.split('\n');
    // Should be wrapped in quotes
    expect(csv).toContain('"Line1\nLine2"');
  });

  test('includes deduction info', () => {
    const result = makeResult({
      score: 60,
      riskLevel: 'MEDIUM',
      deductions: [
        { reason: 'No repository URL', points: 15, confidence: 'high' },
        { reason: 'Single maintainer', points: 10, confidence: 'medium' },
      ],
    });
    const csv = toCsv([result]);
    const lines = csv.split('\n');
    
    // Deduction count
    expect(lines[1]).toContain(',2,');
    // Deduction reasons (semicolon-separated)
    expect(lines[1]).toContain('No repository URL; Single maintainer');
    // Total deduction points
    expect(lines[1]).toContain(',25,'); // 15 + 10
  });

  test('includes vulnerability stats', () => {
    const result = makeResult({
      vulnerabilityStats: {
        total: 5,
        critical: 1,
        high: 2,
        recent: 3,
        hasUnfixed: true,
      },
    });
    const csv = toCsv([result]);
    const lines = csv.split('\n');
    
    // vuln_total, vuln_critical, vuln_high, vuln_recent, vuln_unfixed
    expect(lines[1]).toContain(',5,1,2,3,true,');
  });

  test('handles missing vulnerability stats', () => {
    const result = makeResult({});
    const csv = toCsv([result]);
    const lines = csv.split('\n');
    
    // Should have empty fields for vuln stats
    expect(lines[1]).toContain(',,,,,'); // 5 empty fields for vuln stats
  });

  test('includes ownership transfer flag', () => {
    const result = makeResult({ hasOwnershipTransfer: true });
    const csv = toCsv([result]);
    expect(csv).toContain(',true,');
  });

  test('includes malware history flag', () => {
    const result = makeResult({ hasMalwareHistory: true });
    const csv = toCsv([result]);
    expect(csv).toContain(',true,');
  });

  test('includes is_deleted flag', () => {
    const result = makeResult({ isDeleted: true });
    const csv = toCsv([result]);
    expect(csv).toContain(',true,');
  });

  test('includes last commit date', () => {
    const result = makeResult({ lastCommitDate: '2024-01-15' });
    const csv = toCsv([result]);
    expect(csv).toContain('2024-01-15');
  });

  test('handles empty results array', () => {
    const csv = toCsv([]);
    const lines = csv.split('\n');
    expect(lines.length).toBe(1); // Just header
    expect(lines[0]).toContain('package,ecosystem');
  });

  test('handles multiple packages', () => {
    const results = [
      makeResult({ package: 'pkg-a', ecosystem: 'npm', score: 90 }),
      makeResult({ package: 'pkg-b', ecosystem: 'pypi', score: 70 }),
      makeResult({ package: 'pkg-c', ecosystem: 'crates', score: 50 }),
    ];
    const csv = toCsv(results);
    const lines = csv.split('\n');
    
    expect(lines.length).toBe(4); // header + 3 data rows
    expect(lines[1]).toContain('pkg-a');
    expect(lines[2]).toContain('pkg-b');
    expect(lines[3]).toContain('pkg-c');
  });

  test('produces RFC 4180 compliant output', () => {
    const result = makeResult({
      package: 'complex,pkg"name',
      maintainers: ['alice', 'bob'],
      deductions: [
        { reason: 'Reason with, comma', points: 20, confidence: 'high' },
      ],
    });
    const csv = toCsv([result]);
    
    // Verify proper escaping
    expect(csv).toContain('"complex,pkg""name"'); // escaped package name
    expect(csv).toContain('"Reason with, comma"'); // escaped reason
  });

  test('all ecosystems produce valid output', () => {
    const ecosystems = ['npm', 'pypi', 'crates', 'rubygems', 'go', 'packagist', 'nuget', 'maven', 'hex', 'pub', 'cpan', 'cocoapods', 'conda'] as const;
    
    for (const eco of ecosystems) {
      const csv = toCsv([makeResult({ ecosystem: eco })]);
      expect(csv).toContain(eco);
    }
  });

  test('CRITICAL risk level packages', () => {
    const result = makeResult({
      score: 0,
      riskLevel: 'CRITICAL',
      hasMalwareHistory: true,
      deductions: [
        { reason: 'Known malware', points: 100, confidence: 'high' },
      ],
    });
    const csv = toCsv([result]);
    
    expect(csv).toContain('CRITICAL');
    expect(csv).toContain(',100,'); // total deduction points
  });

  test('handles special characters in package names', () => {
    const scoped = makeResult({ package: '@scope/package' });
    const csv = toCsv([scoped]);
    expect(csv).toContain('@scope/package');
  });

  test('row field count matches header count', () => {
    const result = makeResult({
      vulnerabilityStats: {
        total: 3,
        critical: 1,
        high: 1,
        recent: 2,
        hasUnfixed: true,
      },
      lastCommitDate: '2024-06-01',
    });
    const csv = toCsv([result]);
    const lines = csv.split('\n');
    
    // Parse carefully to handle quoted fields
    const headerFields = lines[0].split(',');
    
    // Count fields in data row (handle quoted fields)
    let dataFields = 0;
    let inQuote = false;
    for (const char of lines[1]) {
      if (char === '"') inQuote = !inQuote;
      if (char === ',' && !inQuote) dataFields++;
    }
    dataFields++; // Add 1 for last field
    
    expect(dataFields).toBe(headerFields.length);
  });
});
