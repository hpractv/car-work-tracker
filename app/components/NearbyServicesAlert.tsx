import { useEffect, useRef, useState } from "react";
import { formatMaintenanceType } from "~/utils/format";

function mapsUrl(lat: number, lon: number, name: string): string {
  // Prefer Google Maps as it's more widely used; fallback available via OSM
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&center=${lat},${lon}`;
}

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
  const [retryKey, setRetryKey] = useState(0);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (maintenanceDue.length === 0) return;
    if (!navigator.geolocation) return;

    const fetchNearby = async () => {
      try {
        setLoading(true);
        setError(null);
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        );
        const { latitude, longitude } = pos.coords;
        const res = await fetch(
          `/api/nearby-services?lat=${latitude}&lon=${longitude}&radius=5000`
        );
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json(); // this can throw
        setServices(data);
      } catch (err) {
        const geoErr = err as { code?: number };
        if (geoErr.code === 1) {
          setError("Location access denied — enable location to find nearby service stations");
        } else if (geoErr.code === 2) {
          setError("Location unavailable");
        } else {
          setError(err instanceof Error ? err.message : "Failed to fetch nearby services");
        }
      } finally {
        setLoading(false);
        setChecked(true);
      }
    };

    fetchNearby();
  }, [maintenanceDue.length, retryKey]);

  useEffect(() => {
    if (showList) listRef.current?.focus();
  }, [showList]);

  if (maintenanceDue.length > 0 && loading) {
    return (
      <div className="alert alert-info">
        <span>📍 Checking for nearby service stations...</span>
      </div>
    );
  }

  if (error && maintenanceDue.length > 0) {
    return (
      <div className="alert alert-info" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>ℹ️ {error}</span>
        <button
          onClick={() => { setError(null); setChecked(false); setRetryKey(k => k + 1); }}
          style={{ background: "none", border: "1px solid #3b82f6", borderRadius: "4px", padding: "0.2rem 0.5rem", cursor: "pointer", color: "#1e3a8a", fontSize: "0.8rem", whiteSpace: "nowrap", marginLeft: "0.5rem" }}
        >
          Retry
        </button>
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
    <div className="alert alert-warning" style={{ flexDirection: "column", gap: "0.5rem" }} role="status" aria-live="polite" aria-atomic="true">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <span>
          ⚠️ <strong>Maintenance due</strong> ({dueTypes}) — {services.length} service station{services.length !== 1 ? "s" : ""} nearby.{" "}
          Nearest: <strong>
            <a href={mapsUrl(nearest.lat, nearest.lon, nearest.name)} target="_blank" rel="noopener noreferrer" style={{ color: "#92400e" }} aria-label={`Open ${nearest.name} in Google Maps`}>"{nearest.name}"</a>
          </strong> ({(nearest.distance / 1000).toFixed(1)} km away)
        </span>
        <button
          onClick={() => setShowList(prev => !prev)}
          aria-expanded={showList}
          aria-controls="nearby-services-list"
          style={{ background: "none", border: "1px solid #f59e0b", borderRadius: "4px", padding: "0.2rem 0.5rem", cursor: "pointer", color: "#92400e", fontSize: "0.8rem", whiteSpace: "nowrap", marginLeft: "0.5rem" }}
        >
          {showList ? "Hide nearby shops ▲" : "Show nearby shops ▼"}
        </button>
      </div>
      {showList && (
        <ul id="nearby-services-list" ref={listRef} tabIndex={-1} style={{ margin: 0, padding: 0, listStyle: "none", width: "100%", borderTop: "1px solid #f59e0b", paddingTop: "0.5rem" }} aria-hidden={!showList}>
          {displayServices.map((s, i) => (
            <li key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0", fontSize: "0.85rem" }}>
              <span>{i + 1}. {s.name}</span>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={{ color: "#92400e" }}>{(s.distance / 1000).toFixed(1)} km</span>
                <a
                  href={mapsUrl(s.lat, s.lon, s.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: "0.1rem 0.4rem", fontSize: "0.75rem" }}
                  aria-label={`Open ${s.name} in Google Maps`}
                >
                  📍 Map
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
