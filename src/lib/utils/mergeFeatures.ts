type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base: PlainObject, patch: PlainObject): PlainObject {
  const result: PlainObject = { ...base };

  for (const key of Object.keys(patch)) {
    const patchValue = patch[key];
    if (patchValue === undefined) continue;

    const baseValue = result[key];

    if (isPlainObject(baseValue) && isPlainObject(patchValue)) {
      result[key] = deepMerge(baseValue, patchValue);
      continue;
    }

    result[key] = patchValue;
  }

  return result;
}

/**
 * Safely merges Merchant.features-style JSON (deep merge for objects, replace arrays/primitives).
 *
 * - If either input is not a plain object, it is treated as `{}`.
 * - `undefined` values in the patch are ignored (no-op).
 */
export function mergeFeatures(base: unknown, patch: unknown): PlainObject {
  const baseObj = isPlainObject(base) ? base : {};
  const patchObj = isPlainObject(patch) ? patch : {};
  return deepMerge(baseObj, patchObj);
}
