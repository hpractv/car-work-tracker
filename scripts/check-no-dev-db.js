const { execSync } = require('child_process');
try {
  const out = execSync('git ls-files --full-name "prisma/**/dev.db"', { encoding: 'utf8' }).trim();
  if (out) {
    console.error('ERROR: Found committed prisma dev DB file(s):');
    console.error(out);
    process.exit(2);
  }
  console.log('No committed prisma dev.db files found.');
  process.exit(0);
} catch (e) {
  console.log('No committed prisma dev.db files found.');
  process.exit(0);
}
