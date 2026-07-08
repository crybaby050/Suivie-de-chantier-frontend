export function required(value, message) {
  if (!String(value ?? "").trim()) {
    throw new Error(message);
  }
}

export function requirePositiveNumber(value, message) {
  if (isNaN(Number(value)) || Number(value) <= 0) {
    throw new Error(message);
  }
}

export function requireNonNegativeNumber(value, message) {
  if (isNaN(Number(value)) || Number(value) < 0) {
    throw new Error(message);
  }
}