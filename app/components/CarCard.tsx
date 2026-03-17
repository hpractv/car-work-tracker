import { Link } from "@remix-run/react";
import { formatDate } from "~/utils/format";

interface CarCardProps {
  car: {
    id: string;
    make: string;
    model: string;
    year: number;
    currentMileage: number;
    vendor?: string | null;
  };
  dueCount?: number;
  lastServiceDate?: string | null;
  totalRecords?: number;
}

export default function CarCard({ car, dueCount, lastServiceDate, totalRecords }: CarCardProps) {
  return (
    <div className="card" style={{ position: "relative" }}>
      {dueCount != null && dueCount > 0 && (
        <span
          style={{
            position: "absolute",
            top: "0.75rem",
            right: "0.75rem",
            background: "#f59e0b",
            color: "white",
            borderRadius: "999px",
            padding: "0.15rem 0.55rem",
            fontSize: "0.75rem",
            fontWeight: 700,
          }}
          title={`${dueCount} maintenance item(s) due`}
        >
          {dueCount} due
        </span>
      )}
      <h3>
        {car.year} {car.make} {car.model}
      </h3>
      <p className="text-muted text-sm">
        {car.currentMileage.toLocaleString()} miles
        {car.vendor ? ` · ${car.vendor}` : ""}
      </p>
      {(lastServiceDate || (totalRecords !== undefined && totalRecords > 0)) && (
        <p className="text-muted text-sm">
          {totalRecords !== undefined && totalRecords > 0 && `${totalRecords} record${totalRecords !== 1 ? "s" : ""}`}
          {lastServiceDate && totalRecords !== undefined && totalRecords > 0 && " · "}
          {lastServiceDate && `Last: ${formatDate(lastServiceDate)}`}
        </p>
      )}
      <div className="mt-2">
        <Link to={`/cars/${car.id}`} className="btn btn-primary btn-sm">
          View Details
        </Link>
      </div>
    </div>
  );
}
