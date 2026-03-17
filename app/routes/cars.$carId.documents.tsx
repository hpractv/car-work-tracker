import { useState } from "react";
import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation, useRouteError, isRouteErrorResponse } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarById, getCarDocuments, addCarDocument, deleteCarDocument, updateCarDocument } from "~/models/car.server";
import { formatDate } from "~/utils/format";

export function meta() {
  return [{ title: "Documents — Car Work Tracker" }];
}

const VALID_TYPES = ["insurance", "registration", "inspection", "warranty", "other"] as const;
type DocType = typeof VALID_TYPES[number];

const TYPE_LABELS: Record<DocType, string> = {
  insurance: "Insurance",
  registration: "Registration",
  inspection: "Inspection",
  warranty: "Warranty",
  other: "Other",
};

const TYPE_BADGE_COLORS: Record<DocType, string> = {
  insurance: "#dbeafe",
  registration: "#dcfce7",
  inspection: "#ffedd5",
  warranty: "#f3e8ff",
  other: "#f3f4f6",
};

const TYPE_BADGE_TEXT_COLORS: Record<DocType, string> = {
  insurance: "#1d4ed8",
  registration: "#15803d",
  inspection: "#c2410c",
  warranty: "#7e22ce",
  other: "#374151",
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId!, userId);
  if (!car) throw new Response("Not Found", { status: 404 });

  const documents = await getCarDocuments(params.carId!);
  const now = new Date();

  const docsWithStatus = documents.map((doc) => {
    let daysUntilExpiry: number | null = null;
    let status: "expired" | "expiring" | "current" | "none" = "none";
    if (doc.expiryDate) {
      const expiry = new Date(doc.expiryDate);
      const msLeft = expiry.getTime() - now.getTime();
      daysUntilExpiry = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry < 0) {
        status = "expired";
      } else if (daysUntilExpiry <= 30) {
        status = "expiring";
      } else {
        status = "current";
      }
    }
    return { ...doc, daysUntilExpiry, status };
  });

  // Sort: expired first, then expiring soon, then current, then no expiry
  const statusOrder = { expired: 0, expiring: 1, current: 2, none: 3 };
  docsWithStatus.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return json({ car, documents: docsWithStatus });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const carId = params.carId!;
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "add") {
    const type = String(formData.get("type") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const expiryDateStr = String(formData.get("expiryDate") ?? "").trim();
    const fileUrl = String(formData.get("fileUrl") ?? "").trim() || null;
    const notes = String(formData.get("notes") ?? "").trim() || null;

    if (!VALID_TYPES.includes(type as DocType)) {
      return json({ error: "Invalid document type" }, { status: 400 });
    }
    if (!title) {
      return json({ error: "Title is required" }, { status: 400 });
    }
    if (title.length > 100) {
      return json({ error: "Title must be 100 characters or fewer" }, { status: 400 });
    }

    let expiryDate: Date | null = null;
    if (expiryDateStr) {
      const d = new Date(expiryDateStr);
      if (isNaN(d.getTime())) {
        return json({ error: "Invalid expiry date" }, { status: 400 });
      }
      expiryDate = d;
    }

    if (fileUrl) {
      try {
        new URL(fileUrl);
      } catch {
        return json({ error: "File URL must be a valid URL" }, { status: 400 });
      }
    }

    try {
      await addCarDocument(carId, { type, title, expiryDate, fileUrl, notes }, userId);
      return redirect(`/cars/${carId}/documents`);
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 403 });
    }
  }

  if (intent === "edit") {
    const docId = String(formData.get("docId") ?? "");
    const type = String(formData.get("type") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const expiryDateStr = String(formData.get("expiryDate") ?? "").trim();
    const fileUrl = String(formData.get("fileUrl") ?? "").trim() || null;
    const notes = String(formData.get("notes") ?? "").trim() || null;

    if (!docId) return json({ error: "Document ID is required" }, { status: 400 });
    if (!VALID_TYPES.includes(type as DocType)) return json({ error: "Invalid document type" }, { status: 400 });
    if (!title) return json({ error: "Title is required" }, { status: 400 });
    if (title.length > 100) return json({ error: "Title must be 100 characters or fewer" }, { status: 400 });

    let expiryDate: Date | null = null;
    if (expiryDateStr) {
      const d = new Date(expiryDateStr);
      if (isNaN(d.getTime())) return json({ error: "Invalid expiry date" }, { status: 400 });
      expiryDate = d;
    }

    if (fileUrl) {
      try { new URL(fileUrl); } catch {
        return json({ error: "File URL must be a valid URL" }, { status: 400 });
      }
    }

    try {
      await updateCarDocument(docId, carId, { type, title, expiryDate, fileUrl, notes }, userId);
      return redirect(`/cars/${carId}/documents`);
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 403 });
    }
  }

  if (intent === "delete") {
    const docId = String(formData.get("docId") ?? "");
    if (!docId) return json({ error: "Document ID is required" }, { status: 400 });
    try {
      await deleteCarDocument(docId, carId, userId);
      return redirect(`/cars/${carId}/documents`);
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 403 });
    }
  }

  return json({ error: "Unknown action" }, { status: 400 });
}

