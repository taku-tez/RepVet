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
  | 'common-typo'         // general keyboard proximity
  | 'bitsquat'            // single bit flip in character
  | 'prefix-suffix'       // lodash -> lodash-cli, pre-lodash
  | 'phonetic';           // similar pronunciation

/**
 * Common keyboard proximity typos (QWERTY layout)
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
 * Extended homoglyphs (visually similar characters)
 * Including Unicode confusables
 */
const HOMOGLYPHS: Record<string, string[]> = {
  // Latin lowercase
  'a': ['@', '4', 'α', 'а', 'ɑ', 'ạ', 'ą'],
  'b': ['6', 'ƅ', 'Ь', 'ḅ'],
  'c': ['ϲ', 'с', 'ç', 'ċ', '('],
  'd': ['ԁ', 'ḍ', 'ɗ'],
  'e': ['3', 'є', 'е', 'ė', 'ẹ', 'ę'],
  'f': ['ƒ'],
  'g': ['9', 'ɡ', 'ġ', 'ģ'],
  'h': ['һ', 'ḥ'],
  'i': ['1', 'l', '|', 'í', 'ì', 'ї', 'і', 'ı'],
  'j': ['ј', 'ʝ'],
  'k': ['κ', 'к', 'ķ'],
  'l': ['1', 'I', '|', 'ⅼ', 'ł', 'ľ'],
  'm': ['rn', 'ṃ', 'ⅿ'],
  'n': ['ո', 'ñ', 'ń', 'ṇ'],
  'o': ['0', 'О', 'о', 'ο', 'օ', 'ọ', 'ø'],
  'p': ['р', 'ρ', 'ṗ'],
  'q': ['ԛ', 'գ'],
  'r': ['г', 'ṛ', 'ŕ'],
  's': ['5', '$', 'ѕ', 'ś', 'ș', 'ṣ'],
  't': ['7', '+', 'τ', 'т', 'ț', 'ṭ'],
  'u': ['μ', 'υ', 'ս', 'ụ', 'ű'],
  'v': ['ν', 'ѵ', 'ṿ'],
  'w': ['ѡ', 'ẃ', 'ẁ', 'ẅ'],
  'x': ['х', '×', 'ẋ'],
  'y': ['ү', 'у', 'ý', 'ỳ'],
  'z': ['ż', 'ź', 'ẓ'],
  // Numbers
  '0': ['o', 'O', 'О', 'ο'],
  '1': ['l', 'I', 'i', '|'],
  '2': ['z', 'ƨ'],
  '3': ['e', 'з', 'ε'],
  '4': ['a', 'ч'],
  '5': ['s', 'ѕ'],
  '6': ['b', 'б'],
  '7': ['t', '7'],
  '8': ['b', '&'],
  '9': ['g', 'q'],
  // Uppercase
  'A': ['Α', 'А', 'Ａ'],
  'B': ['Β', 'В', 'Ｂ'],
  'C': ['Ϲ', 'С', 'Ｃ'],
  'D': ['Ｄ'],
  'E': ['Ε', 'Е', 'Ｅ'],
  'H': ['Η', 'Н', 'Ｈ'],
  'I': ['l', '1', 'Ι', 'І', 'Ｉ'],
  'K': ['Κ', 'К', 'Ｋ'],
  'M': ['Μ', 'М', 'Ｍ'],
  'N': ['Ν', 'Ｎ'],
  'O': ['0', 'Ο', 'О', 'Ｏ'],
  'P': ['Ρ', 'Р', 'Ｐ'],
  'S': ['Ѕ', 'Ｓ'],
  'T': ['Τ', 'Т', 'Ｔ'],
  'X': ['Χ', 'Х', 'Ｘ'],
  'Y': ['Υ', 'У', 'Ｙ'],
  'Z': ['Ζ', 'Ｚ'],
};

/**
 * Common prefix/suffix additions in typosquatting
 */
