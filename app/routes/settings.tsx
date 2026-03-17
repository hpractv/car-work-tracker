import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, Link, Form } from "@remix-run/react";
import { useState } from "react";
import { Prisma } from "@prisma/client";
import { requireUserId } from "~/session.server";
import {
  getMaintenanceTypes,
  createMaintenanceType,
  updateMaintenanceType,
  deleteMaintenanceType,
} from "~/models/maintenance.server";
import { formatMaintenanceType } from "~/utils/format";
import { db } from "~/db.server";

const DEFAULT_TYPES = [
  { name: "oil_change", defaultIntervalMiles: 5000, defaultIntervalMonths: 6 },
  { name: "tire_rotation", defaultIntervalMiles: 7500, defaultIntervalMonths: 12 },
  { name: "brake_service", defaultIntervalMiles: 25000, defaultIntervalMonths: 24 },
  { name: "air_filter", defaultIntervalMiles: 15000, defaultIntervalMonths: 12 },
  { name: "cabin_filter", defaultIntervalMiles: 15000, defaultIntervalMonths: 12 },
  { name: "spark_plugs", defaultIntervalMiles: 30000, defaultIntervalMonths: 36 },
  { name: "transmission_service", defaultIntervalMiles: 60000, defaultIntervalMonths: 60 },
  { name: "coolant_flush", defaultIntervalMiles: 50000, defaultIntervalMonths: 60 },
  { name: "fuel_filter", defaultIntervalMiles: 30000, defaultIntervalMonths: 24 },
  { name: "wiper_blades", defaultIntervalMiles: null, defaultIntervalMonths: 12 },
  { name: "battery_check", defaultIntervalMiles: null, defaultIntervalMonths: 12 },
];

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
    try {
      await createMaintenanceType({ name, defaultIntervalMiles, defaultIntervalMonths });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return json({ error: `A maintenance type named "${name}" already exists` }, { status: 409 });
      }
      throw e;
    }
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

  if (intent === "restoreDefaults") {
    for (const type of DEFAULT_TYPES) {
      await db.maintenanceType.upsert({
        where: { name: type.name },
        update: { defaultIntervalMiles: type.defaultIntervalMiles, defaultIntervalMonths: type.defaultIntervalMonths },
        create: type,
      });
    }
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

      <div className="card" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ marginTop: 0 }}>Restore Defaults</h2>
        <p className="text-muted" style={{ marginBottom: "1rem" }}>
          <strong>Warning:</strong> This will restore all 11 default maintenance types, updating their intervals if they already exist.
        </p>
        <Form
          method="post"
          onSubmit={(e) => {
            if (!window.confirm("Restore all default maintenance types? Existing defaults will have their intervals reset.")) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="intent" value="restoreDefaults" />
          <button type="submit" className="btn btn-secondary" disabled={isSubmitting}>
            Restore Defaults
          </button>
        </Form>
      </div>
    </div>
  );
}

