'use server'

import { createClient } from '@/lib/supabase/server'
import { isLocaleAdmin } from '@/lib/locale-admin'
import { getTableConfig } from '@/lib/tables'
import { validateFields } from '@/lib/validation'

export type SeedResult =
  | { ok: true; inserted: number }
  | { ok: false; error: string; details?: string[] }

const MAX_PAYLOAD_BYTES = 102400

/** camelCase → snake_case */
function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)
}

/** Convert camelCase object keys to snake_case for flat-column DB insertion. */
function toDbRow(obj: Record<string, unknown>, ownerCol: string, ownerId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { [ownerCol]: ownerId }
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'id') continue
    row[camelToSnake(key)] = value
  }
  return row
}

/**
 * Generic seed action for flat-column tables (quotes, books, students, resumes, animals).
 * Converts camelCase JSON to snake_case DB columns and inserts with user_id ownership.
 */
export async function seedTableRows(table: string, json: string): Promise<SeedResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'Not authenticated' }

  const isAdmin = isLocaleAdmin(user.id)
  if (!isAdmin) return { ok: false, error: 'Only locale admins can seed data' }

  if (json.length > MAX_PAYLOAD_BYTES) {
    return { ok: false, error: `Payload too large (max ${MAX_PAYLOAD_BYTES / 1024}kb)` }
  }

  let parsed: unknown
  try { parsed = JSON.parse(json) }
  catch { return { ok: false, error: 'Invalid JSON' } }

  const items: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [parsed as Record<string, unknown>]
  if (items.length === 0) return { ok: false, error: 'Provide at least one object' }

  const config = getTableConfig(table)
  if (!config) return { ok: false, error: `Unknown table: ${table}` }

  const ownerCol = config.ownershipCol ?? 'user_id'
  const insertedIds: string[] = []
  const errors: string[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`Item ${i + 1}: must be a plain object`)
      continue
    }

    const validation = validateFields(item, config.fields)
    if (!validation.valid) {
      errors.push(`Item ${i + 1}: ${(validation.errors ?? []).join('; ')}`)
      continue
    }

    if (config.fields.createdAt?.auto) {
      (item as Record<string, unknown>).createdAt = new Date().toISOString()
    }

    // Only insert fields the table actually has — silently drop unknown keys
    const knownFields = new Set(Object.keys(config.fields))
    const filtered: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
      if (knownFields.has(k)) filtered[k] = v
    }

    const row = toDbRow(filtered, ownerCol, user.id)

    const { data: inserted, error } = await supabase
      .from(table)
      .insert(row)
      .select('id')
      .single()

    if (error) { errors.push(`Item ${i + 1}: ${error.message}`); continue }
    if (inserted?.id) insertedIds.push(inserted.id)
  }

  if (insertedIds.length === 0 && errors.length > 0) {
    return { ok: false, error: 'No rows inserted', details: errors }
  }

  return { ok: true, inserted: insertedIds.length }
}
