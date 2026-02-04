/**
 * RepVet - Maintainer Reputation Checker
 * 
 * Public API
 */

export { checkPackageReputation } from './scorer.js';
export { fetchPackageInfo, checkOwnershipTransfer } from './registry/npm.js';
export { fetchPyPIPackageInfo } from './registry/pypi.js';
export { fetchCratesPackageInfo, checkCratesOwnershipTransfer } from './registry/crates.js';
export { fetchRubyGemsPackageInfo } from './registry/rubygems.js';
export { fetchGoPackageInfo } from './registry/golang.js';
export { fetchPackagistPackageInfo } from './registry/packagist.js';
export { fetchNuGetPackageInfo } from './registry/nuget.js';
export { fetchMavenPackageInfo } from './registry/maven.js';
export { fetchHexPackageInfo } from './registry/hex.js';
export { fetchPubPackageInfo } from './registry/pub.js';
export { fetchCPANPackageInfo } from './registry/cpan.js';
export { fetchCocoaPodsPackageInfo } from './registry/cocoapods.js';
export { parseGitHubUrl, fetchLastCommitDate, fetchRepoInfo, fetchGitHubStars } from './registry/github.js';
export type { GitHubRepoInfo, GitHubCommitInfo } from './registry/github.js';
export { hasMalwareHistory, getMalwareDetails, KNOWN_MALWARE_PACKAGES } from './malware/known-packages.js';
export type { OwnershipTransferResult } from './registry/utils.js';
export { cleanRepoUrl, isValidRepoUrl, parseMaintainerString, fetchWithRetry } from './registry/utils.js';
export type { FetchWithRetryOptions } from './registry/utils.js';
export { queryPackageVulnerabilities, analyzeVulnerabilityHistory } from './osv/client.js';
export * from './types.js';
export type { PackageDependency } from './types.js';
