import { useState, useEffect } from "react";
import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link, useRouteError, isRouteErrorResponse, useSearchParams, Form, useNavigation } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { formatMaintenanceType, formatDate, formatCurrency, formatMileage } from "~/utils/format";
import { getCarById, updateCarMileage, archiveCar, restoreCar, getCarMaintenanceOverrides, getCarDocuments, getFuelLogs } from "~/models/car.server";
import { getMaintenanceDue, getServiceIntervalStatus } from "~/models/maintenance.server";
import MaintenanceList from "~/components/MaintenanceList";

export function meta() {
  return [{ title: "Car Details — Car Work Tracker" }];
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId!, userId);
  if (!car) throw new Response("Not Found", { status: 404 });

  const overrides = await getCarMaintenanceOverrides(car.id);
  const due = await getMaintenanceDue(car.id, car.currentMileage, overrides);
  const intervalStatus = await getServiceIntervalStatus(car.id, car.currentMileage, overrides);
  const userMembership = car.members.find((m) => m.userId === userId);
  const isOwner = userMembership?.role === "owner";

  // Derive forecast (next due mileage/date) from interval status
  const forecast = Object.fromEntries(
    intervalStatus
      .filter((s) => s.nextMileage != null || s.nextDate != null)
      .map((s) => [
        s.type,
        {
          nextDueMileage: s.nextMileage ?? undefined,
          nextDueDate: s.nextDate ?? undefined,
        },
      ])
  );

  const documents = await getCarDocuments(car.id);
  const now = new Date();
  const cutoff30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const docCount = documents.length;
  const expiredDocCount = documents.filter(
    (d) => d.expiryDate && new Date(d.expiryDate) < now
  ).length;
  const expiringDocCount = documents.filter(
    (d) =>
      d.expiryDate &&
      new Date(d.expiryDate) >= now &&
      new Date(d.expiryDate) <= cutoff30
  ).length;

  const fuelLogs = await getFuelLogs(car.id);
  const totalFuelCost = fuelLogs.reduce((s, l) => s + (l.totalCost ?? 0), 0);
  const totalFuelGallons = fuelLogs.reduce((s, l) => s + l.gallons, 0);
  const chronoLogs = [...fuelLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const fullTankLogs = chronoLogs.filter(l => l.fullTank);
  const mpgValues: number[] = [];
  for (let i = 1; i < fullTankLogs.length; i++) {
    const mileageDiff = fullTankLogs[i].mileage - fullTankLogs[i-1].mileage;
    if (mileageDiff > 0 && fullTankLogs[i].gallons > 0) {
      mpgValues.push(mileageDiff / fullTankLogs[i].gallons);
    }
  }
  const avgMpg = mpgValues.length > 0 ? mpgValues.reduce((s,v) => s+v, 0) / mpgValues.length : null;
  const lastFuelLog = fuelLogs.length > 0 ? fuelLogs[0] : null;
  const fuelFillUps = fuelLogs.length;

  return json({ car, due, isOwner, intervalStatus, forecast, isArchived: car.isArchived, docCount, expiredDocCount, expiringDocCount, fuelSummary: { totalCost: totalFuelCost, totalGallons: totalFuelGallons, avgMpg, lastFuelDate: lastFuelLog?.date ?? null, fillUps: fuelFillUps } });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const carId = params.carId!;
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "updateMileage") {
    const newMileage = parseInt(String(formData.get("currentMileage") ?? "0"));
    if (isNaN(newMileage) || newMileage < 0) {
      return json({ error: "Mileage must be a non-negative number" }, { status: 400 });
    }
    try {
      await updateCarMileage(carId, newMileage, userId);
      return redirect(`/cars/${carId}`);
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 403 });
    }
  }

  if (intent === "archive") {
    try {
      await archiveCar(carId, userId);
      return redirect("/cars");
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 403 });
    }
  }

  if (intent === "restore") {
    try {
      await restoreCar(carId, userId);
      return redirect(`/cars/${carId}`);
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 403 });
    }
  }

  return json({ error: "Unknown action" }, { status: 400 });
}

type SortField = "date" | "type" | "cost" | "mileage";
type SortDir = "asc" | "desc";

function sortRecords(
  records: Array<{ id: string; type: string; date: string | Date; mileage: number; cost?: number | null; vendor?: string | null; description?: string | null }>,
  field: SortField,
  dir: SortDir
) {
  return [...records].sort((a, b) => {
    let cmp = 0;
    if (field === "date") cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
    else if (field === "type") cmp = a.type.localeCompare(b.type);
    else if (field === "cost") cmp = (a.cost ?? 0) - (b.cost ?? 0);
    else if (field === "mileage") cmp = a.mileage - b.mileage;
    return dir === "asc" ? cmp : -cmp;
  });
}

