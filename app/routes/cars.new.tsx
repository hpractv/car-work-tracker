import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { createCar } from "~/models/car.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request);
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();

  const make = String(formData.get("make") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const year = parseInt(String(formData.get("year") ?? "0"));
  const currentMileage = parseInt(String(formData.get("currentMileage") ?? "0"));
  const purchaseCostRaw = String(formData.get("purchaseCost") ?? "").trim();
  const vendor = String(formData.get("vendor") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!make || !model || !year || isNaN(currentMileage)) {
    return json({ error: "Make, model, year, and mileage are required" }, { status: 400 });
  }

  const purchaseCost = purchaseCostRaw ? parseFloat(purchaseCostRaw) : null;

  const car = await createCar(
    { make, model, year, currentMileage, purchaseCost, vendor, description },
    userId
  );

  return redirect(`/cars/${car.id}`);
}

export default function CarsNew() {
  const actionData = useActionData<typeof action>();

  return (
    <div style={{ maxWidth: "600px" }}>
      <div className="page-header">
        <h1>Add New Car</h1>
      </div>

      {actionData?.error && (
        <div className="alert alert-error mb-2">{actionData.error}</div>
      )}

      <div className="card">
        <Form method="post">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label htmlFor="make">Make *</label>
              <input id="make" name="make" type="text" required className="form-control" placeholder="Toyota" />
            </div>
            <div className="form-group">
              <label htmlFor="model">Model *</label>
              <input id="model" name="model" type="text" required className="form-control" placeholder="Camry" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label htmlFor="year">Year *</label>
              <input id="year" name="year" type="number" required min={1900} max={2100} className="form-control" placeholder="2020" />
            </div>
            <div className="form-group">
              <label htmlFor="currentMileage">Current Mileage *</label>
              <input id="currentMileage" name="currentMileage" type="number" required min={0} className="form-control" placeholder="50000" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label htmlFor="purchaseCost">Purchase Cost ($)</label>
              <input id="purchaseCost" name="purchaseCost" type="number" min={0} step="0.01" className="form-control" placeholder="25000" />
            </div>
            <div className="form-group">
              <label htmlFor="vendor">Vendor / Dealership</label>
              <input id="vendor" name="vendor" type="text" className="form-control" placeholder="ABC Motors" />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={3} className="form-control" placeholder="Additional notes..." />
          </div>
          <div className="flex gap-sm">
            <button type="submit" className="btn btn-primary">Add Car</button>
            <a href="/cars" className="btn btn-secondary">Cancel</a>
          </div>
        </Form>
      </div>
    </div>
  );
}
