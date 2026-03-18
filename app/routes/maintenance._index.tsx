import { useState } from "react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link, useRouteError, isRouteErrorResponse, Form, useSearchParams } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarsForUser } from "~/models/car.server";
// server import moved into loader to avoid client bundling
import { formatMaintenanceType, formatDate, formatCurrency, formatMileage } from "~/utils/format";

export function meta() {
  return [{ title: "Maintenance History — Car Work Tracker" }];
}

const PAGE_SIZE = 25;

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { db } = await import('~/db.server');
  const cars = await getCarsForUser(userId);
  const carIds = cars.map((c) => c.id);

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const selectedCarId = url.searchParams.get("carId") ?? "";
  const typeFilter = url.searchParams.get("type") ?? "";
  const sortField = url.searchParams.get("sortField") ?? "date";
  const sortDir = (url.searchParams.get("sortDir") ?? "desc") as "asc" | "desc";
  const dateFrom = url.searchParams.get("dateFrom") ?? "";
  const dateTo = url.searchParams.get("dateTo") ?? "";
  const search = url.searchParams.get("search") ?? "";

  if (carIds.length === 0) {
    return json({
      records: [],
      cars,
      uniqueTypes: [] as string[],
      totalCost: 0,
      totalCount: 0,
      page: 1,
      pageSize: PAGE_SIZE,
      totalPages: 0,
      sortField,
      sortDir,
      selectedCarId,
      typeFilter,
      dateFrom,
      dateTo,
      search,
    });
  }

  // Fetch all distinct types for the filter dropdown (unaffected by current filters)
  const typeRows = await db.maintenanceRecord.findMany({
    where: { carId: { in: carIds } },
    select: { type: true },
    distinct: ["type"],
    orderBy: { type: "asc" },
  });
  const uniqueTypes = typeRows.map((r) => r.type);

  // Build Prisma where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = selectedCarId
    ? { carId: selectedCarId }
    : { carId: { in: carIds } };

  if (typeFilter) {
    where.type = typeFilter;
  }

  if (dateFrom || dateTo) {
    const dateCondition: { gte?: Date; lt?: Date } = {};
    if (dateFrom) {
      const d = new Date(dateFrom);
      if (!isNaN(d.getTime())) dateCondition.gte = d;
    }
    if (dateTo) {
      const d = new Date(dateTo);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + 1); // exclusive upper bound
        d.setHours(0, 0, 0, 0);
        dateCondition.lt = d;
      }
    }
    if (Object.keys(dateCondition).length > 0) {
      where.date = dateCondition;
    }
  }

  if (search.trim()) {
    where.OR = [
      { type: { contains: search } },
      { vendor: { contains: search } },
      { description: { contains: search } },
    ];
  }

  // Restrict sortField to direct columns (car-name sort would require client-side join)
  const validSortFields = ["date", "type", "mileage", "cost"];
  const orderByField = validSortFields.includes(sortField) ? sortField : "date";
  const orderBy = { [orderByField]: sortDir };

  const totalCount= await db.maintenanceRecord.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const records = await db.maintenanceRecord.findMany({
    where,
    orderBy,
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      car: { select: { id: true, make: true, model: true, year: true } },
    },
  });

  // totalCost aggregates ALL matching records (not just the current page)
  const costAgg = await db.maintenanceRecord.aggregate({
    where: { ...where, cost: { not: null } },
    _sum: { cost: true },
  });
  const totalCost = costAgg._sum.cost ?? 0;

  return json({
    records,
    cars,
    uniqueTypes,
    totalCost,
    totalCount,
    page: currentPage,
    pageSize: PAGE_SIZE,
    totalPages,
    sortField: orderByField,
    sortDir,
    selectedCarId,
    typeFilter,
    dateFrom,
    dateTo,
    search,
  });
}

