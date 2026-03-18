import { it, expect, vi } from 'vitest';

// Mock Prisma DB to avoid requiring a generated client during unit tests
vi.mock('~/db.server', () => {
  const maintenanceRecord = { findMany: vi.fn() };
  const car = { findMany: vi.fn() };
  return { db: { maintenanceRecord, car } };
});

vi.mock('~/session.server', () => ({ requireUserId: vi.fn().mockResolvedValue('user1') }));
vi.mock('~/models/car.server', () => ({ getCarsForUser: vi.fn().mockResolvedValue([]) }));

import { loader } from '../app/routes/maintenance.export';

it('returns CSV header with CRLF and proper headers when no cars', async () => {
  const res = await (loader as any)({ request: new Request('http://localhost/maintenance/export') });
  expect(res).toBeInstanceOf(Response);
  const text = await res.text();
  expect(text).toBe('Date,Car,VIN,Service Type,Mileage,Cost,Vendor,Description,Receipt URL\r\n');
  expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
  expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="maintenance-history.csv"');
});
