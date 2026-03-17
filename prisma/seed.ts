import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function seed() {
  const maintenanceTypes = [
    { name: "oil_change", defaultIntervalMiles: 3000, defaultIntervalMonths: 3 },
    { name: "tire_rotation", defaultIntervalMiles: 5000, defaultIntervalMonths: 6 },
    { name: "brake_service", defaultIntervalMiles: 25000, defaultIntervalMonths: 24 },
    { name: "air_filter", defaultIntervalMiles: 15000, defaultIntervalMonths: 12 },
    { name: "cabin_filter", defaultIntervalMiles: 15000, defaultIntervalMonths: 12 },
    { name: "transmission_service", defaultIntervalMiles: 30000, defaultIntervalMonths: 24 },
    { name: "spark_plugs", defaultIntervalMiles: 30000, defaultIntervalMonths: 24 },
    { name: "battery_check", defaultIntervalMiles: null, defaultIntervalMonths: 12 },
    { name: "coolant_flush", defaultIntervalMiles: 30000, defaultIntervalMonths: 24 },
    { name: "wheel_alignment", defaultIntervalMiles: 10000, defaultIntervalMonths: 12 },
    { name: "wiper_blades", defaultIntervalMiles: null, defaultIntervalMonths: 12 },
  ];

  for (const mt of maintenanceTypes) {
    await db.maintenanceType.upsert({
      where: { name: mt.name },
      update: {},
      create: mt,
    });
  }
  console.log("✓ Seeded maintenance types");

  // Seed a development user for easy testing
  const devEmail = "dev@example.com";
  const devPassword = "password123";
  const passwordHash = await bcrypt.hash(devPassword, 10);

  const devUser = await db.user.upsert({
    where: { email: devEmail },
    update: {},
    create: {
      email: devEmail,
      passwordHash,
      name: "Dev User",
    },
  });
  console.log(`✓ Seeded dev user: ${devEmail} / ${devPassword}`);

  // Seed a car for the dev user
  let car = await db.car.findFirst({ where: { members: { some: { userId: devUser.id } } } });
  if (!car) {
    car = await db.car.create({
      data: {
        make: "Toyota",
        model: "Camry",
        year: 2020,
        currentMileage: 45700,
        members: { create: { userId: devUser.id, role: "owner" } },
      },
    });
    console.log("✓ Seeded dev car");
  }

  // Seed FuelLog entries
  try {
    const fuelLogData = [
      { date: new Date('2025-12-01T12:00:00'), mileage: 45000, gallons: 10.5, pricePerGallon: 3.45, totalCost: 36.23, fullTank: true, notes: 'Shell station' },
      { date: new Date('2025-12-20T12:00:00'), mileage: 45320, gallons: 9.8, pricePerGallon: 3.52, totalCost: 34.50, fullTank: true, notes: 'BP gas' },
      { date: new Date('2026-01-15T12:00:00'), mileage: 45680, gallons: 11.2, pricePerGallon: 3.38, totalCost: 37.86, fullTank: true, notes: null },
    ];
    for (const flog of fuelLogData) {
      await db.fuelLog.create({ data: { carId: car.id, ...flog } });
    }
    console.log("✓ Seeded fuel logs");
  } catch (e) {
    console.error("Failed to seed fuel logs:", e);
  }

  // Seed OdometerLog entries
  try {
    await db.odometerLog.createMany({
      data: [
        { carId: car.id, mileage: 44500, note: 'Monthly reading', recordedAt: new Date('2025-11-01') },
        { carId: car.id, mileage: 45700, note: 'Annual check', recordedAt: new Date('2026-01-01') },
      ],
    });
    console.log("✓ Seeded odometer logs");
  } catch (e) {
    console.error("Failed to seed odometer logs:", e);
  }

  // Seed CarDocument entries
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 15); // 15 days from now - "expiring soon"
    await db.carDocument.createMany({
      data: [
        { carId: car.id, type: 'insurance', title: 'State Farm Policy 2025', expiryDate: thirtyDaysFromNow, fileUrl: null, notes: 'Policy #12345' },
        { carId: car.id, type: 'registration', title: 'DMV Registration', expiryDate: new Date('2026-12-31'), fileUrl: null, notes: null },
      ],
    });
    console.log("✓ Seeded car documents");
  } catch (e) {
    console.error("Failed to seed car documents:", e);
  }

  console.log("Seed completed successfully.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
