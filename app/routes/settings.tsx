import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, Link, Form } from "@remix-run/react";
import { useState } from "react";
import { requireUserId } from "~/session.server";
import {
  getMaintenanceTypes,
  createMaintenanceType,
  updateMaintenanceType,
  deleteMaintenanceType,
} from "~/models/maintenance.server";
import { formatMaintenanceType } from "~/utils/format";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request);
  const types = await getMaintenanceTypes();
  return json({ types });
}

export async function action({ request }: ActionFunctionArgs) {
  await requireUserId(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create") {
    const name = (formData.get("name") as string | null)?.trim();
    if (!name) return json({ error: "Name is required" }, { status: 400 });
    const milesRaw = formData.get("miles") as string | null;
    const monthsRaw = formData.get("months") as string | null;
    const defaultIntervalMiles = milesRaw ? parseInt(milesRaw, 10) || null : null;
    const defaultIntervalMonths = monthsRaw ? parseInt(monthsRaw, 10) || null : null;
    await createMaintenanceType({ name, defaultIntervalMiles, defaultIntervalMonths });
    return redirect("/settings");
  }

  if (intent === "update") {
    const id = formData.get("id") as string;
    const name = (formData.get("name") as string | null)?.trim();
    if (!name) return json({ error: "Name is required" }, { status: 400 });
    const milesRaw = formData.get("miles") as string | null;
    const monthsRaw = formData.get("months") as string | null;
    const defaultIntervalMiles = milesRaw ? parseInt(milesRaw, 10) || null : null;
    const defaultIntervalMonths = monthsRaw ? parseInt(monthsRaw, 10) || null : null;
    await updateMaintenanceType(id, { name, defaultIntervalMiles, defaultIntervalMonths });
    return redirect("/settings");
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    await deleteMaintenanceType(id);
    return redirect("/settings");
  }

  return json({ error: "Unknown intent" }, { status: 400 });
}

export default function Settings() {
  const { types } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: "700px" }}>
      <div className="page-header">
        <h1>Maintenance Intervals</h1>
        <Link to="/" className="btn btn-secondary">← Dashboard</Link>
      </div>

      <p className="text-muted mb-2" style={{ marginBottom: "1rem" }}>
        <strong>Note:</strong> Changes to these intervals will affect maintenance due alerts for all vehicles.
      </p>

      {actionData && "error" in actionData && actionData.error && (
        <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
          {actionData.error}
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Service Type</th>
              <th>Every (Miles)</th>
              <th>Every (Months)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) =>
              editingId === t.id ? (
                <tr key={t.id}>
                  <td colSpan={4}>
                    <Form method="post" style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <input type="hidden" name="intent" value="update" />
                      <input type="hidden" name="id" value={t.id} />
                      <input
                        className="form-control"
                        name="name"
                        defaultValue={t.name}
                        placeholder="Service name"
                        required
                        style={{ flex: "1 1 160px" }}
                      />
                      <input
                        className="form-control"
                        name="miles"
                        type="number"
                        defaultValue={t.defaultIntervalMiles ?? ""}
                        placeholder="Miles"
                        style={{ flex: "0 1 100px" }}
                      />
                      <input
                        className="form-control"
                        name="months"
                        type="number"
                        defaultValue={t.defaultIntervalMonths ?? ""}
                        placeholder="Months"
                        style={{ flex: "0 1 100px" }}
                      />
                      <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </Form>
                  </td>
                </tr>
              ) : (
                <tr key={t.id}>
                  <td><strong>{formatMaintenanceType(t.name)}</strong></td>
                  <td>{t.defaultIntervalMiles != null ? t.defaultIntervalMiles.toLocaleString() : "—"}</td>
                  <td>{t.defaultIntervalMonths != null ? `${t.defaultIntervalMonths}` : "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setEditingId(t.id)}
                      style={{ marginRight: "0.4rem" }}
                    >
                      Edit
                    </button>
                    <Form
                      method="post"
                      style={{ display: "inline" }}
                      onSubmit={(e) => {
                        if (!window.confirm(`Delete "${formatMaintenanceType(t.name)}"?`)) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="id" value={t.id} />
                      <button type="submit" className="btn btn-danger btn-sm" disabled={isSubmitting}>
                        Delete
                      </button>
                    </Form>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>Add Maintenance Type</h2>
        <Form method="post" style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <input type="hidden" name="intent" value="create" />
          <div style={{ flex: "1 1 160px" }}>
            <label className="form-label">Service Name</label>
            <input
              className="form-control"
              name="name"
              placeholder="e.g. oil_change"
              required
            />
          </div>
          <div style={{ flex: "0 1 100px" }}>
            <label className="form-label">Miles</label>
            <input
              className="form-control"
              name="miles"
              type="number"
              placeholder="e.g. 5000"
            />
          </div>
          <div style={{ flex: "0 1 100px" }}>
            <label className="form-label">Months</label>
            <input
              className="form-control"
              name="months"
              type="number"
              placeholder="e.g. 6"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            Add
          </button>
        </Form>
      </div>
    </div>
  );
}

