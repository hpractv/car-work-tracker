import { db } from "~/db.server";

export async function getCarsForUser(userId: string, includeArchived = false) {
  return db.car.findMany({
    where: {
      members: { some: { userId } },
      ...(includeArchived ? {} : { isArchived: false }),
    },
    include: {
      members: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCarById(carId: string, userId: string) {
  return db.car.findFirst({
    where: {
      id: carId,
      members: { some: { userId } },
    },
    include: {
      members: { include: { user: true } },
      maintenanceRecords: { orderBy: { date: "desc" } },
    },
  });
}

export async function createCar(
  data: {
    make: string;
    model: string;
    year: number;
    currentMileage: number;
    purchaseCost?: number | null;
    vendor?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    notes?: string | null;
    vin?: string | null;
    color?: string | null;
  },
  userId: string
){
  return db.car.create({
    data: {
      ...data,
      members: {
        create: { userId, role: "owner" },
      },
    },
  });
}

export async function updateCar(
  carId: string,
  data: {
    make?: string;
    model?: string;
    year?: number;
    currentMileage?: number;
    purchaseCost?: number | null;
    vendor?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    notes?: string | null;
    vin?: string | null;
    color?: string | null;
    isArchived?: boolean;
  },
  userId: string
){
  const membership = await db.carMember.findFirst({
    where: { carId, userId, role: "owner" },
  });
  if (!membership) throw new Error("Not authorized to update this car");
  return db.car.update({ where: { id: carId }, data });
}

export async function deleteCar(carId: string, userId: string) {
  const membership = await db.carMember.findFirst({
    where: { carId, userId, role: "owner" },
  });
  if (!membership) throw new Error("Not authorized to delete this car");
  return db.car.delete({ where: { id: carId } });
}

export async function addCarMember(
  carId: string,
  email: string,
  role: string,
  requestingUserId: string
) {
  const requester = await db.carMember.findFirst({
    where: { carId, userId: requestingUserId, role: "owner" },
  });
  if (!requester) throw new Error("Only owners can add members");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email address format");
  }

  const targetUser = await db.user.findUnique({ where: { email } });
  if (!targetUser) throw new Error("No user found with that email");

  const existing = await db.carMember.findFirst({ where: { carId, userId: targetUser.id } });
  if (existing) throw new Error("That user is already a member of this car");

  return db.carMember.create({
    data: { carId, userId: targetUser.id, role },
  });
}

export async function removeCarMember(
  carId: string,
  memberId: string,
  requestingUserId: string
) {
  const requester = await db.carMember.findFirst({
    where: { carId, userId: requestingUserId, role: "owner" },
  });
  if (!requester) throw new Error("Only owners can remove members");

  return db.carMember.delete({ where: { id: memberId } });
}

export async function updateCarMemberRole(
  carId: string,
  memberId: string,
  newRole: string,
  requestingUserId: string
) {
  const requester = await db.carMember.findFirst({
    where: { carId, userId: requestingUserId, role: "owner" },
  });
  if (!requester) throw new Error("Only owners can change member roles");

  // Prevent owner from changing their own role to driver if no other owners
  const member = await db.carMember.findUnique({ where: { id: memberId } });
  if (!member) throw new Error("Member not found");

  if (member.userId === requestingUserId && newRole !== "owner") {
    const ownerCount = await db.carMember.count({ where: { carId, role: "owner" } });
    if (ownerCount <= 1) throw new Error("Cannot demote the only owner — promote another member first");
  }

  return db.carMember.update({ where: { id: memberId }, data: { role: newRole } });
}

export async function updateCarMileage(carId: string, newMileage: number, userId: string) {
  if (newMileage < 0) throw new Error("Mileage cannot be negative");
  const membership = await db.carMember.findFirst({
    where: { carId, userId },
  });
  if (!membership) throw new Error("Not authorized");
  return db.car.update({
    where: { id: carId },
    data: { currentMileage: newMileage },
  });
}

export async function archiveCar(carId: string, userId: string) {
  const membership = await db.carMember.findFirst({
    where: { carId, userId, role: "owner" },
  });
  if (!membership) throw new Error("Not authorized to archive this car");
  return db.car.update({ where: { id: carId }, data: { isArchived: true } });
}

export async function restoreCar(carId: string, userId: string) {
  const membership = await db.carMember.findFirst({
    where: { carId, userId, role: "owner" },
  });
  if (!membership) throw new Error("Not authorized to restore this car");
  return db.car.update({ where: { id: carId }, data: { isArchived: false } });
}

export async function getOdometerLogs(carId: string) {
  return db.odometerLog.findMany({
    where: { carId },
    orderBy: { recordedAt: "desc" },
  });
}

export async function addOdometerLog(carId: string, mileage: number, note: string | null, userId: string) {
  if (mileage < 0) throw new Error("Mileage cannot be negative");
  const membership = await db.carMember.findFirst({ where: { carId, userId } });
  if (!membership) throw new Error("Not authorized");
  return db.odometerLog.create({ data: { carId, mileage, note } });
}

export async function deleteOdometerLog(logId: string, carId: string, userId: string) {
  const membership = await db.carMember.findFirst({ where: { carId, userId } });
  if (!membership) throw new Error("Not authorized");
  return db.odometerLog.deleteMany({ where: { id: logId, carId } });
}

export async function getCarDocuments(carId: string) {
  return db.carDocument.findMany({
    where: { carId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function addCarDocument(
  carId: string,
  data: {
    type: string;
    title: string;
    expiryDate?: Date | null;
    fileUrl?: string | null;
    notes?: string | null;
  },
  userId: string
) {
  const membership = await db.carMember.findFirst({ where: { carId, userId } });
  if (!membership) throw new Error('Not authorized');
  return db.carDocument.create({ data: { carId, ...data } });
}

export async function deleteCarDocument(docId: string, carId: string, userId: string) {
  const membership = await db.carMember.findFirst({ where: { carId, userId } });
  if (!membership) throw new Error('Not authorized');
  return db.carDocument.deleteMany({ where: { id: docId, carId } });
}

export async function updateCarDocument(
  docId: string,
  carId: string,
  data: {
    type: string;
    title: string;
    expiryDate?: Date | null;
    fileUrl?: string | null;
    notes?: string | null;
  },
  userId: string
) {
  const membership = await db.carMember.findFirst({ where: { carId, userId } });
  if (!membership) throw new Error('Not authorized');
  return db.carDocument.update({
    where: { id: docId },
    data: { ...data },
  });
}

export async function getExpiringDocuments(userCarIds: string[], daysAhead = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);
  return db.carDocument.findMany({
    where: {
      carId: { in: userCarIds },
      expiryDate: { lte: cutoff, gte: new Date() },
    },
    include: { car: { select: { make: true, model: true, year: true, id: true } } },
    orderBy: { expiryDate: 'asc' },
  });
}

export async function getExpiredDocuments(userCarIds: string[]) {
  return db.carDocument.findMany({
    where: {
      carId: { in: userCarIds },
      expiryDate: { lt: new Date() },
    },
    include: { car: { select: { make: true, model: true, year: true, id: true } } },
    orderBy: { expiryDate: 'desc' },
  });
}

export async function getCarMaintenanceOverrides(carId: string) {
  return db.carMaintenanceOverride.findMany({ where: { carId }, orderBy: { typeName: 'asc' } });
}

export async function upsertCarMaintenanceOverride(
  carId: string,
  typeName: string,
  intervalMiles: number | null,
  intervalMonths: number | null,
  userId: string
) {
  const membership = await db.carMember.findFirst({ where: { carId, userId } });
  if (!membership) throw new Error('Not authorized');
  return db.carMaintenanceOverride.upsert({
    where: { carId_typeName: { carId, typeName } },
    create: { carId, typeName, intervalMiles, intervalMonths },
    update: { intervalMiles, intervalMonths },
  });
}

export async function deleteCarMaintenanceOverride(carId: string, typeName: string, userId: string) {
  const membership = await db.carMember.findFirst({ where: { carId, userId } });
  if (!membership) throw new Error('Not authorized');
  return db.carMaintenanceOverride.deleteMany({ where: { carId, typeName } });
}

export async function getFuelLogs(carId: string) {
  return db.fuelLog.findMany({
    where: { carId },
    orderBy: { date: 'desc' },
  });
}

export async function addFuelLog(
  carId: string,
  data: {
    date: Date;
    mileage: number;
    gallons: number;
    pricePerGallon?: number | null;
    totalCost?: number | null;
    fullTank: boolean;
    notes?: string | null;
  },
  userId: string
) {
  if (data.mileage < 0) throw new Error('Mileage cannot be negative');
  if (data.gallons <= 0) throw new Error('Gallons must be positive');
  const membership = await db.carMember.findFirst({ where: { carId, userId } });
  if (!membership) throw new Error('Not authorized');
  return db.fuelLog.create({ data: { carId, ...data } });
}

export async function deleteFuelLog(logId: string, carId: string, userId: string) {
  const membership = await db.carMember.findFirst({ where: { carId, userId } });
  if (!membership) throw new Error('Not authorized');
  return db.fuelLog.deleteMany({ where: { id: logId, carId } });
}

export async function updateFuelLog(
  logId: string,
  carId: string,
  data: {
    date: Date;
    mileage: number;
    gallons: number;
    pricePerGallon: number | null;
    totalCost: number | null;
    fullTank: boolean;
    notes: string | null;
  },
  userId: string
) {
  const membership = await db.carMember.findFirst({
    where: { carId, userId },
  });
  if (!membership) throw new Error("Not authorized");

  return db.fuelLog.update({
    where: { id: logId },
    data: {
      date: data.date,
      mileage: data.mileage,
      gallons: data.gallons,
      pricePerGallon: data.pricePerGallon,
      totalCost: data.totalCost,
      fullTank: data.fullTank,
      notes: data.notes,
    },
  });
}