export default function CarDocuments() {
  const { car, documents } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  function getRowStyle(status: string) {
    if (status === "expired") return { backgroundColor: "#fee2e2" };
    if (status === "expiring") return { backgroundColor: "#fef3c7" };
    return {};
  }

  function getExpiryDisplay(doc: (typeof documents)[number]) {
    if (!doc.expiryDate) return <span className="text-muted">—</span>;
    const formatted = formatDate(doc.expiryDate);
    if (doc.status === "expired") {
      return <span style={{ color: "#dc2626", fontWeight: 600 }}>🔴 {formatted} (expired)</span>;
    }
    if (doc.status === "expiring") {
      return <span style={{ color: "#d97706", fontWeight: 600 }}>🟡 {formatted} ({doc.daysUntilExpiry}d left)</span>;
    }
    return <span style={{ color: "#16a34a" }}>🟢 {formatted}</span>;
  }

  function getStatusIcon(status: string) {
    if (status === "expired") return "🔴";
    if (status === "expiring") return "🟡";
    if (status === "current") return "🟢";
    return "";
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Documents — {car.year} {car.make} {car.model}</h1>
        </div>
        <Link to={`/cars/${car.id}`} className="btn btn-secondary">← Back</Link>
      </div>

      {actionData?.error && (
        <div className="alert alert-error mb-2">{actionData.error}</div>
      )}

      {/* Documents table */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2>Current Documents</h2>
        {documents.length === 0 ? (
          <p className="text-muted">No documents added yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Type</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Title</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Expiry Date</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>File</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Notes</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const docType = doc.type as DocType;
                  const isValidType = VALID_TYPES.includes(docType);
                  const badgeBg = isValidType ? TYPE_BADGE_COLORS[docType] : "#f3f4f6";
                  const badgeText = isValidType ? TYPE_BADGE_TEXT_COLORS[docType] : "#374151";
                  const label = isValidType ? TYPE_LABELS[docType] : doc.type;
                  return (
                    <tr key={doc.id} style={{ borderBottom: "1px solid #e5e7eb", ...getRowStyle(doc.status) }}>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: badgeBg,
                            color: badgeText,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {label}
                        </span>
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        {getStatusIcon(doc.status)} {doc.title}
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        {getExpiryDisplay(doc)}
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        {doc.fileUrl ? (
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                            🔗 View
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem", maxWidth: "200px" }}>
                        {doc.notes ? (
                          <span className="text-sm text-muted" style={{ wordBreak: "break-word" }}>{doc.notes}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        <Form method="post" style={{ display: "inline" }} onSubmit={(e) => {
                          if (!window.confirm("Delete this document?")) e.preventDefault();
                        }}>
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="docId" value={doc.id} />
                          <button type="submit" className="btn btn-danger btn-sm" disabled={isSubmitting}>
                            Delete
                          </button>
                        </Form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add document form */}
      <div className="card">
        <h2>Add Document</h2>
        <Form method="post">
          <input type="hidden" name="intent" value="add" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div className="form-group">
              <label htmlFor="type">Type *</label>
              <select id="type" name="type" className="form-control" required>
                {VALID_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                id="title"
                name="title"
                type="text"
                required
                maxLength={100}
                className="form-control"
                placeholder="e.g. State Farm Policy 2025"
              />
            </div>
            <div className="form-group">
              <label htmlFor="expiryDate">Expiry Date</label>
              <input
                id="expiryDate"
                name="expiryDate"
                type="date"
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label htmlFor="fileUrl">File URL</label>
              <input
                id="fileUrl"
                name="fileUrl"
                type="url"
                className="form-control"
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              className="form-control"
              rows={3}
              placeholder="Optional notes about this document"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Document"}
          </button>
        </Form>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <div className="card">
      <h2>Error</h2>
      {isRouteErrorResponse(error) ? (
        <p>{error.status}: {error.data}</p>
      ) : (
        <p>{(error as Error)?.message ?? "An unexpected error occurred."}</p>
      )}
      <Link to="/cars" className="btn btn-secondary">← Back to Cars</Link>
    </div>
  );
}
