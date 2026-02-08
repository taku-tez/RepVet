/**
 * True positive test: known typosquat patterns should be detected
 */
import { checkTyposquat } from './dist/typosquat/detector.js';

const KNOWN_TYPOSQUATS = [
  // Character swaps
  { pkg: 'axois', target: 'axios' },
  { pkg: 'epxress', target: 'express' },
  { pkg: 'reqeust', target: 'request' },
  { pkg: 'loadsh', target: 'lodash' },
  { pkg: 'chlak', target: 'chalk' },
  // Character omission
  { pkg: 'expres', target: 'express' },
  { pkg: 'axio', target: 'axios' },
  { pkg: 'reac', target: 'react' },
  // Character insertion
  { pkg: 'expresss', target: 'express' },
  { pkg: 'axiosx', target: 'axios' },
  { pkg: 'reactt', target: 'react' },
  // Hyphen manipulation
  { pkg: 'co-mmander', target: 'commander' },
  { pkg: 'web-pack', target: 'webpack' },
  // Scope confusion
  { pkg: '@lodash/core', target: 'lodash' },
  // Common real-world typosquats
  { pkg: 'crossenv', target: 'cross-env' },
  { pkg: 'event-stream', target: 'event-stream' }, // skip - same name
  { pkg: 'flatmap-stream', target: 'flatmap-stream' }, // skip - same
  { pkg: 'electorn', target: 'electron' },
  { pkg: 'djano', target: 'django' },
  { pkg: 'flaskk', target: 'flask' },
  { pkg: 'requets', target: 'requests' },
];

let detected = 0;
let total = 0;
const missed = [];

for (const { pkg, target } of KNOWN_TYPOSQUATS) {
  if (pkg === target) continue;
  total++;
  
  const eco = ['django', 'flask', 'requests'].includes(target) ? 'pypi' : 'npm';
  const matches = checkTyposquat(pkg, { ecosystem: eco });
  const found = matches.some(m => m.target === target);
  
  if (found) {
    detected++;
  } else {
    missed.push({ pkg, target, matches: matches.map(m => m.target) });
  }
}

console.log(`\n=== True Positive Test Results ===`);
console.log(`Tested: ${total} known typosquats`);
console.log(`Detected: ${detected} (${(detected/total*100).toFixed(1)}%)`);
console.log(`Recall: ${(detected/total*100).toFixed(1)}%\n`);

if (missed.length > 0) {
  console.log('Missed detections:');
  for (const m of missed) {
    console.log(`  ${m.pkg} should match ${m.target} (matched: ${m.matches.join(', ') || 'none'})`);
  }
}
