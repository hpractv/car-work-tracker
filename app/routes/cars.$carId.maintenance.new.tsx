import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarById } from "~/models/car.server";
import { createMaintenanceRecord, getMaintenanceTypes } from "~/models/maintenance.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId!, userId);
  if (!car) throw new Response("Not Found", { status: 404 });
  const maintenanceTypes = await getMaintenanceTypes();
  return json({ car, maintenanceTypes });
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

  if (!type || !dateStr || isNaN(mileage)) {
    return json({ error: "Type, date, and mileage are required" }, { status: 400 });
  }

  const date = new Date(dateStr);
  const cost = costRaw ? parseFloat(costRaw) : null;

  await createMaintenanceRecord({ carId, type, date, mileage, cost, vendor, description });
  return redirect(`/cars/${carId}`);
}

export default function NewMaintenance() {
  const { car, maintenanceTypes } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

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
        <Form method="post">
          <div className="form-group">
            <label htmlFor="type">Maintenance Type *</label>
            <select id="type" name="type" required className="form-control">
              <option value="">Select type...</option>
              {maintenanceTypes.map((mt) => (
                <option key={mt.id} value={mt.name}>
                  {mt.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
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
            <button type="submit" className="btn btn-primary">Save Record</button>
            <a href={`/cars/${car.id}`} className="btn btn-secondary">Cancel</a>
          </div>
        </Form>
      </div>
    </div>
  );
}
