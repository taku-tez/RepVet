/**
 * Conda Registry API (Anaconda.org)
 * 
 * Supports both anaconda and conda-forge channels
 */

import { PackageInfo, Maintainer } from '../types.js';
import { fetchWithRetry, OwnershipTransferResult, NO_TRANSFER_DETECTED } from './utils.js';

const ANACONDA_API = 'https://api.anaconda.org';

// Common channels to search in order of preference
const DEFAULT_CHANNELS = ['conda-forge', 'anaconda', 'bioconda', 'defaults'];

interface AnacondaPackageResponse {
  name: string;
  id: string;
  package_types: string[];
  summary?: string;
  description?: string;
  home?: string;
  public: boolean;
  owner: {
    login: string;
    name: string;
    user_type: 'user' | 'org';
    created_at?: string;
    description?: string;
  };
  full_name: string;
  url: string;
  html_url: string;
  versions: string[];
  latest_version: string;
  platforms?: Record<string, string>;
  conda_platforms?: string[];
  revision?: number;
  license?: string;
  dev_url?: string;
  doc_url?: string;
  source_git_url?: string;
  builds?: string[];
  files?: Array<{
    version: string;
    upload_time: string;
    attrs?: {
      depends?: string[];
    };
  }>;
}

interface AnacondaFileInfo {
  version: string;
  upload_time: string;
  basename: string;
  uploader?: string;
  attrs?: {
    depends?: string[];
    timestamp?: number;
  };
}

export interface CondaPackageData extends PackageInfo {
  ecosystem: 'conda';
  channel: string;
  platforms?: string[];
  license?: string;
  totalDownloads?: number;
}

/**
 * Extract GitHub repository URL from various package metadata fields
 */
function extractRepoUrl(pkg: AnacondaPackageResponse): string | undefined {
  // Priority: dev_url (usually GitHub) > source_git_url > home
  if (pkg.dev_url && (pkg.dev_url.includes('github.com') || pkg.dev_url.includes('gitlab.com'))) {
    return pkg.dev_url;
  }
  if (pkg.source_git_url) {
    return pkg.source_git_url;
  }
  if (pkg.home && (pkg.home.includes('github.com') || pkg.home.includes('gitlab.com'))) {
    return pkg.home;
  }
  return undefined;
}

/**
 * Fetch package info from a specific channel
 */
async function fetchFromChannel(
  packageName: string, 
  channel: string
): Promise<CondaPackageData | null> {
  try {
    const response = await fetchWithRetry(
      `${ANACONDA_API}/package/${encodeURIComponent(channel)}/${encodeURIComponent(packageName)}`,
      { timeoutMs: 10000 }
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Anaconda API error: ${response.status}`);
    }
    
    const data = await response.json() as AnacondaPackageResponse;
    
    // Build maintainer info from owner
    const maintainers: Maintainer[] = [{
      name: data.owner.name || data.owner.login,
    }];
    
    // Extract repository URL
    const repoUrl = extractRepoUrl(data);
    
    // Build time map from versions
    // Note: Anaconda API doesn't provide timestamps per version in the main endpoint
    // We use revision count to estimate download popularity instead
    const time: Record<string, string> = {};
    
    // Estimate downloads based on revision count (each build increment = activity)
    // conda-forge packages with high revisions are heavily used
    const revisionCount = data.revision || 0;
    let estimatedDownloads = 0;
    if (revisionCount > 5000) estimatedDownloads = 100000000;
    else if (revisionCount > 1000) estimatedDownloads = 10000000;
    else if (revisionCount > 500) estimatedDownloads = 1000000;
    else if (revisionCount > 100) estimatedDownloads = 100000;
    else estimatedDownloads = revisionCount * 100;
    
    return {
      name: data.name,
      version: data.latest_version,
      maintainers,
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'conda',
      downloads: estimatedDownloads,
      channel,
      platforms: data.conda_platforms,
      license: data.license,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Fetch conda package info, searching across common channels
 * 
 * @param packageName - Package name
 * @param channel - Specific channel (optional, will search defaults if not provided)
 */
export async function fetchCondaPackageInfo(
  packageName: string,
  channel?: string
): Promise<CondaPackageData | null> {
  try {
    // If specific channel provided, only check that one
    if (channel) {
      return await fetchFromChannel(packageName, channel);
    }
    
    // Search across default channels
    for (const ch of DEFAULT_CHANNELS) {
      const result = await fetchFromChannel(packageName, ch);
      if (result) {
        return result;
      }
    }
    
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch Conda package info: ${message}`);
  }
}

/**
 * Fetch package files to check for ownership changes
 */
async function fetchPackageFiles(
  channel: string,
  packageName: string
): Promise<AnacondaFileInfo[]> {
  try {
    const response = await fetchWithRetry(
      `${ANACONDA_API}/package/${encodeURIComponent(channel)}/${encodeURIComponent(packageName)}/files`,
      { timeoutMs: 10000 }
    );
    
    if (!response.ok) {
      return [];
    }
    
    return await response.json() as AnacondaFileInfo[];
  } catch {
    return [];
  }
}

