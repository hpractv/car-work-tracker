import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarById, getCarMaintenanceOverrides } from "~/models/car.server";
import { getServiceIntervalStatus } from "~/models/maintenance.server";
import { formatMaintenanceType, formatDate, formatMileage } from "~/utils/format";

export function meta() {
  return [{ title: "Service Schedule — Car Work Tracker" }];
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId!, userId);
  if (!car) throw new Response("Not Found", { status: 404 });

  const overrides = await getCarMaintenanceOverrides(car.id);
  const intervalStatus = await getServiceIntervalStatus(car.id, car.currentMileage, overrides);

  // Sort: due first (overallPercent >= 100), then approaching (60-99%), then upcoming (<60%), then no history
  const sorted = [...intervalStatus].sort((a, b) => {
    const aScore = a.hasHistory ? (a.isDue ? 200 : a.overallPercent) : -1;
    const bScore = b.hasHistory ? (b.isDue ? 200 : b.overallPercent) : -1;
    return bScore - aScore;
  });

  return json({ car, schedule: sorted });
}

type ScheduleItem = {
  type: string;
  intervalMiles: number | null;
  intervalMonths: number | null;
  lastDate: string | null;
  lastMileage: number | null;
  nextMileage: number | null;
  nextDate: string | null;
  isDue: boolean;
  overallPercent: number;
  hasHistory: boolean;
};

type StatusKey = "overdue" | "due_soon" | "upcoming" | "ok" | "no_history";

function getStatusKey(item: ScheduleItem): StatusKey {
  if (!item.hasHistory) return "no_history";
  if (item.isDue) return "overdue";
  if (item.overallPercent >= 80) return "due_soon";
  if (item.overallPercent >= 60) return "upcoming";
  return "ok";
}

const STATUS_CONFIG: Record<
  StatusKey,
  { label: string; badgeBg: string; badgeColor: string; barColor: string; headerColor: string; headerBg: string }
> = {
  overdue: {
    label: "OVERDUE",
    badgeBg: "#fee2e2",
    badgeColor: "#991b1b",
    barColor: "#ef4444",
    headerColor: "#991b1b",
    headerBg: "#fef2f2",
  },
  due_soon: {
    label: "DUE SOON",
    badgeBg: "#fef3c7",
    badgeColor: "#92400e",
    barColor: "#f59e0b",
    headerColor: "#92400e",
    headerBg: "#fffbeb",
  },
  upcoming: {
    label: "UPCOMING",
    badgeBg: "#fef9c3",
    badgeColor: "#713f12",
    barColor: "#eab308",
    headerColor: "#713f12",
    headerBg: "#fefce8",
  },
  ok: {
    label: "OK",
    badgeBg: "#d1fae5",
    badgeColor: "#065f46",
    barColor: "#10b981",
    headerColor: "#065f46",
    headerBg: "#f0fdf4",
  },
  no_history: {
    label: "NO HISTORY",
    badgeBg: "#f3f4f6",
    badgeColor: "#6b7280",
    barColor: "#d1d5db",
    headerColor: "#6b7280",
    headerBg: "#f9fafb",
  },
};

const GROUP_ORDER: StatusKey[] = ["overdue", "due_soon", "upcoming", "ok", "no_history"];

const GROUP_TITLES: Record<StatusKey, string> = {
  overdue: "🔴 Overdue",
  due_soon: "🟡 Due Soon",
  upcoming: "🟠 Upcoming",
  ok: "✅ Up to Date",
  no_history: "⚪ No History",
};

