/**
 * Formats a maintenance type key (e.g. "oil_change") into a readable title case string (e.g. "Oil Change").
 */
export function formatMaintenanceType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Formats a Date or ISO string into a human-readable date (e.g. "Jan 15, 2024").
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
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
