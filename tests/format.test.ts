import { describe, it, expect } from 'vitest';
import { formatMaintenanceType, formatDate, formatCurrency, formatMileage, getMaintenanceCategory } from '../app/utils/format';

describe('utils/format', () => {
  it('formatMaintenanceType converts snake_case to Title Case and handles empty strings', () => {
    expect(formatMaintenanceType('oil_change')).toBe('Oil Change');
    expect(formatMaintenanceType('brake_pad_replacement')).toBe('Brake Pad Replacement');
    expect(formatMaintenanceType('')).toBe('');
  });

  it('formatDate accepts Date and ISO string', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    expect(formatDate(d)).toBe(formatDate(d.toISOString()));
  });

  it('formatCurrency formats number to USD including negatives and large numbers', () => {
    expect(formatCurrency(150.5)).toBe('$150.50');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(-12.5)).toBe('$-12.50');
    expect(formatCurrency(1000000.2)).toBe('$1000000.20');
  });

  it('formatMileage formats number with comma and miles and zero', () => {
    expect(formatMileage(50000)).toBe('50,000 miles');
    expect(formatMileage(0)).toBe('0 miles');
  });

  it('getMaintenanceCategory returns known category or Other', () => {
    expect(getMaintenanceCategory('oil_change')).toBe('Fluids');
    expect(getMaintenanceCategory('unknown_type')).toBe('Other');
  });
});
