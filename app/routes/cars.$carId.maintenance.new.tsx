import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, useRouteError, isRouteErrorResponse } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarById } from "~/models/car.server";
import { createMaintenanceRecord, getMaintenanceTypes } from "~/models/maintenance.server";
import { formatMaintenanceType } from "~/utils/format";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId!, userId);
  if (!car) throw new Response("Not Found", { status: 404 });
  const maintenanceTypes = await getMaintenanceTypes();
  const defaultType = new URL(request.url).searchParams.get("type") ?? "";
  return json({ car, maintenanceTypes, defaultType });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const carId = params.carId!;
  const car = await getCarById(carId, userId);
  if (!car) throw new Response("Not Found", { status: 404 });

  const formData = await request.formData();
  const type = String(formData.get("type") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "").trim();
  const mileage = parseInt(String(formData.get("mileage") ?? "0"));
  const costRaw = String(formData.get("cost") ?? "").trim();
  const vendor = String(formData.get("vendor") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!type) return json({ error: "Maintenance type is required" }, { status: 400 });
  if (!dateStr) return json({ error: "Date is required" }, { status: 400 });
  const dateObj = new Date(dateStr + "T12:00:00");
  if (isNaN(dateObj.getTime())) return json({ error: "Invalid date" }, { status: 400 });
  if (isNaN(mileage) || mileage < 0) {
    return json({ error: "Mileage must be a non-negative number" }, { status: 400 });
  }
  if (costRaw && (isNaN(parseFloat(costRaw)) || parseFloat(costRaw) < 0)) {
    return json({ error: "Cost must be a non-negative number" }, { status: 400 });
  }

  const cost = costRaw ? parseFloat(costRaw) : null;

  await createMaintenanceRecord({ carId, type, date: dateObj, mileage, cost, vendor, description });
  return redirect(`/cars/${carId}`);
}

export default function NewMaintenance() {
  const { car, maintenanceTypes, defaultType } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const today = new Date().toISOString().split("T")[0];

  return (
    <div style={{ maxWidth: "600px" }}>
      <div className="page-header">
        <h1>Add Maintenance Record</h1>
        <p className="text-muted">
          {car.year} {car.make} {car.model}
        </p>
      </div>

      {actionData?.error && (
        <div className="alert alert-error mb-2">{actionData.error}</div>
      )}

      <div className="card">
        <Form
          method="post"
          onSubmit={(e) => {
            const mileageInput = e.currentTarget.elements.namedItem("mileage") as HTMLInputElement;
            const enteredMileage = parseInt(mileageInput.value);
            if (!isNaN(enteredMileage) && enteredMileage < car.currentMileage - 1000) {
              if (!window.confirm(`The entered mileage (${enteredMileage.toLocaleString()}) is significantly lower than the car's current mileage (${car.currentMileage.toLocaleString()}). This may indicate a data entry error. Continue anyway?`)) {
                e.preventDefault();
              }
            }
          }}
        >
          <div className="form-group">
            <label htmlFor="type">Maintenance Type *</label>
            <select id="type" name="type" required className="form-control" defaultValue={defaultType}>
              <option value="">Select type...</option>
              {maintenanceTypes.map((mt) => (
                <option key={mt.id} value={mt.name}>
                  {formatMaintenanceType(mt.name)}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label htmlFor="date">Date *</label>
              <input id="date" name="date" type="date" required defaultValue={today} className="form-control" />
            </div>
            <div className="form-group">
              <label htmlFor="mileage">Mileage at Service *</label>
              <input id="mileage" name="mileage" type="number" required min={0} defaultValue={car.currentMileage} className="form-control" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label htmlFor="cost">Cost ($)</label>
              <input id="cost" name="cost" type="number" min={0} step="0.01" className="form-control" />
            </div>
            <div className="form-group">
              <label htmlFor="vendor">Vendor / Shop</label>
              <input id="vendor" name="vendor" type="text" className="form-control" />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="description">Notes</label>
            <textarea id="description" name="description" rows={3} className="form-control" />
          </div>
          <div className="flex gap-sm">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Record"}</button>
            <a href={`/cars/${car.id}`} className="btn btn-secondary">Cancel</a>
          </div>
        </Form>
      </div>
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
