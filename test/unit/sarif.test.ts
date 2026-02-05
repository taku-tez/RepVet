/**
 * SARIF output formatter tests
 */

import { toSarif } from '../../src/sarif.js';
import { ReputationResult } from '../../src/types.js';

describe('SARIF output', () => {
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

  test('produces valid SARIF v2.1.0 envelope', () => {
    const sarif = toSarif([makeResult()]);
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.$schema).toContain('sarif-schema-2.1.0');
    expect(Array.isArray(sarif.runs)).toBe(true);
    expect((sarif.runs as unknown[]).length).toBe(1);
  });

  test('includes tool driver info', () => {
    const sarif = toSarif([makeResult()]);
    const run = (sarif.runs as Record<string, unknown>[])[0];
    const tool = run.tool as Record<string, unknown>;
    const driver = tool.driver as Record<string, unknown>;
    expect(driver.name).toBe('RepVet');
    expect(typeof driver.version).toBe('string');
    expect(driver.informationUri).toContain('repvet');
  });

  test('skips LOW-risk packages with no deductions', () => {
    const sarif = toSarif([makeResult({ riskLevel: 'LOW', deductions: [] })]);
    const run = (sarif.runs as Record<string, unknown>[])[0];
    const results = run.results as unknown[];
    expect(results.length).toBe(0);
  });

  test('emits results for packages with deductions', () => {
    const result = makeResult({
      score: 60,
      riskLevel: 'MEDIUM',
      deductions: [
        { reason: 'No repository URL', points: 15, confidence: 'high' },
        { reason: 'Single maintainer', points: 10, confidence: 'medium' },
      ],
    });
    const sarif = toSarif([result]);
    const run = (sarif.runs as Record<string, unknown>[])[0];
    const sarifResults = run.results as Record<string, unknown>[];
    
    // One result per deduction
    expect(sarifResults.length).toBe(2);
    
    // Check first result
    expect(sarifResults[0].ruleId).toBe('no-repository-url');
    expect(sarifResults[0].level).toBe('warning'); // 15 points
    const msg0 = sarifResults[0].message as Record<string, string>;
    expect(msg0.text).toContain('test-pkg');
    expect(msg0.text).toContain('No repository URL');
    
    // Check second result
    expect(sarifResults[1].ruleId).toBe('single-maintainer');
    expect(sarifResults[1].level).toBe('note'); // 10 points
  });

  test('maps CRITICAL deductions to error level', () => {
    const result = makeResult({
      score: 0,
      riskLevel: 'CRITICAL',
      deductions: [
        { reason: 'Known malware package', points: 100, confidence: 'high' },
      ],
    });
    const sarif = toSarif([result]);
    const run = (sarif.runs as Record<string, unknown>[])[0];
    const sarifResults = run.results as Record<string, unknown>[];
    
    expect(sarifResults[0].level).toBe('error');
  });

  test('deduplicates rules across multiple packages', () => {
    const results = [
      makeResult({
        package: 'pkg-a',
        score: 70,
        riskLevel: 'MEDIUM',
        deductions: [
          { reason: 'No repository URL', points: 15, confidence: 'high' },
        ],
      }),
      makeResult({
        package: 'pkg-b',
        score: 70,
        riskLevel: 'MEDIUM',
        deductions: [
          { reason: 'No repository URL', points: 15, confidence: 'high' },
          { reason: 'Few downloads', points: 5, confidence: 'low' },
        ],
      }),
    ];
    
    const sarif = toSarif(results);
    const run = (sarif.runs as Record<string, unknown>[])[0];
    const tool = run.tool as Record<string, unknown>;
    const driver = tool.driver as Record<string, unknown>;
    const rules = driver.rules as Record<string, unknown>[];
    
    // 2 unique rules, not 3
    expect(rules.length).toBe(2);
    expect(rules.map(r => r.id)).toContain('no-repository-url');
    expect(rules.map(r => r.id)).toContain('few-downloads');
  });

  test('includes properties with repvet metadata', () => {
    const result = makeResult({
      package: 'evil-lib',
      ecosystem: 'pypi',
      score: 20,
      riskLevel: 'HIGH',
      deductions: [
        { reason: 'Ownership transfer detected', points: 30, confidence: 'high' },
      ],
    });
    
    const sarif = toSarif([result], 'requirements.txt');
    const run = (sarif.runs as Record<string, unknown>[])[0];
    const sarifResults = run.results as Record<string, unknown>[];
    const props = sarifResults[0].properties as Record<string, unknown>;
    
    expect(props['repvet/package']).toBe('evil-lib');
    expect(props['repvet/ecosystem']).toBe('pypi');
    expect(props['repvet/score']).toBe(20);
    expect(props['repvet/riskLevel']).toBe('HIGH');
    expect(props['repvet/deductionPoints']).toBe(30);
  });

  test('includes scan target in artifact location', () => {
    const result = makeResult({
      score: 50,
      riskLevel: 'HIGH',
      deductions: [
        { reason: 'Test issue', points: 50, confidence: 'high' },
      ],
    });
    
    const sarif = toSarif([result], 'my-app/package.json');
    const run = (sarif.runs as Record<string, unknown>[])[0];
    const sarifResults = run.results as Record<string, unknown>[];
    const locations = sarifResults[0].locations as Record<string, unknown>[];
    const physical = locations[0].physicalLocation as Record<string, unknown>;
    const artifact = physical.artifactLocation as Record<string, unknown>;
    
    expect(artifact.uri).toBe('my-app/package.json');
  });

  test('includes logical location with ecosystem/package', () => {
    const result = makeResult({
      package: 'serde',
      ecosystem: 'crates',
      score: 50,
      riskLevel: 'HIGH',
      deductions: [
        { reason: 'Test', points: 50, confidence: 'high' },
      ],
    });
    
    const sarif = toSarif([result]);
    const run = (sarif.runs as Record<string, unknown>[])[0];
    const sarifResults = run.results as Record<string, unknown>[];
    const locations = sarifResults[0].locations as Record<string, unknown>[];
    const logical = (locations[0].logicalLocations as Record<string, unknown>[])[0];
    
    expect(logical.fullyQualifiedName).toBe('crates/serde');
    expect(logical.kind).toBe('module');
  });

  test('includes invocations with commandLine', () => {
    const sarif = toSarif([], 'project/');
    const run = (sarif.runs as Record<string, unknown>[])[0];
    const invocations = run.invocations as Record<string, unknown>[];
    
    expect(invocations.length).toBe(1);
    expect(invocations[0].executionSuccessful).toBe(true);
    expect(invocations[0].commandLine).toContain('project/');
  });

  test('tags rules with relevant categories', () => {
    const result = makeResult({
      score: 10,
      riskLevel: 'CRITICAL',
      deductions: [
        { reason: 'Known malware package', points: 100, confidence: 'high' },
        { reason: 'Ownership transfer detected', points: 30, confidence: 'high' },
        { reason: 'Package deprecated', points: 10, confidence: 'high' },
      ],
    });
    
    const sarif = toSarif([result]);
    const run = (sarif.runs as Record<string, unknown>[])[0];
    const tool = run.tool as Record<string, unknown>;
    const driver = tool.driver as Record<string, unknown>;
    const rules = driver.rules as Array<{ id: string; properties?: { tags?: string[] } }>;
    
    const malwareRule = rules.find(r => r.id.includes('malware'));
    expect(malwareRule?.properties?.tags).toContain('malware');
    
    const ownershipRule = rules.find(r => r.id.includes('ownership'));
    expect(ownershipRule?.properties?.tags).toContain('maintainer');
    
    const deprecatedRule = rules.find(r => r.id.includes('deprecated'));
    expect(deprecatedRule?.properties?.tags).toContain('deprecated');
  });

  test('handles empty results array', () => {
    const sarif = toSarif([]);
    const run = (sarif.runs as Record<string, unknown>[])[0];
    const results = run.results as unknown[];
    const tool = run.tool as Record<string, unknown>;
    const driver = tool.driver as Record<string, unknown>;
    const rules = driver.rules as unknown[];
    
    expect(results.length).toBe(0);
    expect(rules.length).toBe(0);
  });

  test('handles HIGH-risk package with no deductions (edge case)', () => {
    const result = makeResult({
      score: 30,
      riskLevel: 'HIGH',
      deductions: [],
    });
    
    const sarif = toSarif([result]);
    const run = (sarif.runs as Record<string, unknown>[])[0];
    const sarifResults = run.results as Record<string, unknown>[];
    
    // Should emit a summary result even with no deductions
    expect(sarifResults.length).toBe(1);
    expect(sarifResults[0].level).toBe('error');
    const msg = sarifResults[0].message as Record<string, string>;
    expect(msg.text).toContain('Score 30/100');
  });

  test('multiple ecosystems in same scan', () => {
    const results = [
      makeResult({
        package: 'lodash',
        ecosystem: 'npm',
        score: 60,
        riskLevel: 'MEDIUM',
        deductions: [{ reason: 'Issue A', points: 20, confidence: 'high' }],
      }),
      makeResult({
        package: 'requests',
        ecosystem: 'pypi',
        score: 55,
        riskLevel: 'MEDIUM',
        deductions: [{ reason: 'Issue B', points: 25, confidence: 'medium' }],
      }),
    ];
    
    const sarif = toSarif(results);
    const run = (sarif.runs as Record<string, unknown>[])[0];
    const sarifResults = run.results as Record<string, unknown>[];
    
    expect(sarifResults.length).toBe(2);
    
    // Check ecosystem info in properties
    const props0 = sarifResults[0].properties as Record<string, unknown>;
    const props1 = sarifResults[1].properties as Record<string, unknown>;
    expect(props0['repvet/ecosystem']).toBe('npm');
    expect(props1['repvet/ecosystem']).toBe('pypi');
  });
});
