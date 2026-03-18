import { createCookieSessionStorage, redirect } from "@remix-run/node";

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable must be set in production");
  }
  console.warn("⚠️  SESSION_SECRET not set — using insecure default. Set SESSION_SECRET in .env for security.");
}
const secret = sessionSecret || "default-secret-change-me";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [secret],
    secure: process.env.NODE_ENV === "production",
  },
});

export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function getUserId(request: Request): Promise<string | null> {
  const session = await getSession(request);
  const userId = session.get("userId");
  return userId ?? null;
}

export async function requireUserId(request: Request): Promise<string> {
  const userId = await getUserId(request);
  if (!userId) {
    const url = new URL(request.url);
    const searchParams = new URLSearchParams([["redirectTo", url.pathname + url.search]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export function safeRedirect(to: unknown, defaultRedirect = "/") {
  if (typeof to !== "string") return defaultRedirect;
  // only allow same-origin paths that start with a single "/"
  if (!to.startsWith("/") || to.startsWith("//")) return defaultRedirect;
  // reject obvious percent-encoded slash/backslash attacks (single-encoded)
  if (/%2f|%5c/i.test(String(to))) return defaultRedirect;
  try {
    const decoded = decodeURIComponent(String(to));
    // reject percent-encoded slashes/backslashes revealed after decoding (double-encoding)
    if (/%2f|%5c/i.test(decoded)) return defaultRedirect;
    // reject decoded protocol-relative URLs or values that don't start with a single '/'
    if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("://")) {
      return defaultRedirect;
    }
    return to;
  } catch {
    // malformed percent-encoding
    return defaultRedirect;
  }
}

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);
  const safe = safeRedirect(redirectTo, "/");
  return redirect(safe, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function destroyUserSession(request: Request) {
  const session = await getSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}