/**
 * Check for ownership transfer in conda packages
 * 
 * Note: Conda packages are typically maintained by the channel (e.g., conda-forge)
 * rather than individual maintainers, so ownership transfer is less of a concern.
 * However, we can still check for uploader changes.
 */
export async function checkCondaOwnershipTransfer(
  packageName: string,
  channel: string = 'conda-forge'
): Promise<OwnershipTransferResult> {
  try {
    const files = await fetchPackageFiles(channel, packageName);
    
    if (files.length < 2) {
      return NO_TRANSFER_DETECTED;
    }
    
    // Sort by upload time
    const sortedFiles = files
      .filter(f => f.upload_time)
      .sort((a, b) => new Date(a.upload_time).getTime() - new Date(b.upload_time).getTime());
    
    // Track uploaders
    const uploaders = new Set<string>();
    let lastUploader: string | undefined;
    let suspiciousChange = false;
    
    for (const file of sortedFiles) {
      if (file.uploader) {
        if (lastUploader && file.uploader !== lastUploader) {
          uploaders.add(file.uploader);
          uploaders.add(lastUploader);
        }
        lastUploader = file.uploader;
      }
    }
    
    // Multiple uploaders isn't necessarily suspicious for conda-forge
    // (community-maintained), but we flag if there are many different ones
    if (uploaders.size > 5) {
      suspiciousChange = true;
    }
    
    if (suspiciousChange) {
      return {
        transferred: true,
        confidence: 'low',
        details: `Multiple uploaders detected (${uploaders.size} different)`,
      };
    }
    
    return NO_TRANSFER_DETECTED;
  } catch {
    return NO_TRANSFER_DETECTED;
  }
}

/**
 * Parse environment.yml (Conda environment file)
 * 
 * Format:
 * ```yaml
 * name: myenv
 * channels:
 *   - conda-forge
 *   - defaults
 * dependencies:
 *   - numpy=1.21
 *   - pandas>=1.3
 *   - python=3.9
 *   - pip:
 *     - requests
 *     - flask>=2.0
 * ```
 */
export function parseEnvironmentYaml(content: string): { 
  condaPackages: string[]; 
  pipPackages: string[];
  channels: string[];
} {
  const condaPackages: string[] = [];
  const pipPackages: string[] = [];
  const channels: string[] = [];
  
  const lines = content.split('\n');
  let inDependencies = false;
  let inPip = false;
  let inChannels = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    // Detect section changes
    if (trimmed === 'dependencies:' || trimmed.startsWith('dependencies:')) {
      inDependencies = true;
      inPip = false;
      inChannels = false;
      continue;
    }
    
    if (trimmed === 'channels:' || trimmed.startsWith('channels:')) {
      inChannels = true;
      inDependencies = false;
      inPip = false;
      continue;
    }
    
    // New top-level section
    if (!line.startsWith(' ') && !line.startsWith('\t') && trimmed.endsWith(':')) {
      inDependencies = false;
      inPip = false;
      inChannels = false;
      continue;
    }
    
    // Parse channels
    if (inChannels && trimmed.startsWith('-')) {
      const channel = trimmed.slice(1).trim();
      if (channel && !channel.includes(':')) {
        channels.push(channel);
      }
      continue;
    }
    
    // Parse dependencies
    if (inDependencies) {
      // Check for pip subsection
      if (trimmed === '- pip:' || trimmed === '-pip:') {
        inPip = true;
        continue;
      }
      
      // Pip packages (more indented under - pip:)
      if (inPip && trimmed.startsWith('-')) {
        const pkg = trimmed.slice(1).trim();
        // Extract package name before version specifier
        const nameMatch = pkg.match(/^([a-zA-Z0-9][a-zA-Z0-9._-]*)/);
        if (nameMatch) {
          pipPackages.push(nameMatch[1]);
        }
        continue;
      }
      
      // Conda packages
      if (trimmed.startsWith('-')) {
        const pkg = trimmed.slice(1).trim();
        
        // Skip python itself and pip
        if (pkg.startsWith('python=') || pkg.startsWith('python>') || 
            pkg.startsWith('python<') || pkg === 'python' ||
            pkg === 'pip' || pkg.startsWith('pip=')) {
          continue;
        }
        
        // Extract package name before version specifier
        // Handles: numpy=1.21, numpy>=1.21, numpy, numpy[extra]
        const nameMatch = pkg.match(/^([a-zA-Z0-9][a-zA-Z0-9._-]*)(?:\[.*?\])?/);
        if (nameMatch) {
          condaPackages.push(nameMatch[1]);
        }
        // Reset pip mode when we see a top-level dependency
        inPip = false;
      }
    }
  }
  
  return { condaPackages, pipPackages, channels };
}
