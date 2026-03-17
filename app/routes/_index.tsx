import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useRouteError, isRouteErrorResponse } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarsForUser } from "~/models/car.server";
import { getMaintenanceDue } from "~/models/maintenance.server";
import { getUserById } from "~/models/user.server";
import { db } from "~/db.server";
import { formatMaintenanceType, formatDate } from "~/utils/format";
import CarCard from "~/components/CarCard";
import NearbyServicesAlert from "~/components/NearbyServicesAlert";
import InstallPrompt from "~/components/InstallPrompt";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const user = await getUserById(userId);
  const cars = await getCarsForUser(userId);

  const carsWithDue = await Promise.all(
    cars.map(async (car) => {
      const due = await getMaintenanceDue(car.id, car.currentMileage);
      return { car, due };
    })
  );

  const recentRecords = await db.maintenanceRecord.findMany({
    where: { car: { members: { some: { userId } } } },
    orderBy: { date: "desc" },
    take: 5,
    include: { car: { select: { make: true, model: true, year: true, id: true } } },
  });

  // Compute fleet stats
  const totalCars = cars.length;
  const totalRecords = await db.maintenanceRecord.count({
    where: { car: { members: { some: { userId } } } },
  });
  const costAggregate = await db.maintenanceRecord.aggregate({
    where: {
      car: { members: { some: { userId } } },
      cost: { not: null },
    },
    _sum: { cost: true },
  });
  const totalCost = costAggregate._sum.cost ?? 0;
  const carsWithDueCount = carsWithDue.filter((c) => c.due.length > 0).length;

  return json({ user, carsWithDue, recentRecords, totalCars, totalRecords, totalCost, carsWithDueCount });
}

export default function Index() {
  const { user, carsWithDue, recentRecords, totalCars, totalRecords, totalCost, carsWithDueCount } = useLoaderData<typeof loader>();

  const allDue = carsWithDue.flatMap((c) => c.due);

  return (
    <div>
      <InstallPrompt />
      <NearbyServicesAlert maintenanceDue={allDue} />

      <div className="page-header">
        <div>
          <h1>Welcome back{user?.name ? `, ${user.name}` : ""}!</h1>
          <p className="text-muted">Here's an overview of your vehicles.</p>
        </div>
        <a href="/cars/new" className="btn btn-primary">
          + Add Car
        </a>
      </div>

      {carsWithDue.length > 0 && (
        <div className="card mb-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1e40af" }}>{totalCars}</div>
            <div className="text-muted text-sm">Car{totalCars !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1e40af" }}>{totalRecords}</div>
            <div className="text-muted text-sm">Service Record{totalRecords !== 1 ? "s" : ""}</div>
          </div>
          {totalCost > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1e40af" }}>${totalCost.toFixed(0)}</div>
              <div className="text-muted text-sm">Total Spent</div>
            </div>
          )}
          {carsWithDueCount > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f59e0b" }}>{carsWithDueCount}</div>
              <div className="text-muted text-sm">Need Service</div>
            </div>
          )}
        </div>
      )}

      {carsWithDue.length === 0 ?(
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <p className="text-muted">You have no cars yet.</p>
          <a href="/cars/new" className="btn btn-primary mt-2">
            Add your first car
          </a>
        </div>
      ) : (
        <>
          {allDue.length > 0 && (
            <div className="card" style={{ borderLeft: "4px solid #f59e0b" }}>
              <h2 style={{ color: "#92400e" }}>⚠️ Maintenance Due</h2>
              {carsWithDue
                .filter((c) => c.due.length > 0)
                .map(({ car, due }) => (
                  <div key={car.id} className="mt-1">
                    <strong>
                      {car.year} {car.make} {car.model}
                    </strong>
                    <ul style={{ margin: "0.35rem 0 0.5rem 1.25rem" }}>
                      {due.map((d) => (
                        <li key={d.type} className="text-sm">
                          <strong>{formatMaintenanceType(d.type)}</strong>: {d.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          )}

          <h2>Your Cars</h2>
          <div className="grid">
            {carsWithDue.map(({ car, due }) => (
              <CarCard key={car.id} car={car} dueCount={due.length} />
            ))}
          </div>
        </>
      )}

      {recentRecords.length > 0 && (
        <div className="card mt-2">
          <h2>Recent Activity</h2>
          <div className="timeline">
            {recentRecords.map((record) => (
              <div key={record.id} className="timeline-item">
                <div className="flex flex-between">
                  <div>
                    <strong>{formatMaintenanceType(record.type)}</strong>
                    <span className="text-muted text-sm" style={{ marginLeft: "0.5rem" }}>
                      {formatDate(record.date)}
                    </span>
                  </div>
                  <a href={`/cars/${record.car.id}`} className="btn btn-secondary btn-sm">
                    {record.car.year} {record.car.make} {record.car.model}
                  </a>
                </div>
                <div className="text-sm mt-1" style={{ color: "#475569" }}>
                  {record.mileage.toLocaleString()} miles
                  {record.cost != null ? ` · $${record.cost.toFixed(2)}` : ""}
                  {record.vendor ? ` · ${record.vendor}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
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
      <a href="/" className="btn btn-secondary mt-2">Go Home</a>
    </div>
  );
}
