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