/**
 * Go ecosystem parser
 * - go.mod
 */

/**
 * Parse go.mod with support for:
 * - require blocks and single-line requires
 * - replace directives (extract original module)
 * - exclude directives (skip these)
 * - Indirect dependencies (included)
 */
export function parseGoMod(content: string): string[] {
  const packages: string[] = [];
  const excludedModules = new Set<string>();
  const lines = content.split('\n');
  
  let inRequire = false;
  let inExclude = false;
  let inReplace = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Track block state
    if (trimmed.startsWith('require (') || trimmed === 'require(') {
      inRequire = true;
      continue;
    }
    if (trimmed.startsWith('exclude (') || trimmed === 'exclude(') {
      inExclude = true;
      continue;
    }
    if (trimmed.startsWith('replace (') || trimmed === 'replace(') {
      inReplace = true;
      continue;
    }
    if (trimmed === ')') {
      inRequire = false;
      inExclude = false;
      inReplace = false;
      continue;
    }
    
    // Handle exclude directives
    if (inExclude || trimmed.startsWith('exclude ')) {
      const moduleMatch = trimmed.match(/^(?:exclude\s+)?([^\s]+)/);
      if (moduleMatch) {
        excludedModules.add(moduleMatch[1]);
      }
      continue;
    }
    
    // Handle replace directives - we still want to check the original module
    if (inReplace || trimmed.startsWith('replace ')) {
      const replaceMatch = trimmed.match(/^(?:replace\s+)?([^\s]+)\s+=>/);
      if (replaceMatch) {
        packages.push(replaceMatch[1]);
      }
      continue;
    }
    
    // Handle require directives
    if (inRequire || trimmed.startsWith('require ')) {
      // Match module path and version
      // Examples:
      //   github.com/gin-gonic/gin v1.9.0
      //   github.com/gin-gonic/gin v1.9.0 // indirect
      const moduleMatch = trimmed.match(/^(?:require\s+)?([^\s]+)\s+v[^\s]+/);
      if (moduleMatch) {
        packages.push(moduleMatch[1]);
      }
    }
  }
  
  // Remove excluded modules
  return packages.filter(pkg => !excludedModules.has(pkg));
}
