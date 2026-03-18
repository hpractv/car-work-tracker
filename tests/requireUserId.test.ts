import { describe, it, expect } from 'vitest';
import { requireUserId } from '../app/session.server';

describe('requireUserId', () => {
  it('throws a redirect when userId is not present in session', async () => {
    const req = new Request('http://localhost/protected');
    await expect(requireUserId(req)).rejects.toHaveProperty('status');
  });
});
