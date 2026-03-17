import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, isRouteErrorResponse, useRouteError } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { db } from "~/db.server";
import { getCarsForUser } from "~/models/car.server";
import { formatCurrency, formatDate, formatMaintenanceType } from "~/utils/format";

export function meta() {
  return [{ title: "Reports & Analytics — Car Work Tracker" }];
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  const cars = await getCarsForUser(userId);
  const carIds = cars.map((c) => c.id);

  const records = carIds.length
    ? await db.maintenanceRecord.findMany({
        where: { carId: { in: carIds } },
        include: { car: true },
        orderBy: { date: "desc" },
      })
    : [];

  // ── Year-over-year ──────────────────────────────────────────────────────
  const byYearMap = new Map<
    number,
    { year: number; totalCost: number; count: number; byType: Record<string, number> }
  >();

  for (const rec of records) {
    const year = new Date(rec.date).getFullYear();
    const cost = rec.cost ?? 0;
    if (!byYearMap.has(year)) {
      byYearMap.set(year, { year, totalCost: 0, count: 0, byType: {} });
    }
    const entry = byYearMap.get(year)!;
    entry.totalCost += cost;
    entry.count += 1;
    entry.byType[rec.type] = (entry.byType[rec.type] ?? 0) + cost;
  }

  const yearOverYear = Array.from(byYearMap.values()).sort((a, b) => b.year - a.year);

  // ── Cost by car ─────────────────────────────────────────────────────────
  const byCarMap = new Map<
    string,
    {
      carId: string;
      label: string;
      totalCost: number;
      count: number;
      firstDate: Date | null;
      lastDate: Date | null;
      minMileage: number | null;
      maxMileage: number | null;
    }
  >();

  for (const car of cars) {
    byCarMap.set(car.id, {
      carId: car.id,
      label: `${car.year} ${car.make} ${car.model}`,
      totalCost: 0,
      count: 0,
      firstDate: null,
      lastDate: null,
      minMileage: null,
      maxMileage: null,
    });
  }

  for (const rec of records) {
    const entry = byCarMap.get(rec.carId);
    if (!entry) continue;
    const cost = rec.cost ?? 0;
    entry.totalCost += cost;
    entry.count += 1;
    const d = new Date(rec.date);
    if (!entry.firstDate || d < entry.firstDate) entry.firstDate = d;
    if (!entry.lastDate || d > entry.lastDate) entry.lastDate = d;
    if (entry.minMileage === null || rec.mileage < entry.minMileage) entry.minMileage = rec.mileage;
    if (entry.maxMileage === null || rec.mileage > entry.maxMileage) entry.maxMileage = rec.mileage;
  }

  const byCar = Array.from(byCarMap.values()).map((entry) => ({
    ...entry,
    costPerMile:
      entry.minMileage !== null && entry.maxMileage !== null && entry.maxMileage > entry.minMileage
        ? entry.totalCost / (entry.maxMileage - entry.minMileage)
        : null,
  })).sort((a, b) => b.totalCost - a.totalCost);

  // ── Cost by maintenance type ─────────────────────────────────────────────
  const byTypeMap = new Map<string, { type: string; totalCost: number; count: number }>();

  for (const rec of records) {
    const cost = rec.cost ?? 0;
    if (!byTypeMap.has(rec.type)) {
      byTypeMap.set(rec.type, { type: rec.type, totalCost: 0, count: 0 });
    }
    const entry = byTypeMap.get(rec.type)!;
    entry.totalCost += cost;
    entry.count += 1;
  }

  const byType = Array.from(byTypeMap.values()).sort((a, b) => b.totalCost - a.totalCost);

  // ── Monthly trend (last 24 months) ───────────────────────────────────────
  const now = new Date();
  const monthlyMap = new Map<string, { key: string; year: number; month: number; totalCost: number }>();

  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, { key, year: d.getFullYear(), month: d.getMonth() + 1, totalCost: 0 });
  }

  for (const rec of records) {
    const d = new Date(rec.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMap.has(key)) {
      monthlyMap.get(key)!.totalCost += rec.cost ?? 0;
    }
  }

  const monthlyTrend = Array.from(monthlyMap.values());

  // ── Fleet summary stats ──────────────────────────────────────────────────
  const totalFleetCost = records.reduce((s, r) => s + (r.cost ?? 0), 0);
  const currentYear = now.getFullYear();
  const thisYearCost = records
    .filter((r) => new Date(r.date).getFullYear() === currentYear)
    .reduce((s, r) => s + (r.cost ?? 0), 0);
  const avgCostPerService = records.length > 0 ? totalFleetCost / records.length : 0;
  const mostServicedCar = byCar.length > 0 ? byCar.reduce((a, b) => (b.count > a.count ? b : a)) : null;

  return json({
    cars,
    totalRecords: records.length,
    totalFleetCost,
    thisYearCost,
    avgCostPerService,
    mostServicedCar,
    yearOverYear,
    byCar,
    byType,
    monthlyTrend,
    currentYear,
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ReportsIndex() {
  const {
    cars,
    totalRecords,
    totalFleetCost,
    thisYearCost,
    avgCostPerService,
    mostServicedCar,
    yearOverYear,
    byCar,
    byType,
    monthlyTrend,
    currentYear,
  } = useLoaderData<typeof loader>();

  // Empty state
  if (cars.length === 0) {
    return (
      <div className="container" style={{ paddingTop: "2rem" }}>
        <div className="page-header">
          <div>
            <h1>Reports &amp; Analytics</h1>
            <p className="text-muted">Spending insights across your fleet</p>
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "3rem 2rem", marginTop: "2rem" }}>
          <p style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📊</p>
          <h2>No data yet</h2>
          <p className="text-muted">Add cars and maintenance records to see analytics here.</p>
        </div>
      </div>
    );
  }

  if (totalRecords === 0) {
    return (
      <div className="container" style={{ paddingTop: "2rem" }}>
        <div className="page-header">
          <div>
            <h1>Reports &amp; Analytics</h1>
            <p className="text-muted">Spending insights across your fleet</p>
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "3rem 2rem", marginTop: "2rem" }}>
          <p style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📋</p>
          <h2>No maintenance records</h2>
          <p className="text-muted">Log maintenance records to start seeing spending analytics.</p>
        </div>
      </div>
    );
  }

  // Monthly trend — last 12 months for the mini chart
  const last12 = monthlyTrend.slice(-12);
  const maxMonthCost = Math.max(...last12.map((m) => m.totalCost), 1);

  // Year chart
  const maxYearCost = Math.max(...yearOverYear.map((y) => y.totalCost), 1);

  return (
    <div className="container" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
      {/* Page header */}
      <div className="page-header mb-2">
        <div>
          <h1>Reports &amp; Analytics</h1>
          <p className="text-muted">Comprehensive spending insights across your entire fleet</p>
        </div>
      </div>

      {/* ── Fleet Summary Cards ── */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <SummaryCard
          icon="💰"
          label="Total Fleet Cost"
          value={formatCurrency(totalFleetCost)}
          sub="all time"
        />
        <SummaryCard
          icon="📅"
          label={`${currentYear} Spending`}
          value={formatCurrency(thisYearCost)}
          sub="this calendar year"
        />
        <SummaryCard
          icon="🔧"
          label="Avg Cost / Service"
          value={formatCurrency(avgCostPerService)}
          sub={`across ${totalRecords} records`}
        />
        <SummaryCard
          icon="🚗"
          label="Most Serviced Car"
          value={mostServicedCar ? mostServicedCar.label : "—"}
          sub={mostServicedCar ? `${mostServicedCar.count} services` : "no records yet"}
          small={!!mostServicedCar}
        />
      </div>

      {/* ── Year-over-Year ── */}
      <section className="card mb-2" style={{ padding: "1.5rem" }}>
        <h2 style={{ marginBottom: "0.25rem" }}>Year-over-Year Cost Comparison</h2>
        <p className="text-muted text-sm" style={{ marginBottom: "1.25rem" }}>
          Total maintenance spend per calendar year
        </p>

        {/* Bar chart */}
        <div style={{ marginBottom: "1.5rem" }}>
          {yearOverYear.map((y) => {
            const pct = maxYearCost > 0 ? (y.totalCost / maxYearCost) * 100 : 0;
            return (
              <div
                key={y.year}
                style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.35rem 0" }}
              >
                <div style={{ minWidth: "48px", textAlign: "right", fontWeight: 600, fontSize: "0.9rem" }}>
                  {y.year}
                </div>
                <div style={{ flex: 1, background: "#f1f5f9", borderRadius: "4px", height: "24px" }}>
                  <div
                    style={{
                      background: "#1e40af",
                      width: `${pct}%`,
                      height: "100%",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: pct > 15 ? "8px" : "0",
                      color: "white",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      minWidth: y.totalCost > 0 ? "60px" : "0",
                      transition: "width 0.3s ease",
                    }}
                  >
                    {pct > 12 ? formatCurrency(y.totalCost) : ""}
                  </div>
                </div>
                <div style={{ minWidth: "120px", color: "#64748b", fontSize: "0.82rem" }}>
                  {y.count} record{y.count !== 1 ? "s" : ""} &bull;{" "}
                  {pct <= 12 ? formatCurrency(y.totalCost) : ""}
                </div>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                <Th>Year</Th>
                <Th align="right">Records</Th>
                <Th align="right">Total Cost</Th>
                <Th align="right">Avg / Service</Th>
                <Th align="right">% of Peak</Th>
              </tr>
            </thead>
            <tbody>
              {yearOverYear.map((y, i) => {
                const avg = y.count > 0 ? y.totalCost / y.count : 0;
                const pct = maxYearCost > 0 ? (y.totalCost / maxYearCost) * 100 : 0;
                const pctChange =
                  i > 0 && yearOverYear[i - 1].totalCost > 0
                    ? ((y.totalCost - yearOverYear[i - 1].totalCost) / yearOverYear[i - 1].totalCost) * 100
                    : null;
                return (
                  <tr key={y.year} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <Td>
                      <strong>{y.year}</strong>
                      {y.year === currentYear && (
                        <span
                          className="badge"
                          style={{
                            marginLeft: "0.5rem",
                            background: "#dbeafe",
                            color: "#1e40af",
                            fontSize: "0.7rem",
                            padding: "1px 6px",
                            borderRadius: "999px",
                          }}
                        >
                          current
                        </span>
                      )}
                    </Td>
                    <Td align="right">{y.count}</Td>
                    <Td align="right">
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                        <strong>{formatCurrency(y.totalCost)}</strong>
                        {pctChange !== null && (
                          <span style={{ fontSize: "0.75rem", color: pctChange >= 0 ? "#dc2626" : "#16a34a" }}>
                            {pctChange >= 0 ? "▲" : "▼"} {Math.abs(pctChange).toFixed(0)}% vs {yearOverYear[i - 1].year}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td align="right">{formatCurrency(avg)}</Td>
                    <Td align="right">
                      <span style={{ color: pct === 100 ? "#1e40af" : "#64748b" }}>
                        {pct.toFixed(1)}%
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Cost by Car ── */}
      <section className="card mb-2" style={{ padding: "1.5rem" }}>
        <h2 style={{ marginBottom: "0.25rem" }}>Cost by Car</h2>
        <p className="text-muted text-sm" style={{ marginBottom: "1.25rem" }}>
          Lifetime maintenance spend broken down by vehicle
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                <Th>Vehicle</Th>
                <Th align="right">Records</Th>
                <Th align="right">Total Cost</Th>
                <Th align="right">Avg / Service</Th>
                <Th align="right">Cost/Mile</Th>
                <Th align="right">Date Range</Th>
              </tr>
            </thead>
            <tbody>
              {byCar.map((c) => {
                const avg = c.count > 0 ? c.totalCost / c.count : 0;
                return (
                  <tr key={c.carId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <Td>
                      <strong>{c.label}</strong>
                    </Td>
                    <Td align="right">{c.count}</Td>
                    <Td align="right">
                      <strong>{formatCurrency(c.totalCost)}</strong>
                    </Td>
                    <Td align="right">{formatCurrency(avg)}</Td>
                    <Td align="right">
                      {c.costPerMile != null ? (
                        <span>${c.costPerMile.toFixed(3)}/mi</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </Td>
                    <Td align="right">
                      {c.firstDate && c.lastDate ? (
                        <span className="text-muted">
                          {formatDate(c.firstDate)} – {formatDate(c.lastDate)}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Cost by Maintenance Type ── */}
      <section className="card mb-2" style={{ padding: "1.5rem" }}>
        <h2 style={{ marginBottom: "0.25rem" }}>Cost by Service Type</h2>
        <p className="text-muted text-sm" style={{ marginBottom: "1.25rem" }}>
          Breakdown of spending by maintenance category (sorted by highest spend)
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                <Th>Service Type</Th>
                <Th align="right">Records</Th>
                <Th align="right">Total Cost</Th>
                <Th align="right">Avg / Service</Th>
                <Th align="right">% of Total</Th>
              </tr>
            </thead>
            <tbody>
              {byType.map((t) => {
                const avg = t.count > 0 ? t.totalCost / t.count : 0;
                const pct = totalFleetCost > 0 ? (t.totalCost / totalFleetCost) * 100 : 0;
                return (
                  <tr key={t.type} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <Td>
                      <span
                        style={{
                          display: "inline-block",
                          background: "#eff6ff",
                          color: "#1e40af",
                          borderRadius: "4px",
                          padding: "2px 8px",
                          fontSize: "0.82rem",
                          fontWeight: 500,
                        }}
                      >
                        {formatMaintenanceType(t.type)}
                      </span>
                    </Td>
                    <Td align="right">{t.count}</Td>
                    <Td align="right">
                      <strong>{formatCurrency(t.totalCost)}</strong>
                    </Td>
                    <Td align="right">{formatCurrency(avg)}</Td>
                    <Td align="right">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "0.4rem",
                        }}
                      >
                        <div
                          style={{
                            width: "60px",
                            height: "6px",
                            background: "#f1f5f9",
                            borderRadius: "3px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              background: "#1e40af",
                              borderRadius: "3px",
                            }}
                          />
                        </div>
                        <span style={{ minWidth: "38px", textAlign: "right", color: "#64748b" }}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Monthly Spending Trend ── */}
      <section className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ marginBottom: "0.25rem" }}>Monthly Spending Trend</h2>
        <p className="text-muted text-sm" style={{ marginBottom: "1.5rem" }}>
          Last 12 months of maintenance spend
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "4px",
            height: "120px",
            paddingBottom: "28px",
            position: "relative",
          }}
        >
          {last12.map((m) => {
            const barPct = maxMonthCost > 0 ? (m.totalCost / maxMonthCost) * 100 : 0;
            const barHeight = Math.max(barPct * 0.9, m.totalCost > 0 ? 4 : 0);
            const label = MONTH_ABBR[m.month - 1];
            return (
              <div
                key={m.key}
                title={`${label} ${m.year}: ${formatCurrency(m.totalCost)}`}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}
              >
                <div
                  style={{
                    width: "100%",
                    height: `${barHeight}px`,
                    background: m.totalCost > 0 ? "#1e40af" : "#e2e8f0",
                    borderRadius: "3px 3px 0 0",
                    transition: "height 0.3s ease",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    fontSize: "0.68rem",
                    color: "#64748b",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary row below chart */}
        <div
          style={{
            display: "flex",
            gap: "2rem",
            marginTop: "1rem",
            paddingTop: "1rem",
            borderTop: "1px solid #f1f5f9",
            flexWrap: "wrap",
          }}
        >
          {(() => {
            const activeLast12 = last12.filter((m) => m.totalCost > 0);
            const totalLast12 = last12.reduce((s, m) => s + m.totalCost, 0);
            const avgMonthly = activeLast12.length > 0 ? totalLast12 / activeLast12.length : 0;
            const peakMonth = last12.reduce(
              (best, m) => (m.totalCost > best.totalCost ? m : best),
              last12[0]
            );
            return (
              <>
                <div>
                  <div className="text-sm text-muted">12-month total</div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{formatCurrency(totalLast12)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted">Monthly avg (active months)</div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{formatCurrency(avgMonthly)}</div>
                </div>
                {peakMonth && peakMonth.totalCost > 0 && (
                  <div>
                    <div className="text-sm text-muted">Peak month</div>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                      {MONTH_ABBR[peakMonth.month - 1]} {peakMonth.year} &mdash;{" "}
                      {formatCurrency(peakMonth.totalCost)}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small reusable helpers
// ---------------------------------------------------------------------------

function SummaryCard({
  icon,
  label,
  value,
  sub,
  small = false,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  small?: boolean;
}) {
  return (
    <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
      <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>{icon}</div>
      <div className="text-sm text-muted" style={{ marginBottom: "0.25rem" }}>
        {label}
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: small ? "1rem" : "1.4rem",
          color: "#1e293b",
          lineHeight: 1.2,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
      <div className="text-sm text-muted" style={{ marginTop: "0.25rem" }}>
        {sub}
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      style={{
        textAlign: align,
        padding: "0.5rem 0.75rem",
        color: "#64748b",
        fontWeight: 600,
        fontSize: "0.78rem",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <td
      style={{
        textAlign: align,
        padding: "0.6rem 0.75rem",
        verticalAlign: "middle",
      }}
    >
      {children}
    </td>
  );
}

// ---------------------------------------------------------------------------
// Error Boundary
// ---------------------------------------------------------------------------

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <div className="container" style={{ paddingTop: "2rem" }}>
      <div className="alert alert-error">
        <h2 style={{ marginBottom: "0.5rem" }}>Something went wrong</h2>
        <p>
          {isRouteErrorResponse(error)
            ? `${error.status} — ${error.statusText}`
            : error instanceof Error
            ? error.message
            : "An unexpected error occurred while loading the reports page."}
        </p>
      </div>
    </div>
  );
}
