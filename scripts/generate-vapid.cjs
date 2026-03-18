const webPush = require('web-push');

try {
  const keys = webPush.generateVAPIDKeys();
  console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
  console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
} catch (err) {
  console.error('Failed to generate VAPID keys:', err);
  process.exit(1);
}
