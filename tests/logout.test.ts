import { it, expect } from 'vitest';
import * as logoutRoute from '../app/routes/logout';

it('logout route is POST-only (no loader exported)', () => {
  expect(typeof logoutRoute.action).toBe('function');
  expect(logoutRoute.loader).toBeUndefined();
});
