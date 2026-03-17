# Ralph Learnings

This document accumulates durable learnings across loop iterations.




## Vite Path Alias with vite-plugin-pwa

When using `vite-plugin-pwa` alongside `@remix-run/dev` in Remix v2, the Remix plugin's automatic `~` path alias is NOT picked up by Rollup during the client build, causing:
```
Rollup failed to resolve import "~/components/Foo"
```
**Fix**: Explicitly add `resolve.alias` in `vite.config.ts` using `fileURLToPath`:
```ts
import { fileURLToPath, URL } from "url";
export default defineConfig({
  resolve: { alias: { "~": fileURLToPath(new URL("./app", import.meta.url)) } },
  ...
});
```

## Logout Route: Always Pass the Real Request

In Remix, a route loader that needs to read cookies MUST receive the real `request` object from the loader argument. Creating `new Request("http://localhost/route")` gives you a request without any cookies — session operations will silently fail. Always use `{ request }: LoaderFunctionArgs` and pass the real `request` through.

## Root Loader for Conditional Nav

To show/hide nav links based on auth state, add a `loader` to `root.tsx` that returns `{ isLoggedIn: !!userId }`. Use `useLoaderData<typeof loader>()` in the `App` component. Also, logout should be a `<Form method="post" action="/logout">` button (not an `<a>` tag) so the action handler fires, not the loader.

## Preventing tsc from Emitting JS into Source Directories

In Remix + Vite projects, TypeScript compilation is handled by Vite, NOT by `tsc`. The `tsc` command is only used for type checking (`npm run typecheck`). If `tsconfig.json` lacks `"noEmit": true`, running `tsc` will emit `.js` files next to every `.ts`/`.tsx` source file. These `.js` duplicates then cause Remix Route ID Collision warnings because Remix route discovery picks up both `.tsx` and `.js` versions.

**Fix**: Always add `"noEmit": true` to `tsconfig.json` in Remix+Vite projects.

## Removing Build Artifacts from Git Tracking

If `build/` or other artifacts were committed before a `.gitignore` was created, they remain tracked by git even after adding them to `.gitignore`. To stop tracking them:
```bash
git rm -r --cached build/
git commit -m "chore: stop tracking build artifacts"
```

## Auto-Updating Car Mileage from Maintenance Records

When a user logs a maintenance record with a mileage higher than the car's recorded `currentMileage`, the car's mileage should be automatically updated. This keeps the maintenance due calculations accurate. Use a Prisma transaction with `updateMany` and a `lt` filter to atomically create the record and conditionally update the car:
```ts
db.$transaction(async (tx) => {
  const record = await tx.maintenanceRecord.create({ data });
  await tx.car.updateMany({
    where: { id: data.carId, currentMileage: { lt: data.mileage } },
    data: { currentMileage: data.mileage },
  });
  return record;
});
```

## PWA Service Worker Registration in Remix

`vite-plugin-pwa` generates a `registerSW.js` file in the client build, but in a Remix SSR app, this file is NOT auto-injected into the HTML (Remix controls the HTML via `root.tsx`). You must explicitly add it:
```tsx
// In root.tsx, inside <body> after <Scripts />
<script src="/registerSW.js" />
```
Without this, the service worker is never registered and the app is not truly a PWA.

## Preserving redirectTo Through Login Flow

