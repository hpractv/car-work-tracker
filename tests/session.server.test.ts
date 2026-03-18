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

  it('safeRedirect rejects percent-encoded slash attacks', () => {
    // encoded protocol-relative URL should be rejected
    expect(safeRedirect('/%2F%2Fevil.com')).toBe('/');
    expect(safeRedirect('/%2f%2Fevil.com')).toBe('/');
    // encoded backslash variants
    expect(safeRedirect('/path%5Cto')).toBe('/');
    // well-formed encoded but harmless path should still be allowed if decoding keeps single leading '/'
    expect(safeRedirect('/some%20path')).toBe('/some%20path');
  });
});
