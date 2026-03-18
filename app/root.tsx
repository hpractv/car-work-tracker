import { useState } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  isRouteErrorResponse,
  useLoaderData,
  Form,
  Link,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getUserId } from "~/session.server";
import { db } from "~/db.server";
import OfflineIndicator from "~/components/OfflineIndicator";
import { monthsDiff } from "~/utils/date";

export const links: LinksFunction = () => [
  { rel: "manifest", href: "/manifest.webmanifest" },
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
];



export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    return json({ isLoggedIn: false, userName: null, dueCount: 0 });
  }
  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
  let dueCount = 0;
  try {
    const cars = await db.car.findMany({
      where: { members: { some: { userId } }, isArchived: false },
      select: { id: true, currentMileage: true },
    });
    if (cars.length > 0) {
      const carIds = cars.map(c => c.id);
      const [types, records, overrides] = await Promise.all([
        db.maintenanceType.findMany(),
        db.maintenanceRecord.findMany({
          where: { carId: { in: carIds } },
          orderBy: { date: "desc" },
          select: { carId: true, type: true, date: true, mileage: true },
        }),
        db.carMaintenanceOverride.findMany({ where: { carId: { in: carIds } } }),
      ]);
      const recordsByCarId = new Map<string, typeof records>();
      for (const record of records) {
        if (!recordsByCarId.has(record.carId)) recordsByCarId.set(record.carId, []);
        recordsByCarId.get(record.carId)!.push(record);
      }
      const now = new Date();
      for (const car of cars) {
        const carRecords = recordsByCarId.get(car.id) ?? [];
        for (const mt of types) {
          if (!mt.defaultIntervalMiles && !mt.defaultIntervalMonths) continue;
          const lastRecord = carRecords.find(r => r.type === mt.name);
          if (!lastRecord) continue;
          const override = overrides.find(o => o.carId === car.id && o.typeName === mt.name);
          const intervalMiles = override ? override.intervalMiles : mt.defaultIntervalMiles;
          const intervalMonths = override ? override.intervalMonths : mt.defaultIntervalMonths;
          if (intervalMiles && (car.currentMileage - lastRecord.mileage) >= intervalMiles) {
            dueCount++;
          } else if (intervalMonths) {
            const monthsSince = monthsDiff(new Date(lastRecord.date), now);
            if (monthsSince >= intervalMonths) dueCount++;
          }
        }
      }
    }
    if (cars.length > 0) {
      const carIds = cars.map(c => c.id);
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const docAlerts = await db.carDocument.count({
        where: {
          carId: { in: carIds },
          expiryDate: { not: null },
          OR: [
            { expiryDate: { lt: now } },
            { expiryDate: { gte: now, lte: sevenDaysFromNow } },
          ],
        },
      });
      dueCount += docAlerts;
    }
  } catch {
    dueCount = 0;
  }
  return json({ isLoggedIn: true, userName: user?.name ?? null, dueCount });
}

export function meta() {
  return [
    { title: "Car Work Tracker" },
    { name: "description", content: "Track your car maintenance" },
    { name: "theme-color", content: "#1e40af" },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    { name: "apple-mobile-web-app-title", content: "Car Work Tracker" },
  ];
}

function NavBar({ isLoggedIn, dueCount, userName }: { isLoggedIn: boolean; dueCount: number; userName?: string | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">🚗 Car Work Tracker</Link>
      <button
        className="nav-hamburger"
        aria-label="Toggle navigation"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? "✕" : "☰"}
      </button>
      <div className={`nav-links${menuOpen ? " nav-open" : ""}`}>
        {isLoggedIn ? (
          <>
            <Link to="/" onClick={() => setMenuOpen(false)}>
              Dashboard
              {dueCount > 0 && (
                <span style={{
                  background: "#dc2626",
                  color: "white",
                  borderRadius: "999px",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  padding: "0.1rem 0.4rem",
                  marginLeft: "0.35rem",
                  lineHeight: 1,
                  verticalAlign: "middle",
                }}>
                  {dueCount}
                </span>
              )}
            </Link>
            <Link to="/cars" onClick={() => setMenuOpen(false)}>My Cars</Link>
            <Link to="/compare" onClick={() => setMenuOpen(false)}>Compare</Link>
            <Link to="/maintenance" onClick={() => setMenuOpen(false)}>History</Link>
            <Link to="/search" onClick={() => setMenuOpen(false)}>Search</Link>
            <Link to="/reports" onClick={() => setMenuOpen(false)}>Reports</Link>
            <Link to="/settings" onClick={() => setMenuOpen(false)}>Settings</Link>
            {userName && <span style={{color:"rgba(255,255,255,0.7)", fontSize:"0.85rem", marginRight:"0.5rem"}}>{userName}</span>}
            <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
            <Form method="post" action="/logout" style={{ display: "inline" }}>
              <button
                type="submit"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "white",
                  opacity: 0.9,
                  fontSize: "inherit",
                  fontFamily: "inherit",
                  padding: 0,
                }}
                onMouseOver={(e) => ((e.target as HTMLButtonElement).style.opacity = "1")}
                onMouseOut={(e) => ((e.target as HTMLButtonElement).style.opacity = "0.9")}
              >
                Logout
              </button>
            </Form>
          </>
        ) : (
          <>
            <Link to="/login" onClick={() => setMenuOpen(false)}>Sign In</Link>
            <Link to="/signup" onClick={() => setMenuOpen(false)}>Sign Up</Link>
          </>
        )}
        <OfflineIndicator />
      </div>
    </nav>
  );
}