When `requireUserId` throws a redirect to `/login`, the original URL is lost unless you encode it as a query param. Pattern:
```ts
// session.server.ts
const url = new URL(request.url);
throw redirect(`/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
// login.tsx loader
const redirectTo = new URL(request.url).searchParams.get("redirectTo") ?? "/";
return json({ redirectTo });
// login.tsx form
<input type="hidden" name="redirectTo" value={redirectTo} />
```

## Uncontrolled Forms and Remix Re-renders

Remix re-runs loaders after actions and provides fresh data, but `defaultValue` on uncontrolled `<input>` elements does NOT cause the DOM input to update. The input retains its user-typed value. Fix: add a `key` prop to the `<Form>` that changes when the underlying data changes — this forces React to unmount/remount the form with fresh `defaultValue` applied.

## Preventing Prisma Unique Constraint Errors with Friendly Messages

When a Prisma model has a `@@unique` constraint (e.g. `[carId, userId]` on CarMember), attempting to create a duplicate row throws a raw P2002 error. Always check for existence first and throw a user-friendly error instead:
```ts
const existing = await db.carMember.findFirst({ where: { carId, userId: targetUser.id } });
if (existing) throw new Error("That user is already a member of this car");
```

## entry.server.tsx and Streaming SSR

Remix uses a default `handleRequest` if no `entry.server.tsx` exists. Adding one with `renderToPipeableStream` enables proper streaming HTML responses, better error boundaries, and a configurable abort timeout. The 5-second `ABORT_DELAY` ensures stuck renders don't block indefinitely.

## URL-Persisted Filter State with useSearchParams

When a filter (e.g., maintenance type) uses `useState`, it resets on navigation and cannot be bookmarked. Use `useSearchParams` from `@remix-run/react` instead:
```ts
const [searchParams, setSearchParams] = useSearchParams();
const filterType = searchParams.get("type") ?? "";
// On change:
setSearchParams(e.target.value ? { type: e.target.value } : {}, { replace: true });
```
Using `replace: true` prevents each filter change from adding a new browser history entry.

## Centralised Formatting Utilities

Avoid scattering `type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())` inline across multiple files. Put shared helpers in `app/utils/format.ts` and import everywhere. This also makes it easy to catch subtle inconsistencies (e.g., the AlertBanner in car detail was only doing the first replace — missing capitalisation).

## GeolocationPositionError.code Values

When handling `navigator.geolocation.getCurrentPosition` errors, use the numeric `error.code` to distinguish cases:
- `1` = PERMISSION_DENIED
- `2` = POSITION_UNAVAILABLE
- `3` = TIMEOUT
This lets you show targeted messages ("Enable location to find nearby service stations") instead of a generic fallback.
## CSV Download Routes in Remix

Remix loaders can return a raw `Response` with `Content-Type: text/csv` and `Content-Disposition: attachment; filename="..."` to trigger a CSV download. No React component is needed — the loader is the entire route module. The route file just exports a `loader` function. Vite will warn about "Generated an empty chunk" for these server-only routes — this is expected and harmless.

## Service Interval Progress Bars

For maintenance due UI, compute `overallPercent = Math.max(mileagePercent, timePercent)` capped at 100. Color the progress bar green (<80%), amber (80-99%), or red (>=100%). Always `Math.min(100, percent)` the bar width so it doesn't overflow the container. Store interval status as a derived loader value — never in client state — so it always reflects the latest mileage.

## Quick Mileage Update Pattern

To allow inline mileage updates without navigating to edit page, add a small `<Form method="post">` inside the car detail card with `intent=updateMileage`. Handle it in the route `action` function. Using `redirect(\`/cars/${carId}\`)` after success ensures the page re-renders with fresh data including recalculated interval progress.

## Removing Aggressive "No Record Found" Due Alerts

The original due logic marked ALL maintenance types as due for any car that had at least ONE service record but was missing a specific type. This caused e.g. a car with only one oil change to show 10 "no record found" alerts. The spec pseudocode (`if lastRecord.mileage + interval < currentMileage`) implies no alert when there's no lastRecord. Fix: simply `continue` when `!lastRecord` instead of pushing a "No record found" item.

## getMaintenanceApproaching for Proactive UX

Rather than only alerting when maintenance is 100% due, a separate `getMaintenanceApproaching` function filters service interval status to items at 60-99% of their interval. This gives users a heads-up before items become due. The function reuses `getServiceIntervalStatus` logic to avoid duplicating the Prisma queries.

## Pre-filling Form Selects from URL Params in Remix

To pre-fill a `<select>` from a URL query param, read it in the loader:
```ts
const defaultType = new URL(request.url).searchParams.get("type") ?? "";
return json({ ..., defaultType });
```
Then in the component, use `defaultValue={defaultType}` on the uncontrolled `<select>`. React will select the matching option on initial render. This enables "Log Service" links like `/cars/:id/maintenance/new?type=oil_change` to pre-fill the dropdown.

## Client-side Pagination with useEffect Reset

For client-side pagination with filter/sort, use `useState` for `currentPage` and a `useEffect` to reset to page 1 when any filter or sort parameter changes:
```ts
useEffect(() => { setCurrentPage(1); }, [filterType, sortField, sortDir]);
```
Slice the sorted array: `sortedRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)`. This avoids the complexity of server-side pagination for small-to-medium datasets.

## NearbyServicesAlert Inline Div vs AlertBanner for Expandable Lists

When a banner needs interactive content (like an expandable list of services), it's better to use an inline `<div className="alert alert-warning">` directly rather than the `AlertBanner` component. The `AlertBanner` component renders a flat message string, which prevents adding buttons, lists, or other interactive elements inside the banner.
## Batch Prisma Queries Instead of N+1 Loops

When loading stats for a list of cars (record counts, last dates), avoid per-car DB calls in Promise.all loops. Instead:
1. Extract all carIds first: `const carIds = cars.map(c => c.id)`
2. Use a single `findMany` with `where: { carId: { in: carIds } }` ordered by date desc — first occurrence per carId is the most recent
3. Use `groupBy(['carId'])` with `_count: { id: true }` for per-car counts
4. Build Maps for O(1) lookup per car

This reduces N×2 queries to 2 batch queries regardless of fleet size.

## Client-side Mileage Validation with onSubmit

To warn users when entered mileage is significantly lower than car's current mileage (data entry error), add an `onSubmit` handler to the Remix Form:
```tsx
<Form method="post" onSubmit={(e) => {
  const mileageInput = e.currentTarget.elements.namedItem("mileage") as HTMLInputElement;
  const entered = parseInt(mileageInput.value);
  if (!isNaN(entered) && entered < car.currentMileage - 1000) {
    if (!window.confirm(`Mileage (${entered.toLocaleString()}) is lower than current (${car.currentMileage.toLocaleString()}). Continue?`)) {
      e.preventDefault();
    }
  }
}}>
```
This is non-blocking — user can still save historical records by confirming.

## Account Deletion with Cascade Cleanup

When deleting a user account, Prisma's cascade on CarMember will only remove the membership row, not the car itself. Cars owned solely by the deleted user become orphaned. Fix: before deleting the user, find all cars where they are the ONLY owner and delete those cars first using a loop with `db.carMember.count({ where: { carId, role: 'owner', NOT: { userId } } })`.

## Duplicate Prisma Constraint Error Handling

To give a friendly error on P2002 (unique constraint violation), wrap the create call in try/catch and check the error code:
```ts
import { Prisma } from "@prisma/client";
try {
  await db.maintenanceType.create({ data });
} catch (e) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return json({ error: 'That name already exists' }, { status: 409 });
  }
  throw e; // re-throw unexpected errors
}
```
## Batch Prisma Queries for Maintenance Due Calculations

The `getMaintenanceDue(carId, mileage)` function does 2 DB queries per car. When the dashboard loads for a user with N cars, this creates 2N queries just for due-maintenance checks (plus another 2N for approaching). Fix: add `getBatchMaintenanceDue(cars)` that loads all types once and all records for all carIds in one query, then computes results in-memory per car. Reduces from 2N queries to 2 queries. Apply the same pattern to `getBatchMaintenanceApproaching`. Both use a `Map<carId, results[]>` return type for O(1) lookup per car.

## Persisting UI State in localStorage for PWA

When a user dismisses a PWA install prompt, the dismissal should survive page reloads. Use `localStorage.setItem(KEY, "1")` on dismiss and read it back in a `useEffect` on mount. Initialize the `dismissed` state to `true` (not `false`) to avoid a flash of the prompt on first render before localStorage is read. Only set it to `false` after confirming the key is absent.

## Global History Routes in Remix

A global `/maintenance` route that shows all records across all user cars is valuable for fleet management. Load with `db.maintenanceRecord.findMany({ where: { carId: { in: carIds } }, include: { car: { select: ... } } })`. Client-side filter/sort works well for typical fleet sizes (< 1000 records). For larger datasets, consider server-side pagination via URL searchParams.

## Auto-Sanitizing User Input for Technical Field Names

When a field (like maintenance type name) is used as a technical identifier (stored as `oil_change`, used in URL params), auto-sanitize on the server: `rawName.toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]/g, "")`. This lets users type "Oil Change" naturally while storing the canonical form. Always validate the sanitized result is non-empty.
## Print Routes as Standalone HTML Documents

When creating a print-friendly route in Remix, return a full `<html>` document from the component (not an Outlet-rendered page). This bypasses the root.tsx layout entirely. Use `@media print { .no-print { display: none } }` CSS to hide the print/back buttons when the user actually prints. Opening the route with `target="_blank"` gives the user a clean print preview tab.

## Server-Side Filtering/Pagination vs Client-Side

For global history pages with potentially large datasets, server-side Prisma filtering is better than client-side useMemo. Build the Prisma `where` clause dynamically from URL search params. Use `db.maintenanceRecord.count({ where })` for totals, then `findMany({ where, skip, take })` for the current page. This scales to thousands of records without sending them all to the browser.

## Root Loader Due Count Badge Pattern

To show a notification badge in the navbar, add the due-count computation directly in the root loader (inline Prisma queries, not imported from server modules). Wrap in try/catch so a DB error never breaks navigation. Initialize `dueCount = 0` and increment it per due type across all cars. Pass it to the NavBar component as a prop and render conditionally with a red pill badge.

## Analytics Pages with Pure CSS Bar Charts

For simple analytics visualizations, avoid external charting libraries. Use `<div>` elements with `width: X%` and `background: color` to render horizontal bars. Calculate `width = (value / maxValue) * 100`. For vertical bars, use `height` instead and a flex column-reverse container. This works offline (no CDN), renders SSR, and prints cleanly.
