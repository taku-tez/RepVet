/**
 * RepVet Types
 */

export interface PackageInfo {
  name: string;
  version: string;
  maintainers: Maintainer[];
  repository?: RepositoryInfo;
  time?: Record<string, string>;
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
  score: number;
  deductions: Deduction[];
  maintainers: string[];
  lastCommitDate?: string;
  hasOwnershipTransfer: boolean;
  hasMalwareHistory: boolean;
}

export interface Deduction {
  reason: string;
  points: number;
}

export interface ScanOptions {
  json?: boolean;
  threshold?: number;
  failUnder?: number;
}
