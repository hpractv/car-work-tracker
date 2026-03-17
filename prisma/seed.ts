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

  await db.user.upsert({
    where: { email: devEmail },
    update: {},
    create: {
      email: devEmail,
      passwordHash,
      name: "Dev User",
    },
  });
  console.log(`✓ Seeded dev user: ${devEmail} / ${devPassword}`);

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
