import { useState, useMemo } from "react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link, useRouteError, isRouteErrorResponse } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarsForUser } from "~/models/car.server";
import { db } from "~/db.server";
import { formatMaintenanceType, formatDate, formatCurrency, formatMileage } from "~/utils/format";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const cars = await getCarsForUser(userId);
  const carIds = cars.map((c) => c.id);

  if (carIds.length === 0) {
    return json({ records: [], cars, totalCost: 0 });
  }

  const records = await db.maintenanceRecord.findMany({
    where: { carId: { in: carIds } },
    orderBy: { date: "desc" },
    include: {
      car: { select: { id: true, make: true, model: true, year: true } },
    },
  });

  const costAgg = await db.maintenanceRecord.aggregate({
    where: { carId: { in: carIds }, cost: { not: null } },
    _sum: { cost: true },
  });
  const totalCost = costAgg._sum.cost ?? 0;

  return json({ records, cars, totalCost });
}

type SortField = "date" | "type" | "cost" | "mileage" | "car";
type SortDir = "asc" | "desc";

function sortRecords(
  records: ReturnType<typeof useLoaderData<typeof loader>>["records"],
  field: SortField,
  dir: SortDir
) {
  return [...records].sort((a, b) => {
    let cmp = 0;
    if (field === "date") cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
    else if (field === "type") cmp = a.type.localeCompare(b.type);
    else if (field === "cost") cmp = (a.cost ?? 0) - (b.cost ?? 0);
    else if (field === "mileage") cmp = a.mileage - b.mileage;
    else if (field === "car") {
      const aLabel = `${a.car.year} ${a.car.make} ${a.car.model}`;
      const bLabel = `${b.car.year} ${b.car.make} ${b.car.model}`;
      cmp = aLabel.localeCompare(bLabel);
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

export default function MaintenanceIndex() {
  const { records, cars, totalCost } = useLoaderData<typeof loader>();

  const [search, setSearch] = useState("");
  const [filterCar, setFilterCar] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const uniqueTypes = useMemo(
    () => [...new Set(records.map((r) => r.type))].sort(),
    [records]
  );

  const filtered = useMemo(() => {
    let result = records;
    if (filterCar) result = result.filter((r) => r.car.id === filterCar);
    if (filterType) result = result.filter((r) => r.type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          formatMaintenanceType(r.type).toLowerCase().includes(q) ||
          r.car.make.toLowerCase().includes(q) ||
          r.car.model.toLowerCase().includes(q) ||
          String(r.car.year).includes(q) ||
          (r.vendor ?? "").toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q)
      );
    }
    return sortRecords(result, sortField, sortDir);
  }, [records, filterCar, filterType, search, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  const filteredCost = filtered
    .filter((r) => r.cost != null)
    .reduce((s, r) => s + (r.cost ?? 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Maintenance History</h1>
          <p className="text-muted">All service records across your fleet</p>
        </div>
        <Link to="/" className="btn btn-secondary">← Dashboard</Link>
      </div>

      {records.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <p className="text-muted">No maintenance records yet.</p>
          {cars.length === 0 ? (
            <Link to="/cars/new" className="btn btn-primary mt-2">Add your first car</Link>
          ) : (
            <Link to={`/cars/${cars[0].id}/maintenance/new`} className="btn btn-primary mt-2">
              Log first service
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="card" style={{ display: "flex", gap: "2rem", padding: "1rem 1.5rem", marginBottom: "1rem", background: "#f8fafc", flexWrap: "wrap" }}>
            <div>
              <strong>{records.length}</strong>
              <span className="text-muted text-sm" style={{ marginLeft: "0.35rem" }}>
                record{records.length !== 1 ? "s" : ""}
              </span>
            </div>
            {totalCost > 0 && (
              <div>
                <strong>{formatCurrency(totalCost)}</strong>
                <span className="text-muted text-sm" style={{ marginLeft: "0.35rem" }}>total spent</span>
              </div>
            )}
            <div>
              <strong>{cars.length}</strong>
              <span className="text-muted text-sm" style={{ marginLeft: "0.35rem" }}>
                car{cars.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Filter controls */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
              <div className="form-group">
                <label>Search</label>
                <input
                  type="search"
                  placeholder="Type, car, vendor, notes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-control"
                  aria-label="Search maintenance records"
                />
              </div>
              {cars.length > 1 && (
                <div className="form-group">
                  <label>Car</label>
                  <select
                    value={filterCar}
                    onChange={(e) => setFilterCar(e.target.value)}
                    className="form-control"
                  >
                    <option value="">All cars</option>
                    {cars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.year} {c.make} {c.model}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {uniqueTypes.length > 1 && (
                <div className="form-group">
                  <label>Service Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="form-control"
                  >
                    <option value="">All types</option>
                    {uniqueTypes.map((t) => (
                      <option key={t} value={t}>{formatMaintenanceType(t)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {(search || filterCar || filterType) && (
              <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span className="text-sm text-muted">
                  Showing {filtered.length} of {records.length} records
                  {filteredCost > 0 ? ` · ${formatCurrency(filteredCost)}` : ""}
                </span>
                <button
                  onClick={() => { setSearch(""); setFilterCar(""); setFilterType(""); }}
                  className="btn btn-secondary btn-sm"
                >
                  × Clear filters
                </button>
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
              <p className="text-muted">No records match your filters.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>
                        <button
                          onClick={() => toggleSort("date")}
                          style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", color: "#64748b", padding: 0 }}
                        >
                          Date{sortIcon("date")}
                        </button>
                      </th>
                      {cars.length > 1 && (
                        <th>
                          <button
                            onClick={() => toggleSort("car")}
                            style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", color: "#64748b", padding: 0 }}
                          >
                            Car{sortIcon("car")}
                          </button>
                        </th>
                      )}
                      <th>
                        <button
                          onClick={() => toggleSort("type")}
                          style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", color: "#64748b", padding: 0 }}
                        >
                          Service Type{sortIcon("type")}
                        </button>
                      </th>
                      <th>
                        <button
                          onClick={() => toggleSort("mileage")}
                          style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", color: "#64748b", padding: 0 }}
                        >
                          Mileage{sortIcon("mileage")}
                        </button>
                      </th>
                      <th>
                        <button
                          onClick={() => toggleSort("cost")}
                          style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", color: "#64748b", padding: 0 }}
                        >
                          Cost{sortIcon("cost")}
                        </button>
                      </th>
                      <th>Vendor</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((record) => (
                      <tr key={record.id}>
                        <td style={{ whiteSpace: "nowrap" }}>{formatDate(record.date)}</td>
                        {cars.length > 1 && (
                          <td style={{ whiteSpace: "nowrap" }}>
                            <Link to={`/cars/${record.car.id}`} style={{ color: "#1e40af", textDecoration: "none" }}>
                              {record.car.year} {record.car.make} {record.car.model}
                            </Link>
                          </td>
                        )}
                        <td>{formatMaintenanceType(record.type)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{formatMileage(record.mileage)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {record.cost != null ? formatCurrency(record.cost) : "—"}
                        </td>
                        <td>{record.vendor ?? "—"}</td>
                        <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {record.description ?? "—"}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <div className="flex gap-sm">
                            <Link
                              to={`/cars/${record.car.id}/maintenance/${record.id}/edit`}
                              className="btn btn-secondary btn-sm"
                            >
                              Edit
                            </Link>
                            <Link
                              to={`/cars/${record.car.id}/maintenance/${record.id}/delete`}
                              className="btn btn-danger btn-sm"
                            >
                              Delete
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
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
      <a href="/" className="btn btn-secondary mt-2">Go Home</a>
    </div>
  );
}
