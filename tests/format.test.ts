import { describe, it, expect } from 'vitest';
import { formatMaintenanceType, formatDate, formatCurrency, formatMileage, getMaintenanceCategory } from '../app/utils/format';

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
