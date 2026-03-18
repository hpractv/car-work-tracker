import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('~/db.server', () => {
  const pushSubscription = { upsert: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() };
  return { db: { pushSubscription } };
});

import { db } from '~/db.server';
import * as pushModel from '../app/models/push.server';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('push.server', () => {
  it('createPushSubscription calls upsert with endpoint and keys', async () => {
    db.pushSubscription.upsert.mockResolvedValue({ id: 'p1', endpoint: 'https://e' });
    const data = { userId: 'u1', endpoint: 'https://e', p256dh: 'pkey', auth: 'auth' };
    const res = await pushModel.createPushSubscription(data);
    expect(res).toEqual({ id: 'p1', endpoint: 'https://e' });
    expect(db.pushSubscription.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { endpoint: 'https://e' } }));
  });

  it('deletePushSubscription calls deleteMany with endpoint filter', async () => {
    db.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });
    const res = await pushModel.deletePushSubscription('https://e');
    expect(db.pushSubscription.deleteMany).toHaveBeenCalledWith({ where: { endpoint: 'https://e' } });
    expect(res).toEqual({ count: 1 });
  });

  it('getPushSubscriptionsForUser delegates to db.findMany', async () => {
    db.pushSubscription.findMany.mockResolvedValue([{ id: 'p1', userId: 'u1' }]);
    const r = await pushModel.getPushSubscriptionsForUser('u1');
    expect(db.pushSubscription.findMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(r).toEqual([{ id: 'p1', userId: 'u1' }]);
  });
});
