/** Internal runtime guards for values crossing the engine boundary. */

export function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite number greater than or equal to 0`);
  }
}

export function assertIntegerInRange(
  value: number,
  min: number,
  max: number,
  label: string,
): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${label} must be an integer between ${min} and ${max}`);
  }
}

export function assertOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): asserts value is T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new RangeError(`${label} must be one of: ${allowed.join(', ')}`);
  }
}

export function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${label} must be a boolean`);
  }
}

export function assertNever(value: never, label: string): never {
  throw new RangeError(`${label} received an unsupported value: ${String(value)}`);
}
