import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable, createCookieSessionStorage, redirect, json } from "@remix-run/node";
import { RemixServer, useLoaderData, Meta, Links, Form, Outlet, ScrollRestoration, Scripts, useRouteError, isRouteErrorResponse, useActionData, Link } from "@remix-run/react";
import * as isbotModule from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { PrismaClient } from "@prisma/client";
import { useState, useEffect } from "react";
import bcrypt from "bcryptjs";
const ABORT_DELAY = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, remixContext, loadContext) {
  let prohibitOutOfOrderStreaming = isBotRequest(request.headers.get("user-agent")) || remixContext.isSpaMode;
  return prohibitOutOfOrderStreaming ? handleBotRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  ) : handleBrowserRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  );
}
function isBotRequest(userAgent) {
  if (!userAgent) {
    return false;
  }
  if ("isbot" in isbotModule && typeof isbotModule.isbot === "function") {
    return isbotModule.isbot(userAgent);
  }
  if ("default" in isbotModule && typeof isbotModule.default === "function") {
    return isbotModule.default(userAgent);
  }
  return false;
}
function handleBotRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        }
      ),
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
function handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        }
      ),
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
const sessionSecret = process.env.SESSION_SECRET || "default-secret-change-me";
const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [sessionSecret],
    secure: process.env.NODE_ENV === "production"
  }
});
async function getSession(request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}
async function getUserId(request) {
  const session = await getSession(request);
  const userId = session.get("userId");
  return userId ?? null;
}
async function requireUserId(request) {
  const userId = await getUserId(request);
  if (!userId) throw redirect("/login");
  return userId;
}
async function createUserSession(userId, redirectTo) {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session)
    }
  });
}
async function destroyUserSession(request) {
  const session = await getSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session)
    }
  });
}
const links = () => [
  { rel: "manifest", href: "/manifest.webmanifest" }
];
async function loader$e({ request }) {
  const userId = await getUserId(request);
  return json({ isLoggedIn: !!userId });
}
function meta() {
  return [
    { title: "Car Work Tracker" },
    { name: "description", content: "Track your car maintenance" },
    { name: "theme-color", content: "#1e40af" },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    { name: "apple-mobile-web-app-title", content: "Car Work Tracker" }
  ];
}
function App() {
  const { isLoggedIn } = useLoaderData();
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {}),
      /* @__PURE__ */ jsx("style", { children: globalStyles })
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsxs("nav", { className: "navbar", children: [
        /* @__PURE__ */ jsx("a", { href: "/", className: "nav-brand", children: "🚗 Car Work Tracker" }),
        /* @__PURE__ */ jsx("div", { className: "nav-links", children: isLoggedIn ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("a", { href: "/cars", children: "My Cars" }),
          /* @__PURE__ */ jsx(Form, { method: "post", action: "/logout", style: { display: "inline" }, children: /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              style: {
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "white",
                opacity: 0.9,
                fontSize: "inherit",
                fontFamily: "inherit",
                padding: 0
              },
              onMouseOver: (e) => e.target.style.opacity = "1",
              onMouseOut: (e) => e.target.style.opacity = "0.9",
              children: "Logout"
            }
          ) })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("a", { href: "/login", children: "Sign In" }),
          /* @__PURE__ */ jsx("a", { href: "/signup", children: "Sign Up" })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx("main", { className: "container", children: /* @__PURE__ */ jsx(Outlet, {}) }),
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
function ErrorBoundary() {
  const error = useRouteError();
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      /* @__PURE__ */ jsx("title", { children: "Error" }),
      /* @__PURE__ */ jsx("style", { children: globalStyles })
    ] }),
    /* @__PURE__ */ jsx("body", { children: /* @__PURE__ */ jsxs("div", { className: "container", style: { marginTop: "2rem" }, children: [
      /* @__PURE__ */ jsx("h1", { children: "Something went wrong" }),
      isRouteErrorResponse(error) ? /* @__PURE__ */ jsxs("p", { children: [
        error.status,
        " - ",
        error.statusText
      ] }) : error instanceof Error ? /* @__PURE__ */ jsx("p", { children: error.message }) : /* @__PURE__ */ jsx("p", { children: "Unknown error" }),
      /* @__PURE__ */ jsx("a", { href: "/", children: "Go home" })
    ] }) })
  ] });
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
`;
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  default: App,
  links,
  loader: loader$e,
  meta
}, Symbol.toStringTag, { value: "Module" }));
let db;
if (process.env.NODE_ENV === "production") {
  db = new PrismaClient();
} else {
  if (!global.__db__) {
    global.__db__ = new PrismaClient();
  }
  db = global.__db__;
}
async function getCarsForUser(userId) {
  return db.car.findMany({
    where: {
      members: { some: { userId } }
    },
    include: {
      members: { include: { user: true } }
    },
    orderBy: { createdAt: "desc" }
  });
}
async function getCarById(carId, userId) {
  return db.car.findFirst({
    where: {
      id: carId,
      members: { some: { userId } }
    },
    include: {
      members: { include: { user: true } },
      maintenanceRecords: { orderBy: { date: "desc" } }
    }
  });
}
async function createCar(data, userId) {
  return db.car.create({
    data: {
      ...data,
      members: {
        create: { userId, role: "owner" }
      }
    }
  });
}
async function updateCar(carId, data, userId) {
  const membership = await db.carMember.findFirst({
    where: { carId, userId, role: "owner" }
  });
  if (!membership) throw new Error("Not authorized to update this car");
  return db.car.update({ where: { id: carId }, data });
}
async function deleteCar(carId, userId) {
  const membership = await db.carMember.findFirst({
    where: { carId, userId, role: "owner" }
  });
  if (!membership) throw new Error("Not authorized to delete this car");
  return db.car.delete({ where: { id: carId } });
}
async function addCarMember(carId, email, role, requestingUserId) {
  const requester = await db.carMember.findFirst({
    where: { carId, userId: requestingUserId, role: "owner" }
  });
  if (!requester) throw new Error("Only owners can add members");
  const targetUser = await db.user.findUnique({ where: { email } });
  if (!targetUser) throw new Error("No user found with that email");
  return db.carMember.create({
    data: { carId, userId: targetUser.id, role }
  });
}
async function removeCarMember(carId, memberId, requestingUserId) {
  const requester = await db.carMember.findFirst({
    where: { carId, userId: requestingUserId, role: "owner" }
  });
  if (!requester) throw new Error("Only owners can remove members");
  return db.carMember.delete({ where: { id: memberId } });
}
async function getMaintenanceRecord(recordId, carId) {
  return db.maintenanceRecord.findFirst({
    where: { id: recordId, carId }
  });
}
async function createMaintenanceRecord(data) {
  return db.maintenanceRecord.create({ data });
}
async function updateMaintenanceRecord(recordId, data) {
  return db.maintenanceRecord.update({ where: { id: recordId }, data });
}
async function deleteMaintenanceRecord(recordId, carId) {
  return db.maintenanceRecord.deleteMany({
    where: { id: recordId, carId }
  });
}
async function getMaintenanceTypes() {
  return db.maintenanceType.findMany({ orderBy: { name: "asc" } });
}
async function getMaintenanceDue(carId, currentMileage) {
  const types = await db.maintenanceType.findMany();
  const records = await db.maintenanceRecord.findMany({
    where: { carId },
    orderBy: { date: "desc" }
  });
  const due = [];
  for (const mt of types) {
    const lastRecord = records.find((r) => r.type === mt.name);
    const now = /* @__PURE__ */ new Date();
    if (!lastRecord) {
      due.push({ type: mt.name, reason: "No record found" });
      continue;
    }
    if (mt.defaultIntervalMiles && lastRecord) {
      const milesSince = currentMileage - lastRecord.mileage;
      if (milesSince >= mt.defaultIntervalMiles) {
        due.push({
          type: mt.name,
          reason: `${milesSince.toLocaleString()} miles since last service (interval: ${mt.defaultIntervalMiles.toLocaleString()} miles)`,
          lastDate: lastRecord.date,
          lastMileage: lastRecord.mileage
        });
        continue;
      }
    }
    if (mt.defaultIntervalMonths && lastRecord) {
      const monthsSince = (now.getTime() - lastRecord.date.getTime()) / (1e3 * 60 * 60 * 24 * 30);
      if (monthsSince >= mt.defaultIntervalMonths) {
        due.push({
          type: mt.name,
          reason: `${Math.floor(monthsSince)} months since last service (interval: ${mt.defaultIntervalMonths} months)`,
          lastDate: lastRecord.date,
          lastMileage: lastRecord.mileage
        });
        continue;
      }
    }
  }
  return due;
}
async function loader$d({ request, params }) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId, userId);
  if (!car) throw new Response("Not Found", { status: 404 });
  const record = await getMaintenanceRecord(params.recordId, params.carId);
  if (!record) throw new Response("Not Found", { status: 404 });
  return json({ car, record });
}
async function action$9({ request, params }) {
  const userId = await requireUserId(request);
  const carId = params.carId;
  const car = await getCarById(carId, userId);
  if (!car) throw new Response("Not Found", { status: 404 });
  await deleteMaintenanceRecord(params.recordId, carId);
  return redirect(`/cars/${carId}`);
}
function DeleteMaintenance() {
  const { car, record } = useLoaderData();
  const dateStr = new Date(record.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
  const typeLabel = record.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return /* @__PURE__ */ jsx("div", { style: { maxWidth: "500px" }, children: /* @__PURE__ */ jsxs("div", { className: "card", style: { borderLeft: "4px solid #dc2626" }, children: [
    /* @__PURE__ */ jsx("h1", { children: "Delete Maintenance Record" }),
    /* @__PURE__ */ jsxs("p", { className: "mt-2", children: [
      "Are you sure you want to delete the",
      " ",
      /* @__PURE__ */ jsx("strong", { children: typeLabel }),
      " record from ",
      /* @__PURE__ */ jsx("strong", { children: dateStr }),
      " for",
      " ",
      car.year,
      " ",
      car.make,
      " ",
      car.model,
      "?"
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex gap-sm mt-3", children: [
      /* @__PURE__ */ jsx(Form, { method: "post", children: /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-danger", children: "Yes, Delete" }) }),
      /* @__PURE__ */ jsx("a", { href: `/cars/${car.id}`, className: "btn btn-secondary", children: "Cancel" })
    ] })
  ] }) });
}
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$9,
  default: DeleteMaintenance,
  loader: loader$d
}, Symbol.toStringTag, { value: "Module" }));
async function loader$c({ request, params }) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId, userId);
  if (!car) throw new Response("Not Found", { status: 404 });
  const record = await getMaintenanceRecord(params.recordId, params.carId);
  if (!record) throw new Response("Not Found", { status: 404 });
  const maintenanceTypes = await getMaintenanceTypes();
  return json({ car, record, maintenanceTypes });
}
async function action$8({ request, params }) {
  const userId = await requireUserId(request);
  const carId = params.carId;
  const recordId = params.recordId;
  const car = await getCarById(carId, userId);
  if (!car) throw new Response("Not Found", { status: 404 });
  const formData = await request.formData();
  const type = String(formData.get("type") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "").trim();
  const mileage = parseInt(String(formData.get("mileage") ?? "0"));
  const costRaw = String(formData.get("cost") ?? "").trim();
  const vendor = String(formData.get("vendor") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!type || !dateStr || isNaN(mileage)) {
    return json({ error: "Type, date, and mileage are required" }, { status: 400 });
  }
  const date = new Date(dateStr);
  const cost = costRaw ? parseFloat(costRaw) : null;
  await updateMaintenanceRecord(recordId, { type, date, mileage, cost, vendor, description });
  return redirect(`/cars/${carId}`);
}
function EditMaintenance() {
  const { car, record, maintenanceTypes } = useLoaderData();
  const actionData = useActionData();
  const dateValue = new Date(record.date).toISOString().split("T")[0];
  return /* @__PURE__ */ jsxs("div", { style: { maxWidth: "600px" }, children: [
    /* @__PURE__ */ jsxs("div", { className: "page-header", children: [
      /* @__PURE__ */ jsx("h1", { children: "Edit Maintenance Record" }),
      /* @__PURE__ */ jsxs("p", { className: "text-muted", children: [
        car.year,
        " ",
        car.make,
        " ",
        car.model
      ] })
    ] }),
    (actionData == null ? void 0 : actionData.error) && /* @__PURE__ */ jsx("div", { className: "alert alert-error mb-2", children: actionData.error }),
    /* @__PURE__ */ jsx("div", { className: "card", children: /* @__PURE__ */ jsxs(Form, { method: "post", children: [
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "type", children: "Maintenance Type *" }),
        /* @__PURE__ */ jsx("select", { id: "type", name: "type", required: true, defaultValue: record.type, className: "form-control", children: maintenanceTypes.map((mt) => /* @__PURE__ */ jsx("option", { value: mt.name, children: mt.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) }, mt.id)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }, children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "date", children: "Date *" }),
          /* @__PURE__ */ jsx("input", { id: "date", name: "date", type: "date", required: true, defaultValue: dateValue, className: "form-control" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "mileage", children: "Mileage *" }),
          /* @__PURE__ */ jsx("input", { id: "mileage", name: "mileage", type: "number", required: true, min: 0, defaultValue: record.mileage, className: "form-control" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }, children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "cost", children: "Cost ($)" }),
          /* @__PURE__ */ jsx("input", { id: "cost", name: "cost", type: "number", min: 0, step: "0.01", defaultValue: record.cost ?? "", className: "form-control" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "vendor", children: "Vendor" }),
          /* @__PURE__ */ jsx("input", { id: "vendor", name: "vendor", type: "text", defaultValue: record.vendor ?? "", className: "form-control" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "description", children: "Notes" }),
        /* @__PURE__ */ jsx("textarea", { id: "description", name: "description", rows: 3, defaultValue: record.description ?? "", className: "form-control" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-sm", children: [
        /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-primary", children: "Save Changes" }),
        /* @__PURE__ */ jsx("a", { href: `/cars/${car.id}`, className: "btn btn-secondary", children: "Cancel" })
      ] })
    ] }) })
  ] });
}
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$8,
  default: EditMaintenance,
  loader: loader$c
}, Symbol.toStringTag, { value: "Module" }));
async function loader$b({ request, params }) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId, userId);
  if (!car) throw new Response("Not Found", { status: 404 });
  const maintenanceTypes = await getMaintenanceTypes();
  return json({ car, maintenanceTypes });
}
async function action$7({ request, params }) {
  const userId = await requireUserId(request);
  const carId = params.carId;
  const car = await getCarById(carId, userId);
  if (!car) throw new Response("Not Found", { status: 404 });
  const formData = await request.formData();
  const type = String(formData.get("type") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "").trim();
  const mileage = parseInt(String(formData.get("mileage") ?? "0"));
  const costRaw = String(formData.get("cost") ?? "").trim();
  const vendor = String(formData.get("vendor") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!type || !dateStr || isNaN(mileage)) {
    return json({ error: "Type, date, and mileage are required" }, { status: 400 });
  }
  const date = new Date(dateStr);
  const cost = costRaw ? parseFloat(costRaw) : null;
  await createMaintenanceRecord({ carId, type, date, mileage, cost, vendor, description });
  return redirect(`/cars/${carId}`);
}
function NewMaintenance() {
  const { car, maintenanceTypes } = useLoaderData();
  const actionData = useActionData();
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  return /* @__PURE__ */ jsxs("div", { style: { maxWidth: "600px" }, children: [
    /* @__PURE__ */ jsxs("div", { className: "page-header", children: [
      /* @__PURE__ */ jsx("h1", { children: "Add Maintenance Record" }),
      /* @__PURE__ */ jsxs("p", { className: "text-muted", children: [
        car.year,
        " ",
        car.make,
        " ",
        car.model
      ] })
    ] }),
    (actionData == null ? void 0 : actionData.error) && /* @__PURE__ */ jsx("div", { className: "alert alert-error mb-2", children: actionData.error }),
    /* @__PURE__ */ jsx("div", { className: "card", children: /* @__PURE__ */ jsxs(Form, { method: "post", children: [
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "type", children: "Maintenance Type *" }),
        /* @__PURE__ */ jsxs("select", { id: "type", name: "type", required: true, className: "form-control", children: [
          /* @__PURE__ */ jsx("option", { value: "", children: "Select type..." }),
          maintenanceTypes.map((mt) => /* @__PURE__ */ jsx("option", { value: mt.name, children: mt.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) }, mt.id))
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }, children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "date", children: "Date *" }),
          /* @__PURE__ */ jsx("input", { id: "date", name: "date", type: "date", required: true, defaultValue: today, className: "form-control" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "mileage", children: "Mileage at Service *" }),
          /* @__PURE__ */ jsx("input", { id: "mileage", name: "mileage", type: "number", required: true, min: 0, defaultValue: car.currentMileage, className: "form-control" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }, children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "cost", children: "Cost ($)" }),
          /* @__PURE__ */ jsx("input", { id: "cost", name: "cost", type: "number", min: 0, step: "0.01", className: "form-control" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "vendor", children: "Vendor / Shop" }),
          /* @__PURE__ */ jsx("input", { id: "vendor", name: "vendor", type: "text", className: "form-control" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "description", children: "Notes" }),
        /* @__PURE__ */ jsx("textarea", { id: "description", name: "description", rows: 3, className: "form-control" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-sm", children: [
        /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-primary", children: "Save Record" }),
        /* @__PURE__ */ jsx("a", { href: `/cars/${car.id}`, className: "btn btn-secondary", children: "Cancel" })
      ] })
    ] }) })
  ] });
}
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$7,
  default: NewMaintenance,
  loader: loader$b
}, Symbol.toStringTag, { value: "Module" }));
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
async function loader$a({ request }) {
  const url = new URL(request.url);
  const lat = parseFloat(url.searchParams.get("lat") ?? "");
  const lon = parseFloat(url.searchParams.get("lon") ?? "");
  const radius = parseInt(url.searchParams.get("radius") ?? "5000");
  if (isNaN(lat) || isNaN(lon)) {
    return json({ error: "lat and lon are required" }, { status: 400 });
  }
  const overpassQuery = `
    [out:json][timeout:15];
    (
      node["shop"="car_repair"](around:${radius},${lat},${lon});
      way["shop"="car_repair"](around:${radius},${lat},${lon});
      node["amenity"="car_repair"](around:${radius},${lat},${lon});
      way["amenity"="car_repair"](around:${radius},${lat},${lon});
    );
    out center;
  `.trim();
  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(overpassQuery)}`
    });
    if (!response.ok) {
      return json([], { status: 200 });
    }
    const data = await response.json();
    const services = data.elements.map((el) => {
      var _a, _b, _c;
      const elLat = el.lat ?? ((_a = el.center) == null ? void 0 : _a.lat);
      const elLon = el.lon ?? ((_b = el.center) == null ? void 0 : _b.lon);
      if (!elLat || !elLon) return null;
      const distance = haversineDistance(lat, lon, elLat, elLon);
      return {
        name: ((_c = el.tags) == null ? void 0 : _c.name) ?? "Unnamed Service",
        lat: elLat,
        lon: elLon,
        distance: Math.round(distance)
      };
    }).filter(Boolean).sort((a, b) => ((a == null ? void 0 : a.distance) ?? 0) - ((b == null ? void 0 : b.distance) ?? 0));
    return json(services);
  } catch {
    return json([], { status: 200 });
  }
}
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$a
}, Symbol.toStringTag, { value: "Module" }));
async function loader$9({ request, params }) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId, userId);
  if (!car) throw new Response("Not Found", { status: 404 });
  const isOwner = car.members.some((m) => m.userId === userId && m.role === "owner");
  return json({ car, isOwner, currentUserId: userId });
}
async function action$6({ request, params }) {
  const userId = await requireUserId(request);
  const carId = params.carId;
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  if (intent === "add") {
    const email = String(formData.get("email") ?? "").trim();
    const role = String(formData.get("role") ?? "driver");
    if (!email) return json({ error: "Email is required" }, { status: 400 });
    try {
      await addCarMember(carId, email, role, userId);
      return redirect(`/cars/${carId}/members`);
    } catch (e) {
      return json({ error: e.message }, { status: 400 });
    }
  }
  if (intent === "remove") {
    const memberId = String(formData.get("memberId") ?? "");
    try {
      await removeCarMember(carId, memberId, userId);
      return redirect(`/cars/${carId}/members`);
    } catch (e) {
      return json({ error: e.message }, { status: 400 });
    }
  }
  return json({ error: "Unknown action" }, { status: 400 });
}
function CarMembers() {
  const { car, isOwner, currentUserId } = useLoaderData();
  const actionData = useActionData();
  return /* @__PURE__ */ jsxs("div", { style: { maxWidth: "700px" }, children: [
    /* @__PURE__ */ jsxs("div", { className: "page-header", children: [
      /* @__PURE__ */ jsxs("h1", { children: [
        "Members — ",
        car.year,
        " ",
        car.make,
        " ",
        car.model
      ] }),
      /* @__PURE__ */ jsx("a", { href: `/cars/${car.id}`, className: "btn btn-secondary", children: "← Back" })
    ] }),
    (actionData == null ? void 0 : actionData.error) && /* @__PURE__ */ jsx("div", { className: "alert alert-error mb-2", children: actionData.error }),
    /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsx("h2", { children: "Current Members" }),
      /* @__PURE__ */ jsxs("table", { children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { children: "Name" }),
          /* @__PURE__ */ jsx("th", { children: "Email" }),
          /* @__PURE__ */ jsx("th", { children: "Role" }),
          isOwner && /* @__PURE__ */ jsx("th", { children: "Actions" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: car.members.map((m) => /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { children: m.user.name ?? "—" }),
          /* @__PURE__ */ jsx("td", { children: m.user.email }),
          /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("span", { className: `badge badge-${m.role}`, children: m.role }) }),
          isOwner && /* @__PURE__ */ jsx("td", { children: m.userId !== currentUserId && /* @__PURE__ */ jsxs(Form, { method: "post", style: { display: "inline" }, children: [
            /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "remove" }),
            /* @__PURE__ */ jsx("input", { type: "hidden", name: "memberId", value: m.id }),
            /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-danger btn-sm", children: "Remove" })
          ] }) })
        ] }, m.id)) })
      ] })
    ] }),
    isOwner && /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsx("h2", { children: "Add Member" }),
      /* @__PURE__ */ jsxs(Form, { method: "post", children: [
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "add" }),
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: "0.75rem", alignItems: "end" }, children: [
          /* @__PURE__ */ jsxs("div", { className: "form-group", style: { margin: 0 }, children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "email", children: "User Email" }),
            /* @__PURE__ */ jsx("input", { id: "email", name: "email", type: "email", required: true, className: "form-control", placeholder: "user@example.com" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "form-group", style: { margin: 0 }, children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "role", children: "Role" }),
            /* @__PURE__ */ jsxs("select", { id: "role", name: "role", className: "form-control", children: [
              /* @__PURE__ */ jsx("option", { value: "driver", children: "Driver" }),
              /* @__PURE__ */ jsx("option", { value: "owner", children: "Owner" })
            ] })
          ] }),
          /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-primary", children: "Add" })
        ] })
      ] })
    ] })
  ] });
}
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$6,
  default: CarMembers,
  loader: loader$9
}, Symbol.toStringTag, { value: "Module" }));
async function loader$8({ request, params }) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId, userId);
  if (!car) throw new Response("Not Found", { status: 404 });
  const isOwner = car.members.some((m) => m.userId === userId && m.role === "owner");
  if (!isOwner) throw new Response("Forbidden", { status: 403 });
  return json({ car });
}
async function action$5({ request, params }) {
  const userId = await requireUserId(request);
  try {
    await deleteCar(params.carId, userId);
    return redirect("/cars");
  } catch (e) {
    return json({ error: e.message }, { status: 403 });
  }
}
function DeleteCar() {
  const { car } = useLoaderData();
  return /* @__PURE__ */ jsx("div", { style: { maxWidth: "500px" }, children: /* @__PURE__ */ jsxs("div", { className: "card", style: { borderLeft: "4px solid #dc2626" }, children: [
    /* @__PURE__ */ jsx("h1", { children: "Delete Car" }),
    /* @__PURE__ */ jsxs("p", { className: "mt-2", children: [
      "Are you sure you want to delete",
      " ",
      /* @__PURE__ */ jsxs("strong", { children: [
        car.year,
        " ",
        car.make,
        " ",
        car.model
      ] }),
      "? This will permanently delete all maintenance records as well."
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex gap-sm mt-3", children: [
      /* @__PURE__ */ jsx(Form, { method: "post", children: /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-danger", children: "Yes, Delete" }) }),
      /* @__PURE__ */ jsx("a", { href: `/cars/${car.id}`, className: "btn btn-secondary", children: "Cancel" })
    ] })
  ] }) });
}
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$5,
  default: DeleteCar,
  loader: loader$8
}, Symbol.toStringTag, { value: "Module" }));
async function loader$7({ request, params }) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId, userId);
  if (!car) throw new Response("Not Found", { status: 404 });
  return json({ car });
}
async function action$4({ request, params }) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const carId = params.carId;
  const make = String(formData.get("make") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const year = parseInt(String(formData.get("year") ?? "0"));
  const currentMileage = parseInt(String(formData.get("currentMileage") ?? "0"));
  const purchaseCostRaw = String(formData.get("purchaseCost") ?? "").trim();
  const vendor = String(formData.get("vendor") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!make || !model || !year || isNaN(currentMileage)) {
    return json({ error: "Make, model, year, and mileage are required" }, { status: 400 });
  }
  const purchaseCost = purchaseCostRaw ? parseFloat(purchaseCostRaw) : null;
  try {
    await updateCar(carId, { make, model, year, currentMileage, purchaseCost, vendor, description }, userId);
    return redirect(`/cars/${carId}`);
  } catch (e) {
    return json({ error: e.message }, { status: 403 });
  }
}
function EditCar() {
  const { car } = useLoaderData();
  const actionData = useActionData();
  return /* @__PURE__ */ jsxs("div", { style: { maxWidth: "600px" }, children: [
    /* @__PURE__ */ jsx("div", { className: "page-header", children: /* @__PURE__ */ jsx("h1", { children: "Edit Car" }) }),
    (actionData == null ? void 0 : actionData.error) && /* @__PURE__ */ jsx("div", { className: "alert alert-error mb-2", children: actionData.error }),
    /* @__PURE__ */ jsx("div", { className: "card", children: /* @__PURE__ */ jsxs(Form, { method: "post", children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }, children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "make", children: "Make *" }),
          /* @__PURE__ */ jsx("input", { id: "make", name: "make", type: "text", required: true, defaultValue: car.make, className: "form-control" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "model", children: "Model *" }),
          /* @__PURE__ */ jsx("input", { id: "model", name: "model", type: "text", required: true, defaultValue: car.model, className: "form-control" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }, children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "year", children: "Year *" }),
          /* @__PURE__ */ jsx("input", { id: "year", name: "year", type: "number", required: true, min: 1900, max: 2100, defaultValue: car.year, className: "form-control" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "currentMileage", children: "Current Mileage *" }),
          /* @__PURE__ */ jsx("input", { id: "currentMileage", name: "currentMileage", type: "number", required: true, min: 0, defaultValue: car.currentMileage, className: "form-control" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }, children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "purchaseCost", children: "Purchase Cost ($)" }),
          /* @__PURE__ */ jsx("input", { id: "purchaseCost", name: "purchaseCost", type: "number", min: 0, step: "0.01", defaultValue: car.purchaseCost ?? "", className: "form-control" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "vendor", children: "Vendor" }),
          /* @__PURE__ */ jsx("input", { id: "vendor", name: "vendor", type: "text", defaultValue: car.vendor ?? "", className: "form-control" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "description", children: "Description" }),
        /* @__PURE__ */ jsx("textarea", { id: "description", name: "description", rows: 3, defaultValue: car.description ?? "", className: "form-control" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-sm", children: [
        /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-primary", children: "Save Changes" }),
        /* @__PURE__ */ jsx("a", { href: `/cars/${car.id}`, className: "btn btn-secondary", children: "Cancel" })
      ] })
    ] }) })
  ] });
}
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4,
  default: EditCar,
  loader: loader$7
}, Symbol.toStringTag, { value: "Module" }));
function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
function formatType(type) {
  return type.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function MaintenanceList({ records, carId }) {
  if (records.length === 0) {
    return /* @__PURE__ */ jsxs("div", { className: "text-muted", style: { padding: "1rem 0" }, children: [
      "No maintenance records yet.",
      " ",
      /* @__PURE__ */ jsx(Link, { to: `/cars/${carId}/maintenance/new`, children: "Add the first one." })
    ] });
  }
  return /* @__PURE__ */ jsx("div", { className: "timeline", children: records.map((record) => /* @__PURE__ */ jsxs("div", { className: "timeline-item", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("strong", { children: formatType(record.type) }),
        /* @__PURE__ */ jsx("span", { className: "text-muted text-sm", style: { marginLeft: "0.5rem" }, children: formatDate(record.date) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-sm", children: [
        /* @__PURE__ */ jsx(
          Link,
          {
            to: `/cars/${carId}/maintenance/${record.id}/edit`,
            className: "btn btn-secondary btn-sm",
            children: "Edit"
          }
        ),
        /* @__PURE__ */ jsx(
          Link,
          {
            to: `/cars/${carId}/maintenance/${record.id}/delete`,
            className: "btn btn-danger btn-sm",
            children: "Delete"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "text-sm mt-1", style: { color: "#475569" }, children: [
      record.mileage.toLocaleString(),
      " miles",
      record.cost != null ? ` · $${record.cost.toFixed(2)}` : "",
      record.vendor ? ` · ${record.vendor}` : ""
    ] }),
    record.description && /* @__PURE__ */ jsx("div", { className: "text-sm text-muted mt-1", children: record.description })
  ] }, record.id)) });
}
function AlertBanner({
  message,
  severity = "warning",
  onDismiss
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const icons = { warning: "⚠️", error: "🚨", info: "ℹ️" };
  return /* @__PURE__ */ jsxs("div", { className: `alert alert-${severity}`, role: "alert", children: [
    /* @__PURE__ */ jsx("span", { children: icons[severity] }),
    /* @__PURE__ */ jsx("span", { style: { flex: 1 }, children: message }),
    onDismiss && /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => {
          setDismissed(true);
          onDismiss();
        },
        style: { background: "none", border: "none", cursor: "pointer", fontSize: "1rem", lineHeight: 1 },
        "aria-label": "Dismiss",
        children: "✕"
      }
    ),
    !onDismiss && /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => setDismissed(true),
        style: { background: "none", border: "none", cursor: "pointer", fontSize: "1rem", lineHeight: 1 },
        "aria-label": "Dismiss",
        children: "✕"
      }
    )
  ] });
}
async function loader$6({ request, params }) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId, userId);
  if (!car) throw new Response("Not Found", { status: 404 });
  const due = await getMaintenanceDue(car.id, car.currentMileage);
  const userMembership = car.members.find((m) => m.userId === userId);
  const isOwner = (userMembership == null ? void 0 : userMembership.role) === "owner";
  return json({ car, due, isOwner });
}
function CarDetail() {
  const { car, due, isOwner } = useLoaderData();
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "page-header", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("h1", { children: [
          car.year,
          " ",
          car.make,
          " ",
          car.model
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-muted", children: [
          car.currentMileage.toLocaleString(),
          " miles",
          car.vendor ? ` · ${car.vendor}` : ""
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-sm", style: { flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsx(Link, { to: `/cars/${car.id}/maintenance/new`, className: "btn btn-primary", children: "+ Add Maintenance" }),
        isOwner && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Link, { to: `/cars/${car.id}/edit`, className: "btn btn-secondary", children: "Edit" }),
          /* @__PURE__ */ jsx(Link, { to: `/cars/${car.id}/members`, className: "btn btn-secondary", children: "Members" }),
          /* @__PURE__ */ jsx(Link, { to: `/cars/${car.id}/delete`, className: "btn btn-danger", children: "Delete" })
        ] })
      ] })
    ] }),
    due.length > 0 && /* @__PURE__ */ jsx(
      AlertBanner,
      {
        severity: "warning",
        message: `Maintenance due: ${due.map((d) => d.type.replace(/_/g, " ")).join(", ")}`
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsx("h2", { children: "Car Details" }),
      /* @__PURE__ */ jsx("table", { children: /* @__PURE__ */ jsxs("tbody", { children: [
        /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { children: "Make" }),
          /* @__PURE__ */ jsx("td", { children: car.make })
        ] }),
        /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { children: "Model" }),
          /* @__PURE__ */ jsx("td", { children: car.model })
        ] }),
        /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { children: "Year" }),
          /* @__PURE__ */ jsx("td", { children: car.year })
        ] }),
        /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { children: "Current Mileage" }),
          /* @__PURE__ */ jsx("td", { children: car.currentMileage.toLocaleString() })
        ] }),
        car.purchaseCost != null && /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { children: "Purchase Cost" }),
          /* @__PURE__ */ jsxs("td", { children: [
            "$",
            car.purchaseCost.toFixed(2)
          ] })
        ] }),
        car.vendor && /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { children: "Vendor" }),
          /* @__PURE__ */ jsx("td", { children: car.vendor })
        ] }),
        car.description && /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { children: "Description" }),
          /* @__PURE__ */ jsx("td", { children: car.description })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-between mb-2", children: [
        /* @__PURE__ */ jsx("h2", { style: { margin: 0 }, children: "Maintenance History" }),
        /* @__PURE__ */ jsx(Link, { to: `/cars/${car.id}/maintenance/new`, className: "btn btn-primary btn-sm", children: "+ Add Record" })
      ] }),
      /* @__PURE__ */ jsx(MaintenanceList, { records: car.maintenanceRecords, carId: car.id })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsx("h2", { children: "Members" }),
      /* @__PURE__ */ jsxs("table", { children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { children: "Name" }),
          /* @__PURE__ */ jsx("th", { children: "Email" }),
          /* @__PURE__ */ jsx("th", { children: "Role" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: car.members.map((m) => /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { children: m.user.name ?? "—" }),
          /* @__PURE__ */ jsx("td", { children: m.user.email }),
          /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("span", { className: `badge badge-${m.role}`, children: m.role }) })
        ] }, m.id)) })
      ] }),
      isOwner && /* @__PURE__ */ jsx("div", { className: "mt-2", children: /* @__PURE__ */ jsx(Link, { to: `/cars/${car.id}/members`, className: "btn btn-secondary btn-sm", children: "Manage Members" }) })
    ] }),
    /* @__PURE__ */ jsx("a", { href: "/cars", className: "btn btn-secondary", children: "← Back to Cars" })
  ] });
}
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: CarDetail,
  loader: loader$6
}, Symbol.toStringTag, { value: "Module" }));
function CarCard({ car, dueCount }) {
  return /* @__PURE__ */ jsxs("div", { className: "card", style: { position: "relative" }, children: [
    dueCount != null && dueCount > 0 && /* @__PURE__ */ jsxs(
      "span",
      {
        style: {
          position: "absolute",
          top: "0.75rem",
          right: "0.75rem",
          background: "#f59e0b",
          color: "white",
          borderRadius: "999px",
          padding: "0.15rem 0.55rem",
          fontSize: "0.75rem",
          fontWeight: 700
        },
        title: `${dueCount} maintenance item(s) due`,
        children: [
          dueCount,
          " due"
        ]
      }
    ),
    /* @__PURE__ */ jsxs("h3", { children: [
      car.year,
      " ",
      car.make,
      " ",
      car.model
    ] }),
    /* @__PURE__ */ jsxs("p", { className: "text-muted text-sm", children: [
      car.currentMileage.toLocaleString(),
      " miles",
      car.vendor ? ` · ${car.vendor}` : ""
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-2", children: /* @__PURE__ */ jsx(Link, { to: `/cars/${car.id}`, className: "btn btn-primary btn-sm", children: "View Details" }) })
  ] });
}
async function loader$5({ request }) {
  const userId = await requireUserId(request);
  const cars = await getCarsForUser(userId);
  const carsWithDue = await Promise.all(
    cars.map(async (car) => {
      const due = await getMaintenanceDue(car.id, car.currentMileage);
      return { car, dueCount: due.length };
    })
  );
  return json({ carsWithDue });
}
function CarsIndex() {
  const { carsWithDue } = useLoaderData();
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "page-header", children: [
      /* @__PURE__ */ jsx("h1", { children: "My Cars" }),
      /* @__PURE__ */ jsx(Link, { to: "/cars/new", className: "btn btn-primary", children: "+ Add Car" })
    ] }),
    carsWithDue.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "card", style: { textAlign: "center", padding: "2rem" }, children: [
      /* @__PURE__ */ jsx("p", { className: "text-muted", children: "No cars yet. Add your first one!" }),
      /* @__PURE__ */ jsx(Link, { to: "/cars/new", className: "btn btn-primary mt-2", children: "Add Car" })
    ] }) : /* @__PURE__ */ jsx("div", { className: "grid", children: carsWithDue.map(({ car, dueCount }) => /* @__PURE__ */ jsx(CarCard, { car, dueCount }, car.id)) })
  ] });
}
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: CarsIndex,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
async function loader$4({ request }) {
  await requireUserId(request);
  return json({});
}
async function action$3({ request }) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const make = String(formData.get("make") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const year = parseInt(String(formData.get("year") ?? "0"));
  const currentMileage = parseInt(String(formData.get("currentMileage") ?? "0"));
  const purchaseCostRaw = String(formData.get("purchaseCost") ?? "").trim();
  const vendor = String(formData.get("vendor") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!make || !model || !year || isNaN(currentMileage)) {
    return json({ error: "Make, model, year, and mileage are required" }, { status: 400 });
  }
  const purchaseCost = purchaseCostRaw ? parseFloat(purchaseCostRaw) : null;
  const car = await createCar(
    { make, model, year, currentMileage, purchaseCost, vendor, description },
    userId
  );
  return redirect(`/cars/${car.id}`);
}
function CarsNew() {
  const actionData = useActionData();
  return /* @__PURE__ */ jsxs("div", { style: { maxWidth: "600px" }, children: [
    /* @__PURE__ */ jsx("div", { className: "page-header", children: /* @__PURE__ */ jsx("h1", { children: "Add New Car" }) }),
    (actionData == null ? void 0 : actionData.error) && /* @__PURE__ */ jsx("div", { className: "alert alert-error mb-2", children: actionData.error }),
    /* @__PURE__ */ jsx("div", { className: "card", children: /* @__PURE__ */ jsxs(Form, { method: "post", children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }, children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "make", children: "Make *" }),
          /* @__PURE__ */ jsx("input", { id: "make", name: "make", type: "text", required: true, className: "form-control", placeholder: "Toyota" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "model", children: "Model *" }),
          /* @__PURE__ */ jsx("input", { id: "model", name: "model", type: "text", required: true, className: "form-control", placeholder: "Camry" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }, children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "year", children: "Year *" }),
          /* @__PURE__ */ jsx("input", { id: "year", name: "year", type: "number", required: true, min: 1900, max: 2100, className: "form-control", placeholder: "2020" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "currentMileage", children: "Current Mileage *" }),
          /* @__PURE__ */ jsx("input", { id: "currentMileage", name: "currentMileage", type: "number", required: true, min: 0, className: "form-control", placeholder: "50000" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }, children: [
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "purchaseCost", children: "Purchase Cost ($)" }),
          /* @__PURE__ */ jsx("input", { id: "purchaseCost", name: "purchaseCost", type: "number", min: 0, step: "0.01", className: "form-control", placeholder: "25000" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "vendor", children: "Vendor / Dealership" }),
          /* @__PURE__ */ jsx("input", { id: "vendor", name: "vendor", type: "text", className: "form-control", placeholder: "ABC Motors" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "description", children: "Description" }),
        /* @__PURE__ */ jsx("textarea", { id: "description", name: "description", rows: 3, className: "form-control", placeholder: "Additional notes..." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-sm", children: [
        /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-primary", children: "Add Car" }),
        /* @__PURE__ */ jsx("a", { href: "/cars", className: "btn btn-secondary", children: "Cancel" })
      ] })
    ] }) })
  ] });
}
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3,
  default: CarsNew,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
