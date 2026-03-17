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