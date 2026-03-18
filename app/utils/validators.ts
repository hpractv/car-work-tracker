export function validateYear(y: unknown): { ok: true; value: number } | { ok: false; error: string } {
  const n = Number(y);
  const current = new Date().getFullYear();
  if (Number.isNaN(n) || !Number.isInteger(n)) return { ok: false, error: "Year must be an integer" };
  if (n < 1886 || n > current + 2) return { ok: false, error: `Year must be between 1886 and ${current + 2}` };
  return { ok: true, value: n };
}

export function validateNonNegativeInt(v: unknown, field = "Value") {
  const n = Number(v);
  if (Number.isNaN(n) || !Number.isInteger(n)) return { ok: false, error: `${field} must be an integer` };
  if (n < 0) return { ok: false, error: `${field} must be >= 0` };
  return { ok: true, value: n };
}

export function validateNonNegativeNumber(v: unknown, field = "Value") {
  const n = Number(v);
  if (Number.isNaN(n)) return { ok: false, error: `${field} must be a number` };
  if (n < 0) return { ok: false, error: `${field} must be >= 0` };
  return { ok: true, value: n };
}
