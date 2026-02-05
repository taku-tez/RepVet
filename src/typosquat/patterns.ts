/**
 * Known typosquat patterns for package name manipulation
 */

export type TyposquatPattern = 
  | 'character-swap'       // lodash -> loadsh
  | 'character-duplicate'  // express -> expresss
  | 'character-omission'   // lodash -> lodas
  | 'character-insertion'  // lodash -> lodassh
  | 'homoglyph'           // lodash -> Iodash (l->I)
  | 'hyphen-manipulation' // react-dom -> reactdom, react_dom
  | 'scope-confusion'     // @babel/core -> babel-core
  | 'version-suffix'      // lodash -> lodash2, lodashjs
  | 'common-typo';        // general keyboard proximity

/**
 * Common keyboard proximity typos
 * Maps each character to its neighboring keys
 */
const KEYBOARD_NEIGHBORS: Record<string, string[]> = {
  'a': ['s', 'q', 'z', 'w'],
  'b': ['v', 'g', 'h', 'n'],
  'c': ['x', 'd', 'f', 'v'],
  'd': ['s', 'e', 'r', 'f', 'c', 'x'],
  'e': ['w', 's', 'd', 'r', '3', '4'],
  'f': ['d', 'r', 't', 'g', 'v', 'c'],
  'g': ['f', 't', 'y', 'h', 'b', 'v'],
  'h': ['g', 'y', 'u', 'j', 'n', 'b'],
  'i': ['u', 'j', 'k', 'o', '8', '9'],
  'j': ['h', 'u', 'i', 'k', 'm', 'n'],
  'k': ['j', 'i', 'o', 'l', 'm'],
  'l': ['k', 'o', 'p'],
  'm': ['n', 'j', 'k'],
  'n': ['b', 'h', 'j', 'm'],
  'o': ['i', 'k', 'l', 'p', '9', '0'],
  'p': ['o', 'l', '0'],
  'q': ['w', 'a', '1', '2'],
  'r': ['e', 'd', 'f', 't', '4', '5'],
  's': ['a', 'w', 'e', 'd', 'x', 'z'],
  't': ['r', 'f', 'g', 'y', '5', '6'],
  'u': ['y', 'h', 'j', 'i', '7', '8'],
  'v': ['c', 'f', 'g', 'b'],
  'w': ['q', 'a', 's', 'e', '2', '3'],
  'x': ['z', 's', 'd', 'c'],
  'y': ['t', 'g', 'h', 'u', '6', '7'],
  'z': ['a', 's', 'x'],
};

/**
 * Common homoglyphs (visually similar characters)
 */
const HOMOGLYPHS: Record<string, string[]> = {
  'l': ['1', 'I', '|'],
  '1': ['l', 'I', '|'],
  'I': ['l', '1', '|'],
  'o': ['0', 'O'],
  '0': ['o', 'O'],
  'O': ['o', '0'],
  's': ['5', '$'],
  '5': ['s', 'S'],
  'a': ['@', '4'],
  'e': ['3'],
  'g': ['9', 'q'],
  'q': ['g', '9'],
  'b': ['6'],
  't': ['7', '+'],
};

export interface PatternMatch {
  pattern: TyposquatPattern;
  description: string;
  confidence: number; // 0-1
}

/**
 * Detect if name could be a typosquat of target using known patterns
 */
export function detectPatterns(name: string, target: string): PatternMatch[] {
  const matches: PatternMatch[] = [];
  const nameLower = name.toLowerCase();
  const targetLower = target.toLowerCase();
  
  // Skip if identical
  if (nameLower === targetLower) return [];
  
  // Character swap detection (adjacent characters swapped)
  if (isCharacterSwap(nameLower, targetLower)) {
    matches.push({
      pattern: 'character-swap',
      description: 'Adjacent characters swapped',
      confidence: 0.9,
    });
  }
  
  // Character duplication (one char repeated)
  if (isCharacterDuplicate(nameLower, targetLower)) {
    matches.push({
      pattern: 'character-duplicate',
      description: 'Character duplicated',
      confidence: 0.85,
    });
  }
  
  // Character omission (one char missing)
  if (isCharacterOmission(nameLower, targetLower)) {
    matches.push({
      pattern: 'character-omission',
      description: 'Character omitted',
      confidence: 0.85,
    });
  }
  
  // Character insertion (one extra char)
  if (isCharacterInsertion(nameLower, targetLower)) {
    matches.push({
      pattern: 'character-insertion',
      description: 'Extra character inserted',
      confidence: 0.8,
    });
  }
  
  // Homoglyph substitution
  if (hasHomoglyphSubstitution(name, target)) {
    matches.push({
      pattern: 'homoglyph',
      description: 'Visually similar character substitution',
      confidence: 0.95,
    });
  }
  
  // Hyphen manipulation
  const hyphenMatch = detectHyphenManipulation(nameLower, targetLower);
  if (hyphenMatch) {
    matches.push(hyphenMatch);
  }
  
  // Scope confusion (@scope/pkg vs scope-pkg)
  const scopeMatch = detectScopeConfusion(nameLower, targetLower);
  if (scopeMatch) {
    matches.push(scopeMatch);
  }
  
  // Version suffix (pkg -> pkg2, pkgjs)
  if (hasVersionSuffix(nameLower, targetLower)) {
    matches.push({
      pattern: 'version-suffix',
      description: 'Version or JS suffix added',
      confidence: 0.7,
    });
  }
  
  // Common keyboard typo
  if (isKeyboardTypo(nameLower, targetLower)) {
    matches.push({
      pattern: 'common-typo',
      description: 'Keyboard proximity typo',
      confidence: 0.75,
    });
  }
  
  return matches;
}

