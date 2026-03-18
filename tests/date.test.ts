import { describe, it, expect } from 'vitest';
import { monthsDiff } from '../app/utils/date';

describe('utils/date', () => {
  it('monthsDiff computes months between dates', () => {
    const d1 = new Date('2020-01-15');
    const d2 = new Date('2021-03-10'); // 14 months
    expect(monthsDiff(d1, d2)).toBe(14);
    expect(monthsDiff(d2, d1)).toBe(-14);
  });

  it('monthsDiff edge cases across month boundaries', () => {
    expect(monthsDiff(new Date('2021-01-01'), new Date('2021-02-01'))).toBe(1);
    expect(monthsDiff(new Date('2021-02-01'), new Date('2021-02-01'))).toBe(0);
  });

  it('monthsDiff handles leap year and end-of-month transitions (numeric dates for determinism)', () => {
    expect(monthsDiff(new Date(2020, 1, 29), new Date(2020, 2, 1))).toBe(1); // Feb29 -> Mar1
    expect(monthsDiff(new Date(2021, 0, 31), new Date(2021, 1, 28))).toBe(1); // Jan31 -> Feb28
  });
});
