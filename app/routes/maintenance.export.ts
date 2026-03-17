import { type LoaderFunctionArgs } from "@remix-run/node";
import { requireUserId } from "~/session.server";
import { getCarsForUser } from "~/models/car.server";
import { db } from "~/db.server";

/**
 * GET /maintenance/export?carId=&type=&dateFrom=&dateTo=&search=
 * Returns a CSV download of all filtered maintenance records.
 * Mirrors the filter logic in maintenance._index.tsx (where clause only, no pagination).
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const cars = await getCarsForUser(userId);
  const carIds = cars.map((c) => c.id);

  if (carIds.length === 0) {
    return new Response("Date,Car,VIN,Service Type,Mileage,Cost,Vendor,Description,Receipt URL\n", {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="maintenance-history.csv"`,
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

  const escapeCsvField = (value: string | number | null | undefined): string => {
    if (value == null) return "";
    const s = String(value);
    if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = [
    ["Date", "Car", "VIN", "Service Type", "Mileage", "Cost", "Vendor", "Description", "Receipt URL"].join(","),
    ...allRecords.map((r) =>
      [
        escapeCsvField(new Date(r.date).toISOString().slice(0, 10)),
        escapeCsvField(`${r.car.year} ${r.car.make} ${r.car.model}`),
        escapeCsvField(r.car.vin),
        escapeCsvField(r.type),
        escapeCsvField(r.mileage),
        escapeCsvField(r.cost != null ? r.cost.toFixed(2) : ""),
        escapeCsvField(r.vendor),
        escapeCsvField(r.description),
        escapeCsvField(r.receiptUrl),
      ].join(",")
    ),
  ].join("\r\n");

  return new Response(rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="maintenance-history.csv"`,
    },
  });
}
