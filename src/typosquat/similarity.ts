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
 * Damerau-Levenshtein distance
 * Like Levenshtein but also counts transpositions as single edit
 * Better for detecting typosquats like "lodash" -> "loadsh"
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  
  const dp: number[][] = Array(m + 2).fill(null).map(() => Array(n + 2).fill(0));
  const inf = m + n;
  
  dp[0][0] = inf;
  for (let i = 0; i <= m; i++) {
    dp[i + 1][0] = inf;
    dp[i + 1][1] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j + 1] = inf;
    dp[1][j + 1] = j;
  }
  
  const charIndex: Record<string, number> = {};
  
  for (let i = 1; i <= m; i++) {
    let db = 0;
    
    for (let j = 1; j <= n; j++) {
      const i1 = charIndex[b[j - 1]] || 0;
      const j1 = db;
      
      let cost = 1;
      if (a[i - 1] === b[j - 1]) {
        cost = 0;
        db = j;
      }
      
      dp[i + 1][j + 1] = Math.min(
        dp[i][j] + cost,         // substitution
        dp[i + 1][j] + 1,        // insertion
        dp[i][j + 1] + 1,        // deletion
        dp[i1][j1] + (i - i1 - 1) + 1 + (j - j1 - 1)  // transposition
      );
    }
    
    charIndex[a[i - 1]] = i;
  }
  
  return dp[m + 1][n + 1];
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
 * Calculate normalized Damerau-Levenshtein similarity (0-1)
 */
export function damerauLevenshteinSimilarity(a: string, b: string): number {
  const distance = damerauLevenshteinDistance(a, b);
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
 * N-gram similarity (Dice coefficient)
 * Good for partial matches and detecting substring relationships
 */
export function ngramSimilarity(a: string, b: string, n = 2): number {
  if (a.length < n || b.length < n) {
    return a === b ? 1 : 0;
  }
  
  const getNgrams = (s: string): Set<string> => {
    const ngrams = new Set<string>();
    for (let i = 0; i <= s.length - n; i++) {
      ngrams.add(s.substring(i, i + n));
    }
    return ngrams;
  };
  
  const aGrams = getNgrams(a);
  const bGrams = getNgrams(b);
  
  let intersection = 0;
  for (const gram of aGrams) {
    if (bGrams.has(gram)) intersection++;
  }
  
  // Dice coefficient
  return (2 * intersection) / (aGrams.size + bGrams.size);
}

/**
 * Soundex encoding for phonetic similarity
 * Returns a 4-character code representing pronunciation
 */
export function soundex(s: string): string {
  if (!s) return '0000';
  
  const str = s.toUpperCase();
  const codes: Record<string, string> = {
    'B': '1', 'F': '1', 'P': '1', 'V': '1',
    'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
    'D': '3', 'T': '3',
    'L': '4',
    'M': '5', 'N': '5',
    'R': '6',
  };
  
  let result = str[0];
  let prevCode = codes[str[0]] || '0';
  
  for (let i = 1; i < str.length && result.length < 4; i++) {
    const char = str[i];
    const code = codes[char];
    
    if (code && code !== prevCode) {
      result += code;
      prevCode = code;
    } else if (!code) {
      prevCode = '0';
    }
  }
  
  return (result + '0000').substring(0, 4);
}

/**
 * Check if two strings have similar pronunciation
 */
export function phoneticSimilarity(a: string, b: string): number {
  const soundexA = soundex(a);
  const soundexB = soundex(b);
  
  if (soundexA === soundexB) return 1;
  
  // Partial match
  let matches = 0;
  for (let i = 0; i < 4; i++) {
    if (soundexA[i] === soundexB[i]) matches++;
  }
  
  return matches / 4;
}

/**
 * Combined similarity score using multiple algorithms
 * Returns a score between 0 and 1
 */
export function combinedSimilarity(a: string, b: string): number {
  const lev = levenshteinSimilarity(a, b);
  const dam = damerauLevenshteinSimilarity(a, b);
  const jw = jaroWinklerSimilarity(a, b);
  const ngram = ngramSimilarity(a, b, 2);
  
  // Weighted combination
  // - Damerau-Levenshtein is best for transpositions
  // - Jaro-Winkler is best for prefix matching
  // - N-gram is good for partial matches
  return lev * 0.2 + dam * 0.3 + jw * 0.35 + ngram * 0.15;
}

/**
 * Quick check if similarity is possible (for performance)
 * Returns false if strings are too different to be similar
 */
export function couldBeSimilar(a: string, b: string, minSimilarity = 0.7): boolean {
  // Length difference check
  const lenDiff = Math.abs(a.length - b.length);
  const maxLen = Math.max(a.length, b.length);
  
  // If length difference is too big, can't be similar
  if (lenDiff / maxLen > (1 - minSimilarity)) {
    return false;
  }
  
  // First character check (most typosquats preserve first char)
  if (a[0]?.toLowerCase() !== b[0]?.toLowerCase()) {
    // Allow if only first char is different
    if (lenDiff > 1) return false;
  }
  
  return true;
}
