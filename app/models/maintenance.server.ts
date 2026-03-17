import { db } from "~/db.server";

export async function getMaintenanceRecords(carId: string) {
  return db.maintenanceRecord.findMany({
    where: { carId },
    orderBy: { date: "desc" },
  });
}

export async function getMaintenanceRecord(recordId: string, carId: string) {
  return db.maintenanceRecord.findFirst({
    where: { id: recordId, carId },
  });
}

export async function createMaintenanceRecord(data: {
  carId: string;
  type: string;
  date: Date;
  mileage: number;
  cost?: number | null;
  vendor?: string | null;
  description?: string | null;
  receiptUrl?: string | null;
}) {
  return db.$transaction(async (tx) => {
    const record = await tx.maintenanceRecord.create({ data });
    // Auto-update car mileage if service mileage is higher
    await tx.car.updateMany({
      where: { id: data.carId, currentMileage: { lt: data.mileage } },
      data: { currentMileage: data.mileage },
    });
    return record;
  });
}

export async function updateMaintenanceRecord(
  recordId: string,
  data: {
    type?: string;
    date?: Date;
    mileage?: number;
    cost?: number | null;
    vendor?: string | null;
    description?: string | null;
    receiptUrl?: string | null;
  }
) {
  return db.$transaction(async (tx) => {
    const record = await tx.maintenanceRecord.update({ where: { id: recordId }, data });
    // Auto-update car mileage if the new service mileage is higher
    if (data.mileage !== undefined) {
      await tx.car.updateMany({
        where: { id: record.carId, currentMileage: { lt: data.mileage } },
        data: { currentMileage: data.mileage },
      });
    }
    return record;
  });
}

export async function deleteMaintenanceRecord(recordId: string, carId: string) {
  return db.maintenanceRecord.deleteMany({
    where: { id: recordId, carId },
  });
}

export async function getMaintenanceTypes() {
  return db.maintenanceType.findMany({ orderBy: { name: "asc" } });
}

export async function createMaintenanceType(data: {
  name: string;
  defaultIntervalMiles?: number | null;
  defaultIntervalMonths?: number | null;
}) {
  return db.maintenanceType.create({ data });
}

export async function updateMaintenanceType(
  id: string,
  data: {
    name?: string;
    defaultIntervalMiles?: number | null;
    defaultIntervalMonths?: number | null;
  }
) {
  return db.maintenanceType.update({ where: { id }, data });
}

export async function deleteMaintenanceType(id: string) {
  return db.maintenanceType.delete({ where: { id } });
}

