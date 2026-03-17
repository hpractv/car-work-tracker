import { type LoaderFunctionArgs } from "@remix-run/node";
import { requireUserId } from "~/session.server";
import { getCarsForUser } from "~/models/car.server";
import { db } from "~/db.server";
import { formatMaintenanceType } from "~/utils/format";

/**
 * GET /maintenance/export-json?carId=&type=&dateFrom=&dateTo=&search=
 * Returns a JSON download of all filtered maintenance records.
 * Mirrors the filter logic in maintenance.export.tsx.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const cars = await getCarsForUser(userId);
  const carIds = cars.map((c) => c.id);

  if (carIds.length === 0) {
    const empty = { exported_at: new Date().toISOString(), total_records: 0, records: [] };
    return new Response(JSON.stringify(empty, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="maintenance-history.json"',
      },
    });
  }

  const url = new URL(request.url);
  const selectedCarId = url.searchParams.get("carId") ?? "";
  const typeFilter = url.searchParams.get("type") ?? "";
  const dateFrom = url.searchParams.get("dateFrom") ?? "";
  const dateTo = url.searchParams.get("dateTo") ?? "";
  const search = url.searchParams.get("search") ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = selectedCarId
    ? { carId: selectedCarId }
    : { carId: { in: carIds } };

  if (typeFilter) {
    where.type = typeFilter;
  }

  if (dateFrom || dateTo) {
    const dateCondition: { gte?: Date; lt?: Date } = {};
    if (dateFrom) {
      const d = new Date(dateFrom);
      if (!isNaN(d.getTime())) dateCondition.gte = d;
    }
    if (dateTo) {
      const d = new Date(dateTo);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
        dateCondition.lt = d;
      }
    }
    if (Object.keys(dateCondition).length > 0) {
      where.date = dateCondition;
    }
  }

  if (search.trim()) {
    where.OR = [
      { type: { contains: search } },
      { vendor: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const allRecords = await db.maintenanceRecord.findMany({
    where,
    orderBy: { date: "desc" },
    include: { car: { select: { make: true, model: true, year: true, vin: true } } },
  });

  const records = allRecords.map((r) => ({
    id: r.id,
    date: new Date(r.date).toISOString().slice(0, 10),
    car: `${r.car.year} ${r.car.make} ${r.car.model}`,
    car_year: r.car.year,
    car_make: r.car.make,
    car_model: r.car.model,
    vin: r.car.vin ?? null,
    type: r.type,
    type_label: formatMaintenanceType(r.type),
    mileage: r.mileage,
    cost: r.cost ?? null,
    vendor: r.vendor ?? null,
    description: r.description ?? null,
    receipt_url: r.receiptUrl ?? null,
  }));

  const data = {
    exported_at: new Date().toISOString(),
    total_records: records.length,
    records,
  };

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="maintenance-history.json"',
    },
  });
}
