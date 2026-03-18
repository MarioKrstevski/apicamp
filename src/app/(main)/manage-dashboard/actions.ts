'use server'

import { createClient } from '@/lib/supabase/server'
import { isLocaleAdmin } from '@/lib/locale-admin'
import { getTableConfig } from '@/lib/tables'
import { getTable } from '@/lib/table-for-category'
import { validateFields } from '@/lib/validation'

export type AddSeedDataResult =
  | { ok: true; inserted: number }
  | { ok: false; error: string; details?: string[] }

const MAX_PAYLOAD_BYTES = 10240

export async function addSeedData(category: string, json: string): Promise<AddSeedDataResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Not authenticated' }
  }

  const localeSuffix = isLocaleAdmin(user.id)
  if (!localeSuffix) {
    return { ok: false, error: 'Only locale admins can add seed data' }
  }

  const locale = localeSuffix.toLowerCase()
  const config = getTableConfig(category)
  if (!config) {
    return { ok: false, error: `Unknown resource: ${category}` }
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

  const items: Record<string, unknown>[] = Array.isArray(parsed)
    ? parsed
    : [parsed as Record<string, unknown>]

  if (items.length === 0) {
    return { ok: false, error: 'Provide at least one object' }
  }

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

    const data = { ...item } as Record<string, unknown>
    if (config.fields.createdAt?.auto) {
      data.createdAt = new Date().toISOString()
    }

    const table = getTable(category)
    const col   = config.ownershipCol ?? 'user_id'
    const insertPayload: Record<string, unknown> = {
      [col]:     user.id,
      locale:    config.locale ? locale : 'en',
      is_system: true,
      data,
    }

    const { data: row, error } = await supabase
      .from(table)
      .insert(insertPayload)
      .select('id')
      .single()

    if (error) {
      errors.push(`Item ${i + 1}: ${error.message}`)
      continue
    }
    if (row?.id) insertedIds.push(row.id)
  }

  if (insertedIds.length === 0 && errors.length > 0) {
    return { ok: false, error: 'No rows inserted', details: errors }
  }

  return { ok: true, inserted: insertedIds.length }
}
