import { type LoaderFunctionArgs } from "@remix-run/node";
import { requireUserId } from "~/session.server";
import { getCarById, getFuelLogs } from "~/models/car.server";
import { escapeCsvField, sanitizeFilename } from "~/utils/csv";



export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId!, userId);
  if (!car) throw new Response("Not Found", { status: 404 });

  const logs = await getFuelLogs(params.carId!);

  const headers = ["Date", "Mileage", "Gallons", "Price/Gal", "Total Cost", "Full Tank", "Notes"];
  const rows = logs.map((log) => [
    escapeCsvField(new Date(log.date).toISOString().split("T")[0]),
    escapeCsvField(log.mileage),
    escapeCsvField(log.gallons),
    escapeCsvField(log.pricePerGallon != null ? log.pricePerGallon.toFixed(3) : ""),
    escapeCsvField(log.totalCost != null ? log.totalCost.toFixed(2) : ""),
    escapeCsvField(log.fullTank ? "Yes" : "No"),
    escapeCsvField(log.notes),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\r\n");

  const filename = sanitizeFilename(`${car.year}-${car.make}-${car.model}-fuel-log.csv`);

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
