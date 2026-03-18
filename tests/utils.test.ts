import { describe, it, expect } from 'vitest';
import { formatMaintenanceType, formatDate, formatCurrency, formatMileage, getMaintenanceCategory } from '../app/utils/format';
import { monthsDiff } from '../app/utils/date';
import { safeRedirect } from '../app/session.server';
import { getPublicVapidKey } from '../app/utils/webpush.server';

describe('utils/format', () => {
  it('formatMaintenanceType converts snake_case to Title Case', () => {
    expect(formatMaintenanceType('oil_change')).toBe('Oil Change');
    expect(formatMaintenanceType('brake_pad_replacement')).toBe('Brake Pad Replacement');
  });

  it('formatCurrency formats number to USD', () => {
    expect(formatCurrency(150.5)).toBe('$150.50');
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formatMileage formats number with comma and miles', () => {
    expect(formatMileage(50000)).toBe('50,000 miles');
  });

  it('getMaintenanceCategory returns known category or Other', () => {
    expect(getMaintenanceCategory('oil_change')).toBe('Fluids');
    expect(getMaintenanceCategory('unknown_type')).toBe('Other');
  });
});

describe('utils/date', () => {
  it('monthsDiff computes months between dates', () => {
    const d1 = new Date('2020-01-15');
    const d2 = new Date('2021-03-10'); // 14 months
    expect(monthsDiff(d1, d2)).toBe(14);
    expect(monthsDiff(d2, d1)).toBe(-14);
  });
});

describe('session.server', () => {
  it('safeRedirect allows valid paths and rejects others', () => {
    expect(safeRedirect('/cars/1')).toBe('/cars/1');
    expect(safeRedirect('http://evil.com')).toBe('/');
    expect(safeRedirect('//evil.com')).toBe('/');
    expect(safeRedirect(null)).toBe('/');
    expect(safeRedirect('/')).toBe('/');
  });
});

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
