/**
 * SARIF (Static Analysis Results Interchange Format) output formatter
 * Spec: OASIS SARIF v2.1.0
 * https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
 */

import { createRequire } from 'module';
import { ReputationResult, Deduction } from './types.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

/** SARIF severity levels */
type SarifLevel = 'error' | 'warning' | 'note' | 'none';

/** Map RepVet risk levels to SARIF severity levels */
function riskToLevel(riskLevel: string): SarifLevel {
  switch (riskLevel) {
    case 'CRITICAL': return 'error';
    case 'HIGH': return 'error';
    case 'MEDIUM': return 'warning';
    case 'LOW': return 'note';
    default: return 'none';
  }
}

/** Map deduction confidence to SARIF level */
function confidenceToLevel(confidence: string, points: number): SarifLevel {
  if (points >= 30) return 'error';
  if (points >= 15) return 'warning';
  return 'note';
}

/**
 * Generate a stable rule ID from a deduction reason.
 * Normalises free-text reasons into kebab-case identifiers.
 */
function reasonToRuleId(reason: string): string {
  return reason
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * SARIF rule descriptor for a deduction type
 */
interface SarifRule {
  id: string;
  shortDescription: { text: string };
  helpUri?: string;
  properties?: {
    tags?: string[];
  };
}

/**
 * Build unique SARIF rules from all deductions across results.
 * Deduplicates by rule ID.
 */
function buildRules(results: ReputationResult[]): SarifRule[] {
  const seen = new Map<string, SarifRule>();

  for (const result of results) {
    for (const d of result.deductions) {
      const id = reasonToRuleId(d.reason);
      if (!seen.has(id)) {
        const tags: string[] = ['security', 'supply-chain'];
        if (d.reason.toLowerCase().includes('malware')) tags.push('malware');
        if (d.reason.toLowerCase().includes('vulnerability') || d.reason.toLowerCase().includes('vuln')) tags.push('vulnerability');
        if (d.reason.toLowerCase().includes('maintainer') || d.reason.toLowerCase().includes('ownership')) tags.push('maintainer');
        if (d.reason.toLowerCase().includes('deprecated') || d.reason.toLowerCase().includes('archived')) tags.push('deprecated');

        seen.set(id, {
          id,
          shortDescription: { text: d.reason },
          properties: { tags },
        });
      }
    }
  }

  return [...seen.values()];
}

/**
 * Convert RepVet scan results to SARIF v2.1.0 JSON.
 *
 * @param results - Array of reputation check results
 * @param scanTarget - Path or description of what was scanned
 * @returns SARIF JSON object (ready for JSON.stringify)
 */
export function toSarif(
  results: ReputationResult[],
  scanTarget?: string,
): Record<string, unknown> {
  const rules = buildRules(results);
  const ruleIndex = new Map(rules.map((r, i) => [r.id, i]));

  // Build SARIF results: one per package (summary) + one per deduction (detail)
  const sarifResults: Record<string, unknown>[] = [];

  for (const result of results) {
    // Skip LOW-risk packages with no deductions (clean)
    if (result.riskLevel === 'LOW' && result.deductions.length === 0) continue;

    // Summary result per package
    const pkgUri = packageUri(result.package, result.ecosystem);

    // One result per deduction for granular reporting
    for (const d of result.deductions) {
      const ruleId = reasonToRuleId(d.reason);
      const entry: Record<string, unknown> = {
        ruleId,
        ruleIndex: ruleIndex.get(ruleId),
        level: confidenceToLevel(d.confidence, d.points),
        message: {
          text: `[${result.ecosystem}] ${result.package}: ${d.reason} (-${d.points} points, ${d.confidence} confidence)`,
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: scanTarget || 'package.json',
                uriBaseId: '%SRCROOT%',
              },
            },
            logicalLocations: [
              {
                fullyQualifiedName: `${result.ecosystem}/${result.package}`,
                kind: 'module',
              },
            ],
          },
        ],
        properties: {
          'repvet/package': result.package,
          'repvet/ecosystem': result.ecosystem,
          'repvet/score': result.score,
          'repvet/riskLevel': result.riskLevel,
          'repvet/deductionPoints': d.points,
          'repvet/confidence': d.confidence,
        },
      };

      sarifResults.push(entry);
    }

    // If package has risk but somehow no deductions (e.g. malware-only),
    // emit a single summary result
    if (result.deductions.length === 0 && result.riskLevel !== 'LOW') {
      sarifResults.push({
        ruleId: 'package-risk',
        level: riskToLevel(result.riskLevel),
        message: {
          text: `[${result.ecosystem}] ${result.package}: Score ${result.score}/100 (${result.riskLevel} risk)`,
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: scanTarget || 'package.json',
                uriBaseId: '%SRCROOT%',
              },
            },
            logicalLocations: [
              {
                fullyQualifiedName: `${result.ecosystem}/${result.package}`,
                kind: 'module',
              },
            ],
          },
        ],
        properties: {
          'repvet/package': result.package,
          'repvet/ecosystem': result.ecosystem,
          'repvet/score': result.score,
          'repvet/riskLevel': result.riskLevel,
        },
      });
    }
  }

  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'RepVet',
            version: packageJson.version,
            informationUri: 'https://github.com/taku-tez/repvet',
            semanticVersion: packageJson.version,
            rules,
          },
        },
        results: sarifResults,
        invocations: [
          {
            executionSuccessful: true,
            commandLine: `repvet scan ${scanTarget || '(unknown)'}`,
          },
        ],
      },
    ],
  };
}

/**
 * Build a package URI for registry linking
 */
function packageUri(name: string, ecosystem: string): string {
  switch (ecosystem) {
    case 'npm': return `https://www.npmjs.com/package/${name}`;
    case 'pypi': return `https://pypi.org/project/${name}`;
    case 'crates': return `https://crates.io/crates/${name}`;
    case 'rubygems': return `https://rubygems.org/gems/${name}`;
    case 'go': return `https://pkg.go.dev/${name}`;
    case 'packagist': return `https://packagist.org/packages/${name}`;
    case 'nuget': return `https://www.nuget.org/packages/${name}`;
    case 'maven': return `https://search.maven.org/search?q=${name}`;
    case 'hex': return `https://hex.pm/packages/${name}`;
    case 'pub': return `https://pub.dev/packages/${name}`;
    case 'cpan': return `https://metacpan.org/pod/${name}`;
    case 'cocoapods': return `https://cocoapods.org/pods/${name}`;
    case 'conda': return `https://anaconda.org/conda-forge/${name}`;
    default: return name;
  }
}