export default function MaintenanceIndex() {
  const {
    records,
    cars,
    uniqueTypes,
    totalCost,
    totalCount,
    page,
    totalPages,
    sortField,
    sortDir,
    selectedCarId,
    typeFilter,
    dateFrom,
    dateTo,
    search,
  } = useLoaderData<typeof loader>();

  const [searchParams] = useSearchParams();
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  function toggleNote(id: string) {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const hasFilters = !!(selectedCarId || typeFilter || dateFrom || dateTo || search);

  const csvSearchParams = new URLSearchParams(searchParams);
  csvSearchParams.set("format", "csv");

  function buildPageUrl(p: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  function buildSortUrl(field: string) {
    const params = new URLSearchParams(searchParams);
    const nextDir = sortField === field && sortDir === "desc" ? "asc" : "desc";
    params.set("sortField", field);
    params.set("sortDir", nextDir);
    params.set("page", "1");
    return `?${params.toString()}`;
  }

  function sortIcon(field: string) {
    if (sortField !== field) return " \u2195";
    return sortDir === "asc" ? " \u2191" : " \u2193";
  }

  const sortLinkStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: "0.85rem",
    color: "#64748b",
    textDecoration: "none",
    whiteSpace: "nowrap",
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Maintenance History</h1>
          <p className="text-muted">All service records across your fleet</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <a href={`/maintenance/export?${csvSearchParams.toString()}`} className="btn btn-secondary btn-sm">
            ⬇ CSV
          </a>
          <a href={`/maintenance/export-json?${csvSearchParams.toString()}`} className="btn btn-secondary btn-sm">
            ⬇ JSON
          </a>
          <Link to="/" className="btn btn-secondary btn-sm">&larr; Dashboard</Link>
        </div>
      </div>

      {totalCount === 0 && !hasFilters ? (
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
              <strong>{totalCount}</strong>
              <span className="text-muted text-sm" style={{ marginLeft: "0.35rem" }}>
                record{totalCount !== 1 ? "s" : ""}{hasFilters ? " matched" : ""}
              </span>
            </div>
            {totalCost > 0 && (
              <div>
                <strong>{formatCurrency(totalCost)}</strong>
                <span className="text-muted text-sm" style={{ marginLeft: "0.35rem" }}>
                  total cost for {totalCount} matched record{totalCount !== 1 ? "s" : ""} (all pages)
                </span>
              </div>
            )}
            <div>
              <strong>{cars.length}</strong>
              <span className="text-muted text-sm" style={{ marginLeft: "0.35rem" }}>
                car{cars.length !== 1 ? "s" : ""}
              </span>
            </div>
            {totalPages > 1 && (
              <div>
                <span className="text-muted text-sm">Page {page} of {totalPages}</span>
              </div>
            )}
          </div>

          {/* Filter form — GET so filters appear in the URL */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <Form method="get" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
              {/* Preserve sort state so submitting the filter form doesn't reset sort */}
              <input type="hidden" name="sortField" value={sortField} />
              <input type="hidden" name="sortDir" value={sortDir} />

              {cars.length > 1 && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", marginBottom: "0.25rem" }}>Car</label>
                  <select name="carId" defaultValue={selectedCarId} className="form-control">
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
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", marginBottom: "0.25rem" }}>Service Type</label>
                  <select name="type" defaultValue={typeFilter} className="form-control">
                    <option value="">All types</option>
                    {uniqueTypes.map((t: string) => (
                      <option key={t} value={t}>{formatMaintenanceType(t)}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", marginBottom: "0.25rem" }}>From Date</label>
                <input type="date" name="dateFrom" defaultValue={dateFrom} className="form-control" style={{ width: "150px" }} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", marginBottom: "0.25rem" }}>To Date</label>
                <input type="date" name="dateTo" defaultValue={dateTo} className="form-control" style={{ width: "150px" }} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", marginBottom: "0.25rem" }}>Search</label>
                <input type="text" name="search" defaultValue={search} placeholder="vendor, type, notes..." className="form-control" style={{ width: "200px" }} />
              </div>

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", paddingBottom: "0.05rem" }}>
                <button type="submit" className="btn btn-primary btn-sm">Apply</button>
                {hasFilters && (
                  <a href="?" className="btn btn-secondary btn-sm">&times; Clear</a>
                )}
              </div>
            </Form>

            {hasFilters && (
              <div style={{ marginTop: "0.5rem" }}>
                <span className="text-sm text-muted">
                  {totalCount} record{totalCount !== 1 ? "s" : ""} matched
                  {totalCost > 0 ? ` \u00b7 ${formatCurrency(totalCost)} total` : ""}
                </span>
              </div>
            )}
          </div>

          {records.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
              <p className="text-muted">No records match your filters.</p>
              <p className="text-sm text-muted" style={{ marginTop: "0.5rem" }}>
                Try adjusting the date range, search term, or selecting a different car or service type.
              </p>
              <a href="?" className="btn btn-secondary btn-sm" style={{ marginTop: "0.75rem" }}>Clear all filters</a>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th aria-sort={sortField === "date" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                        <a href={buildSortUrl("date")} style={sortLinkStyle}>
                          Date{sortIcon("date")}
                        </a>
                      </th>
                      {cars.length > 1 && (
                        <th style={{ fontSize: "0.85rem", color: "#64748b" }}>Car</th>
                      )}
                      <th aria-sort={sortField === "type" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                        <a href={buildSortUrl("type")} style={sortLinkStyle}>
                          Service Type{sortIcon("type")}
                        </a>
                      </th>
                      <th aria-sort={sortField === "mileage" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                        <a href={buildSortUrl("mileage")} style={sortLinkStyle}>
                          Mileage{sortIcon("mileage")}
                        </a>
                      </th>
                      <th aria-sort={sortField === "cost" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                        <a href={buildSortUrl("cost")} style={sortLinkStyle}>
                          Cost{sortIcon("cost")}
                        </a>
                      </th>
                      <th>Vendor</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
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
                          {record.cost != null ? formatCurrency(record.cost) : "\u2014"}
                        </td>
                        <td>{record.vendor ?? "\u2014"}</td>
                        <td style={{ maxWidth: "200px" }}>
                          {record.description ? (
                            record.description.length > 50 && !expandedNotes.has(record.id) ? (
                              <span>
                                {record.description.slice(0, 47)}...{" "}
                                <button
                                  type="button"
                                  onClick={() => toggleNote(record.id)}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "#1e40af", fontSize: "0.75rem", padding: 0 }}
                                >
                                  more
                                </button>
                              </span>
                            ) : record.description.length > 50 ? (
                              <span>
                                {record.description}{" "}
                                <button
                                  type="button"
                                  onClick={() => toggleNote(record.id)}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "#1e40af", fontSize: "0.75rem", padding: 0 }}
                                >
                                  less
                                </button>
                              </span>
                            ) : (
                              record.description
                            )
                          ) : (
                            "\u2014"
                          )}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <div className="flex gap-sm">
                            {record.receiptUrl && (
                              <a
                                href={record.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary btn-sm"
                                title="View Receipt"
                              >
                                📄
                              </a>
                            )}
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

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", marginTop: "1rem" }}>
              {page > 1 && (
                <a href={buildPageUrl(page - 1)} className="btn btn-secondary btn-sm">&larr; Prev</a>
              )}
              <span className="text-muted text-sm">Page {page} of {totalPages} ({totalCount} total records)</span>
              {page < totalPages && (
                <a href={buildPageUrl(page + 1)} className="btn btn-primary btn-sm">Next &rarr;</a>
              )}
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
        <p className="text-muted">{error.status} &mdash; {error.statusText || "Error"}</p>
      ) : error instanceof Error ? (
        <p className="text-muted">{error.message}</p>
      ) : (
        <p className="text-muted">An unexpected error occurred</p>
      )}
      <a href="/" className="btn btn-secondary mt-2">Go Home</a>
    </div>
  );
}