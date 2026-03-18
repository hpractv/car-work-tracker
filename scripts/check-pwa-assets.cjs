const fs = require('fs');

const candidates = ['public/manifest.webmanifest', 'public/manifest.json'];
let manifestPath = candidates.find(p => fs.existsSync(p));
if (!manifestPath) {
  console.warn('No manifest file found in public/. Skipping PWA icon checks.');
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const icons = manifest.icons || [];
const missing = [];
for (const icon of icons) {
  const src = icon.src.replace(/^\//, '');
  const full = `public/${src}`;
  if (!fs.existsSync(full)) missing.push(src);
}
if (missing.length) {
  console.error('Missing PWA assets:', missing.join(', '));
  process.exit(2);
}
console.log('PWA assets verified.');
process.exit(0);
