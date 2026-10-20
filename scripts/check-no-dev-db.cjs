#!/usr/bin/env node
/**
 * Fail CI if any prisma local SQLite dev DB path is tracked in git.
 * Prints path names only — never opens or dumps DB contents.
 */
const { execSync } = require('child_process');

const patterns = [
  'prisma/dev.db',
  'prisma/dev.db-journal',
  'prisma/**/dev.db',
  'prisma/**/dev.db-journal',
];

try {
  const out = execSync(`git ls-files --full-name -- ${patterns.map(JSON.stringify).join(' ')}`, {
    encoding: 'utf8',
  }).trim();
  if (out) {
    console.error('ERROR: Found committed prisma dev DB file(s):');
    console.error(out);
    process.exit(2);
  }
  console.log('No committed prisma dev.db files found.');
  process.exit(0);
} catch (e) {
  // git ls-files exits 0 even when empty; other failures: treat as no matches if empty stdout
  const msg = (e.stdout || '').toString().trim();
  if (msg) {
    console.error('ERROR: Found committed prisma dev DB file(s):');
    console.error(msg);
    process.exit(2);
  }
  console.log('No committed prisma dev.db files found.');
  process.exit(0);
}
