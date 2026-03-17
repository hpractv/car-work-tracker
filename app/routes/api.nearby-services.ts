import { json, type LoaderFunctionArgs } from "@remix-run/node";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function loader({ request }: LoaderFunctionArgs) {
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
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!response.ok) {
      return json([], { status: 200 });
    }

    const data = await response.json() as {
      elements: Array<{
        id: number;
        type: string;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: { name?: string; [key: string]: string | undefined };
      }>;
    };

    const services = data.elements
      .map((el) => {
        const elLat = el.lat ?? el.center?.lat;
        const elLon = el.lon ?? el.center?.lon;
        if (!elLat || !elLon) return null;
        const distance = haversineDistance(lat, lon, elLat, elLon);
        return {
          name: el.tags?.name ?? "Unnamed Service",
          lat: elLat,
          lon: elLon,
          distance: Math.round(distance),
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a?.distance ?? 0) - (b?.distance ?? 0));

    return json(services);
  } catch {
    return json([], { status: 200 });
  }
}
