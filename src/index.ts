/**
 * RepVet - Maintainer Reputation Checker
 * 
 * Public API
 */

export { checkPackageReputation } from './scorer.js';
export { fetchPackageInfo, checkOwnershipTransfer } from './registry/npm.js';
export { fetchPyPIPackageInfo } from './registry/pypi.js';
export { fetchCratesPackageInfo, checkCratesOwnershipTransfer } from './registry/crates.js';
export { parseGitHubUrl, fetchLastCommitDate } from './registry/github.js';
export { hasMalwareHistory, getMalwareDetails, KNOWN_MALWARE_PACKAGES } from './malware/known-packages.js';
export { queryPackageVulnerabilities, analyzeVulnerabilityHistory } from './osv/client.js';
export * from './types.js';
