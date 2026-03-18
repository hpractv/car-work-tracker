import { describe, it, expect, vi } from 'vitest';

describe('webpush', () => {
  it('getPublicVapidKey returns null by default and reads env var at module init', async () => {
    const prev = process.env.VAPID_PUBLIC_KEY;
    vi.resetModules();
    delete process.env.VAPID_PUBLIC_KEY;
    const mod1 = await import('../app/utils/webpush.server');
    expect(mod1.getPublicVapidKey()).toBeNull();

    vi.resetModules();
    process.env.VAPID_PUBLIC_KEY = 'TEST_KEY';
    const mod2 = await import('../app/utils/webpush.server');
    expect(mod2.getPublicVapidKey()).toBe('TEST_KEY');

    // normalize
    if (prev !== undefined) process.env.VAPID_PUBLIC_KEY = prev; else delete process.env.VAPID_PUBLIC_KEY;
  });

  it('empty-string env var treated as unset', async () => {
    const prevPub = process.env.VAPID_PUBLIC_KEY;
    const prevPriv = process.env.VAPID_PRIVATE_KEY;
    vi.resetModules();
    process.env.VAPID_PUBLIC_KEY = '';
    delete process.env.VAPID_PRIVATE_KEY;
    const mod = await import('../app/utils/webpush.server');
    expect(mod.getPublicVapidKey()).toBeNull();
    if (prevPub !== undefined) process.env.VAPID_PUBLIC_KEY = prevPub; else delete process.env.VAPID_PUBLIC_KEY;
    if (prevPriv !== undefined) process.env.VAPID_PRIVATE_KEY = prevPriv; else delete process.env.VAPID_PRIVATE_KEY;
  });
});
