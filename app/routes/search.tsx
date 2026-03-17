import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form, Link, isRouteErrorResponse, useRouteError } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { db } from "~/db.server";
import { formatMaintenanceType, formatDate, formatCurrency } from "~/utils/format";

export function meta() {
  return [{ title: "Search — Car Work Tracker" }];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return json({ cars: [], records: [], documentResults: [], fuelLogResults: [], query: q, totalCars: 0, totalRecords: 0 });
  }

  const memberRows = await db.carMember.findMany({
    where: { userId },
    select: { carId: true },
  });
  const carIds = memberRows.map((m) => m.carId);

  const carWhere = {
    AND: [
      { members: { some: { userId } } },
      {
        OR: [
          { make: { contains: q } },
          { model: { contains: q } },
          { vendor: { contains: q } },
          { description: { contains: q } },
          { vin: { contains: q } },
          { color: { contains: q } },
          { notes: { contains: q } },
        ],
      },
    ],
  };

  const recordWhere =
    carIds.length > 0
      ? {
          AND: [
            { carId: { in: carIds } },
            {
              OR: [
                { type: { contains: q } },
                { vendor: { contains: q } },
                { description: { contains: q } },
              ],
            },
          ],
        }
      : null;

  const [cars, totalCars] = await Promise.all([
    db.car.findMany({ where: carWhere, take: 10 }),
    db.car.count({ where: carWhere }),
  ]);

  const records = recordWhere
    ? await db.maintenanceRecord.findMany({
        where: recordWhere,
        include: {
          car: { select: { id: true, make: true, model: true, year: true } },
        },
        orderBy: { date: "desc" },
        take: 20,
      })
    : [];

  const totalRecords = recordWhere
    ? await db.maintenanceRecord.count({ where: recordWhere })
    : 0;

  // Documents search
  const documentResults = q.length >= 2
    ? await db.carDocument.findMany({
        where: {
          carId: { in: carIds },
          OR: [
            { title: { contains: q } },
            { notes: { contains: q } },
          ],
        },
        include: { car: { select: { id: true, make: true, model: true, year: true } } },
        take: 10,
      })
    : [];

  // Fuel log search
  const fuelLogResults = q.length >= 2
    ? await db.fuelLog.findMany({
        where: {
          carId: { in: carIds },
          notes: { contains: q },
        },
        include: { car: { select: { id: true, make: true, model: true, year: true } } },
        take: 10,
      })
    : [];

  return json({ cars, records, documentResults, fuelLogResults, query: q, totalCars, totalRecords });
}

