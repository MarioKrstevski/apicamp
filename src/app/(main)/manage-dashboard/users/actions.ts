'use server'

import { createClient } from '@/lib/supabase/server'
import { getTableConfig } from '@/lib/tables'
import { validateFields } from '@/lib/validation'

export type SeedUsersTableResult =
  | { ok: true; inserted: number }
  | { ok: false; error: string; details?: string[] }

const MAX_PAYLOAD_BYTES = 102400

/** Map camelCase keys from pasted JSON to snake_case DB columns */
function toRow(obj: Record<string, unknown>, createdBy: string): Record<string, unknown> {
  const map: Record<string, string> = {
    firstName: 'first_name',
    lastName: 'last_name',
    isActive: 'is_active',
    socialLinks: 'social_links',
    birthDate: 'birth_date',
    createdAt: 'created_at'
  }
  const row: Record<string, unknown> = { created_by: createdBy }
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'id' || key === 'createdBy' || key === 'created_by') continue
    const col = map[key] ?? key
    row[col] = value
  }
  return row
}

export async function seedUsersTable(json: string): Promise<SeedUsersTableResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Not authenticated' }
  }

  if (json.length > MAX_PAYLOAD_BYTES) {
    return { ok: false, error: `Payload too large (max ${MAX_PAYLOAD_BYTES} bytes)` }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, error: 'Invalid JSON' }
  }

  const items = Array.isArray(parsed) ? parsed : [parsed]
  if (items.length === 0) {
    return { ok: false, error: 'Provide at least one object' }
  }

  const insertedIds: string[] = []
  const errors: string[] = []

  const config = getTableConfig('users')
  const fields = config?.fields ?? {}

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`Item ${i + 1}: must be a plain object`)
      continue
    }

    const validation = validateFields(item, fields)
    if (!validation.valid) {
      errors.push(`Item ${i + 1}: ${(validation.errors ?? []).join('; ')}`)
      continue
    }

    const row = toRow(item as Record<string, unknown>, user.id)

    const { data: inserted, error } = await supabase
      .from('users')
      .insert(row)
      .select('id')
      .single()

    if (error) {
      errors.push(`Item ${i + 1}: ${error.message}`)
      continue
    }
    if (inserted?.id) insertedIds.push(inserted.id)
  }

  if (insertedIds.length === 0 && errors.length > 0) {
    return { ok: false, error: 'No rows inserted', details: errors }
  }

  return { ok: true, inserted: insertedIds.length }
}
