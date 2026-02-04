/**
 * Maven Central Registry API
 */

import { PackageInfo } from '../types.js';
import { fetchWithRetry } from './utils.js';

const MAVEN_REPO = 'https://repo1.maven.org/maven2';

/**
 * Parse Maven coordinate (groupId:artifactId)
 */
function parseCoordinate(coordinate: string): { groupId: string; artifactId: string } | null {
  const parts = coordinate.split(':');
  if (parts.length >= 2) {
    return { groupId: parts[0], artifactId: parts[1] };
  }
  return null;
}

/**
 * Relocation detection result
 */
export interface MavenRelocationResult {
  relocated: boolean;
  newGroupId?: string;
  newArtifactId?: string;
  newVersion?: string;
  message?: string;
}

/**
 * Extended Maven package data with relocation info
 */
export interface MavenPackageData extends PackageInfo {
  ecosystem: 'maven';
  deprecated?: string;           // Deprecation/relocation message
  relocatedTo?: string;          // New coordinate if relocated
}

export async function fetchMavenPackageInfo(coordinate: string): Promise<MavenPackageData | null> {
  try {
    const parsed = parseCoordinate(coordinate);
    if (!parsed) {
      // Return null for invalid coordinates instead of throwing
      return null;
    }
    
    const { groupId, artifactId } = parsed;
    const groupPath = groupId.replace(/\./g, '/');
    
    // Fetch maven-metadata.xml
    const metadataUrl = `${MAVEN_REPO}/${groupPath}/${artifactId}/maven-metadata.xml`;
    const response = await fetchWithRetry(metadataUrl, { timeoutMs: 10000 });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Maven API error: ${response.status}`);
    }
    
    const xml = await response.text();
    
    // Parse XML (simple regex parsing)
    const latestMatch = xml.match(/<latest>([^<]+)<\/latest>/);
    const releaseMatch = xml.match(/<release>([^<]+)<\/release>/);
    const versionsMatch = xml.matchAll(/<version>([^<]+)<\/version>/g);
    
    const latestVersion = releaseMatch?.[1] || latestMatch?.[1] || '';
    const versions = Array.from(versionsMatch).map(m => m[1]);
    
    // Build time map (Maven doesn't provide timestamps in metadata)
    const time: Record<string, string> = {};
    
    // Try to get POM for latest version to extract developer info and relocation
    const maintainers: Array<{ name: string }> = [];
    let deprecated: string | undefined;
    let relocatedTo: string | undefined;
    let repoUrl: string | undefined;
    
    if (latestVersion) {
      try {
        const pomUrl = `${MAVEN_REPO}/${groupPath}/${artifactId}/${latestVersion}/${artifactId}-${latestVersion}.pom`;
        const pomResponse = await fetchWithRetry(pomUrl, { timeoutMs: 10000 });
        if (pomResponse.ok) {
          const pom = await pomResponse.text();
          
          // Check for relocation
          const relocationMatch = pom.match(/<relocation>([\s\S]*?)<\/relocation>/);
          if (relocationMatch) {
            const relocation = relocationMatch[1];
            const newGroupId = relocation.match(/<groupId>([^<]+)<\/groupId>/)?.[1];
            const newArtifactId = relocation.match(/<artifactId>([^<]+)<\/artifactId>/)?.[1];
            const message = relocation.match(/<message>([^<]+)<\/message>/)?.[1];
            
            // Build new coordinate
            const newCoords: string[] = [];
            if (newGroupId) newCoords.push(newGroupId);
            else newCoords.push(groupId);
            if (newArtifactId) newCoords.push(newArtifactId);
            else newCoords.push(artifactId);
            
            relocatedTo = newCoords.join(':');
            deprecated = message || `Relocated to ${relocatedTo}`;
          }
          
          // Extract developers
          const developerMatches = pom.matchAll(/<developer>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/developer>/g);
          for (const match of developerMatches) {
            maintainers.push({ name: match[1].trim() });
          }
          
          // Extract organization if no developers
          if (maintainers.length === 0) {
            const orgMatch = pom.match(/<organization>[\s\S]*?<name>([^<]+)<\/name>/);
            if (orgMatch) {
              maintainers.push({ name: orgMatch[1].trim() });
            }
          }
          
          // Repository URL from SCM
          const scmMatch = pom.match(/<scm>[\s\S]*?<url>([^<]+)<\/url>/);
          if (scmMatch && (scmMatch[1].includes('github.com') || scmMatch[1].includes('gitlab.com'))) {
            repoUrl = scmMatch[1];
          }
        }
      } catch {
        // Ignore POM fetch errors
      }
    }
    
    return {
      name: coordinate,
      version: latestVersion,
      maintainers: maintainers.length > 0 ? maintainers : [{ name: groupId.split('.').pop() || groupId }],
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'maven',
      downloads: versions.length * 10000, // Rough estimate based on version count
      deprecated,
      relocatedTo,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch Maven package info: ${message}`);
  }
}

