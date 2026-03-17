import { useState, useMemo } from "react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link, useRouteError, isRouteErrorResponse } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarsForUser } from "~/models/car.server";
import { getBatchMaintenanceDue } from "~/models/maintenance.server";
import { db } from "~/db.server";
import CarCard from "~/components/CarCard";
import { formatCurrency } from "~/utils/format";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const cars = await getCarsForUser(userId);

  const carIds = cars.map((c) => c.id);

  const [lastRecordsRaw, countGroupsRaw] = await Promise.all([
    carIds.length > 0
      ? db.maintenanceRecord.findMany({
          where: { carId: { in: carIds } },
          orderBy: { date: "desc" },
          select: { carId: true, date: true },
        })
      : Promise.resolve([]),
    carIds.length > 0
      ? db.maintenanceRecord.groupBy({
          by: ["carId"],
          where: { carId: { in: carIds } },
          _count: { id: true },
        })
      : Promise.resolve([]),
  ]);

  const lastRecordsByCarId = new Map<string, string>();
  for (const record of lastRecordsRaw) {
    if (!lastRecordsByCarId.has(record.carId)) {
      lastRecordsByCarId.set(record.carId, record.date.toISOString());
    }
  }

  const recordCountsByCarId = new Map<string, number>();
  for (const group of countGroupsRaw) {
    recordCountsByCarId.set(group.carId, group._count.id);
  }

  const dueMap = await getBatchMaintenanceDue(
    cars.map((c) => ({ id: c.id, currentMileage: c.currentMileage }))
  );

  const carsWithDue = cars.map((car) => ({
    car,
    dueCount: (dueMap.get(car.id) ?? []).length,
    dueTypes: (dueMap.get(car.id) ?? []).map((d) => d.type),
    lastServiceDate: lastRecordsByCarId.get(car.id) ?? null,
    totalRecords: recordCountsByCarId.get(car.id) ?? 0,
  }));

  let totalRecords = 0;
  let totalCost = 0;
  if (carIds.length > 0) {
    totalRecords = await db.maintenanceRecord.count({ where: { carId: { in: carIds } } });
    const costAgg = await db.maintenanceRecord.aggregate({
      where: { carId: { in: carIds }, cost: { not: null } },
      _sum: { cost: true },
    });
    totalCost = costAgg._sum.cost ?? 0;
  }

  return json({ carsWithDue, totalRecords, totalCost });
}

export default function CarsIndex() {
  const { carsWithDue, totalRecords, totalCost } = useLoaderData<typeof loader>();
  const [search, setSearch] = useState("");

  const filteredCars = useMemo(() => {
    if (!search.trim()) return carsWithDue;
    const q = search.toLowerCase();
    return carsWithDue.filter(({ car }) =>
      car.make.toLowerCase().includes(q) ||
      car.model.toLowerCase().includes(q) ||
      String(car.year).includes(q)
    );
  }, [search, carsWithDue]);

  return (
    <div>
      <div className="page-header">
        <h1>My Cars</h1>
        <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
          {carsWithDue.length > 0 && (
            <a href="/cars/export" className="btn btn-secondary">
              ⬇ Export All
            </a>
          )}
          <Link to="/cars/new" className="btn btn-primary">
            + Add Car
          </Link>
        </div>
      </div>

      {carsWithDue.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <p className="text-muted">No cars yet. Add your first one!</p>
          <Link to="/cars/new" className="btn btn-primary mt-2">Add Car</Link>
        </div>
      ) : (
        <>
          {carsWithDue.length > 0 && (
            <div className="card" style={{ display: "flex", gap: "2rem", padding: "1rem 1.5rem", marginBottom: "1rem", background: "#f8fafc" }}>
              <div>
                <strong>{carsWithDue.length}</strong>
                <span className="text-muted text-sm" style={{ marginLeft: "0.35rem" }}>car{carsWithDue.length !== 1 ? "s" : ""}</span>
              </div>
              {totalRecords > 0 && (
                <div>
                  <strong>{totalRecords}</strong>
                  <span className="text-muted text-sm" style={{ marginLeft: "0.35rem" }}>service record{totalRecords !== 1 ? "s" : ""}</span>
                </div>
              )}
              {totalCost > 0 && (
                <div>
                  <strong>{formatCurrency(totalCost)}</strong>
                  <span className="text-muted text-sm" style={{ marginLeft: "0.35rem" }}>total spent</span>
                </div>
              )}
            </div>
          )}
          <div className="form-group mb-2">
            <input
              type="search"
              placeholder="Search by make, model, or year..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
              aria-label="Search cars"
            />
          </div>
          {filteredCars.length === 0 ? (
            <p className="text-muted">No cars match your search.</p>
          ) : (
            <div className="grid">
              {filteredCars.map(({ car, dueCount, dueTypes, lastServiceDate, totalRecords }) => (
                <CarCard key={car.id} car={car} dueCount={dueCount} dueTypes={dueTypes} lastServiceDate={lastServiceDate} totalRecords={totalRecords} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <div className="card" style={{ borderLeft: "4px solid #dc2626", maxWidth: "600px" }}>
      <h2>Something went wrong</h2>
      {isRouteErrorResponse(error) ? (
        <p className="text-muted">{error.status} — {error.statusText || "Error"}</p>
      ) : error instanceof Error ? (
        <p className="text-muted">{error.message}</p>
      ) : (
        <p className="text-muted">An unexpected error occurred</p>
      )}
      <a href="/cars" className="btn btn-secondary mt-2">← Back to Cars</a>
    </div>
  );
}
