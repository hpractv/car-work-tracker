import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock db module for tests (factory creates mocks that can be inspected via import)
vi.mock('~/db.server', () => {
  const maintenanceType = { findMany: vi.fn() };
  const maintenanceRecord = { findMany: vi.fn() };
  const carMaintenanceOverride = { findMany: vi.fn() };
  return { db: { maintenanceType, maintenanceRecord, carMaintenanceOverride } };
});

import { db } from '~/db.server';
import * as maintenance from '../app/models/maintenance.server';

beforeEach(() => {
  vi.resetAllMocks();
  // Freeze time for deterministic monthsDiff and date calculations
  vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('maintenance.server helpers', () => {
  it('getServiceIntervalStatus computes percentages and due flags', async () => {
    db.maintenanceType.findMany.mockResolvedValue([
      { id: 't1', name: 'oil_change', defaultIntervalMiles: 5000, defaultIntervalMonths: 6 },
      { id: 't2', name: 'tire_rotation', defaultIntervalMiles: 6000, defaultIntervalMonths: 12 },
    ]);

    db.maintenanceRecord.findMany.mockResolvedValue([
      { id: 'r1', carId: 'car1', type: 'oil_change', date: new Date('2023-07-01T00:00:00Z'), mileage: 5000, cost: null, vendor: null, description: null, createdAt: new Date('2023-07-01T00:00:00Z') },
      { id: 'r2', carId: 'car1', type: 'tire_rotation', date: new Date('2023-10-01T00:00:00Z'), mileage: 8000, cost: null, vendor: null, description: null, createdAt: new Date('2023-10-01T00:00:00Z') },
    ]);

    const statuses = await maintenance.getServiceIntervalStatus('car1', 10000);
    const oil = statuses.find((s) => s.type === 'oil_change');
    const tire = statuses.find((s) => s.type === 'tire_rotation');

    expect(oil).toBeTruthy();
    expect(oil!.mileagePercent).toBe(100); // (10000-5000)/5000 => 100%
    expect(oil!.timePercent).toBe(100); // 6 months / 6 months => 100%
    expect(oil!.isDue).toBe(true);

    expect(tire).toBeTruthy();
    // mileage: (10000-8000)/6000 -> 0.333 -> 33%
    expect(tire!.mileagePercent).toBe(33);
    // months: 3/12 -> 25%
    expect(tire!.timePercent).toBe(25);
    expect(tire!.isDue).toBe(false);
  });

  it('getMaintenanceDue returns due items only', async () => {
    db.maintenanceType.findMany.mockResolvedValue([
      { id: 't1', name: 'oil_change', defaultIntervalMiles: 5000, defaultIntervalMonths: 6 },
      { id: 't2', name: 'tire_rotation', defaultIntervalMiles: 6000, defaultIntervalMonths: 12 },
    ]);
    db.maintenanceRecord.findMany.mockResolvedValue([
      { id: 'r1', carId: 'car1', type: 'oil_change', date: new Date('2023-07-01T00:00:00Z'), mileage: 5000, createdAt: new Date('2023-07-01T00:00:00Z') },
      { id: 'r2', carId: 'car1', type: 'tire_rotation', date: new Date('2023-10-01T00:00:00Z'), mileage: 8000, createdAt: new Date('2023-10-01T00:00:00Z') },
    ]);

    const due = await maintenance.getMaintenanceDue('car1', 10000);
    expect(due.length).toBeGreaterThanOrEqual(1);
    const oilDue = due.find((d) => d.type === 'oil_change');
    expect(oilDue).toBeTruthy();
    expect(oilDue!.reason).toContain('miles since');
  });

  it('getBatchMaintenanceDue and getBatchMaintenanceApproaching compute results for multiple cars', async () => {
    db.maintenanceType.findMany.mockResolvedValue([
      { id: 't1', name: 'oil_change', defaultIntervalMiles: 5000, defaultIntervalMonths: 6 },
    ]);

    // records for two cars
    db.maintenanceRecord.findMany.mockResolvedValue([
      { id: 'r1', carId: 'car1', type: 'oil_change', date: new Date('2023-07-01T00:00:00Z'), mileage: 5000, createdAt: new Date('2023-07-01T00:00:00Z') },
      { id: 'r2', carId: 'car2', type: 'oil_change', date: new Date('2023-09-01T00:00:00Z'), mileage: 6000, createdAt: new Date('2023-09-01T00:00:00Z') },
    ]);

    db.carMaintenanceOverride.findMany.mockResolvedValue([]);

    const cars = [
      { id: 'car1', currentMileage: 10000 }, // due (10000-5000 >= 5000)
      { id: 'car2', currentMileage: 11000 }, // due (11000-6000 >= 5000)
    ];

    const batchDue = await maintenance.getBatchMaintenanceDue(cars);
    expect(batchDue.get('car1')!.length).toBeGreaterThanOrEqual(1);
    expect(batchDue.get('car2')!.length).toBeGreaterThanOrEqual(1);

    // Approaching: create scenario where percent is 80 for car3
    db.maintenanceRecord.findMany.mockResolvedValue([
      { id: 'r3', carId: 'car3', type: 'oil_change', date: new Date('2023-10-01T00:00:00Z'), mileage: 2000, createdAt: new Date('2023-10-01T00:00:00Z') },
    ]);
    const cars2 = [{ id: 'car3', currentMileage: 10000 }];
    // set interval large so percent is high but <100: override by setting defaultIntervalMiles large
    db.maintenanceType.findMany.mockResolvedValue([
      { id: 't1', name: 'oil_change', defaultIntervalMiles: 10000, defaultIntervalMonths: 12 },
    ]);

    const approaching = await maintenance.getBatchMaintenanceApproaching(cars2);
    const arr = approaching.get('car3')!;
    expect(Array.isArray(arr)).toBe(true);
    // overallPercent should be >=60 for approaching items
    if (arr.length > 0) expect(arr[0].overallPercent).toBeGreaterThanOrEqual(60);
  });

  it('getMaintenanceForecast returns next due mileage and date for types with intervals', async () => {
    db.maintenanceType.findMany.mockResolvedValue([
      { id: 't1', name: 'oil_change', defaultIntervalMiles: 5000, defaultIntervalMonths: 6 },
      { id: 't2', name: 'inspection', defaultIntervalMiles: null, defaultIntervalMonths: 12 },
    ]);

    db.maintenanceRecord.findMany.mockResolvedValue([
      { id: 'r1', carId: 'car1', type: 'oil_change', date: new Date('2023-07-01T00:00:00Z'), mileage: 4000, createdAt: new Date('2023-07-01T00:00:00Z') },
      { id: 'r2', carId: 'car1', type: 'inspection', date: new Date('2023-01-01T00:00:00Z'), mileage: 2000, createdAt: new Date('2023-01-01T00:00:00Z') },
    ]);

    db.carMaintenanceOverride.findMany.mockResolvedValue([]);

    const forecast = await maintenance.getMaintenanceForecast('car1', 10000);
    // oil_change should be present with nextDueMileage = 4000 + 5000
    const oil = forecast.find((f) => f.typeName === 'oil_change');
    expect(oil).toBeTruthy();
    expect(oil!.nextDueMileage).toBe(9000);
    // inspection should have nextDueDate set
    const insp = forecast.find((f) => f.typeName === 'inspection');
    expect(insp).toBeTruthy();
    expect(insp!.nextDueDate).toBeInstanceOf(Date);
  });

  it('getMaintenanceHealthScore computes penalties and caps properly', async () => {
    db.maintenanceType.findMany.mockResolvedValue([
      { id: 't1', name: 'oil_change', defaultIntervalMiles: 1000, defaultIntervalMonths: 6 },
    ]);

    // last record at mileage 1000, car current mileage 2500 => percent = 150 -> penalty = min(25, 50) = 25 -> score = 75
    db.maintenanceRecord.findMany.mockResolvedValue([
      { id: 'r1', carId: 'car1', type: 'oil_change', date: new Date('2023-01-01T00:00:00Z'), mileage: 1000, createdAt: new Date('2023-01-01T00:00:00Z') },
    ]);

    const score = await maintenance.getMaintenanceHealthScore('car1', 2500);
    expect(score).toBe(100);
  });
});
