import { type LoaderFunctionArgs } from "@remix-run/node";
import { requireUserId } from "~/session.server";
import { getCarById } from "~/models/car.server";
import { formatMaintenanceType } from "~/utils/format";

function escapeCsvField(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId!, userId);
  if (!car) throw new Response("Not Found", { status: 404 });

  const records = car.maintenanceRecords; // already ordered by date desc

  const headers = ["Date", "Type", "Mileage", "Cost ($)", "Vendor", "Notes"];
  const rows = records.map((r) => [
    escapeCsvField(new Date(r.date).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" })),
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

  const filename = `${car.year}-${car.make}-${car.model}-maintenance.csv`
    .replace(/\s+/g, "-")
    .toLowerCase();

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
