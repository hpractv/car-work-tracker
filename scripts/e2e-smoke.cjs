const http = require('http');
const url = 'http://localhost:3000/';

const req = http.get(url, (res) => {
  console.log('status', res.statusCode);
  if (res.statusCode >= 200 && res.statusCode < 400) {
    console.log('OK');
    process.exit(0);
  } else {
    console.error('Bad status', res.statusCode);
    process.exit(2);
  }
});
req.on('error', (e) => {
  console.error('Request failed', e.message);
  process.exit(2);
});
