export function toLower(value?: string) {
  return typeof value === "string" ? value.trim().toLowerCase() : undefined;
}

export function valuesMatch(a?: string, b?: string) {
  if (!a || !b) {
    return false;
  }
  return toLower(a) === toLower(b);
}

export function isInRange(value: number | undefined, min?: number, max?: number) {
  if (value === undefined || value === null) {
    return false;
  }
  if (min !== undefined && value < min) {
    return false;
  }
  if (max !== undefined && value > max) {
    return false;
  }
  return true;
}

export function computePercentage(matched: number, considered: number) {
  if (!considered) {
    return 100;
  }
  return Math.round((matched / considered) * 100);
}

export function toNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}
