import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarById } from "~/models/car.server";
import { getOdometerLogs, addOdometerLog, deleteOdometerLog } from "~/models/car.server";
import { formatDate, formatMileage } from "~/utils/format";

export function meta() {
  return [{ title: "Odometer History — Car Work Tracker" }];
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId!, userId);
  if (!car) throw new Response("Not Found", { status: 404 });
  const logs = await getOdometerLogs(params.carId!);
  return json({ car, logs });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const carId = params.carId!;
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "add") {
    const mileage = parseInt(String(formData.get("mileage") ?? "0"));
    const note = String(formData.get("note") ?? "").trim() || null;
    if (isNaN(mileage) || mileage < 0) {
      return json({ error: "Mileage must be a non-negative number" }, { status: 400 });
    }
    // Fetch the most recent log to prevent backward mileage
    const existingLogs = await getOdometerLogs(carId);
    if (existingLogs.length > 0) {
      const maxPreviousMileage = Math.max(...existingLogs.map(l => l.mileage));
      if (mileage < maxPreviousMileage) {
        return json({ error: `Mileage (${mileage.toLocaleString()}) cannot be less than a previous reading (${maxPreviousMileage.toLocaleString()} miles)` }, { status: 400 });
      }
    }
    try {
      await addOdometerLog(carId, mileage, note, userId);
      return redirect(`/cars/${carId}/odometer`);
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 400 });
    }
  }

  if (intent === "delete") {
    const logId = String(formData.get("logId") ?? "");
    if (!logId) return json({ error: "Log ID is required" }, { status: 400 });
    try {
      await deleteOdometerLog(logId, carId, userId);
      return redirect(`/cars/${carId}/odometer`);
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 400 });
    }
  }

  return json({ error: "Unknown action" }, { status: 400 });
}

export default function OdometerHistory() {
  const { car, logs } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Compute mileage trend: sort logs ascending to show progression
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );

  // Find min and max for bar chart scale
  const mileages = sortedLogs.map(l => l.mileage);
  const minMileage = mileages.length > 0 ? Math.min(...mileages) : 0;
  const maxMileage = mileages.length > 0 ? Math.max(...mileages, car.currentMileage) : car.currentMileage;
  const mileageRange = maxMileage - minMileage || 1;

  return (
    <div style={{ maxWidth: "700px" }}>
      <div className="page-header">
        <div>
          <h1>Odometer History</h1>
          <p className="text-muted">{car.year} {car.make} {car.model} — Current: {formatMileage(car.currentMileage)}</p>
        </div>
        <Link to={`/cars/${car.id}`} className="btn btn-secondary">← Back</Link>
      </div>

      {actionData?.error && (
        <div className="alert alert-error mb-2">{actionData.error}</div>
      )}

      {/* Add reading form */}
      <div className="card">
        <h2>Log Odometer Reading</h2>
        <Form method="post">
          <input type="hidden" name="intent" value="add" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: "0.75rem", alignItems: "end" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="mileage">Mileage *</label>
              <input
                id="mileage"
                name="mileage"
                type="number"
                required
                min={0}
                defaultValue={car.currentMileage}
                className="form-control"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="note">Note (optional)</label>
              <input
                id="note"
                name="note"
                type="text"
                className="form-control"
                placeholder="e.g. Annual inspection, Road trip odometer"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "..." : "Log"}
            </button>
          </div>
        </Form>
      </div>

      {/* Mileage trend visualization */}
      {sortedLogs.length >= 2 && (
        <div className="card">
          <h2>Mileage Trend</h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "80px", marginBottom: "0.5rem" }}>
            {sortedLogs.map((log) => {
              const heightPct = Math.max(4, Math.round(((log.mileage - minMileage) / mileageRange) * 72));
              return (
                <div
                  key={log.id}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}
                >
                  <div
                    title={`${formatDate(log.recordedAt)}: ${formatMileage(log.mileage)}`}
                    style={{
                      background: "#1e40af",
                      borderRadius: "3px 3px 0 0",
                      width: "100%",
                      height: `${heightPct}px`,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <p className="text-sm text-muted">Hover bars for details.</p>
        </div>
      )}

      {/* History list */}
      <div className="card">
        <h2>Reading History ({logs.length})</h2>
        {logs.length === 0 ? (
          <p className="text-muted">No odometer readings logged yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Mileage</th>
                <th>Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => {
                const prevLog = logs[idx + 1]; // logs are desc, so next in array is older
                const mileageDiff = prevLog ? log.mileage - prevLog.mileage : null;
                return (
                  <tr key={log.id}>
                    <td>{formatDate(log.recordedAt)}</td>
                    <td>
                      {formatMileage(log.mileage)}
                      {mileageDiff != null && mileageDiff > 0 && (
                        <span className="text-muted text-sm" style={{ marginLeft: "0.5rem" }}>
                          (+{mileageDiff.toLocaleString()} mi)
                        </span>
                      )}
                    </td>
                    <td className="text-muted">{log.note ?? "—"}</td>
                    <td>
                      <Form
                        method="post"
                        style={{ display: "inline" }}
                        onSubmit={(e) => {
                          if (!window.confirm("Delete this odometer reading?")) e.preventDefault();
                        }}
                      >
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="logId" value={log.id} />
                        <button type="submit" className="btn btn-danger btn-sm" disabled={isSubmitting}>
                          ✕
                        </button>
                      </Form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
