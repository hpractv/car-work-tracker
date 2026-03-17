# Data Model (Prisma Schema)

**Core entities:**

- **User** 
  - `id` (String/UUID)
  - `email` (String, unique)
  - `passwordHash` (String)
  - `name` (String?)
  - `createdAt` (DateTime)

- **Car**
  - `id` (String/UUID)
  - `make` (String)
  - `model` (String)
  - `year` (Int)
  - `currentMileage` (Int)
  - `purchaseCost` (Float?)
  - `vendor` (String?)
  - `description` (String?)
  - `createdAt` (DateTime)

- **CarMember** (junction table)
  - `carId` (String, foreign key)
  - `userId` (String, foreign key)
  - `role` (String: "owner" | "driver")

- **MaintenanceRecord**
  - `id` (String/UUID)
  - `carId` (String, foreign key)
  - `type` (String: "oil_change" | "tire_rotation" | "brake_service" | etc.)
  - `date` (DateTime)
  - `mileage` (Int)
  - `cost` (Float?)
  - `vendor` (String?)
  - `description` (String?)
  - `createdAt` (DateTime)

- **MaintenanceType** (reference/configuration)
  - `id` (String/UUID)
  - `name` (String)
  - `defaultIntervalMiles` (Int?)
  - `defaultIntervalMonths` (Int?)

**Relationships:**
- User ↔ Car: many-to-many via CarMember
- Car → MaintenanceRecord: one-to-many

## Auth Guard Pattern (Loaders)
```ts
const session = await getSession(request);
if (!session.get("userId")) throw redirect("/login");
const cars = await prisma.car.findMany({
  where: { members: { some: { userId: session.get("userId") } } }
});
```
