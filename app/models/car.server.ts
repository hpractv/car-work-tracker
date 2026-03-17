import { db } from "~/db.server";

export async function getCarsForUser(userId: string) {
  return db.car.findMany({
    where: {
      members: { some: { userId } },
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
  },
  userId: string
) {
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
  },
  userId: string
) {
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

  const targetUser = await db.user.findUnique({ where: { email } });
  if (!targetUser) throw new Error("No user found with that email");

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
