import { expect, test } from 'vitest';
import { requireUserId } from '../app/session.server';

test('requireUserId redirects anonymous to login with redirectTo', async () => {
  const req = new Request('http://localhost/cars/42?foo=bar');
  try {
    await requireUserId(req as unknown as Request);
    throw new Error('Expected redirect');
  } catch (res: any) {
    // Remix redirect throws a Response object
    expect(res).toBeInstanceOf(Response);
    const location = res.headers.get('Location') || res.headers.get('location');
    expect(location).toBe('/login?redirectTo=%2Fcars%2F42%3Ffoo%3Dbar');
  }
});
