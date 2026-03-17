import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useRouteError, isRouteErrorResponse } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarsForUser } from "~/models/car.server";
import { getMaintenanceDue, getMaintenanceApproaching } from "~/models/maintenance.server";
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

  const carsWithApproaching = await Promise.all(
    cars.map(async (car) => {
      const approaching = await getMaintenanceApproaching(car.id, car.currentMileage);
      return { car, approaching };
    })
  );

  return json({ user, carsWithDue, carsWithApproaching, recentRecords, totalCars, totalRecords, totalCost, carsWithDueCount });
}

export default function Index() {
  const { user, carsWithDue, carsWithApproaching, recentRecords, totalCars, totalRecords, totalCost, carsWithDueCount } = useLoaderData<typeof loader>();

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
                    <ul style={{ margin: "0.35rem 0 0.5rem 0", listStyle: "none", padding: 0 }}>
                      {due.map((d) => (
                        <li key={d.type} className="text-sm" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0" }}>
                          <span><strong>{formatMaintenanceType(d.type)}</strong>: {d.reason}</span>
                          <a href={`/cars/${car.id}/maintenance/new?type=${encodeURIComponent(d.type)}`} className="btn btn-primary btn-sm" style={{ marginLeft: "0.5rem", whiteSpace: "nowrap" }}>
                            Log Service
                          </a>
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

          {carsWithApproaching.some(c => c.approaching.length > 0) && (
            <div className="card mt-2" style={{ borderLeft: "4px solid #3b82f6" }}>
              <h2 style={{ color: "#1e40af" }}>🔧 Upcoming Maintenance</h2>
              <p className="text-muted text-sm mb-2">Items approaching their service interval</p>
              {carsWithApproaching
                .filter(c => c.approaching.length > 0)
                .map(({ car, approaching }) => (
                  <div key={car.id} className="mt-1">
                    <strong>{car.year} {car.make} {car.model}</strong>
                    <ul style={{ margin: "0.35rem 0 0.5rem 0", listStyle: "none", padding: 0 }}>
                      {approaching.map((item) => (
                        <li key={item.type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0" }}>
                          <div style={{ flex: 1 }}>
                            <span className="text-sm"><strong>{formatMaintenanceType(item.type)}</strong></span>
                            <div style={{ background: "#e2e8f0", borderRadius: "999px", height: "4px", marginTop: "0.2rem", width: "100%", maxWidth: "200px" }}>
                              <div style={{ background: "#3b82f6", borderRadius: "999px", height: "4px", width: `${Math.min(100, item.overallPercent)}%` }} />
                            </div>
                            <span className="text-sm text-muted">{item.overallPercent}% of interval</span>
                          </div>
                          <a href={`/cars/${car.id}/maintenance/new?type=${encodeURIComponent(item.type)}`} className="btn btn-secondary btn-sm" style={{ marginLeft: "0.5rem", whiteSpace: "nowrap" }}>
                            Log Service
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          )}
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
