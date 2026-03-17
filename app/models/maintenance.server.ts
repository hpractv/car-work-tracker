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

export async function getMaintenanceDue(carId: string, currentMileage: number) {
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

    if (!lastRecord) {
      continue;
    }

    // Check mileage interval
    if (mt.defaultIntervalMiles && lastRecord) {
      const milesSince = currentMileage - lastRecord.mileage;
      if (milesSince >= mt.defaultIntervalMiles) {
        due.push({
          type: mt.name,
          reason: `${milesSince.toLocaleString()} miles since last service (interval: ${mt.defaultIntervalMiles.toLocaleString()} miles)`,
          lastDate: lastRecord.date,
          lastMileage: lastRecord.mileage,
        });
        continue;
      }
    }

    // Check time interval
    if (mt.defaultIntervalMonths && lastRecord) {
      const monthsSince =
        (now.getTime() - lastRecord.date.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSince >= mt.defaultIntervalMonths) {
        due.push({
          type: mt.name,
          reason: `${Math.floor(monthsSince)} months since last service (interval: ${mt.defaultIntervalMonths} months)`,
          lastDate: lastRecord.date,
          lastMileage: lastRecord.mileage,
        });
        continue;
      }
    }
  }

  return due;
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

export async function getServiceIntervalStatus(carId: string, currentMileage: number) {
  const types = await db.maintenanceType.findMany();
  const records = await db.maintenanceRecord.findMany({
    where: { carId },
    orderBy: { date: "desc" },
  });

  return types.map((mt) => {
    const lastRecord = records.find((r) => r.type === mt.name);
    const now = new Date();
    
    let milesSinceLast: number | null = null;
    let monthsSinceLast: number | null = null;
    let mileagePercent: number | null = null;
    let timePercent: number | null = null;
    let nextMileage: number | null = null;
    let nextDate: Date | null = null;

    if (lastRecord) {
      milesSinceLast = currentMileage - lastRecord.mileage;
      monthsSinceLast = (now.getTime() - lastRecord.date.getTime()) / (1000 * 60 * 60 * 24 * 30);
      
      if (mt.defaultIntervalMiles) {
        mileagePercent = Math.min(100, Math.round((milesSinceLast / mt.defaultIntervalMiles) * 100));
        nextMileage = lastRecord.mileage + mt.defaultIntervalMiles;
      }
      if (mt.defaultIntervalMonths) {
        timePercent = Math.min(100, Math.round((monthsSinceLast / mt.defaultIntervalMonths) * 100));
        const nextDateMs = lastRecord.date.getTime() + mt.defaultIntervalMonths * 30 * 24 * 60 * 60 * 1000;
        nextDate = new Date(nextDateMs);
      }
    }

    const isDue = !!(
      (mileagePercent !== null && mileagePercent >= 100) ||
      (timePercent !== null && timePercent >= 100)
    );
    const overallPercent = Math.max(mileagePercent ?? 0, timePercent ?? 0);

    return {
      type: mt.name,
      intervalMiles: mt.defaultIntervalMiles,
      intervalMonths: mt.defaultIntervalMonths,
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