export default function SearchPage() {
  const { cars, records, documentResults, fuelLogResults, query, totalCars, totalRecords } = useLoaderData<typeof loader>();
  const hasResults = cars.length > 0 || records.length > 0 || documentResults.length > 0 || fuelLogResults.length > 0;

  return (
    <div className="container" style={{ padding: "1.5rem" }}>
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <h1>Search</h1>
      </div>

      <Form method="get" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            name="q"
            defaultValue={query}
            autoFocus
            placeholder="Search cars, maintenance records..."
            className="form-control"
            style={{ flex: 1, fontSize: "1rem" }}
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </div>
      </Form>

      {query.length < 2 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <p className="text-muted">Enter at least 2 characters to search.</p>
        </div>
      ) : !hasResults ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <p className="text-muted">No results found for &ldquo;{query}&rdquo;</p>
          <p className="text-muted text-sm mt-1">
            Try searching for a car make, model, service type, or vendor name.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <p className="text-muted text-sm">
            Showing {cars.length} of {totalCars} car{totalCars !== 1 ? "s" : ""} and{" "}
            {records.length} of {totalRecords} record
            {totalRecords !== 1 ? "s" : ""} matching &ldquo;{query}&rdquo;
          </p>

          {cars.length > 0 && (
            <div className="card">
              <h2 style={{ marginBottom: "0.75rem" }}>
                🚗 Cars ({cars.length}{totalCars > cars.length ? ` of ${totalCars}` : ""})
              </h2>
              {cars.map((car) => (
                <div
                  key={car.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <div>
                    <strong>
                      {car.year} {car.make} {car.model}
                    </strong>
                    {car.vendor && (
                      <span className="text-muted text-sm" style={{ marginLeft: "0.5rem" }}>
                        from {car.vendor}
                      </span>
                    )}
                    {car.vin && (
                      <span className="text-muted text-sm" style={{ marginLeft: "0.5rem" }}>
                        VIN: <span style={{ fontFamily: "monospace" }}>{car.vin}</span>
                      </span>
                    )}
                    {car.color && (
                      <span className="text-muted text-sm" style={{ marginLeft: "0.5rem" }}>
                        • {car.color}
                      </span>
                    )}
                    {car.currentMileage != null && (
                      <span className="text-muted text-sm" style={{ marginLeft: "0.5rem" }}>
                        {car.currentMileage.toLocaleString()} miles
                      </span>
                    )}
                  </div>
                  <a href={`/cars/${car.id}`} className="btn btn-secondary btn-sm">
                    View →
                  </a>
                </div>
              ))}
            </div>
          )}

          {records.length > 0 && (
            <div className="card">
              <h2 style={{ marginBottom: "0.75rem" }}>
                🔧 Maintenance Records ({records.length}{totalRecords > records.length ? ` of ${totalRecords}` : ""})
              </h2>
              {records.map((record) => (
                <div
                  key={record.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <div>
                    <strong>{formatMaintenanceType(record.type)}</strong>
                    <span className="text-muted text-sm" style={{ marginLeft: "0.5rem" }}>
                      {formatDate(record.date)}
                    </span>
                    <div className="text-sm" style={{ color: "#475569" }}>
                      {record.car.year} {record.car.make} {record.car.model}
                      {record.cost != null && ` · ${formatCurrency(record.cost)}`}
                      {record.vendor && ` · ${record.vendor}`}
                    </div>
                  </div>
                  <a href={`/cars/${record.car.id}`} className="btn btn-secondary btn-sm">
                    View Car →
                  </a>
                </div>
              ))}
            </div>
          )}

          {documentResults.length > 0 && (
            <div className="card">
              <h2>Documents ({documentResults.length})</h2>
              <ul>
                {documentResults.map(doc => (
                  <li key={doc.id}>
                    <Link to={`/cars/${doc.car.id}/documents`} className="btn btn-secondary btn-sm" style={{marginRight:'0.5rem'}}>View</Link>
                    <strong>{doc.title}</strong> ({doc.type}) — {doc.car.year} {doc.car.make} {doc.car.model}
                    {doc.expiryDate && <span className="text-muted text-sm" style={{marginLeft:'0.5rem'}}>Expires: {formatDate(doc.expiryDate)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {fuelLogResults.length > 0 && (
            <div className="card">
              <h2>Fuel Logs ({fuelLogResults.length})</h2>
              <ul>
                {fuelLogResults.map(log => (
                  <li key={log.id}>
                    <Link to={`/cars/${log.car.id}/fuel`} className="btn btn-secondary btn-sm" style={{marginRight:'0.5rem'}}>View</Link>
                    {log.car.year} {log.car.make} {log.car.model} — {formatDate(log.date)} — {log.gallons.toFixed(1)} gal
                    {log.notes && <span className="text-muted text-sm" style={{marginLeft:'0.5rem'}}>{log.notes}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <div className="container" style={{ padding: "1.5rem" }}>
      <div className="card">
        <h2>Search Error</h2>
        {isRouteErrorResponse(error) ? (
          <p className="text-muted">
            {error.status} — {error.statusText}
          </p>
        ) : error instanceof Error ? (
          <p className="text-muted">{error.message}</p>
        ) : (
          <p className="text-muted">An unexpected error occurred.</p>
        )}
        <a href="/search" className="btn btn-secondary" style={{ marginTop: "1rem" }}>
          Back to Search
        </a>
      </div>
    </div>
  );
}
