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
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getUserId } from "~/session.server";
import OfflineIndicator from "~/components/OfflineIndicator";

export const links: LinksFunction = () => [
  { rel: "manifest", href: "/manifest.webmanifest" },
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  return json({ isLoggedIn: !!userId });
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

function NavBar({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <nav className="navbar">
      <a href="/" className="nav-brand">🚗 Car Work Tracker</a>
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
            <a href="/cars" onClick={() => setMenuOpen(false)}>My Cars</a>
            <a href="/settings" onClick={() => setMenuOpen(false)}>Settings</a>
            <a href="/profile" onClick={() => setMenuOpen(false)}>Profile</a>
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
            <a href="/login" onClick={() => setMenuOpen(false)}>Sign In</a>
            <a href="/signup" onClick={() => setMenuOpen(false)}>Sign Up</a>
          </>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  const { isLoggedIn } = useLoaderData<typeof loader>();

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
        <NavBar isLoggedIn={isLoggedIn} />
        <main className="container">
          <Outlet />
        </main>
        <OfflineIndicator />
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
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.5; }
  .container { max-width: 1000px; margin: 0 auto; padding: 1.5rem 1rem; }
  .navbar { background: #1e40af; color: white; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; }
  .nav-brand { color: white; text-decoration: none; font-size: 1.1rem; font-weight: 700; }
  .nav-links { display: flex; gap: 1rem; align-items: center; }
  .nav-links a { color: white; text-decoration: none; opacity: 0.9; }
  .nav-links a:hover { opacity: 1; text-decoration: underline; }
  h1 { font-size: 1.8rem; font-weight: 700; margin-bottom: 1rem; color: #1e293b; }
  h2 { font-size: 1.4rem; font-weight: 600; margin-bottom: 0.75rem; color: #334155; }
  h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
  a { color: #1e40af; }
  .btn { display: inline-block; padding: 0.5rem 1rem; border-radius: 6px; border: none; cursor: pointer; font-size: 0.9rem; font-weight: 500; text-decoration: none; transition: background 0.2s; }
  .btn-primary { background: #1e40af; color: white; }
  .btn-primary:hover { background: #1d3a9e; color: white; }
  .btn-secondary { background: #e2e8f0; color: #1e293b; }
  .btn-secondary:hover { background: #cbd5e1; }
  .btn-danger { background: #dc2626; color: white; }
  .btn-danger:hover { background: #b91c1c; color: white; }
  .btn-sm { padding: 0.25rem 0.6rem; font-size: 0.8rem; }
  .card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.25rem; margin-bottom: 1rem; }
  .form-group { margin-bottom: 1rem; }
  .form-group label { display: block; font-weight: 500; margin-bottom: 0.35rem; font-size: 0.9rem; }
  .form-control { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem; background: white; }
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
  .text-muted { color: #64748b; font-size: 0.9rem; }
  .text-sm { font-size: 0.875rem; }
  .timeline { border-left: 2px solid #e2e8f0; padding-left: 1rem; margin-left: 0.5rem; }
  .timeline-item { position: relative; padding-bottom: 1.25rem; }
  .timeline-item::before { content: ''; position: absolute; left: -1.35rem; top: 0.35rem; width: 0.6rem; height: 0.6rem; background: #1e40af; border-radius: 50%; }
  .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem; }
  .auth-container { max-width: 420px; margin: 3rem auto; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid #e2e8f0; }
  th { font-weight: 600; font-size: 0.85rem; color: #64748b; background: #f8fafc; }
  .divider { border: none; border-top: 1px solid #e2e8f0; margin: 1.25rem 0; }
  .nav-hamburger { display: none; background: none; border: none; color: white; font-size: 1.4rem; cursor: pointer; padding: 0.25rem; }
  @media (max-width: 640px) { 
    .nav-hamburger { display: block; }
    .nav-links { display: none; flex-direction: column; position: absolute; top: 100%; left: 0; right: 0; background: #1e40af; padding: 0.5rem 1rem; z-index: 100; }
    .nav-links.nav-open { display: flex; }
    .navbar { position: relative; flex-wrap: wrap; }
  }
`;
