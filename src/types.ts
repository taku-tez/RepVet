/**
 * RepVet Types
 */

export type Ecosystem = 'npm' | 'pypi' | 'crates' | 'go' | 'rubygems';

export interface PackageInfo {
  name: string;
  version: string;
  maintainers: Maintainer[];
  repository?: RepositoryInfo;
  time?: Record<string, string>;
  ecosystem: Ecosystem;
  downloads?: number; // For adjusting scoring based on popularity
}

export interface Maintainer {
  name: string;
  email?: string;
}

export interface RepositoryInfo {
  type: string;
  url: string;
}

export interface ReputationResult {
  package: string;
  ecosystem: Ecosystem;
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  deductions: Deduction[];
  maintainers: string[];
  lastCommitDate?: string;
  hasOwnershipTransfer: boolean;
  hasMalwareHistory: boolean;
  vulnerabilityStats?: VulnerabilityStats;
}

export interface Deduction {
  reason: string;
  points: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface VulnerabilityStats {
  total: number;
  critical: number;
  high: number;
  recent: number;
  hasUnfixed: boolean;
}

export interface ScanOptions {
  json?: boolean;
  threshold?: number;
  failUnder?: number;
  ecosystem?: Ecosystem;
}

export interface ScanResult {
  packages: ReputationResult[];
  summary: {
    total: number;
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}
