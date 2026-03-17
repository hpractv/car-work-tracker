import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { requireUserId } from "~/session.server";
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
          message={`Maintenance due: ${due.map((d) => d.type.replace(/_/g, " ")).join(", ")}`}
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
        <MaintenanceList records={car.maintenanceRecords} carId={car.id} />
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