function isCharacterSwap(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let diffs = 0;
  let swapPos = -1;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      diffs++;
      if (diffs === 1) swapPos = i;
      if (diffs > 2) return false;
    }
  }
  
  if (diffs === 2 && swapPos + 1 < a.length) {
    return a[swapPos] === b[swapPos + 1] && a[swapPos + 1] === b[swapPos];
  }
  
  return false;
}

function isCharacterDuplicate(a: string, b: string): boolean {
  if (a.length !== b.length + 1) return false;
  
  let j = 0;
  let skipCount = 0;
  
  for (let i = 0; i < a.length; i++) {
    if (j < b.length && a[i] === b[j]) {
      j++;
    } else if (i > 0 && a[i] === a[i - 1]) {
      skipCount++;
    } else {
      return false;
    }
  }
  
  return skipCount === 1 && j === b.length;
}

function isCharacterOmission(a: string, b: string): boolean {
  return isCharacterDuplicate(b, a);
}

function isCharacterInsertion(a: string, b: string): boolean {
  if (a.length !== b.length + 1) return false;
  
  let j = 0;
  let insertions = 0;
  
  for (let i = 0; i < a.length && j <= b.length; i++) {
    if (j < b.length && a[i] === b[j]) {
      j++;
    } else {
      insertions++;
      if (insertions > 1) return false;
    }
  }
  
  return insertions === 1;
}

function hasHomoglyphSubstitution(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let homoglyphCount = 0;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    
    const homoglyphs = HOMOGLYPHS[b[i].toLowerCase()] || [];
    if (homoglyphs.includes(a[i]) || homoglyphs.includes(a[i].toLowerCase())) {
      homoglyphCount++;
    } else {
      return false;
    }
  }
  
  return homoglyphCount > 0 && homoglyphCount <= 2;
}

function detectHyphenManipulation(a: string, b: string): PatternMatch | null {
  // Remove all hyphens/underscores and compare
  const aNorm = a.replace(/[-_]/g, '');
  const bNorm = b.replace(/[-_]/g, '');
  
  if (aNorm === bNorm && a !== b) {
    return {
      pattern: 'hyphen-manipulation',
      description: 'Hyphen or underscore manipulation',
      confidence: 0.9,
    };
  }
  
  return null;
}

function detectScopeConfusion(a: string, b: string): PatternMatch | null {
  // @scope/pkg vs scope-pkg or scopepkg
  const scopeMatch = b.match(/^@([^/]+)\/(.+)$/);
  if (scopeMatch) {
    const [, scope, pkg] = scopeMatch;
    const variants = [
      `${scope}-${pkg}`,
      `${scope}_${pkg}`,
      `${scope}${pkg}`,
      pkg, // Just the package name without scope
    ];
    
    if (variants.includes(a)) {
      return {
        pattern: 'scope-confusion',
        description: 'Scoped package name confusion',
        confidence: 0.85,
      };
    }
  }
  
  return null;
}

function hasVersionSuffix(a: string, b: string): boolean {
  const suffixes = ['2', '3', 'js', '-js', '.js', 'next', '-next'];
  
  for (const suffix of suffixes) {
    if (a === b + suffix) return true;
  }
  
  return false;
}

function isKeyboardTypo(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let typoCount = 0;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    
    const neighbors = KEYBOARD_NEIGHBORS[b[i].toLowerCase()] || [];
    if (neighbors.includes(a[i].toLowerCase())) {
      typoCount++;
    } else {
      return false;
    }
  }
  
  return typoCount === 1;
}
