/**
 * String similarity algorithms for typosquat detection
 */

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  
  // Create matrix
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Initialize first column and row
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Calculate normalized Levenshtein similarity (0-1)
 * 1 = identical, 0 = completely different
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distance / maxLen;
}

/**
 * Jaro similarity algorithm
 * Good for detecting transpositions
 */
export function jaroSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  
  const matchWindow = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  
  const aMatches: boolean[] = new Array(a.length).fill(false);
  const bMatches: boolean[] = new Array(b.length).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matches
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(b.length, i + matchWindow + 1);
    
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0;
  
  // Count transpositions
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  
  return (
    matches / a.length +
    matches / b.length +
    (matches - transpositions / 2) / matches
  ) / 3;
}

/**
 * Jaro-Winkler similarity (prefix-weighted Jaro)
 * Better for typos at the end of words
 */
export function jaroWinklerSimilarity(a: string, b: string, prefixScale = 0.1): number {
  const jaroSim = jaroSimilarity(a, b);
  
  // Find common prefix (up to 4 chars)
  let prefixLen = 0;
  const maxPrefix = Math.min(4, a.length, b.length);
  
  for (let i = 0; i < maxPrefix; i++) {
    if (a[i] === b[i]) {
      prefixLen++;
    } else {
      break;
    }
  }
  
  return jaroSim + prefixLen * prefixScale * (1 - jaroSim);
}

/**
 * Combined similarity score using multiple algorithms
 * Returns a score between 0 and 1
 */
export function combinedSimilarity(a: string, b: string): number {
  const lev = levenshteinSimilarity(a, b);
  const jw = jaroWinklerSimilarity(a, b);
  
  // Weight Jaro-Winkler slightly higher for typosquat detection
  return lev * 0.4 + jw * 0.6;
}
