import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarById, updateCar } from "~/models/car.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId!, userId);
  if (!car) throw new Response("Not Found", { status: 404 });
  return json({ car });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const carId = params.carId!;

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

  try {
    await updateCar(carId, { make, model, year, currentMileage, purchaseCost, vendor, description }, userId);
    return redirect(`/cars/${carId}`);
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 403 });
  }
}

export default function EditCar() {
  const { car } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div style={{ maxWidth: "600px" }}>
      <div className="page-header">
        <h1>Edit Car</h1>
      </div>

      {actionData?.error && (
        <div className="alert alert-error mb-2">{actionData.error}</div>
      )}

      <div className="card">
        <Form method="post">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label htmlFor="make">Make *</label>
              <input id="make" name="make" type="text" required defaultValue={car.make} className="form-control" />
            </div>
            <div className="form-group">
              <label htmlFor="model">Model *</label>
              <input id="model" name="model" type="text" required defaultValue={car.model} className="form-control" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label htmlFor="year">Year *</label>
              <input id="year" name="year" type="number" required min={1900} max={2100} defaultValue={car.year} className="form-control" />
            </div>
            <div className="form-group">
              <label htmlFor="currentMileage">Current Mileage *</label>
              <input id="currentMileage" name="currentMileage" type="number" required min={0} defaultValue={car.currentMileage} className="form-control" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label htmlFor="purchaseCost">Purchase Cost ($)</label>
              <input id="purchaseCost" name="purchaseCost" type="number" min={0} step="0.01" defaultValue={car.purchaseCost ?? ""} className="form-control" />
            </div>
            <div className="form-group">
              <label htmlFor="vendor">Vendor</label>
              <input id="vendor" name="vendor" type="text" defaultValue={car.vendor ?? ""} className="form-control" />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={3} defaultValue={car.description ?? ""} className="form-control" />
          </div>
          <div className="flex gap-sm">
            <button type="submit" className="btn btn-primary">Save Changes</button>
            <a href={`/cars/${car.id}`} className="btn btn-secondary">Cancel</a>
          </div>
        </Form>
      </div>
    </div>
  );
}
