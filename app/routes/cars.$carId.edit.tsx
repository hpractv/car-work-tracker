import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, useRouteError, isRouteErrorResponse } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarById, updateCar } from "~/models/car.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId!, userId);
  if (!car) throw new Response("Not Found", { status: 404 });
  const isOwner = car.members.some((m) => m.userId === userId && m.role === "owner");
  if (!isOwner) throw new Response("Forbidden", { status: 403 });
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
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (imageUrl) {
    try { new URL(imageUrl); } catch { return json({ error: "Image URL must be a valid URL" }, { status: 400 }); }
  }

  const currentYear = new Date().getFullYear();
  if (!make) return json({ error: "Make is required" }, { status: 400 });
  if (make.length > 100) return json({ error: "Make must be 100 characters or less" }, { status: 400 });
  if (!model) return json({ error: "Model is required" }, { status: 400 });
  if (model.length > 100) return json({ error: "Model must be 100 characters or less" }, { status: 400 });
  if (isNaN(year) || year < 1886 || year > currentYear + 2) {
    return json({ error: `Year must be between 1886 and ${currentYear + 2}` }, { status: 400 });
  }
  if (isNaN(currentMileage) || currentMileage < 0) {
    return json({ error: "Mileage must be a non-negative number" }, { status: 400 });
  }
  if (purchaseCostRaw && (isNaN(parseFloat(purchaseCostRaw)) || parseFloat(purchaseCostRaw) < 0)) {
    return json({ error: "Purchase cost must be a non-negative number" }, { status: 400 });
  }

  const purchaseCost = purchaseCostRaw ? parseFloat(purchaseCostRaw) : null;

  try {
    await updateCar(carId, { make, model, year, currentMileage, purchaseCost, vendor, description, imageUrl, notes }, userId);
    return redirect(`/cars/${carId}`);
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 403 });
  }
}

export default function EditCar() {
  const { car } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

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
            <label htmlFor="imageUrl">Image URL (optional)</label>
            <input id="imageUrl" name="imageUrl" type="url" defaultValue={car.imageUrl ?? ""} className="form-control" placeholder="https://example.com/my-car.jpg" />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={3} defaultValue={car.description ?? ""} className="form-control" />
          </div>
          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" rows={3} defaultValue={car.notes ?? ""} className="form-control" placeholder="Additional notes about this car..." />
          </div>
          <div className="flex gap-sm">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</button>
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
