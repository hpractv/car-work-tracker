import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link, useRouteError, isRouteErrorResponse, useSearchParams } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { formatMaintenanceType } from "~/utils/format";
import { getCarById } from "~/models/car.server";
import { getMaintenanceDue } from "~/models/maintenance.server";
import MaintenanceList from "~/components/MaintenanceList";
import AlertBanner from "~/components/AlertBanner";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId!, userId);
  if (!car) throw new Response("Not Found", { status: 404 });

  const due = await getMaintenanceDue(car.id, car.currentMileage);
  const userMembership = car.members.find((m) => m.userId === userId);
  const isOwner = userMembership?.role === "owner";

  return json({ car, due, isOwner });
}

export default function CarDetail() {
  const { car, due, isOwner } = useLoaderData<typeof loader>();

  const [searchParams, setSearchParams] = useSearchParams();
  const filterType = searchParams.get("type") ?? "";
  const uniqueTypes = [...new Set(car.maintenanceRecords.map(r => r.type))].sort();
  const filteredRecords = filterType
    ? car.maintenanceRecords.filter(r => r.type === filterType)
    : car.maintenanceRecords;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>
            {car.year} {car.make} {car.model}
          </h1>
          <p className="text-muted">
            {car.currentMileage.toLocaleString()} miles
            {car.vendor ? ` · ${car.vendor}` : ""}
          </p>
        </div>
        <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
          <Link to={`/cars/${car.id}/maintenance/new`} className="btn btn-primary">
            + Add Maintenance
          </Link>
          {isOwner && (
            <>
              <Link to={`/cars/${car.id}/edit`} className="btn btn-secondary">Edit</Link>
              <Link to={`/cars/${car.id}/members`} className="btn btn-secondary">Members</Link>
              <Link to={`/cars/${car.id}/delete`} className="btn btn-danger">Delete</Link>
            </>
          )}
        </div>
      </div>

      {due.length > 0 && (
        <AlertBanner
          severity="warning"
          message={`Maintenance due: ${due.map((d) => formatMaintenanceType(d.type)).join(", ")}`}
        />
      )}

      <div className="card">
        <h2>Car Details</h2>
        <table>
          <tbody>
            <tr><th>Make</th><td>{car.make}</td></tr>
            <tr><th>Model</th><td>{car.model}</td></tr>
            <tr><th>Year</th><td>{car.year}</td></tr>
            <tr><th>Current Mileage</th><td>{car.currentMileage.toLocaleString()}</td></tr>
            {car.purchaseCost != null && <tr><th>Purchase Cost</th><td>${car.purchaseCost.toFixed(2)}</td></tr>}
            {car.vendor && <tr><th>Vendor</th><td>{car.vendor}</td></tr>}
            {car.description && <tr><th>Description</th><td>{car.description}</td></tr>}
            {car.maintenanceRecords.length > 0 && (
              <>
                <tr>
                  <th>Last Service</th>
                  <td>{new Date(car.maintenanceRecords[0].date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
                </tr>
                {car.maintenanceRecords.some(r => r.cost != null) && (
                  <tr>
                    <th>Avg Service Cost</th>
                    <td>${(car.maintenanceRecords.filter(r => r.cost != null).reduce((sum, r) => sum + (r.cost ?? 0), 0) / car.maintenanceRecords.filter(r => r.cost != null).length).toFixed(2)}</td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="flex flex-between mb-2">
          <h2 style={{ margin: 0 }}>Maintenance History</h2>
          <Link to={`/cars/${car.id}/maintenance/new`} className="btn btn-primary btn-sm">
            + Add Record
          </Link>
        </div>
        {car.maintenanceRecords.length > 0 && (
          <div className="flex gap-md text-sm text-muted mb-2">
            <span>{car.maintenanceRecords.length} record{car.maintenanceRecords.length !== 1 ? "s" : ""}</span>
            {car.maintenanceRecords.some((r) => r.cost != null) && (
              <span>
                Total cost: ${car.maintenanceRecords
                  .filter((r) => r.cost != null)
                  .reduce((sum, r) => sum + (r.cost ?? 0), 0)
                  .toFixed(2)}
              </span>
            )}
          </div>
        )}
        {uniqueTypes.length > 1 && (
          <div className="flex gap-sm mb-2" style={{ alignItems: "center" }}>
            <label htmlFor="type-filter" className="text-sm" style={{ fontWeight: 500 }}>Filter by type:</label>
            <select
              id="type-filter"
              value={filterType}
              onChange={(e) => setSearchParams(e.target.value ? { type: e.target.value } : {}, { replace: true })}
              className="form-control"
              style={{ width: "auto", padding: "0.25rem 0.5rem" }}
            >
              <option value="">All types</option>
              {uniqueTypes.map(t => (
                <option key={t} value={t}>{formatMaintenanceType(t)}</option>
              ))}
            </select>
          </div>
        )}
        <MaintenanceList records={filteredRecords} carId={car.id} />
      </div>

      <div className="card">
        <h2>Members</h2>
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th></tr>
          </thead>
          <tbody>
            {car.members.map((m) => (
              <tr key={m.id}>
                <td>{m.user.name ?? "—"}</td>
                <td>{m.user.email}</td>
                <td>
                  <span className={`badge badge-${m.role}`}>{m.role}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isOwner && (
          <div className="mt-2">
            <Link to={`/cars/${car.id}/members`} className="btn btn-secondary btn-sm">
              Manage Members
            </Link>
          </div>
        )}
      </div>

      <a href="/cars" className="btn btn-secondary">← Back to Cars</a>
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
