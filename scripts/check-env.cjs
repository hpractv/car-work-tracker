#!/usr/bin/env node
const required = ['SESSION_SECRET'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  console.error('Set them in your environment or add to .env.local. In CI, set Repository Secrets.');
  process.exit(2);
}
console.log('All required env vars present: ' + required.join(', '));