export default function CarDetail() {
  const { car, due, isOwner, intervalStatus, forecast, isArchived, docCount, expiredDocCount, expiringDocCount, fuelSummary } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [searchParams, setSearchParams] = useSearchParams();
  const filterType = searchParams.get("type") ?? "";
  const sortField = (searchParams.get("sort") as SortField) ?? "date";
  const sortDir = (searchParams.get("dir") as SortDir) ?? "desc";

  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, sortField, sortDir]);

  const uniqueTypes = [...new Set(car.maintenanceRecords.map((r) => r.type))].sort();
  const filteredRecords = filterType
    ? car.maintenanceRecords.filter((r) => r.type === filterType)
    : car.maintenanceRecords;
  const sortedRecords = sortRecords(filteredRecords, sortField, sortDir);

  const totalPages = Math.ceil(sortedRecords.length / PAGE_SIZE);
  const paginatedRecords = sortedRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Per-type cost breakdown
  const costByType = car.maintenanceRecords
    .filter((r) => r.cost != null)
    .reduce<Record<string, { total: number; count: number }>>((acc, r) => {
      if (!acc[r.type]) acc[r.type] = { total: 0, count: 0 };
      acc[r.type].total += r.cost ?? 0;
      acc[r.type].count += 1;
      return acc;
    }, {});
  const costEntries = Object.entries(costByType).sort((a, b) => b[1].total - a[1].total);

  const minRecordMileage = car.maintenanceRecords.length > 0 ? Math.min(...car.maintenanceRecords.map((r) => r.mileage)) : null;
  const maxRecordMileage = car.maintenanceRecords.length > 0 ? Math.max(...car.maintenanceRecords.map((r) => r.mileage)) : null;
  const mileageSpan = minRecordMileage !== null && maxRecordMileage !== null && maxRecordMileage > minRecordMileage ? maxRecordMileage - minRecordMileage : null;

  // Monthly spending computation
  const monthlySpending = (() => {
    const now = new Date();
    const months: Array<{ label: string; total: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const total = car.maintenanceRecords
        .filter((r) => {
          const rd = new Date(r.date);
          return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth() && r.cost != null;
        })
        .reduce((s, r) => s + (r.cost ?? 0), 0);
      months.push({ label, total });
    }
    return months;
  })();

  const maxMonthly = Math.max(...monthlySpending.map(m => m.total), 1);
  const hasMonthlyData = monthlySpending.some(m => m.total > 0);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      updateParam("dir", sortDir === "asc" ? "desc" : "asc");
    } else {
      const next = new URLSearchParams(searchParams);
      next.set("sort", field);
      next.set("dir", "desc");
      setSearchParams(next, { replace: true });
    }
  }

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  const typesWithHistory = intervalStatus.filter((s) => s.hasHistory || (s.intervalMiles ?? 0) > 0 || (s.intervalMonths ?? 0) > 0);

  return (
    <div>
      {isArchived && (
        <div className="alert alert-info mb-2">
          <span>📦 This car is archived and hidden from your cars list. <strong>Restore it</strong> to make it active again.</span>
        </div>
      )}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h1 style={{ margin: 0 }}>
              {car.year} {car.make} {car.model}
            </h1>
            <span className={`badge badge-${isOwner ? "owner" : "driver"}`}>
              {isOwner ? "Owner" : "Driver"}
            </span>
          </div>
          <p className="text-muted" style={{ marginTop: "0.25rem" }}>
            {formatMileage(car.currentMileage)}
            {car.vendor ? ` · ${car.vendor}` : ""}
          </p>
        </div>
        <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
          <Link to={`/cars/${car.id}/maintenance/new`} className="btn btn-primary">
            + Add Maintenance
          </Link>
          <Link to={`/cars/${car.id}/forecast`} className="btn btn-secondary">📅 Schedule</Link>
          <Link to={`/cars/${car.id}/odometer`} className="btn btn-secondary">
            📊 Odometer Log
          </Link>
          <Link to={`/cars/${car.id}/fuel`} className="btn btn-secondary">⛽ Fuel Log</Link>
          <Link to={`/cars/${car.id}/documents`} className="btn btn-secondary">📄 Documents</Link>
          <Link to={`/compare?cars=${car.id}`} className="btn btn-secondary">⚖ Compare</Link>
          {isOwner && (
            <>
              <Link to={`/cars/${car.id}/overrides`} className="btn btn-secondary">⚙ Service Intervals</Link>
              <Link to={`/cars/${car.id}/edit`} className="btn btn-secondary">Edit</Link>
              <Link to={`/cars/${car.id}/members`} className="btn btn-secondary">Members</Link>
              <Link to={`/cars/${car.id}/delete`} className="btn btn-danger">Delete</Link>
              {!isArchived && (
                <Form method="post" style={{ display: "inline" }} onSubmit={(e) => {
                  if (!window.confirm("Archive this car? It will be hidden from your cars list. You can restore it later.")) e.preventDefault();
                }}>
                  <input type="hidden" name="intent" value="archive" />
                  <button type="submit" className="btn btn-secondary">📦 Archive</button>
                </Form>
              )}
              {isArchived && (
                <Form method="post" style={{ display: "inline" }}>
                  <input type="hidden" name="intent" value="restore" />
                  <button type="submit" className="btn btn-primary">↩ Restore</button>
                </Form>
              )}
            </>
          )}
        </div>
      </div>

      {due.length > 0 && (
        <div className="card" style={{ borderLeft: "4px solid #f59e0b", marginBottom: "1rem" }}>
          <h2 style={{ color: "#92400e", marginBottom: "0.75rem" }}>⚠️ Maintenance Due</h2>
          <ul style={{ margin: 0, listStyle: "none", padding: 0 }}>
            {due.map((d) => (
              <li key={d.type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.3rem 0", borderBottom: "1px solid #fef3c7" }}>
                <div>
                  <strong className="text-sm">{formatMaintenanceType(d.type)}</strong>
                  <span className="text-muted text-sm" style={{ marginLeft: "0.5rem" }}>{d.reason}</span>
                </div>
                <Link
                  to={`/cars/${car.id}/maintenance/new?type=${encodeURIComponent(d.type)}`}
                  className="btn btn-primary btn-sm"
                  style={{ marginLeft: "0.5rem", whiteSpace: "nowrap" }}
                >
                  Log Service
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
        {/* Car Details */}
        <div className="card">
          <h2>Car Details</h2>
          {car.imageUrl && (
            <img
              src={car.imageUrl}
              alt={`${car.year} ${car.make} ${car.model}`}
              style={{ width: "100%", maxHeight: "250px", objectFit: "cover", borderRadius: "6px", marginBottom: "1rem" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <table>
            <tbody>
              <tr><th>Make</th><td>{car.make}</td></tr>
              <tr><th>Model</th><td>{car.model}</td></tr>
              <tr><th>Year</th><td>{car.year}</td></tr>
              {car.vin && <tr><th>VIN</th><td style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}>{car.vin}</td></tr>}
              {car.color && <tr><th>Color</th><td>{car.color}</td></tr>}
              <tr><th>Current Mileage</th><td>{formatMileage(car.currentMileage)}</td></tr>
              {car.purchaseCost != null && <tr><th>Purchase Cost</th><td>{formatCurrency(car.purchaseCost)}</td></tr>}
              {car.vendor && <tr><th>Vendor</th><td>{car.vendor}</td></tr>}
              {car.description && <tr><th>Description</th><td>{car.description}</td></tr>}
              {car.maintenanceRecords.length > 0 && (
                <>
                  <tr>
                    <th>Last Service</th>
                    <td>{formatDate(car.maintenanceRecords[0].date)}</td>
                  </tr>
                  {car.maintenanceRecords.some((r) => r.cost != null) && (
                    <tr>
                      <th>Total Spent</th>
                      <td>{formatCurrency(car.maintenanceRecords.filter((r) => r.cost != null).reduce((s, r) => s + (r.cost ?? 0), 0))}</td>
                    </tr>
                  )}
                  {mileageSpan != null && mileageSpan > 0 && (
                    <tr>
                      <th>Miles Tracked</th>
                      <td>{mileageSpan.toLocaleString()} mi</td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
          {car.notes && (
            <div className="mt-2">
              <strong>Notes:</strong>
              <p className="text-muted" style={{ whiteSpace: "pre-wrap", marginTop: "0.25rem" }}>{car.notes}</p>
            </div>
          )}
          {/* Quick Mileage Update */}
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
            <p className="text-sm" style={{ fontWeight: 500, marginBottom: "0.5rem" }}>Update Mileage</p>
            <Form method="post" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input type="hidden" name="intent" value="updateMileage" />
              <input
                name="currentMileage"
                type="number"
                min={0}
                defaultValue={car.currentMileage}
                className="form-control"
                style={{ width: "140px" }}
                aria-label="Current mileage"
              />
              <button type="submit" className="btn btn-secondary btn-sm" disabled={isSubmitting}>
                {isSubmitting ? "..." : "Update"}
              </button>
            </Form>
          </div>
        </div>

        {/* Cost Breakdown by Type */}
        {costEntries.length > 0 && (
          <div className="card">
            <h2>Spending by Service Type</h2>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th style={{ textAlign: "right" }}>Records</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th style={{ textAlign: "right" }}>Avg</th>
                </tr>
              </thead>
              <tbody>
                {costEntries.map(([type, data]) => (
                  <tr key={type}>
                    <td>{formatMaintenanceType(type)}</td>
                    <td style={{ textAlign: "right", color: "#64748b" }}>{data.count}</td>
                    <td style={{ textAlign: "right" }}>{formatCurrency(data.total)}</td>
                    <td style={{ textAlign: "right", color: "#64748b" }}>{formatCurrency(data.total / data.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {fuelSummary.fillUps > 0 && (
        <div className="card">
          <div className="flex flex-between">
            <h2>Fuel Economy</h2>
            <Link to={`/cars/${car.id}/fuel`} className="btn btn-secondary btn-sm">⛽ Fuel Log</Link>
          </div>
          <table>
            <tbody>
              <tr><th>Fill-ups</th><td>{fuelSummary.fillUps}</td></tr>
              {fuelSummary.avgMpg && <tr><th>Avg MPG</th><td>{fuelSummary.avgMpg.toFixed(1)} mpg</td></tr>}
              {fuelSummary.totalGallons > 0 && <tr><th>Total Gallons</th><td>{fuelSummary.totalGallons.toFixed(1)}</td></tr>}
              {fuelSummary.totalCost > 0 && <tr><th>Total Fuel Cost</th><td>{formatCurrency(fuelSummary.totalCost)}</td></tr>}
              {fuelSummary.lastFuelDate && <tr><th>Last Fill-up</th><td>{formatDate(fuelSummary.lastFuelDate)}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Monthly Spending Chart */}
      {hasMonthlyData && (
        <div className="card">
          <h2>Monthly Spending (Last 12 Months)</h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "80px" }}>
            {monthlySpending.map((m) => (
              <div key={m.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                <div
                  title={`${m.label}: ${m.total > 0 ? "$" + m.total.toFixed(0) : "—"}`}
                  style={{
                    background: m.total > 0 ? "#1e40af" : "#e2e8f0",
                    borderRadius: "3px 3px 0 0",
                    width: "100%",
                    height: `${m.total > 0 ? Math.max(4, Math.round((m.total / maxMonthly) * 64)) : 2}px`,
                    transition: "height 0.2s",
                  }}
                />
                <span style={{ fontSize: "0.6rem", color: "#94a3b8", writingMode: "vertical-lr", transform: "rotate(180deg)", height: "28px" }}>{m.label}</span>
              </div>
            ))}
          </div>
          <p className="text-muted text-sm mt-1">Hover bars for amounts. Blue = has records.</p>
        </div>
      )}

      {/* Service Schedule */}
      {typesWithHistory.length > 0 && (
        <div className="card">
          <div className="flex flex-between mb-2">
            <h2 style={{ margin: 0 }}>Service Schedule</h2>
            <a href={`/cars/${car.id}/maintenance/export`} className="btn btn-secondary btn-sm">
              ⬇ Export CSV
            </a>
            <a href={`/cars/${car.id}/print`} className="btn btn-secondary btn-sm" target="_blank" rel="noopener noreferrer">
              🖨️ Print Report
            </a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
            {typesWithHistory.map((s) => {
              const percent = s.overallPercent;
              const barColor = percent >= 100 ? "#dc2626" : percent >= 80 ? "#f59e0b" : "#22c55e";
              return (
                <div key={s.type} style={{ border: "1px solid #e2e8f0", borderRadius: "6px", padding: "0.75rem" }}>
                  <div className="flex flex-between" style={{ alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{formatMaintenanceType(s.type)}</span>
                    <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                      {s.isDue && (
                        <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: "999px", padding: "0.1rem 0.45rem", fontSize: "0.7rem", fontWeight: 700 }}>
                          DUE
                        </span>
                      )}
                      <Link
                        to={`/cars/${car.id}/maintenance/new?type=${encodeURIComponent(s.type)}`}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem" }}
                      >
                        + Log
                      </Link>
                    </div>
                  </div>
                  {s.hasHistory ? (
                    <>
                      <p className="text-sm text-muted" style={{ margin: "0.35rem 0 0.5rem" }}>
                        Last: {s.lastDate ? formatDate(s.lastDate) : "—"}
                        {s.lastMileage != null ? ` at ${s.lastMileage.toLocaleString()} mi` : ""}
                      </p>
                      {s.intervalMiles && s.milesSinceLast !== null && (
                        <div style={{ marginBottom: "0.35rem" }}>
                          <div className="flex flex-between text-sm">
                            <span style={{ color: "#475569" }}>{s.milesSinceLast.toLocaleString()} / {s.intervalMiles.toLocaleString()} mi</span>
                            <span style={{ color: "#475569" }}>{s.mileagePercent}%</span>
                          </div>
                          <div style={{ background: "#e2e8f0", borderRadius: "999px", height: "6px", marginTop: "0.25rem" }}>
                            <div style={{ background: barColor, borderRadius: "999px", height: "6px", width: `${Math.min(100, s.mileagePercent ?? 0)}%`, transition: "width 0.3s" }} />
                          </div>
                          {s.nextMileage != null && (
                            <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>Next at {s.nextMileage.toLocaleString()} mi</p>
                          )}
                        </div>
                      )}
                      {s.intervalMonths && s.monthsSinceLast !== null && (
                        <div>
                          <div className="flex flex-between text-sm">
                            <span style={{ color: "#475569" }}>{s.monthsSinceLast} / {s.intervalMonths} months</span>
                            <span style={{ color: "#475569" }}>{s.timePercent}%</span>
                          </div>
                          <div style={{ background: "#e2e8f0", borderRadius: "999px", height: "6px", marginTop: "0.25rem" }}>
                            <div style={{ background: barColor, borderRadius: "999px", height: "6px", width: `${Math.min(100, s.timePercent ?? 0)}%`, transition: "width 0.3s" }} />
                          </div>
                          {s.nextDate != null && (
                            <p className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>Due by {formatDate(s.nextDate)}</p>
                          )}
                        </div>
                      )}
                      {forecast[s.type] && (
                        <p className="text-sm text-muted" style={{ marginTop: "0.4rem", fontStyle: "italic" }}>
                          {forecast[s.type].nextDueMileage != null
                            ? `Next due: ~${formatMileage(forecast[s.type].nextDueMileage!)} mi`
                            : forecast[s.type].nextDueDate != null
                            ? `Next due: ~${formatDate(forecast[s.type].nextDueDate!)}`
                            : null}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted" style={{ margin: "0.35rem 0 0" }}>No records yet</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Maintenance History */}
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
                Total: {formatCurrency(car.maintenanceRecords.filter((r) => r.cost != null).reduce((s, r) => s + (r.cost ?? 0), 0))}
              </span>
            )}
          </div>
        )}
        {/* Sort and filter controls */}
        <div className="flex gap-sm mb-2" style={{ flexWrap: "wrap", alignItems: "center" }}>
          {uniqueTypes.length > 1 && (
            <div className="flex gap-sm" style={{ alignItems: "center" }}>
              <label htmlFor="type-filter" className="text-sm" style={{ fontWeight: 500 }}>Filter:</label>
              <select
                id="type-filter"
                value={filterType}
                onChange={(e) => updateParam("type", e.target.value)}
                className="form-control"
                style={{ width: "auto", padding: "0.25rem 0.5rem" }}
              >
                <option value="">All types</option>
                {uniqueTypes.map((t) => (
                  <option key={t} value={t}>{formatMaintenanceType(t)}</option>
                ))}
              </select>
              {filterType && (
                <button
                  onClick={() => updateParam("type", "")}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: "0.25rem 0.5rem" }}
                  aria-label="Clear filter"
                >
                  × Clear
                </button>
              )}
            </div>
          )}
          {car.maintenanceRecords.length > 1 && (
            <div className="flex gap-sm" style={{ alignItems: "center" }}>
              <span className="text-sm" style={{ fontWeight: 500 }}>Sort by:</span>
              {(["date", "type", "mileage", "cost"] as SortField[]).map((f) => (
                <button
                  key={f}
                  onClick={() => toggleSort(f)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontWeight: sortField === f ? 700 : 400 }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}{sortIcon(f)}
                </button>
              ))}
            </div>
          )}
        </div>
        {filterType && (
          <span className="text-sm text-muted">
            Showing {filteredRecords.length} of {car.maintenanceRecords.length} records
          </span>
        )}
        <MaintenanceList records={paginatedRecords} carId={car.id} />
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #e2e8f0" }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary btn-sm"
            >
              ← Previous
            </button>
            <span className="text-sm text-muted">
              Page {currentPage} of {totalPages} ({sortedRecords.length} records)
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-secondary btn-sm"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Members */}
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