const SUSPICIOUS_AFFIXES = {
  prefixes: ['get-', 'node-', 'npm-', 'js-', 'my-', 'the-', 'official-', 'original-', 'real-', 'better-', 'fast-', 'super-', 'ultra-'],
  suffixes: ['-js', '-node', '-npm', '-cli', '-lib', '-core', '-utils', '-helper', '-dev', '-prod', '-next', '-beta', '-alpha', '2', '3', 'js', 'node'],
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
      confidence: 0.95,
    });
  }
  
  // Character duplication (one char repeated)
  if (isCharacterDuplicate(nameLower, targetLower)) {
    matches.push({
      pattern: 'character-duplicate',
      description: 'Character duplicated',
      confidence: 0.9,
    });
  }
  
  // Character omission (one char missing)
  if (isCharacterOmission(nameLower, targetLower)) {
    matches.push({
      pattern: 'character-omission',
      description: 'Character omitted',
      confidence: 0.9,
    });
  }
  
  // Character insertion (one extra char)
  if (isCharacterInsertion(nameLower, targetLower)) {
    matches.push({
      pattern: 'character-insertion',
      description: 'Extra character inserted',
      confidence: 0.85,
    });
  }
  
  // Homoglyph substitution
  const homoglyphResult = detectHomoglyph(name, target);
  if (homoglyphResult) {
    matches.push({
      pattern: 'homoglyph',
      description: homoglyphResult.description,
      confidence: homoglyphResult.confidence,
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
  
  // Version/type suffix (pkg -> pkg2, pkgjs)
  const suffixMatch = detectSuffixManipulation(nameLower, targetLower);
  if (suffixMatch) {
    matches.push(suffixMatch);
  }
  
  // Prefix manipulation (pkg -> get-pkg)
  const prefixMatch = detectPrefixManipulation(nameLower, targetLower);
  if (prefixMatch) {
    matches.push(prefixMatch);
  }
  
  // Common keyboard typo
  if (isKeyboardTypo(nameLower, targetLower)) {
    matches.push({
      pattern: 'common-typo',
      description: 'Keyboard proximity typo',
      confidence: 0.8,
    });
  }
  
  // Bitsquat (single bit flip)
  if (isBitsquat(nameLower, targetLower)) {
    matches.push({
      pattern: 'bitsquat',
      description: 'Single bit flip in character',
      confidence: 0.85,
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
  
  for (let i = 0; i < a.length; i++) {
    if (j < b.length && a[i] === b[j]) {
      j++;
    } else {
      insertions++;
      if (insertions > 1) return false;
    }
  }
  
  return insertions === 1;
}

function detectHomoglyph(a: string, b: string): { description: string; confidence: number } | null {
  if (a.length !== b.length) return null;
  
  const substitutions: string[] = [];
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    
    const homoglyphs = HOMOGLYPHS[b[i]] || HOMOGLYPHS[b[i].toLowerCase()] || [];
    if (homoglyphs.includes(a[i]) || homoglyphs.includes(a[i].toLowerCase())) {
      substitutions.push(`${b[i]}→${a[i]}`);
    } else {
      return null;
    }
  }
  
  if (substitutions.length === 0) return null;
  
  return {
    description: `Homoglyph substitution: ${substitutions.join(', ')}`,
    confidence: substitutions.length === 1 ? 0.95 : 0.9,
  };
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
        confidence: 0.9,
      };
    }
  }
  
  // @scope/anything where scope matches a popular unscoped package
  // e.g., @lodash/core impersonating lodash
  const scopeMatchA = a.match(/^@([^/]+)\/(.+)$/);
  if (scopeMatchA) {
    const [, scopeA] = scopeMatchA;
    if (scopeA.toLowerCase() === b.toLowerCase()) {
      return {
        pattern: 'scope-confusion',
        description: 'Scoped package impersonating unscoped package',
        confidence: 0.9,
      };
    }
  }

  // Reverse: scope-pkg vs @scope/pkg
  for (const sep of ['-', '_', '']) {
    const match = a.match(new RegExp(`^([a-z]+)${sep === '' ? '' : '\\' + sep}([a-z].+)$`));
    if (match) {
      const [, maybeScope, maybePkg] = match;
      if (b === `@${maybeScope}/${maybePkg}`) {
        return {
          pattern: 'scope-confusion',
          description: 'Scoped package name confusion',
          confidence: 0.85,
        };
      }
    }
  }
  
  return null;
}

function detectSuffixManipulation(a: string, b: string): PatternMatch | null {
  for (const suffix of SUSPICIOUS_AFFIXES.suffixes) {
    if (a === b + suffix) {
      return {
        pattern: 'version-suffix',
        description: `Suspicious suffix added: "${suffix}"`,
        confidence: suffix.match(/^\d+$/) ? 0.85 : 0.75,
      };
    }
  }
  return null;
}

function detectPrefixManipulation(a: string, b: string): PatternMatch | null {
  for (const prefix of SUSPICIOUS_AFFIXES.prefixes) {
    if (a === prefix + b) {
      return {
        pattern: 'prefix-suffix',
        description: `Suspicious prefix added: "${prefix}"`,
        confidence: 0.7,
      };
    }
  }
  return null;
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

/**
 * Detect bitsquat (single bit flip)
 * This can occur due to memory errors and is used in attacks
 */
function isBitsquat(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let bitFlips = 0;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    
    const charA = a.charCodeAt(i);
    const charB = b.charCodeAt(i);
    const xor = charA ^ charB;
    
    // Check if exactly one bit is different
    if (xor !== 0 && (xor & (xor - 1)) === 0) {
      bitFlips++;
    } else {
      return false;
    }
  }
  
  return bitFlips === 1;
}

/**
 * Get all possible typosquat variants of a package name
 * Useful for proactive checking
 */
export function generateTyposquatVariants(name: string): string[] {
  const variants: Set<string> = new Set();
  
  // Character swap
  for (let i = 0; i < name.length - 1; i++) {
    const arr = name.split('');
    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
    variants.add(arr.join(''));
  }
  
  // Character omission
  for (let i = 0; i < name.length; i++) {
    variants.add(name.slice(0, i) + name.slice(i + 1));
  }
  
  // Character duplication
  for (let i = 0; i < name.length; i++) {
    variants.add(name.slice(0, i + 1) + name[i] + name.slice(i + 1));
  }
  
  // Common keyboard typos
  for (let i = 0; i < name.length; i++) {
    const neighbors = KEYBOARD_NEIGHBORS[name[i].toLowerCase()] || [];
    for (const neighbor of neighbors) {
      variants.add(name.slice(0, i) + neighbor + name.slice(i + 1));
    }
  }
  
  // Hyphen manipulation
  if (name.includes('-')) {
    variants.add(name.replace(/-/g, ''));
    variants.add(name.replace(/-/g, '_'));
  }
  
  // Common suffixes
  for (const suffix of ['js', '2', '-js', '-next']) {
    variants.add(name + suffix);
  }
  
  return Array.from(variants);
}