export default function CarForecast() {
  const { car, schedule } = useLoaderData<typeof loader>();

  const grouped = new Map<StatusKey, ScheduleItem[]>();
  for (const key of GROUP_ORDER) grouped.set(key, []);
  for (const item of schedule) {
    grouped.get(getStatusKey(item as ScheduleItem))!.push(item as ScheduleItem);
  }

  const overdueCount = grouped.get("overdue")!.length;
  const dueSoonCount = grouped.get("due_soon")!.length;
  const upcomingCount = grouped.get("upcoming")!.length;
  const okCount = grouped.get("ok")!.length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>📅 Service Schedule — {car.year} {car.make} {car.model}</h1>
          <p className="text-muted" style={{ marginTop: "0.25rem" }}>
            Current mileage: {formatMileage(car.currentMileage)}
          </p>
        </div>
        <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
          <Link to={`/cars/${car.id}/overrides`} className="btn btn-secondary">
            ⚙ Customize Intervals
          </Link>
          <Link to={`/cars/${car.id}`} className="btn btn-secondary">
            ← Back to Car
          </Link>
        </div>
      </div>

      {/* Summary card */}
      <div
        className="card"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <SummaryTile count={overdueCount} label="Overdue" bg="#fee2e2" color="#991b1b" />
        <SummaryTile count={dueSoonCount} label="Due Soon" bg="#fef3c7" color="#92400e" />
        <SummaryTile count={upcomingCount} label="Upcoming" bg="#fefce8" color="#713f12" />
        <SummaryTile count={okCount} label="Up to Date" bg="#d1fae5" color="#065f46" />
      </div>

      {/* Groups */}
      {GROUP_ORDER.map((key) => {
        const items = grouped.get(key)!;
        if (items.length === 0) return null;
        const cfg = STATUS_CONFIG[key];
        return (
          <div key={key} style={{ marginBottom: "1.5rem" }}>
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: cfg.headerColor,
                background: cfg.headerBg,
                padding: "0.5rem 0.75rem",
                borderRadius: "6px 6px 0 0",
                margin: 0,
                borderBottom: `2px solid ${cfg.barColor}`,
              }}
            >
              {GROUP_TITLES[key]}
            </h2>
            <div
              className="card"
              style={{
                borderRadius: "0 0 6px 6px",
                padding: 0,
                overflow: "hidden",
              }}
            >
              {items.map((item, idx) => (
                <ScheduleRow
                  key={item.type}
                  item={item}
                  carId={car.id}
                  statusKey={key}
                  isLast={idx === items.length - 1}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SummaryTile({
  count,
  label,
  bg,
  color,
}: {
  count: number;
  label: string;
  bg: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: bg,
        borderRadius: "8px",
        padding: "1rem",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "2rem", fontWeight: 700, color, lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: "0.8rem", color, marginTop: "0.25rem", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function ScheduleRow({
  item,
  carId,
  statusKey,
  isLast,
}: {
  item: ScheduleItem;
  carId: string;
  statusKey: StatusKey;
  isLast: boolean;
}) {
  const cfg = STATUS_CONFIG[statusKey];
  const barWidth = Math.min(100, item.overallPercent);
  const showLogButton = statusKey === "overdue" || statusKey === "due_soon";

  const intervalDesc = [
    item.intervalMiles ? `Every ${item.intervalMiles.toLocaleString()} mi` : null,
    item.intervalMonths ? `${item.intervalMonths} months` : null,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <div
      style={{
        padding: "0.85rem 1rem",
        borderBottom: isLast ? "none" : "1px solid var(--border, #e5e7eb)",
      }}
    >
      {/* Top row: name + badge + button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "0.5rem",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
          {formatMaintenanceType(item.type)}
        </span>
        <span
          style={{
            background: cfg.badgeBg,
            color: cfg.badgeColor,
            padding: "0.15rem 0.5rem",
            borderRadius: "4px",
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          {cfg.label}
        </span>
        {intervalDesc && (
          <span className="text-muted" style={{ fontSize: "0.78rem", marginLeft: "auto" }}>
            {intervalDesc}
          </span>
        )}
        {showLogButton && (
          <Link
            to={`/cars/${carId}/maintenance/new?type=${encodeURIComponent(item.type)}`}
            className="btn btn-primary btn-sm"
            style={{ marginLeft: intervalDesc ? undefined : "auto", whiteSpace: "nowrap" }}
          >
            Log Service
          </Link>
        )}
      </div>

      {/* Progress bar */}
      {item.hasHistory && (
        <div
          style={{
            height: "6px",
            background: "#e5e7eb",
            borderRadius: "3px",
            overflow: "hidden",
            marginBottom: "0.5rem",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${barWidth}%`,
              background: cfg.barColor,
              borderRadius: "3px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}

      {/* Detail row: last service / next due */}
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          flexWrap: "wrap",
          fontSize: "0.8rem",
          color: "var(--text-muted, #6b7280)",
        }}
      >
        <span>
          <strong>Last service:</strong>{" "}
          {item.lastDate
            ? `${formatDate(item.lastDate)}${item.lastMileage != null ? ` at ${item.lastMileage.toLocaleString()} mi` : ""}`
            : "Never"}
        </span>
        {(item.nextMileage != null || item.nextDate != null) && (
          <span>
            <strong>Next due:</strong>{" "}
            {[
              item.nextMileage != null ? `${item.nextMileage.toLocaleString()} mi` : null,
              item.nextDate ? formatDate(item.nextDate) : null,
            ]
              .filter(Boolean)
              .join(" or ")}
          </span>
        )}
      </div>
    </div>
  );
}
