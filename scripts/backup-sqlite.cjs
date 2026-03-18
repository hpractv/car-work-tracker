const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'prisma', 'dev.db');
if (!fs.existsSync(src)) {
  console.log('No prisma/dev.db file found to backup.');
  process.exit(0);
}
const dest = path.join(__dirname, '..', 'prisma', `dev.db.bak.${Date.now()}`);
fs.copyFileSync(src, dest);
console.log('Backed up', src, '->', dest);
process.exit(0);
