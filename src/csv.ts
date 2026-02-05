/**
 * CSV (Comma-Separated Values) output formatter
 * Spec: RFC 4180
 */

import { ReputationResult } from './types.js';

/**
 * Escape a field value for CSV output.
 * Wraps in quotes if it contains comma, quote, or newline.
 */
function escapeField(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) {
    return '';
  }
  
  const str = String(value);
  
  // If contains comma, double-quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * CSV column definitions
 */
const COLUMNS = [
  'package',
  'ecosystem',
  'score',
  'risk_level',
  'maintainers',
  'deduction_count',
  'deduction_reasons',
  'deduction_points_total',
  'vuln_total',
  'vuln_critical',
  'vuln_high',
  'vuln_recent',
  'vuln_unfixed',
  'has_ownership_transfer',
  'has_malware_history',
  'is_deleted',
  'last_commit_date',
] as const;

/**
 * Convert RepVet scan results to CSV format.
 *
 * @param results - Array of reputation check results
 * @param includeHeader - Whether to include header row (default: true)
 * @returns CSV string
 */
export function toCsv(results: ReputationResult[], includeHeader = true): string {
  const rows: string[] = [];
  
  // Header row
  if (includeHeader) {
    rows.push(COLUMNS.join(','));
  }
  
  // Data rows
  for (const result of results) {
    const totalDeductionPoints = result.deductions.reduce((sum, d) => sum + d.points, 0);
    const deductionReasons = result.deductions.map(d => d.reason).join('; ');
    
    const row = [
      escapeField(result.package),
      escapeField(result.ecosystem),
      escapeField(result.score),
      escapeField(result.riskLevel),
      escapeField(result.maintainers.join('; ')),
      escapeField(result.deductions.length),
      escapeField(deductionReasons),
      escapeField(totalDeductionPoints),
      escapeField(result.vulnerabilityStats?.total ?? ''),
      escapeField(result.vulnerabilityStats?.critical ?? ''),
      escapeField(result.vulnerabilityStats?.high ?? ''),
      escapeField(result.vulnerabilityStats?.recent ?? ''),
      escapeField(result.vulnerabilityStats?.hasUnfixed ?? ''),
      escapeField(result.hasOwnershipTransfer),
      escapeField(result.hasMalwareHistory),
      escapeField(result.isDeleted ?? false),
      escapeField(result.lastCommitDate ?? ''),
    ];
    
    rows.push(row.join(','));
  }
  
  return rows.join('\n');
}

/**
 * Get CSV column headers as an array.
 */
export function getCsvHeaders(): readonly string[] {
  return COLUMNS;
}
