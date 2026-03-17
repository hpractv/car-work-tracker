import { useState, useMemo } from "react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link, useRouteError, isRouteErrorResponse } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarsForUser } from "~/models/car.server";
import { getMaintenanceDue } from "~/models/maintenance.server";
import { db } from "~/db.server";
import CarCard from "~/components/CarCard";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const cars = await getCarsForUser(userId);

  const carsWithDue = await Promise.all(
    cars.map(async (car) => {
      const due = await getMaintenanceDue(car.id, car.currentMileage);
      const lastRecord = await db.maintenanceRecord.findFirst({
        where: { carId: car.id },
        orderBy: { date: "desc" },
        select: { date: true },
      });
      const recordCount = await db.maintenanceRecord.count({ where: { carId: car.id } });
      return {
        car,
        dueCount: due.length,
        lastServiceDate: lastRecord ? lastRecord.date.toISOString() : null,
        totalRecords: recordCount,
      };
    })
  );

  return json({ carsWithDue });
}

export default function CarsIndex() {
  const { carsWithDue } = useLoaderData<typeof loader>();
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
        <Link to="/cars/new" className="btn btn-primary">
          + Add Car
        </Link>
      </div>

      {carsWithDue.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <p className="text-muted">No cars yet. Add your first one!</p>
          <Link to="/cars/new" className="btn btn-primary mt-2">Add Car</Link>
        </div>
      ) : (
        <>
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
              {filteredCars.map(({ car, dueCount, lastServiceDate, totalRecords }) => (
                <CarCard key={car.id} car={car} dueCount={dueCount} lastServiceDate={lastServiceDate} totalRecords={totalRecords} />
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
