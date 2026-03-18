import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db module for tests
vi.mock('~/db.server', () => {
  const carMember = { findFirst: vi.fn(), create: vi.fn(), count: vi.fn(), delete: vi.fn(), update: vi.fn() };
  const user = { findUnique: vi.fn() };
  const car = { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const odometerLog = { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() };
  return { db: { carMember, user, car, odometerLog } };
});

import { db } from '~/db.server';
import * as carModel from '../app/models/car.server';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('car.server', () => {
  it('addCarMember throws when requester is not owner', async () => {
    db.carMember.findFirst.mockResolvedValue(null); // requester missing
    await expect(carModel.addCarMember('car1', 'test@example.com', 'driver', 'req1')).rejects.toThrow('Only owners');
  });

  it('addCarMember throws on invalid email', async () => {
    db.carMember.findFirst.mockResolvedValue({ id: 'm1' }); // requester OK
    await expect(carModel.addCarMember('car1', 'bad-email', 'driver', 'req1')).rejects.toThrow('Invalid email');
  });

  it('addCarMember throws when target user not found', async () => {
    db.carMember.findFirst.mockResolvedValue({ id: 'm1' });
    db.user.findUnique.mockResolvedValue(null);
    await expect(carModel.addCarMember('car1', 'notfound@example.com', 'driver', 'req1')).rejects.toThrow('No user found');
  });

  it('addCarMember throws when already a member', async () => {
    // first call: requester exists, second call: existing membership found
    db.carMember.findFirst
      .mockResolvedValueOnce({ id: 'owner' })
      .mockResolvedValueOnce({ id: 'existing' });
    db.user.findUnique.mockResolvedValue({ id: 'u2' });
    await expect(carModel.addCarMember('car1', 'existing@example.com', 'driver', 'req1')).rejects.toThrow('already a member');
  });

  it('addCarMember creates membership on success', async () => {
    db.carMember.findFirst
      .mockResolvedValueOnce({ id: 'owner' }) // requester
      .mockResolvedValueOnce(null); // no existing membership
    db.user.findUnique.mockResolvedValue({ id: 'u2' });
    db.carMember.create.mockResolvedValue({ id: 'new', carId: 'car1', userId: 'u2', role: 'driver' });

    const res = await carModel.addCarMember('car1', 'new@example.com', 'driver', 'req1');
    expect(res).toEqual({ id: 'new', carId: 'car1', userId: 'u2', role: 'driver' });
    expect(db.carMember.create).toHaveBeenCalled();
  });

  it('updateCarMileage rejects negative and unauthorized, succeeds when authorized', async () => {
    await expect(carModel.updateCarMileage('car1', -10, 'u1')).rejects.toThrow('Mileage cannot be negative');

    db.carMember.findFirst.mockResolvedValue(null);
    await expect(carModel.updateCarMileage('car1', 1000, 'u1')).rejects.toThrow('Not authorized');

    db.carMember.findFirst.mockResolvedValue({ id: 'm1' });
    db.car.update.mockResolvedValue({ id: 'car1', currentMileage: 1000 });
    const res = await carModel.updateCarMileage('car1', 1000, 'u1');
    expect(res).toEqual({ id: 'car1', currentMileage: 1000 });
  });
});
