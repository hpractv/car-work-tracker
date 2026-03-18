/**
 * Formats a maintenance type key (e.g. "oil_change") into a readable title case string (e.g. "Oil Change").
 */
export function formatMaintenanceType(type: string): string {
  const words = String(type).split(/_+/).filter(Boolean);
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Formats a Date or ISO string into a human-readable date (e.g. "Jan 15, 2024").
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats a number as USD currency (e.g. 150.5 → "$150.50").
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Formats a mileage number with locale separators (e.g. 50000 → "50,000 miles").
 */
export function formatMileage(miles: number): string {
  return `${miles.toLocaleString()} miles`;
}

const MAINTENANCE_CATEGORIES: Record<string, string> = {
  // Fluids
  oil_change: "Fluids",
  coolant_flush: "Fluids",
  transmission_fluid: "Fluids",
  brake_fluid: "Fluids",
  power_steering_fluid: "Fluids",
  differential_fluid: "Fluids",
  // Tires & Wheels
  tire_rotation: "Tires & Wheels",
  tire_replacement: "Tires & Wheels",
  wheel_alignment: "Tires & Wheels",
  wheel_balancing: "Tires & Wheels",
  // Brakes
  brake_service: "Brakes",
  brake_pad_replacement: "Brakes",
  brake_rotor_replacement: "Brakes",
  // Engine
  air_filter: "Engine",
  cabin_filter: "Engine",
  spark_plug: "Engine",
  timing_belt: "Engine",
  timing_chain: "Engine",
  fuel_filter: "Engine",
  serpentine_belt: "Engine",
  // Electrical
  battery_replacement: "Electrical",
  alternator: "Electrical",
  // Body & Exterior
  windshield_wiper: "Body & Exterior",
  // General
  inspection: "General",
  detailing: "General",
};

export function getMaintenanceCategory(typeName: string): string {
  return MAINTENANCE_CATEGORIES[typeName] ?? "Other";
}