/**
 * Get all versions from directory listing (for relocation POMs not in metadata.xml)
 */
async function getVersionsFromDirectory(groupPath: string, artifactId: string): Promise<string[]> {
  try {
    const dirUrl = `${MAVEN_REPO}/${groupPath}/${artifactId}/`;
    const response = await fetchWithRetry(dirUrl, { timeoutMs: 10000 });
    if (!response.ok) return [];
    
    const html = await response.text();
    // Match version directories like href="1.7.0/"
    const versionPattern = /href="([0-9][^"/]*)\/?"/g;
    const versions: string[] = [];
    let match;
    while ((match = versionPattern.exec(html)) !== null) {
      versions.push(match[1]);
    }
    return versions;
  } catch {
    return [];
  }
}

/**
 * Check for relocation in a Maven artifact
 * 
 * Maven uses <relocation> element in POM to indicate artifact has moved
 * to a new groupId/artifactId.
 * 
 * Checks versions from both metadata.xml and directory listing since
 * relocation POMs are often published as separate versions not listed
 * in metadata.xml.
 */
export async function checkMavenRelocation(coordinate: string): Promise<MavenRelocationResult> {
  try {
    const parsed = parseCoordinate(coordinate);
    if (!parsed) {
      return { relocated: false };
    }
    
    const { groupId, artifactId } = parsed;
    const groupPath = groupId.replace(/\./g, '/');
    
    // Get versions from metadata.xml
    const metadataVersions: string[] = [];
    try {
      const metadataUrl = `${MAVEN_REPO}/${groupPath}/${artifactId}/maven-metadata.xml`;
      const metaResponse = await fetchWithRetry(metadataUrl, { timeoutMs: 10000 });
      
      if (metaResponse.ok) {
        const xml = await metaResponse.text();
        const versionsMatch = xml.matchAll(/<version>([^<]+)<\/version>/g);
        metadataVersions.push(...Array.from(versionsMatch).map(m => m[1]));
      }
    } catch {
      // Continue with directory listing
    }
    
    // Also get versions from directory listing (catches relocation-only versions)
    const dirVersions = await getVersionsFromDirectory(groupPath, artifactId);
    
    // Combine and dedupe versions
    const allVersions = [...new Set([...metadataVersions, ...dirVersions])];
    
    if (allVersions.length === 0) {
      return { relocated: false };
    }
    
    // Sort versions (simple sort, good enough for version strings)
    allVersions.sort();
    
    // Check the last few versions for relocation (relocation POMs are usually at the end)
    const versionsToCheck = allVersions.slice(-5);  // Check last 5 versions
    
    // Check each version for relocation
    for (const version of versionsToCheck.reverse()) {  // Start from newest
      try {
        const pomUrl = `${MAVEN_REPO}/${groupPath}/${artifactId}/${version}/${artifactId}-${version}.pom`;
        const pomResponse = await fetchWithRetry(pomUrl, { timeoutMs: 5000 });
        
        if (!pomResponse.ok) continue;
        
        const pom = await pomResponse.text();
        
        // Check for relocation element
        const relocationMatch = pom.match(/<relocation>([\s\S]*?)<\/relocation>/);
        if (relocationMatch) {
          const relocation = relocationMatch[1];
          const newGroupId = relocation.match(/<groupId>([^<]+)<\/groupId>/)?.[1];
          const newArtifactId = relocation.match(/<artifactId>([^<]+)<\/artifactId>/)?.[1];
          const newVersion = relocation.match(/<version>([^<]+)<\/version>/)?.[1];
          const message = relocation.match(/<message>([^<]+)<\/message>/)?.[1];
          
          return {
            relocated: true,
            newGroupId,
            newArtifactId,
            newVersion,
            message,
          };
        }
      } catch {
        // Continue to next version
      }
    }
    
    return { relocated: false };
  } catch {
    return { relocated: false };
  }
}