function monthsDiff(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

type OverrideEntry = { typeName: string; intervalMiles: number | null; intervalMonths: number | null };

function applyOverride(
  mt: { defaultIntervalMiles: number | null; defaultIntervalMonths: number | null; name: string },
  overrides: OverrideEntry[]
) {
  const override = overrides.find(o => o.typeName === mt.name);
  return {
    intervalMiles: override ? override.intervalMiles : mt.defaultIntervalMiles,
    intervalMonths: override ? override.intervalMonths : mt.defaultIntervalMonths,
  };
}

export async function getMaintenanceDue(
  carId: string,
  currentMileage: number,
  overrides?: OverrideEntry[]
) {
  const types = await db.maintenanceType.findMany();
  const records = await db.maintenanceRecord.findMany({
    where: { carId },
    orderBy: { date: "desc" },
  });

  const due: Array<{
    type: string;
    reason: string;
    lastDate?: Date;
    lastMileage?: number;
  }> = [];

  for (const mt of types) {
    const lastRecord = records.find((r) => r.type === mt.name);
    const now = new Date();
    const { intervalMiles, intervalMonths } = applyOverride(mt, overrides ?? []);

    if (!lastRecord) {
      continue;
    }

    // Check mileage interval
    if (intervalMiles && lastRecord) {
      const milesSince = currentMileage - lastRecord.mileage;
      if (milesSince >= intervalMiles) {
        due.push({
          type: mt.name,
          reason: `${milesSince.toLocaleString()} miles since last service (interval: ${intervalMiles.toLocaleString()} miles)`,
          lastDate: lastRecord.date,
          lastMileage: lastRecord.mileage,
        });
        continue;
      }
    }

    // Check time interval
    if (intervalMonths && lastRecord) {
      const monthsSince = monthsDiff(lastRecord.date, now);
      if (monthsSince >= intervalMonths) {
        due.push({
          type: mt.name,
          reason: `${Math.floor(monthsSince)} months since last service (interval: ${intervalMonths} months)`,
          lastDate: lastRecord.date,
          lastMileage: lastRecord.mileage,
        });
        continue;
      }
    }
  }

  return due;
}

/**
 * Batch version of getMaintenanceDue - loads all types and records in 2 queries
 * instead of 2 queries per car. Returns a Map from carId to due items array.
 */
export async function getBatchMaintenanceDue(
  cars: Array<{ id: string; currentMileage: number }>
): Promise<Map<string, Array<{ type: string; reason: string; lastDate?: Date; lastMileage?: number }>>> {
  if (cars.length === 0) return new Map();

  const carIds = cars.map((c) => c.id);
  const [types, records, allOverrides] = await Promise.all([
    db.maintenanceType.findMany(),
    db.maintenanceRecord.findMany({
      where: { carId: { in: carIds } },
      orderBy: { date: "desc" },
    }),
    db.carMaintenanceOverride.findMany({ where: { carId: { in: carIds } } }),
  ]);

  // Group records by carId (already ordered desc, so first occurrence per type is most recent)
  const recordsByCarId = new Map<string, typeof records>();
  for (const record of records) {
    if (!recordsByCarId.has(record.carId)) {
      recordsByCarId.set(record.carId, []);
    }
    recordsByCarId.get(record.carId)!.push(record);
  }

  const result = new Map<
    string,
    Array<{ type: string; reason: string; lastDate?: Date; lastMileage?: number }>
  >();
  const now = new Date();

  for (const car of cars) {
    const carRecords = recordsByCarId.get(car.id) ?? [];
    const carOverrides = allOverrides.filter(o => o.carId === car.id);
    const due: Array<{ type: string; reason: string; lastDate?: Date; lastMileage?: number }> = [];

    for (const mt of types) {
      const lastRecord = carRecords.find((r) => r.type === mt.name);
      if (!lastRecord) continue;

      const { intervalMiles, intervalMonths } = applyOverride(mt, carOverrides);

      if (intervalMiles) {
        const milesSince = car.currentMileage - lastRecord.mileage;
        if (milesSince >= intervalMiles) {
          due.push({
            type: mt.name,
            reason: `${milesSince.toLocaleString()} miles since last service (interval: ${intervalMiles.toLocaleString()} miles)`,
            lastDate: lastRecord.date,
            lastMileage: lastRecord.mileage,
          });
          continue;
        }
      }

      if (intervalMonths) {
        const monthsSince = monthsDiff(lastRecord.date, now);
        if (monthsSince >= intervalMonths) {
          due.push({
            type: mt.name,
            reason: `${monthsSince} months since last service (interval: ${intervalMonths} months)`,
            lastDate: lastRecord.date,
            lastMileage: lastRecord.mileage,
          });
          continue;
        }
      }
    }

    result.set(car.id, due);
  }

  return result;
}

/**
 * Batch version of getMaintenanceApproaching - loads all types and records in 2 queries.
 * Returns a Map from carId to approaching items array (60-99% of service interval).
 */
export async function getBatchMaintenanceApproaching(
  cars: Array<{ id: string; currentMileage: number }>
): Promise<
  Map<
    string,
    Array<{
      type: string;
      overallPercent: number;
      mileagePercent: number | null;
      timePercent: number | null;
      nextMileage: number | null;
      nextDate: Date | null;
    }>
  >
> {
  if (cars.length === 0) return new Map();

  const carIds = cars.map((c) => c.id);
  const [types, records, allOverrides] = await Promise.all([
    db.maintenanceType.findMany(),
    db.maintenanceRecord.findMany({
      where: { carId: { in: carIds } },
      orderBy: { date: "desc" },
    }),
    db.carMaintenanceOverride.findMany({ where: { carId: { in: carIds } } }),
  ]);

  const recordsByCarId = new Map<string, typeof records>();
  for (const record of records) {
    if (!recordsByCarId.has(record.carId)) {
      recordsByCarId.set(record.carId, []);
    }
    recordsByCarId.get(record.carId)!.push(record);
  }

  const result = new Map<
    string,
    Array<{
      type: string;
      overallPercent: number;
      mileagePercent: number | null;
      timePercent: number | null;
      nextMileage: number | null;
      nextDate: Date | null;
    }>
  >();
  const now = new Date();

  for (const car of cars) {
    const carRecords = recordsByCarId.get(car.id) ?? [];
    const carOverrides = allOverrides.filter(o => o.carId === car.id);
    const approaching: Array<{
      type: string;
      overallPercent: number;
      mileagePercent: number | null;
      timePercent: number | null;
      nextMileage: number | null;
      nextDate: Date | null;
    }> = [];

    for (const mt of types) {
      const lastRecord = carRecords.find((r) => r.type === mt.name);
      if (!lastRecord) continue;

      const { intervalMiles, intervalMonths } = applyOverride(mt, carOverrides);
      const milesSinceLast = car.currentMileage - lastRecord.mileage;
      const monthsSinceLast = monthsDiff(lastRecord.date, now);

      let mileagePercent: number | null = null;
      let timePercent: number | null = null;
      let nextMileage: number | null = null;
      let nextDate: Date | null = null;

      if (intervalMiles) {
        mileagePercent = Math.min(
          100,
          Math.round((milesSinceLast / intervalMiles) * 100)
        );
        nextMileage = lastRecord.mileage + intervalMiles;
      }
      if (intervalMonths) {
        timePercent = Math.min(
          100,
          Math.round((monthsSinceLast / intervalMonths) * 100)
        );
        const nextDueDate = new Date(lastRecord.date);
        nextDueDate.setMonth(nextDueDate.getMonth() + intervalMonths);
        nextDate = nextDueDate;
      }

      const overallPercent = Math.max(mileagePercent ?? 0, timePercent ?? 0);
      if (overallPercent >= 60 && overallPercent < 100) {
        approaching.push({ type: mt.name, overallPercent, mileagePercent, timePercent, nextMileage, nextDate });
      }
    }

    result.set(car.id, approaching);
  }

  return result;
}

export async function getMaintenanceApproaching(
  carId: string,
  currentMileage: number
): Promise<
  Array<{
    type: string;
    overallPercent: number;
    mileagePercent: number | null;
    timePercent: number | null;
    nextMileage: number | null;
    nextDate: Date | null;
  }>
> {
  const allStatuses = await getServiceIntervalStatus(carId, currentMileage);
  return allStatuses
    .filter((s) => s.hasHistory && s.overallPercent >= 60 && s.overallPercent < 100)
    .map((s) => ({
      type: s.type,
      overallPercent: s.overallPercent,
      mileagePercent: s.mileagePercent,
      timePercent: s.timePercent,
      nextMileage: s.nextMileage,
      nextDate: s.nextDate,
    }));
}

export async function getServiceIntervalStatus(
  carId: string,
  currentMileage: number,
  overrides?: OverrideEntry[]
) {
  const types = await db.maintenanceType.findMany();
  const records = await db.maintenanceRecord.findMany({
    where: { carId },
    orderBy: { date: "desc" },
  });

  return types.map((mt) => {
    const lastRecord = records.find((r) => r.type === mt.name);
    const now = new Date();
    const { intervalMiles, intervalMonths } = applyOverride(mt, overrides ?? []);
    
    let milesSinceLast: number | null = null;
    let monthsSinceLast: number | null = null;
    let mileagePercent: number | null = null;
    let timePercent: number | null = null;
    let nextMileage: number | null = null;
    let nextDate: Date | null = null;

    if (lastRecord) {
      milesSinceLast = currentMileage - lastRecord.mileage;
      monthsSinceLast = monthsDiff(lastRecord.date, now);
      
      if (intervalMiles) {
        mileagePercent = Math.min(100, Math.round((milesSinceLast / intervalMiles) * 100));
        nextMileage = lastRecord.mileage + intervalMiles;
      }
      if (intervalMonths) {
        timePercent = Math.min(100, Math.round((monthsSinceLast / intervalMonths) * 100));
        const nextDueDate = new Date(lastRecord.date);
        nextDueDate.setMonth(nextDueDate.getMonth() + intervalMonths);
        nextDate = nextDueDate;
      }
    }

    const isDue = !!(
      (mileagePercent !== null && mileagePercent >= 100) ||
      (timePercent !== null && timePercent >= 100)
    );
    const overallPercent = Math.max(mileagePercent ?? 0, timePercent ?? 0);

    return {
      type: mt.name,
      intervalMiles,
      intervalMonths,
      lastDate: lastRecord?.date ?? null,
      lastMileage: lastRecord?.mileage ?? null,
      milesSinceLast,
      monthsSinceLast: monthsSinceLast !== null ? Math.floor(monthsSinceLast) : null,
      mileagePercent,
      timePercent,
      nextMileage,
      nextDate,
      isDue,
      overallPercent,
      hasHistory: !!lastRecord,
    };
  });
}

export async function getMaintenanceForecast(
  carId: string,
  currentMileage: number
): Promise<Array<{
  typeId: string;
  typeName: string;
  nextDueMileage: number | null;
  nextDueDate: Date | null;
  intervalMiles: number | null;
  intervalMonths: number | null;
  lastRecordDate: Date | null;
  lastRecordMileage: number | null;
}>> {
  const types = await db.maintenanceType.findMany({ orderBy: { name: "asc" } });
  const records = await db.maintenanceRecord.findMany({
    where: { carId },
    orderBy: { date: "desc" },
  });

  const overrides = await db.carMaintenanceOverride.findMany({ where: { carId } });

  const forecast: Array<{
    typeId: string;
    typeName: string;
    nextDueMileage: number | null;
    nextDueDate: Date | null;
    intervalMiles: number | null;
    intervalMonths: number | null;
    lastRecordDate: Date | null;
    lastRecordMileage: number | null;
  }> = [];

  for (const mt of types) {
    const hasInterval = mt.defaultIntervalMiles !== null || mt.defaultIntervalMonths !== null;
    if (!hasInterval) continue;

    const lastRecord = records.find((r) => r.type === mt.name);
    if (!lastRecord) continue;

    let nextDueMileage: number | null = null;
    let nextDueDate: Date | null = null;

    const { intervalMiles, intervalMonths } = applyOverride(mt, overrides);

    if (intervalMiles !== null && intervalMiles !== undefined) {
      nextDueMileage = lastRecord.mileage + intervalMiles;
    }
    if (intervalMonths !== null && intervalMonths !== undefined) {
      nextDueDate = new Date(lastRecord.date);
      nextDueDate.setMonth(nextDueDate.getMonth() + intervalMonths);
    }

    forecast.push({
      typeId: mt.id,
      typeName: mt.name,
      nextDueMileage,
      nextDueDate,
      intervalMiles: intervalMiles,
      intervalMonths: intervalMonths,
      lastRecordDate: lastRecord.date,
      lastRecordMileage: lastRecord.mileage,
    });
  }

  return forecast;
}

/**
 * Returns a 0–100 health score for a car's maintenance status.
 * null means no maintenance history exists (N/A).
 * 100 = all serviced types are current.
 * Score decreases by up to 25 per overdue type (capped).
 */
export async function getMaintenanceHealthScore(
  carId: string,
  currentMileage: number,
  overrides?: Array<{ typeName: string; intervalMiles: number | null; intervalMonths: number | null }>
): Promise<number | null> {
  const statusList = await getServiceIntervalStatus(carId, currentMileage, overrides);
  const withHistory = statusList.filter((s) => s.hasHistory);
  if (withHistory.length === 0) return null;
  let penalty = 0;
  for (const s of withHistory) {
    if (s.isDue && s.overallPercent > 100) {
      penalty += Math.min(25, s.overallPercent - 100);
    }
  }
  return Math.max(0, Math.round(100 - penalty));
}

/**
 * Batch version — computes health scores for multiple cars in 2 DB queries.
 * Returns a Map<carId, score | null>.
 */
export async function getBatchMaintenanceHealthScores(
  cars: Array<{ id: string; currentMileage: number }>
): Promise<Map<string, number | null>> {
  if (cars.length === 0) return new Map();
  const carIds = cars.map((c) => c.id);
  const [types, records, overridesAll] = await Promise.all([
    db.maintenanceType.findMany(),
    db.maintenanceRecord.findMany({
      where: { carId: { in: carIds } },
      orderBy: { date: "desc" },
    }),
    db.carMaintenanceOverride.findMany({ where: { carId: { in: carIds } } }),
  ]);

  const recordsByCarId = new Map<string, typeof records>();
  for (const r of records) {
    if (!recordsByCarId.has(r.carId)) recordsByCarId.set(r.carId, []);
    recordsByCarId.get(r.carId)!.push(r);
  }

  const now = new Date();
  const result = new Map<string, number | null>();

  for (const car of cars) {
    const carRecords = recordsByCarId.get(car.id) ?? [];
    const carOverrides = overridesAll.filter((o) => o.carId === car.id);
    let hasHistory = false;
    let penalty = 0;

    for (const mt of types) {
      const lastRecord = carRecords.find((r) => r.type === mt.name);
      if (!lastRecord) continue;
      hasHistory = true;

      const override = carOverrides.find((o) => o.typeName === mt.name);
      const intervalMiles = override ? override.intervalMiles : mt.defaultIntervalMiles;
      const intervalMonths = override ? override.intervalMonths : mt.defaultIntervalMonths;

      let mileagePercent = 0;
      let timePercent = 0;
      if (intervalMiles) {
        mileagePercent = Math.min(100, Math.round(((car.currentMileage - lastRecord.mileage) / intervalMiles) * 100));
      }
      if (intervalMonths) {
        const months = monthsDiff(lastRecord.date, now);
        timePercent = Math.min(100, Math.round((months / intervalMonths) * 100));
      }
      const overallPercent = Math.max(mileagePercent, timePercent);
      if (overallPercent >= 100) {
        penalty += Math.min(25, overallPercent - 100);
      }
    }

    result.set(car.id, hasHistory ? Math.max(0, Math.round(100 - penalty)) : null);
  }
  return result;
}
