import { describe, it, expect } from 'vitest';
import { getPublicVapidKey } from '../app/utils/webpush.server';

describe('webpush', () => {
  it('getPublicVapidKey returns null by default and reads env var', () => {
    const prev = process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PUBLIC_KEY;
    expect(getPublicVapidKey()).toBeNull();
    process.env.VAPID_PUBLIC_KEY = 'TEST_KEY';
    expect(getPublicVapidKey()).toBe('TEST_KEY');
    if (prev !== undefined) process.env.VAPID_PUBLIC_KEY = prev; else delete process.env.VAPID_PUBLIC_KEY;
  });
});
