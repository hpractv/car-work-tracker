import { useEffect, useState } from "react";
import { formatMaintenanceType } from "~/utils/format";

interface NearbyService {
  name: string;
  lat: number;
  lon: number;
  distance: number;
}

interface NearbyServicesAlertProps {
  maintenanceDue: Array<{ type: string; reason: string }>;
}

export default function NearbyServicesAlert({
  maintenanceDue,
}: NearbyServicesAlertProps) {
  const [services, setServices] = useState<NearbyService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [showList, setShowList] = useState(false);

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
      (err) => {
        setLoading(false);
        setChecked(true);
        if (err.code === 1) {
          setError("Location access denied — enable location to find nearby service stations");
        } else if (err.code === 2) {
          setError("Location unavailable");
        } else {
          setError("Could not determine your location");
        }
      },
      { timeout: 10000 }
    );
  }, [maintenanceDue.length]);

  if (maintenanceDue.length > 0 && loading) {
    return (
      <div className="alert alert-info">
        <span>📍 Checking for nearby service stations...</span>
      </div>
    );
  }

  if (error && maintenanceDue.length > 0) {
    return (
      <div className="alert alert-info">
        <span>ℹ️ {error}</span>
      </div>
    );
  }

  if (!checked || maintenanceDue.length === 0 || services.length === 0) {
    return null;
  }

  const dueTypes = maintenanceDue.map((d) => formatMaintenanceType(d.type)).join(", ");
  const nearest = services[0];
  const displayServices = services.slice(0, 5);

  return (
    <div className="alert alert-warning" style={{ flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <span>
          ⚠️ <strong>Maintenance due</strong> ({dueTypes}) — {services.length} service station{services.length !== 1 ? "s" : ""} nearby.{" "}
          Nearest: <strong>"{nearest.name}"</strong> ({(nearest.distance / 1000).toFixed(1)} km away)
        </span>
        <button
          onClick={() => setShowList(!showList)}
          style={{ background: "none", border: "1px solid #f59e0b", borderRadius: "4px", padding: "0.2rem 0.5rem", cursor: "pointer", color: "#92400e", fontSize: "0.8rem", whiteSpace: "nowrap", marginLeft: "0.5rem" }}
        >
          {showList ? "Hide ▲" : "Show nearby shops ▼"}
        </button>
      </div>
      {showList && (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", width: "100%", borderTop: "1px solid #f59e0b", paddingTop: "0.5rem" }}>
          {displayServices.map((s, i) => (
            <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.2rem 0", fontSize: "0.85rem" }}>
              <span>{i + 1}. {s.name}</span>
              <span style={{ color: "#92400e" }}>{(s.distance / 1000).toFixed(1)} km</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
