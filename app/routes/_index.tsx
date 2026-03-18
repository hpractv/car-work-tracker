import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useRouteError, isRouteErrorResponse, Link } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarsForUser, getExpiringDocuments, getExpiredDocuments } from "~/models/car.server";
import { getBatchMaintenanceDue, getBatchMaintenanceApproaching, getBatchMaintenanceHealthScores } from "~/models/maintenance.server";
import { getUserById } from "~/models/user.server";
// server import moved into loader to avoid client bundling
import { formatMaintenanceType, formatDate } from "~/utils/format";
import CarCard from "~/components/CarCard";
import NearbyServicesAlert from "~/components/NearbyServicesAlert";
import InstallPrompt from "~/components/InstallPrompt";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { db } = await import('~/db.server');
  const user = await getUserById(userId);
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

  const [dueMap, approachingMap, healthScoreMap] = await Promise.all([
    getBatchMaintenanceDue(cars.map((c) => ({ id: c.id, currentMileage: c.currentMileage }))),
    getBatchMaintenanceApproaching(cars.map((c) => ({ id: c.id, currentMileage: c.currentMileage }))),
    getBatchMaintenanceHealthScores(cars.map((c) => ({ id: c.id, currentMileage: c.currentMileage }))),
  ]);

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const allCarDocs = carIds.length > 0
    ? await db.carDocument.findMany({
        where: { carId: { in: carIds }, expiryDate: { not: null } },
        select: { carId: true, expiryDate: true },
      })
    : [];

  const docStatusByCar = new Map<string, { expired: number; expiring: number }>();
  for (const doc of allCarDocs) {
    if (!doc.expiryDate) continue;
    const entry = docStatusByCar.get(doc.carId) ?? { expired: 0, expiring: 0 };
    if (doc.expiryDate < now) {
      entry.expired++;
    } else if (doc.expiryDate < in30Days) {
      entry.expiring++;
    }
    docStatusByCar.set(doc.carId, entry);
  }

  const carsWithDue = cars.map((car) => ({
    car,
    due: dueMap.get(car.id) ?? [],
    lastServiceDate: lastRecordsByCarId.get(car.id) ?? null,
    totalRecords: recordCountsByCarId.get(car.id) ?? 0,
    healthScore: healthScoreMap.get(car.id) ?? null,
    docStatus: docStatusByCar.get(car.id) ?? { expired: 0, expiring: 0 },
  }));

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

  const healthScores = carsWithDue.map((c) => c.healthScore).filter((s): s is number => s !== null);
  const fleetHealthScore: number | null = healthScores.length > 0
    ? Math.round(healthScores.reduce((sum, s) => sum + s, 0) / healthScores.length)
    : null;

  const carsWithApproaching = cars.map((car) => ({
    car,
    approaching: approachingMap.get(car.id) ?? [],
  }));

  const [expiringDocs, expiredDocs] = await Promise.all([
    carIds.length > 0 ? getExpiringDocuments(carIds, 30) : Promise.resolve([]),
    carIds.length > 0 ? getExpiredDocuments(carIds) : Promise.resolve([]),
  ]);

  return json({ user, carsWithDue, carsWithApproaching, recentRecords, totalCars, totalRecords, totalCost, carsWithDueCount, fleetHealthScore, expiringDocs, expiredDocs });
}

export default function Index() {
  const { user, carsWithDue, carsWithApproaching, recentRecords, totalCars, totalRecords, totalCost, carsWithDueCount, fleetHealthScore, expiringDocs, expiredDocs } = useLoaderData<typeof loader>();

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
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: fleetHealthScore === null ? "#94a3b8" : fleetHealthScore >= 90 ? "#16a34a" : fleetHealthScore >= 70 ? "#65a30d" : fleetHealthScore >= 50 ? "#d97706" : "#dc2626" }}>
              {fleetHealthScore === null ? "N/A" : `${fleetHealthScore}%`}
            </div>
            <div className="text-muted text-sm">Fleet Health</div>
          </div>
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

          {expiredDocs.length > 0 && (
            <div className="card" style={{ borderLeft: "4px solid #dc2626" }}>
              <h2 style={{ color: "#dc2626" }}>🔴 Expired Documents</h2>
              <ul style={{ margin: "0.5rem 0 0 0", listStyle: "none", padding: 0 }}>
                {expiredDocs.map((doc) => (
                  <li key={doc.id} className="text-sm" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.25rem 0", borderBottom: "1px solid var(--border)" }}>
                    <span>
                      <Link to={`/cars/${doc.car.id}/documents`}>
                        {doc.car.year} {doc.car.make} {doc.car.model}
                      </Link>{" "}
                      — <strong>{doc.title}</strong>{" "}
                      <span className="badge" style={{ background: "#fee2e2", color: "#7f1d1d" }}>{doc.type}</span>
                    </span>
                    <span className="text-muted" style={{ marginLeft: "0.5rem", whiteSpace: "nowrap" }}>
                      Expired {formatDate(doc.expiryDate!)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {expiringDocs.length > 0 && (
            <div className="card" style={{ borderLeft: "4px solid #f59e0b" }}>
              <h2 style={{ color: "#92400e" }}>🟡 Documents Expiring Soon</h2>
              <ul style={{ margin: "0.5rem 0 0 0", listStyle: "none", padding: 0 }}>
                {expiringDocs.map((doc) => (
                  <li key={doc.id} className="text-sm" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.25rem 0", borderBottom: "1px solid var(--border)" }}>
                    <span>
                      <Link to={`/cars/${doc.car.id}/documents`}>
                        {doc.car.year} {doc.car.make} {doc.car.model}
                      </Link>{" "}
                      — <strong>{doc.title}</strong>{" "}
                      <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>{doc.type}</span>
                    </span>
                    <span className="text-muted" style={{ marginLeft: "0.5rem", whiteSpace: "nowrap" }}>
                      Expires {formatDate(doc.expiryDate!)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h2>Your Cars</h2>
          <div className="grid">
            {carsWithDue.map(({ car, due, lastServiceDate, totalRecords, healthScore, docStatus }) => (
              <CarCard key={car.id} car={car} imageUrl={car.imageUrl} dueCount={due.length} dueTypes={due.map(d => d.type)} lastServiceDate={lastServiceDate} totalRecords={totalRecords} healthScore={healthScore} docStatus={docStatus} />
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
