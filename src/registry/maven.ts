/**
 * Maven Central Registry API
 */

import { PackageInfo } from '../types.js';

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

export async function fetchMavenPackageInfo(coordinate: string): Promise<PackageInfo | null> {
  try {
    const parsed = parseCoordinate(coordinate);
    if (!parsed) {
      throw new Error(`Invalid Maven coordinate: ${coordinate}. Use format: groupId:artifactId`);
    }
    
    const { groupId, artifactId } = parsed;
    const groupPath = groupId.replace(/\./g, '/');
    
    // Fetch maven-metadata.xml
    const metadataUrl = `${MAVEN_REPO}/${groupPath}/${artifactId}/maven-metadata.xml`;
    const response = await fetch(metadataUrl);
    
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
    
    // Try to get POM for latest version to extract developer info
    let maintainers: Array<{ name: string }> = [];
    
    if (latestVersion) {
      try {
        const pomUrl = `${MAVEN_REPO}/${groupPath}/${artifactId}/${latestVersion}/${artifactId}-${latestVersion}.pom`;
        const pomResponse = await fetch(pomUrl);
        if (pomResponse.ok) {
          const pom = await pomResponse.text();
          
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
        }
      } catch {
        // Ignore POM fetch errors
      }
    }
    
    // Repository URL from SCM
    let repoUrl: string | undefined;
    try {
      const pomUrl = `${MAVEN_REPO}/${groupPath}/${artifactId}/${latestVersion}/${artifactId}-${latestVersion}.pom`;
      const pomResponse = await fetch(pomUrl);
      if (pomResponse.ok) {
        const pom = await pomResponse.text();
        const scmMatch = pom.match(/<scm>[\s\S]*?<url>([^<]+)<\/url>/);
        if (scmMatch && (scmMatch[1].includes('github.com') || scmMatch[1].includes('gitlab.com'))) {
          repoUrl = scmMatch[1];
        }
      }
    } catch {
      // Ignore
    }
    
    return {
      name: coordinate,
      version: latestVersion,
      maintainers: maintainers.length > 0 ? maintainers : [{ name: groupId.split('.').pop() || groupId }],
      repository: repoUrl ? { type: 'git', url: repoUrl } : undefined,
      time,
      ecosystem: 'maven',
      downloads: versions.length * 10000, // Rough estimate based on version count
    };
  } catch (error) {
    throw new Error(`Failed to fetch Maven package info: ${error}`);
  }
}
