import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getCarById } from "~/models/car.server";

const printStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 1.5rem; max-width: 900px; margin: 0 auto; }
  @media print {
    .no-print { display: none !important; }
    body { padding: 0; }
    @page { margin: 1cm; }
  }
`;

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const car = await getCarById(params.carId!, userId);
  if (!car) throw new Response("Not Found", { status: 404 });

  const records = car.maintenanceRecords;
  const totalCost = records.reduce((sum, r) => sum + (r.cost ?? 0), 0);
  const recordsByType = records.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + (r.cost ?? 0);
    return acc;
  }, {} as Record<string, number>);

  return json({ car, records, totalCost, recordsByType });
}

export default function PrintMaintenance() {
  const { car, records, totalCost, recordsByType } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>{car.year} {car.make} {car.model} — Maintenance Report</title>
        <style>{printStyles}</style>
      </head>
      <body>
        <div className="no-print" style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
          <button onClick={() => window.print()} style={{ padding: "0.5rem 1rem", background: "#1e40af", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem" }}>
            🖨️ Print / Save as PDF
          </button>
          <a href={`/cars/${car.id}`} style={{ padding: "0.5rem 1rem", background: "#e2e8f0", color: "#1e293b", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem", textDecoration: "none" }}>
            ← Back to Car
          </a>
        </div>

        <div style={{ borderBottom: "2px solid #1e40af", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.8rem", color: "#1e40af" }}>🚗 Car Work Tracker</h1>
          <h2 style={{ margin: "0.5rem 0 0", fontSize: "1.4rem" }}>Maintenance History Report</h2>
          <p style={{ margin: "0.25rem 0 0", color: "#64748b" }}>Generated: {new Date().toLocaleDateString()}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem", padding: "1rem", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
          <div>
            <h3 style={{ margin: "0 0 0.5rem", color: "#334155" }}>{car.year} {car.make} {car.model}</h3>
            <p style={{ margin: "0.2rem 0", fontSize: "0.9rem" }}><strong>Current Mileage:</strong> {car.currentMileage.toLocaleString()} miles</p>
            {car.vendor && <p style={{ margin: "0.2rem 0", fontSize: "0.9rem" }}><strong>Purchased From:</strong> {car.vendor}</p>}
            {car.purchaseCost && <p style={{ margin: "0.2rem 0", fontSize: "0.9rem" }}><strong>Purchase Price:</strong> ${car.purchaseCost.toFixed(2)}</p>}
          </div>
          <div>
            <p style={{ margin: "0.2rem 0", fontSize: "0.9rem" }}><strong>Total Service Records:</strong> {records.length}</p>
            <p style={{ margin: "0.2rem 0", fontSize: "0.9rem" }}><strong>Total Maintenance Cost:</strong> ${totalCost.toFixed(2)}</p>
            {records.length > 0 && (
              <>
                <p style={{ margin: "0.2rem 0", fontSize: "0.9rem" }}><strong>First Service:</strong> {new Date(records[records.length - 1].date).toLocaleDateString()}</p>
                <p style={{ margin: "0.2rem 0", fontSize: "0.9rem" }}><strong>Latest Service:</strong> {new Date(records[0].date).toLocaleDateString()}</p>
              </>
            )}
          </div>
        </div>

        {records.length === 0 ? (
          <p style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>No maintenance records found.</p>
        ) : (
          <>
            <h3 style={{ color: "#334155", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>Service History</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid #e2e8f0" }}>Date</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid #e2e8f0" }}>Service Type</th>
                  <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", borderBottom: "2px solid #e2e8f0" }}>Mileage</th>
                  <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", borderBottom: "2px solid #e2e8f0" }}>Cost</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid #e2e8f0" }}>Vendor</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid #e2e8f0" }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, i) => (
                  <tr key={record.id} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }}>
                    <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>{new Date(record.date).toLocaleDateString()}</td>
                    <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>{record.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</td>
                    <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>{record.mileage.toLocaleString()}</td>
                    <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>{record.cost != null ? `$${record.cost.toFixed(2)}` : "—"}</td>
                    <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>{record.vendor ?? "—"}</td>
                    <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0", maxWidth: "200px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{record.description ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 600, background: "#f8fafc" }}>
                  <td colSpan={3} style={{ padding: "0.5rem 0.75rem", borderTop: "2px solid #e2e8f0" }}>Total ({records.length} records)</td>
                  <td style={{ padding: "0.5rem 0.75rem", borderTop: "2px solid #e2e8f0", textAlign: "right" }}>${totalCost.toFixed(2)}</td>
                  <td colSpan={2} style={{ borderTop: "2px solid #e2e8f0" }}></td>
                </tr>
              </tfoot>
            </table>

            <h3 style={{ color: "#334155", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", marginTop: "2rem" }}>Cost by Service Type</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid #e2e8f0" }}>Service Type</th>
                  <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", borderBottom: "2px solid #e2e8f0" }}>Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(recordsByType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, cost]) => (
                    <tr key={type}>
                      <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0" }}>{type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</td>
                      <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>${cost.toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </>
        )}

        <p style={{ color: "#94a3b8", fontSize: "0.75rem", textAlign: "center", marginTop: "2rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
          Generated by Car Work Tracker on {new Date().toLocaleDateString()}
        </p>
      </body>
    </html>
  );
}