async function action$2({ request }) {
  return destroyUserSession(request);
}
async function loader$3({ request }) {
  return destroyUserSession(request);
}
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
async function getUserById(id) {
  return db.user.findUnique({ where: { id } });
}
async function getUserByEmail(email) {
  return db.user.findUnique({ where: { email } });
}
async function createUser(email, password, name) {
  const passwordHash = await bcrypt.hash(password, 10);
  return db.user.create({
    data: { email, passwordHash, name }
  });
}
async function verifyLogin(email, password) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return null;
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;
  return user;
}
async function loader$2({ request }) {
  const userId = await getUserId(request);
  if (userId) return redirect("/");
  return json({});
}
async function action$1({ request }) {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return json({ error: "Email and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  const existing = await getUserByEmail(email);
  if (existing) {
    return json({ error: "An account with that email already exists" }, { status: 409 });
  }
  const user = await createUser(email, password, name || void 0);
  return createUserSession(user.id, "/");
}
function Signup() {
  const actionData = useActionData();
  return /* @__PURE__ */ jsx("div", { className: "auth-container", children: /* @__PURE__ */ jsxs("div", { className: "card", children: [
    /* @__PURE__ */ jsx("h1", { style: { marginBottom: "1.5rem" }, children: "🚗 Create Account" }),
    (actionData == null ? void 0 : actionData.error) && /* @__PURE__ */ jsx("div", { className: "alert alert-error mb-2", children: actionData.error }),
    /* @__PURE__ */ jsxs(Form, { method: "post", children: [
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "name", children: "Name (optional)" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "name",
            name: "name",
            type: "text",
            autoComplete: "name",
            className: "form-control"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "email", children: "Email" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "email",
            name: "email",
            type: "email",
            autoComplete: "email",
            required: true,
            className: "form-control"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "password", children: "Password" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "password",
            name: "password",
            type: "password",
            autoComplete: "new-password",
            required: true,
            minLength: 8,
            className: "form-control"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-primary", style: { width: "100%" }, children: "Create Account" })
    ] }),
    /* @__PURE__ */ jsxs("p", { className: "text-muted text-sm mt-2", style: { textAlign: "center" }, children: [
      "Already have an account? ",
      /* @__PURE__ */ jsx("a", { href: "/login", children: "Sign in" })
    ] })
  ] }) });
}
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  default: Signup,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
function NearbyServicesAlert({
  maintenanceDue
}) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (maintenanceDue.length === 0) return;
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `/api/nearby-services?lat=${latitude}&lon=${longitude}&radius=5000`
          );
          if (res.ok) {
            const data = await res.json();
            setServices(data);
          }
        } catch {
          setError("Could not fetch nearby services");
        } finally {
          setLoading(false);
          setChecked(true);
        }
      },
      () => {
        setLoading(false);
        setChecked(true);
      },
      { timeout: 1e4 }
    );
  }, [maintenanceDue.length]);
  if (!checked || maintenanceDue.length === 0 || services.length === 0) {
    return null;
  }
  const dueTypes = maintenanceDue.map((d) => d.type.replace(/_/g, " ")).join(", ");
  const nearest = services[0];
  return /* @__PURE__ */ jsx(
    AlertBanner,
    {
      severity: "warning",
      message: `Maintenance due (${dueTypes}) — ${services.length} service station(s) nearby. Nearest: "${nearest.name}" (${(nearest.distance / 1e3).toFixed(1)} km away)`
    }
  );
}
function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  if (!deferredPrompt || dismissed) return null;
  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted" || choice.outcome === "dismissed") {
      setDeferredPrompt(null);
      setDismissed(true);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "alert alert-info", style: { justifyContent: "space-between" }, children: [
    /* @__PURE__ */ jsx("span", { children: "📲 Install Car Work Tracker as an app for a better experience!" }),
    /* @__PURE__ */ jsxs("div", { className: "flex gap-sm", children: [
      /* @__PURE__ */ jsx("button", { className: "btn btn-primary btn-sm", onClick: handleInstall, children: "Install" }),
      /* @__PURE__ */ jsx(
        "button",
        {
          className: "btn btn-secondary btn-sm",
          onClick: () => setDismissed(true),
          children: "Not now"
        }
      )
    ] })
  ] });
}
async function loader$1({ request }) {
  const userId = await requireUserId(request);
  const user = await getUserById(userId);
  const cars = await getCarsForUser(userId);
  const carsWithDue = await Promise.all(
    cars.map(async (car) => {
      const due = await getMaintenanceDue(car.id, car.currentMileage);
      return { car, due };
    })
  );
  return json({ user, carsWithDue });
}
function Index() {
  const { user, carsWithDue } = useLoaderData();
  const allDue = carsWithDue.flatMap((c) => c.due);
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx(InstallPrompt, {}),
    /* @__PURE__ */ jsx(NearbyServicesAlert, { maintenanceDue: allDue }),
    /* @__PURE__ */ jsxs("div", { className: "page-header", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("h1", { children: [
          "Welcome back",
          (user == null ? void 0 : user.name) ? `, ${user.name}` : "",
          "!"
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-muted", children: "Here's an overview of your vehicles." })
      ] }),
      /* @__PURE__ */ jsx("a", { href: "/cars/new", className: "btn btn-primary", children: "+ Add Car" })
    ] }),
    carsWithDue.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "card", style: { textAlign: "center", padding: "2rem" }, children: [
      /* @__PURE__ */ jsx("p", { className: "text-muted", children: "You have no cars yet." }),
      /* @__PURE__ */ jsx("a", { href: "/cars/new", className: "btn btn-primary mt-2", children: "Add your first car" })
    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      allDue.length > 0 && /* @__PURE__ */ jsxs("div", { className: "card", style: { borderLeft: "4px solid #f59e0b" }, children: [
        /* @__PURE__ */ jsx("h2", { style: { color: "#92400e" }, children: "⚠️ Maintenance Due" }),
        carsWithDue.filter((c) => c.due.length > 0).map(({ car, due }) => /* @__PURE__ */ jsxs("div", { className: "mt-1", children: [
          /* @__PURE__ */ jsxs("strong", { children: [
            car.year,
            " ",
            car.make,
            " ",
            car.model
          ] }),
          /* @__PURE__ */ jsx("ul", { style: { margin: "0.35rem 0 0.5rem 1.25rem" }, children: due.map((d) => /* @__PURE__ */ jsxs("li", { className: "text-sm", children: [
            /* @__PURE__ */ jsx("strong", { children: d.type.replace(/_/g, " ") }),
            ": ",
            d.reason
          ] }, d.type)) })
        ] }, car.id))
      ] }),
      /* @__PURE__ */ jsx("h2", { children: "Your Cars" }),
      /* @__PURE__ */ jsx("div", { className: "grid", children: carsWithDue.map(({ car, due }) => /* @__PURE__ */ jsx(CarCard, { car, dueCount: due.length }, car.id)) })
    ] })
  ] });
}
const route13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Index,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
async function loader({ request }) {
  const userId = await getUserId(request);
  if (userId) return redirect("/");
  return json({});
}
async function action({ request }) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/");
  if (!email || !password) {
    return json({ error: "Email and password are required" }, { status: 400 });
  }
  const user = await verifyLogin(email, password);
  if (!user) {
    return json({ error: "Invalid email or password" }, { status: 401 });
  }
  return createUserSession(user.id, redirectTo);
}
function Login() {
  const actionData = useActionData();
  return /* @__PURE__ */ jsx("div", { className: "auth-container", children: /* @__PURE__ */ jsxs("div", { className: "card", children: [
    /* @__PURE__ */ jsx("h1", { style: { marginBottom: "1.5rem" }, children: "🚗 Sign In" }),
    (actionData == null ? void 0 : actionData.error) && /* @__PURE__ */ jsx("div", { className: "alert alert-error mb-2", children: actionData.error }),
    /* @__PURE__ */ jsxs(Form, { method: "post", children: [
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "email", children: "Email" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "email",
            name: "email",
            type: "email",
            autoComplete: "email",
            required: true,
            className: "form-control"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "password", children: "Password" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "password",
            name: "password",
            type: "password",
            autoComplete: "current-password",
            required: true,
            className: "form-control"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-primary", style: { width: "100%" }, children: "Sign In" })
    ] }),
    /* @__PURE__ */ jsxs("p", { className: "text-muted text-sm mt-2", style: { textAlign: "center" }, children: [
      "Don't have an account?",
      " ",
      /* @__PURE__ */ jsx("a", { href: "/signup", children: "Sign up" })
    ] })
  ] }) });
}
const route14 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: Login,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-D_ovIOxM.js", "imports": ["/assets/components-ODMOgtvn.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": true, "module": "/assets/root-iRga1Lz3.js", "imports": ["/assets/components-ODMOgtvn.js"], "css": [] }, "routes/cars.$carId.maintenance.$recordId.delete": { "id": "routes/cars.$carId.maintenance.$recordId.delete", "parentId": "routes/cars.$carId", "path": "maintenance/:recordId/delete", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/cars._carId.maintenance._recordId.delete-CdJrBhPC.js", "imports": ["/assets/components-ODMOgtvn.js"], "css": [] }, "routes/cars.$carId.maintenance.$recordId.edit": { "id": "routes/cars.$carId.maintenance.$recordId.edit", "parentId": "routes/cars.$carId", "path": "maintenance/:recordId/edit", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/cars._carId.maintenance._recordId.edit-DMgVdSjv.js", "imports": ["/assets/components-ODMOgtvn.js"], "css": [] }, "routes/cars.$carId.maintenance.new": { "id": "routes/cars.$carId.maintenance.new", "parentId": "routes/cars.$carId", "path": "maintenance/new", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/cars._carId.maintenance.new-DrCWuJ0k.js", "imports": ["/assets/components-ODMOgtvn.js"], "css": [] }, "routes/api.nearby-services": { "id": "routes/api.nearby-services", "parentId": "root", "path": "api/nearby-services", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/api.nearby-services-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/cars.$carId.members": { "id": "routes/cars.$carId.members", "parentId": "routes/cars.$carId", "path": "members", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/cars._carId.members-BShVj6Yr.js", "imports": ["/assets/components-ODMOgtvn.js"], "css": [] }, "routes/cars.$carId.delete": { "id": "routes/cars.$carId.delete", "parentId": "routes/cars.$carId", "path": "delete", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/cars._carId.delete-BBJ91tHC.js", "imports": ["/assets/components-ODMOgtvn.js"], "css": [] }, "routes/cars.$carId.edit": { "id": "routes/cars.$carId.edit", "parentId": "routes/cars.$carId", "path": "edit", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/cars._carId.edit-BAb1VzKr.js", "imports": ["/assets/components-ODMOgtvn.js"], "css": [] }, "routes/cars.$carId": { "id": "routes/cars.$carId", "parentId": "root", "path": "cars/:carId", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/cars._carId-DSwgrurx.js", "imports": ["/assets/components-ODMOgtvn.js", "/assets/AlertBanner-DvS54N10.js"], "css": [] }, "routes/cars._index": { "id": "routes/cars._index", "parentId": "root", "path": "cars", "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/cars._index-CpE1eX74.js", "imports": ["/assets/components-ODMOgtvn.js", "/assets/CarCard-BC6gaB2R.js"], "css": [] }, "routes/cars.new": { "id": "routes/cars.new", "parentId": "root", "path": "cars/new", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/cars.new-v34vBkm5.js", "imports": ["/assets/components-ODMOgtvn.js"], "css": [] }, "routes/logout": { "id": "routes/logout", "parentId": "root", "path": "logout", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/logout-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/signup": { "id": "routes/signup", "parentId": "root", "path": "signup", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/signup-BOZ8_dcR.js", "imports": ["/assets/components-ODMOgtvn.js"], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/_index-BmY8OYkV.js", "imports": ["/assets/components-ODMOgtvn.js", "/assets/CarCard-BC6gaB2R.js", "/assets/AlertBanner-DvS54N10.js"], "css": [] }, "routes/login": { "id": "routes/login", "parentId": "root", "path": "login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/login-CWO9C9FA.js", "imports": ["/assets/components-ODMOgtvn.js"], "css": [] } }, "url": "/assets/manifest-e7f581f7.js", "version": "e7f581f7" };
const mode = "production";
const assetsBuildDirectory = "build\\client";
const basename = "/";
const future = { "v3_fetcherPersist": true, "v3_relativeSplatPath": true, "v3_throwAbortReason": true, "v3_routeConfig": false, "v3_singleFetch": false, "v3_lazyRouteDiscovery": false, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/cars.$carId.maintenance.$recordId.delete": {
    id: "routes/cars.$carId.maintenance.$recordId.delete",
    parentId: "routes/cars.$carId",
    path: "maintenance/:recordId/delete",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/cars.$carId.maintenance.$recordId.edit": {
    id: "routes/cars.$carId.maintenance.$recordId.edit",
    parentId: "routes/cars.$carId",
    path: "maintenance/:recordId/edit",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/cars.$carId.maintenance.new": {
    id: "routes/cars.$carId.maintenance.new",
    parentId: "routes/cars.$carId",
    path: "maintenance/new",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/api.nearby-services": {
    id: "routes/api.nearby-services",
    parentId: "root",
    path: "api/nearby-services",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/cars.$carId.members": {
    id: "routes/cars.$carId.members",
    parentId: "routes/cars.$carId",
    path: "members",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/cars.$carId.delete": {
    id: "routes/cars.$carId.delete",
    parentId: "routes/cars.$carId",
    path: "delete",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/cars.$carId.edit": {
    id: "routes/cars.$carId.edit",
    parentId: "routes/cars.$carId",
    path: "edit",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/cars.$carId": {
    id: "routes/cars.$carId",
    parentId: "root",
    path: "cars/:carId",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/cars._index": {
    id: "routes/cars._index",
    parentId: "root",
    path: "cars",
    index: true,
    caseSensitive: void 0,
    module: route9
  },
  "routes/cars.new": {
    id: "routes/cars.new",
    parentId: "root",
    path: "cars/new",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/logout": {
    id: "routes/logout",
    parentId: "root",
    path: "logout",
    index: void 0,
    caseSensitive: void 0,
    module: route11
  },
  "routes/signup": {
    id: "routes/signup",
    parentId: "root",
    path: "signup",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route13
  },
  "routes/login": {
    id: "routes/login",
    parentId: "root",
    path: "login",
    index: void 0,
    caseSensitive: void 0,
    module: route14
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};
