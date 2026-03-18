/**
 * Returns a copy of data with only the keys listed in fields (version shape).
 * Used to expose v1/v2/v3 subsets of category data.
 */
export function applyVersionShape(
  data: unknown,
  fields: unknown
): Record<string, unknown> {
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return {}
  }
  const obj = data as Record<string, unknown>
  const keys = Array.isArray(fields) ? (fields as string[]) : []
  const out: Record<string, unknown> = {}
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      out[key] = obj[key]
    }
  }
  return out
}
