import { type LoaderFunctionArgs } from "@remix-run/node";
import { requireUserId } from "~/session.server";
import { getCarsForUser } from "~/models/car.server";
import { db } from "~/db.server";
import { formatMaintenanceType } from "~/utils/format";

function escapeCsvField(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const cars = await getCarsForUser(userId);
  const carIds = cars.map((c) => c.id);

  if (carIds.length === 0) {
    const csvContent = "Car,Date,Type,Mileage,Cost ($),Vendor,Notes\r\n";
    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="maintenance-history.csv"',
      },
    });
  }

  const records = await db.maintenanceRecord.findMany({
    where: { carId: { in: carIds } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      car: { select: { make: true, model: true, year: true } },
    },
  });

  const headers = ["Car", "Date", "Service Type", "Mileage", "Cost ($)", "Vendor", "Notes"];
  const rows = records.map((r) => [
    escapeCsvField(`${r.car.year} ${r.car.make} ${r.car.model}`),
    escapeCsvField(new Date(r.date).toISOString().split("T")[0]),
    escapeCsvField(formatMaintenanceType(r.type)),
    escapeCsvField(r.mileage),
    escapeCsvField(r.cost != null ? r.cost.toFixed(2) : ""),
    escapeCsvField(r.vendor),
    escapeCsvField(r.description),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\r\n");

  const now = new Date().toISOString().split("T")[0];
  const filename = `fleet-maintenance-${now}.csv`;

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
