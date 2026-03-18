import { type LoaderFunctionArgs } from "@remix-run/node";
import { requireUserId } from "~/session.server";
import { getCarsForUser } from "~/models/car.server";
import { db } from "~/db.server";
import { formatMaintenanceType } from "~/utils/format";
import { escapeCsvField, sanitizeFilename } from "~/utils/csv";



export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const cars = await getCarsForUser(userId);
  const carIds = cars.map((c) => c.id);

  if (carIds.length === 0) {
    const csvContent = "Car,VIN,Color,Date,Service Type,Mileage,Cost ($),Vendor,Notes,Receipt URL\r\n";
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
      car: { select: { make: true, model: true, year: true, vin: true, color: true } },
    },
  });

  const headers = ["Car", "VIN", "Color", "Date", "Service Type", "Mileage", "Cost ($)", "Vendor", "Notes", "Receipt URL"];
  const rows = records.map((r) => [
    escapeCsvField(`${r.car.year} ${r.car.make} ${r.car.model}`),
    escapeCsvField(r.car.vin),
    escapeCsvField(r.car.color),
    escapeCsvField(new Date(r.date).toISOString().split("T")[0]),
    escapeCsvField(formatMaintenanceType(r.type)),
    escapeCsvField(r.mileage),
    escapeCsvField(r.cost != null ? r.cost.toFixed(2) : ""),
    escapeCsvField(r.vendor),
    escapeCsvField(r.description),
    escapeCsvField(r.receiptUrl),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\r\n");

  const now = new Date().toISOString().split("T")[0];
  const filename = sanitizeFilename(`fleet-maintenance-${now}.csv`);

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
