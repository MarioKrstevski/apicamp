// app/api/[locale]/[version]/[category]/[id]/route.ts
// Single-resource GET, PUT, DELETE

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTableForCategory } from "@/lib/table-for-category"
import { applyVersionShape } from "@/lib/versioning"
import { validateFields } from "@/lib/validation"
import { getLocaleAdminId } from "@/lib/locales"
import { logAudit } from "@/lib/audit"
import { bootstrap, type Params } from "../route"

type ParamsWithId = Params & { id: string }

async function getOwnedRow(category: string, id: string, accountId: string, locale: string, config: { locale?: boolean }) {
  const { table, isPlatformTable } = getTableForCategory(category)
  const supabase = await createClient()
  let query = supabase
    .from(table)
    .select("*")
    .eq("id", id)
  if (!isPlatformTable) query = query.eq("category", category)

  if (config.locale) {
    const localeAdminId = await getLocaleAdminId(locale)
    query = query.or(`user_id.eq.${accountId},user_id.eq.${localeAdminId}`)
  } else {
    const systemAdminId = await getLocaleAdminId("en")
    query = query.or(`user_id.eq.${accountId},user_id.eq.${systemAdminId}`)
  }

  const { data, error } = await query.single()
  if (error || !data) return null
  return data
}

// ─── GET — Single resource ─────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params: _params }: { params: Promise<ParamsWithId> }
) {
  const params = await _params
  const { locale, version, category, id } = params
  const boot = await bootstrap(req, params)
  if ("error" in boot) return boot.error
  const { account, config } = boot

  const row = await getOwnedRow(category, id, account.id, locale, config)
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const versionFields = config.versions[version]
  return NextResponse.json(applyVersionShape(row.data, versionFields))
}

// ─── PUT ───────────────────────────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params: _params }: { params: Promise<ParamsWithId> }
) {
  const params = await _params
  const { locale: _locale, version, category, id } = params
  const boot = await bootstrap(req, params)
  if ("error" in boot) return boot.error
  const { account, config } = boot

  if (account.tier === "free") {
    return NextResponse.json({ error: "Writing data requires a paid account" }, { status: 403 })
  }

  const { table, isPlatformTable } = getTableForCategory(category)
  const supabase = await createClient()

  let fetchQuery = supabase.from(table).select("*").eq("id", id).eq("user_id", account.id)
  if (!isPlatformTable) fetchQuery = fetchQuery.eq("category", category)
  const { data: existing, error: fetchError } = await fetchQuery.single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Not found or not yours" }, { status: 404 })
  }

  if (existing.is_system && account.role === "user") {
    return NextResponse.json({ error: "Cannot modify system rows" }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (JSON.stringify(body).length > 10240) {
    return NextResponse.json({ error: "Payload too large (max 10kb)" }, { status: 413 })
  }

  const validation = validateFields(body, config.fields, { partial: true })
  if (!validation.valid) {
    return NextResponse.json({ error: "Validation failed", details: validation.errors }, { status: 422 })
  }

  const merged = { ...existing.data, ...body }

  const { data, error } = await supabase
    .from(table)
    .update({ data: merged })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: "Update failed", detail: error.message }, { status: 500 })

  await logAudit(account.id, "PUT", category, id)

  const versionFields = config.versions[version]
  return NextResponse.json(applyVersionShape(data.data, versionFields))
}

// ─── DELETE ───────────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params: _params }: { params: Promise<ParamsWithId> }
) {
  const params = await _params
  const { version: _version, category, id } = params
  const boot = await bootstrap(req, params)
  if ("error" in boot) return boot.error
  const { account } = boot

  if (account.tier === "free") {
    return NextResponse.json({ error: "Writing data requires a paid account" }, { status: 403 })
  }

  if (account.role === "locale_admin") {
    return NextResponse.json({ error: "Locale admins cannot delete rows" }, { status: 403 })
  }

  const { table, isPlatformTable } = getTableForCategory(category)
  const supabase = await createClient()

  let deleteFetchQuery = supabase.from(table).select("*").eq("id", id).eq("user_id", account.id)
  if (!isPlatformTable) deleteFetchQuery = deleteFetchQuery.eq("category", category)
  const { data: existing, error: fetchError } = await deleteFetchQuery.single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Not found or not yours" }, { status: 404 })
  }

  if (existing.is_system) {
    return NextResponse.json({ error: "System rows cannot be deleted" }, { status: 403 })
  }

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error: "Delete failed", detail: error.message }, { status: 500 })

  await logAudit(account.id, "DELETE", category, id)

  return new NextResponse(null, { status: 204 })
}
