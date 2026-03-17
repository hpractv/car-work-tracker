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
  return db.maintenanceRecord.create({ data });
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
  return db.maintenanceRecord.update({ where: { id: recordId }, data });
}

export async function deleteMaintenanceRecord(recordId: string, carId: string) {
  return db.maintenanceRecord.deleteMany({
    where: { id: recordId, carId },
  });
}

export async function getMaintenanceTypes() {
  return db.maintenanceType.findMany({ orderBy: { name: "asc" } });
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
      due.push({ type: mt.name, reason: "No record found" });
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
