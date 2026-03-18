import { describe, it, expect } from 'vitest';
import { safeRedirect } from '../app/session.server';

describe('session.server', () => {
  it('safeRedirect allows valid paths and rejects others', () => {
    expect(safeRedirect('/cars/1')).toBe('/cars/1');
    expect(safeRedirect('http://evil.com')).toBe('/');
    expect(safeRedirect('//evil.com')).toBe('/');
    expect(safeRedirect(null)).toBe('/');
    expect(safeRedirect('/')).toBe('/');
  });
});
