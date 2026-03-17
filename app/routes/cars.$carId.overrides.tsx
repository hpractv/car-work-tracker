import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link, Form, useNavigation } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarById, getCarMaintenanceOverrides, upsertCarMaintenanceOverride, deleteCarMaintenanceOverride } from "~/models/car.server";
import { getMaintenanceTypes } from "~/models/maintenance.server";
import { formatMaintenanceType } from "~/utils/format";

export function meta() {
  return [{ title: "Service Intervals — Car Work Tracker" }];
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId!, userId);
  if (!car) throw new Response("Not Found", { status: 404 });
  const [types, overrides] = await Promise.all([
    getMaintenanceTypes(),
    getCarMaintenanceOverrides(params.carId!),
  ]);
  return json({ car, types, overrides });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const carId = params.carId!;
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const typeName = String(formData.get("typeName") ?? "");

  if (intent === "set") {
    const milesRaw = formData.get("intervalMiles");
    const monthsRaw = formData.get("intervalMonths");
    const intervalMiles = milesRaw && String(milesRaw).trim() !== "" ? parseInt(String(milesRaw)) : null;
    const intervalMonths = monthsRaw && String(monthsRaw).trim() !== "" ? parseInt(String(monthsRaw)) : null;

    if (intervalMiles !== null && isNaN(intervalMiles)) {
      return json({ error: "Miles must be a valid number" }, { status: 400 });
    }
    if (intervalMonths !== null && isNaN(intervalMonths)) {
      return json({ error: "Months must be a valid number" }, { status: 400 });
    }

    try {
      await upsertCarMaintenanceOverride(carId, typeName, intervalMiles, intervalMonths, userId);
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 403 });
    }
    return redirect(`/cars/${carId}/overrides`);
  }

  if (intent === "clear") {
    try {
      await deleteCarMaintenanceOverride(carId, typeName, userId);
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 403 });
    }
    return redirect(`/cars/${carId}/overrides`);
  }

  return json({ error: "Unknown action" }, { status: 400 });
}

export default function CarOverrides() {
  const { car, types, overrides } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const overrideMap = new Map(overrides.map((o) => [o.typeName, o]));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>⚙ Service Intervals</h1>
          <p className="text-muted">
            {car.year} {car.make} {car.model} — customize maintenance intervals for this car
          </p>
        </div>
        <div className="flex gap-sm">
          <Link to={`/cars/${car.id}`} className="btn btn-secondary">← Back to Car</Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <p className="text-muted" style={{ margin: 0 }}>
          Override the global default maintenance intervals for this specific car. Leave fields blank to use the global default.
        </p>
      </div>

      <div className="card">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border, #e5e7eb)" }}>
              <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Service Type</th>
              <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Global Default</th>
              <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Car Override</th>
              <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Status</th>
              <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {types.map((mt) => {
              const override = overrideMap.get(mt.name);
              const hasOverride = !!override;
              const globalDesc = [
                mt.defaultIntervalMiles ? `${mt.defaultIntervalMiles.toLocaleString()} mi` : null,
                mt.defaultIntervalMonths ? `${mt.defaultIntervalMonths} mo` : null,
              ]
                .filter(Boolean)
                .join(" / ") || "—";
              const overrideDesc = hasOverride
                ? [
                    override.intervalMiles ? `${override.intervalMiles.toLocaleString()} mi` : null,
                    override.intervalMonths ? `${override.intervalMonths} mo` : null,
                  ]
                    .filter(Boolean)
                    .join(" / ") || "—"
                : null;

              return (
                <tr
                  key={mt.id}
                  style={{
                    borderBottom: "1px solid var(--border, #e5e7eb)",
                    background: hasOverride ? "var(--highlight-bg, #f0fdf4)" : undefined,
                  }}
                >
                  <td style={{ padding: "0.6rem 0.75rem", fontWeight: 500 }}>
                    {formatMaintenanceType(mt.name)}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted, #6b7280)" }}>
                    {globalDesc}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    {hasOverride ? (
                      <strong style={{ color: "var(--success, #15803d)" }}>{overrideDesc}</strong>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    {hasOverride ? (
                      <span
                        className="badge"
                        style={{
                          background: "#d1fae5",
                          color: "#065f46",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                        }}
                      >
                        Custom override
                      </span>
                    ) : (
                      <span
                        className="badge"
                        style={{
                          background: "#f3f4f6",
                          color: "#6b7280",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                        }}
                      >
                        Using global default
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    <details style={{ display: "inline" }}>
                      <summary
                        style={{
                          cursor: "pointer",
                          color: "var(--primary, #2563eb)",
                          fontSize: "0.85rem",
                          listStyle: "none",
                        }}
                      >
                        {hasOverride ? "Edit" : "Set override"}
                      </summary>
                      <div
                        style={{
                          position: "absolute",
                          background: "white",
                          border: "1px solid var(--border, #e5e7eb)",
                          borderRadius: "6px",
                          padding: "1rem",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          zIndex: 10,
                          minWidth: "260px",
                        }}
                      >
                        <Form method="post">
                          <input type="hidden" name="intent" value="set" />
                          <input type="hidden" name="typeName" value={mt.name} />
                          <div style={{ marginBottom: "0.6rem" }}>
                            <label style={{ display: "block", fontWeight: 500, marginBottom: "0.2rem", fontSize: "0.85rem" }}>
                              Interval (miles)
                            </label>
                            <input
                              type="number"
                              name="intervalMiles"
                              min={1}
                              defaultValue={override?.intervalMiles ?? mt.defaultIntervalMiles ?? ""}
                              placeholder={mt.defaultIntervalMiles ? `Default: ${mt.defaultIntervalMiles.toLocaleString()}` : "Leave blank to skip"}
                              style={{ width: "100%", padding: "0.35rem 0.5rem", borderRadius: "4px", border: "1px solid #d1d5db", boxSizing: "border-box" }}
                            />
                          </div>
                          <div style={{ marginBottom: "0.75rem" }}>
                            <label style={{ display: "block", fontWeight: 500, marginBottom: "0.2rem", fontSize: "0.85rem" }}>
                              Interval (months)
                            </label>
                            <input
                              type="number"
                              name="intervalMonths"
                              min={1}
                              defaultValue={override?.intervalMonths ?? mt.defaultIntervalMonths ?? ""}
                              placeholder={mt.defaultIntervalMonths ? `Default: ${mt.defaultIntervalMonths}` : "Leave blank to skip"}
                              style={{ width: "100%", padding: "0.35rem 0.5rem", borderRadius: "4px", border: "1px solid #d1d5db", boxSizing: "border-box" }}
                            />
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              type="submit"
                              className="btn btn-primary btn-sm"
                              disabled={isSubmitting}
                            >
                              Save
                            </button>
                          </div>
                        </Form>
                      </div>
                    </details>
                    {hasOverride && (
                      <Form
                        method="post"
                        style={{ display: "inline", marginLeft: "0.5rem" }}
                        onSubmit={(e) => {
                          if (!window.confirm(`Clear override for ${formatMaintenanceType(mt.name)}? It will revert to the global default.`)) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="intent" value="clear" />
                        <input type="hidden" name="typeName" value={mt.name} />
                        <button
                          type="submit"
                          className="btn btn-danger btn-sm"
                          disabled={isSubmitting}
                          style={{ fontSize: "0.8rem" }}
                        >
                          Clear
                        </button>
                      </Form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
