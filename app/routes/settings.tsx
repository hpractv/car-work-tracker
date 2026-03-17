import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getMaintenanceTypes } from "~/models/maintenance.server";
import { formatMaintenanceType } from "~/utils/format";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request);
  const types = await getMaintenanceTypes();
  return json({ types });
}

export default function Settings() {
  const { types } = useLoaderData<typeof loader>();
  return (
    <div style={{ maxWidth: "700px" }}>
      <div className="page-header">
        <h1>Maintenance Intervals</h1>
        <Link to="/" className="btn btn-secondary">← Dashboard</Link>
      </div>
      <div className="card">
        <p className="text-muted mb-2">
          These are the default service intervals used to determine when maintenance is due for your vehicles.
        </p>
        <table>
          <thead>
            <tr>
              <th>Service Type</th>
              <th>Every (Miles)</th>
              <th>Every (Months)</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id}>
                <td><strong>{formatMaintenanceType(t.name)}</strong></td>
                <td>{t.defaultIntervalMiles != null ? t.defaultIntervalMiles.toLocaleString() : "—"}</td>
                <td>{t.defaultIntervalMonths != null ? `${t.defaultIntervalMonths}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
