export function escapeCsvField(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (
    s.includes(",") ||
    s.includes('"') ||
    s.includes("\n") ||
    s.includes("\r") ||
    s.startsWith(" ") ||
    s.endsWith(" ") ||
    s.startsWith("\t") ||
    s.endsWith("\t")
  ) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/["\\\/\:*?<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