export default function App() {
  const { isLoggedIn, dueCount, userName } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <Meta />
        <Links />
        <style>{globalStyles}</style>
      </head>
      <body>
        <NavBar isLoggedIn={isLoggedIn} dueCount={dueCount} userName={userName} />
        <main className="container">
          <Outlet />
        </main>
        <ScrollRestoration />
        <Scripts />
        <script src="/registerSW.js" />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>Error</title>
        <style>{globalStyles}</style>
      </head>
      <body>
        <div className="container" style={{ marginTop: "2rem" }}>
          <h1>Something went wrong</h1>
          {isRouteErrorResponse(error) ? (
            <p>{error.status} - {error.statusText}</p>
          ) : error instanceof Error ? (
            <p>{error.message}</p>
          ) : (
            <p>Unknown error</p>
          )}
          <a href="/">Go home</a>
        </div>
      </body>
    </html>
  );
}

const globalStyles = `
  :root {
    --bg: #f8fafc;
    --bg-card: #ffffff;
    --text: #1e293b;
    --text-muted: #64748b;
    --border: #e2e8f0;
    --nav-bg: #1e40af;
    --btn-secondary-bg: #e2e8f0;
    --btn-secondary-text: #1e293b;
    --th-bg: #f8fafc;
    --input-bg: #ffffff;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f172a;
      --bg-card: #1e293b;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --border: #334155;
      --nav-bg: #1e3a8a;
      --btn-secondary-bg: #334155;
      --btn-secondary-text: #f1f5f9;
      --th-bg: #1e293b;
      --input-bg: #0f172a;
    }
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }
  .container { max-width: 1000px; margin: 0 auto; padding: 1.5rem 1rem; }
  .navbar { background: var(--nav-bg); color: white; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; }
  .nav-brand { color: white; text-decoration: none; font-size: 1.1rem; font-weight: 700; }
  .nav-links { display: flex; gap: 1rem; align-items: center; }
  .nav-links a { color: white; text-decoration: none; opacity: 0.9; }
  .nav-links a:hover { opacity: 1; text-decoration: underline; }
  h1 { font-size: 1.8rem; font-weight: 700; margin-bottom: 1rem; color: var(--text); }
  h2 { font-size: 1.4rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--text); }
  h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
  a { color: #1e40af; }
  .btn { display: inline-block; padding: 0.5rem 1rem; border-radius: 6px; border: none; cursor: pointer; font-size: 0.9rem; font-weight: 500; text-decoration: none; transition: background 0.2s; }
  .btn-primary { background: #1e40af; color: white; }
  .btn-primary:hover { background: #1d3a9e; color: white; }
  .btn-secondary { background: var(--btn-secondary-bg); color: var(--btn-secondary-text); }
  .btn-secondary:hover { background: var(--btn-secondary-bg); filter: brightness(0.9); }
  .btn-danger { background: #dc2626; color: white; }
  .btn-danger:hover { background: #b91c1c; color: white; }
  .btn-sm { padding: 0.25rem 0.6rem; font-size: 0.8rem; }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.25rem; margin-bottom: 1rem; }
  .form-group { margin-bottom: 1rem; }
  .form-group label { display: block; font-weight: 500; margin-bottom: 0.35rem; font-size: 0.9rem; }
  .form-control { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.95rem; background: var(--input-bg); color: var(--text); }
  .form-control:focus { outline: none; border-color: #1e40af; box-shadow: 0 0 0 2px rgba(30,64,175,0.15); }
  .error-msg { color: #dc2626; font-size: 0.85rem; margin-top: 0.25rem; }
  .alert { padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; display: flex; align-items: flex-start; gap: 0.5rem; }
  .alert-warning { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; }
  .alert-error { background: #fee2e2; border: 1px solid #ef4444; color: #7f1d1d; }
  .alert-info { background: #dbeafe; border: 1px solid #3b82f6; color: #1e3a8a; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
  .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
  .badge-owner { background: #dbeafe; color: #1e40af; }
  .badge-driver { background: #dcfce7; color: #166534; }
  .flex { display: flex; }
  .flex-between { justify-content: space-between; align-items: center; }
  .gap-sm { gap: 0.5rem; }
  .gap-md { gap: 1rem; }
  .mt-1 { margin-top: 0.5rem; }
  .mt-2 { margin-top: 1rem; }
  .mt-3 { margin-top: 1.5rem; }
  .mb-1 { margin-bottom: 0.5rem; }
  .mb-2 { margin-bottom: 1rem; }
  .text-muted { color: var(--text-muted); font-size: 0.9rem; }
  .text-sm { font-size: 0.875rem; }
  .timeline { border-left: 2px solid var(--border); padding-left: 1rem; margin-left: 0.5rem; }
  .timeline-item { position: relative; padding-bottom: 1.25rem; }
  .timeline-item::before { content: ''; position: absolute; left: -1.35rem; top: 0.35rem; width: 0.6rem; height: 0.6rem; background: #1e40af; border-radius: 50%; }
  .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem; }
  .auth-container { max-width: 420px; margin: 3rem auto; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border); }
  th { font-weight: 600; font-size: 0.85rem; color: var(--text-muted); background: var(--th-bg); }
  .divider { border: none; border-top: 1px solid var(--border); margin: 1.25rem 0; }
  .nav-hamburger { display: none; background: none; border: none; color: white; font-size: 1.4rem; cursor: pointer; padding: 0.25rem; }
  @media (max-width: 640px) { 
    .nav-hamburger { display: block; }
    .nav-links { display: none; flex-direction: column; position: absolute; top: 100%; left: 0; right: 0; background: var(--nav-bg); padding: 0.5rem 1rem; z-index: 100; }
    .nav-links.nav-open { display: flex; }
    .navbar { position: relative; flex-wrap: wrap; }
  }
`;
