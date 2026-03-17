import { useEffect, useState } from "react";
import AlertBanner from "./AlertBanner";

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
      { timeout: 10000 }
    );
  }, [maintenanceDue.length]);

  if (!checked || maintenanceDue.length === 0 || services.length === 0) {
    return null;
  }

  const dueTypes = maintenanceDue.map((d) => d.type.replace(/_/g, " ")).join(", ");
  const nearest = services[0];

  return (
    <AlertBanner
      severity="warning"
      message={`Maintenance due (${dueTypes}) — ${services.length} service station(s) nearby. Nearest: "${nearest.name}" (${(nearest.distance / 1000).toFixed(1)} km away)`}
    />
  );
}

export { NearbyServicesAlert };
