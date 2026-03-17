type FieldDef = {
  type?: string
  required?: boolean
  maxLength?: number
  min?: number
  max?: number
  precision?: number
  values?: string[]
  maxItems?: number
  itemType?: string
  auto?: boolean
  [key: string]: unknown
}

export type ValidateFieldsResult = {
  valid: boolean
  errors?: string[]
}

function isPresent(v: unknown): boolean {
  if (v === null || v === undefined) return false
  if (typeof v === 'string' && v.trim() === '') return false
  return true
}

function validateOne(
  value: unknown,
  key: string,
  def: FieldDef,
  errors: string[]
): void {
  const { type, required, maxLength, min, max, precision, values, maxItems, itemType } = def

  if (required && !isPresent(value)) {
    errors.push(`${key}: required`)
    return
  }
  if (!required && !isPresent(value)) return

  switch (type) {
    case 'string':
    case 'text': {
      if (typeof value !== 'string') {
        errors.push(`${key}: must be a string`)
        return
      }
      if (maxLength != null && value.length > maxLength) {
        errors.push(`${key}: max length ${maxLength}`)
      }
      break
    }
    case 'number':
    case 'integer': {
      const n = typeof value === 'number' ? value : Number(value)
      if (Number.isNaN(n)) {
        errors.push(`${key}: must be a number`)
        return
      }
      if (type === 'integer' && !Number.isInteger(n)) {
        errors.push(`${key}: must be an integer`)
        return
      }
      if (min != null && n < min) errors.push(`${key}: min ${min}`)
      if (max != null && n > max) errors.push(`${key}: max ${max}`)
      if (precision != null) {
        const parts = String(n).split('.')
        if (parts[1] && parts[1].length > precision) {
          errors.push(`${key}: max ${precision} decimal places`)
        }
      }
      break
    }
    case 'boolean': {
      if (typeof value !== 'boolean') {
        errors.push(`${key}: must be a boolean`)
      }
      break
    }
    case 'enum': {
      if (typeof value !== 'string') {
        errors.push(`${key}: must be a string`)
        return
      }
      if (values && !values.includes(value)) {
        errors.push(`${key}: must be one of ${values.join(', ')}`)
      }
      break
    }
    case 'enum_multi': {
      if (!Array.isArray(value)) {
        errors.push(`${key}: must be an array`)
        return
      }
      if (values) {
        const invalid = value.filter((v) => typeof v !== 'string' || !values.includes(v))
        if (invalid.length) errors.push(`${key}: each item must be one of ${values.join(', ')}`)
      }
      if (maxItems != null && value.length > maxItems) {
        errors.push(`${key}: max ${maxItems} items`)
      }
      break
    }
    case 'array': {
      if (!Array.isArray(value)) {
        errors.push(`${key}: must be an array`)
        return
      }
      if (maxItems != null && value.length > maxItems) {
        errors.push(`${key}: max ${maxItems} items`)
      }
      if (itemType === 'url') {
        const urlRe = /^https?:\/\//
        value.forEach((item, i) => {
          if (typeof item !== 'string' || !urlRe.test(item)) {
            errors.push(`${key}[${i}]: must be a URL`)
          }
        })
      }
      break
    }
    case 'date':
    case 'datetime': {
      if (typeof value !== 'string') {
        errors.push(`${key}: must be a date string`)
        return
      }
      const parsed = Date.parse(value)
      if (Number.isNaN(parsed)) errors.push(`${key}: invalid date`)
      break
    }
    case 'url': {
      if (typeof value !== 'string') {
        errors.push(`${key}: must be a string`)
        return
      }
      try {
        new URL(value)
      } catch {
        errors.push(`${key}: invalid URL`)
      }
      break
    }
    case 'email': {
      if (typeof value !== 'string') {
        errors.push(`${key}: must be a string`)
        return
      }
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRe.test(value)) errors.push(`${key}: invalid email`)
      break
    }
    case 'json': {
      if (value !== null && typeof value !== 'object') {
        errors.push(`${key}: must be an object or null`)
      }
      break
    }
    case 'ref': {
      if (typeof value !== 'string' && typeof value !== 'number') {
        errors.push(`${key}: must be a string or number (reference id)`)
      }
      break
    }
    default:
      // unknown type — allow through
      break
  }
}

export function validateFields(
  body: unknown,
  fields: Record<string, FieldDef>,
  opts?: { partial?: boolean }
): ValidateFieldsResult {
  const errors: string[] = []
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['Body must be a plain object'] }
  }

  const obj = body as Record<string, unknown>

  for (const [key, def] of Object.entries(fields)) {
    if (def.auto) continue
    const value = obj[key]
    if (opts?.partial && !Object.prototype.hasOwnProperty.call(obj, key)) continue
    validateOne(value, key, def as FieldDef, errors)
  }

  // Disallow unknown keys?
  // Config-driven: only validate known fields; extra keys could be stripped later if needed.
  return {
    valid: errors.length === 0,
    errors: errors.length ? errors : undefined
  }
}
