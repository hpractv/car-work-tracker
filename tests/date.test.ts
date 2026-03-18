import { describe, it, expect } from 'vitest';
import { monthsDiff } from '../app/utils/date';

describe('utils/date', () => {
  it('monthsDiff computes months between dates', () => {
    const d1 = new Date('2020-01-15');
    const d2 = new Date('2021-03-10'); // 14 months
    expect(monthsDiff(d1, d2)).toBe(14);
    expect(monthsDiff(d2, d1)).toBe(-14);
  });
});
