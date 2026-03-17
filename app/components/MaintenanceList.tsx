import { Link } from "@remix-run/react";
import { formatDate, formatMaintenanceType } from "~/utils/format";

interface MaintenanceRecord {
  id: string;
  type: string;
  date: string | Date;
  mileage: number;
  cost?: number | null;
  vendor?: string | null;
  description?: string | null;
  receiptUrl?: string | null;
}

interface MaintenanceListProps {
  records: MaintenanceRecord[];
  carId: string;
}

export default function MaintenanceList({ records, carId }: MaintenanceListProps) {
  if (records.length === 0) {
    return (
      <div className="text-muted" style={{ padding: "1rem 0" }}>
        No maintenance records yet.{" "}
        <Link to={`/cars/${carId}/maintenance/new`}>Add the first one.</Link>
      </div>
    );
  }

  return (
    <div className="timeline">
      {records.map((record) => (
        <div key={record.id} className="timeline-item">
          <div className="flex flex-between">
            <div>
              <strong>{formatMaintenanceType(record.type)}</strong>
              <span className="text-muted text-sm" style={{ marginLeft: "0.5rem" }}>
                {formatDate(record.date)}
              </span>
            </div>
            <div className="flex gap-sm">
              <Link
                to={`/cars/${carId}/maintenance/${record.id}/edit`}
                className="btn btn-secondary btn-sm"
              >
                Edit
              </Link>
              <Link
                to={`/cars/${carId}/maintenance/${record.id}/delete`}
                className="btn btn-danger btn-sm"
              >
                Delete
              </Link>
            </div>
          </div>
          <div className="text-sm mt-1" style={{ color: "#475569" }}>
            {record.mileage.toLocaleString()} miles
            {record.cost != null ? ` · $${record.cost.toFixed(2)}` : ""}
            {record.vendor ? ` · ${record.vendor}` : ""}
          </div>
          {record.description && (
            <div className="text-sm text-muted mt-1">{record.description}</div>
          )}
          {record.receiptUrl && (
            <a
              href={record.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: "0.25rem" }}
            >
              📄 View Receipt
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
