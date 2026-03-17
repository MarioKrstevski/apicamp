// app/api/[locale]/[version]/[category]/route.ts
// FULL PRODUCTION VERSION — handles all variations, modifiers, edge cases

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCategoryConfig } from "@/lib/categories"
import { validateApiKey } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rateLimit"
import { applyVersionShape } from "@/lib/versioning"
import { validateFields } from "@/lib/validation"
import { getLocaleAdminId } from "@/lib/locales"
import { logAudit } from "@/lib/audit"
import { applyModifier, extractModifier } from "@/lib/modifiers"

type Params = {
  locale: string
  version: string
  category: string
}

// ─── MIDDLEWARE HELPERS ───────────────────────────────────────────────────

async function bootstrap(req: NextRequest, params: Params) {
  const { locale, version, category } = params

  // API key auth
  const apiKey = req.headers.get("x-api-key")
  const account = await validateApiKey(apiKey)
  if (!account) return { error: NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 }) }

  // Rate limit
  const limited = await checkRateLimit(account)
  if (limited) return {
    error: NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "X-RateLimit-Reset": limited.resetAt } }
    )
  }

  // Category config
  const config = getCategoryConfig(category)
  if (!config) return { error: NextResponse.json({ error: `Unknown category: ${category}` }, { status: 404 }) }

  // Version check
  if (!config.versions[version]) {
    const available = Object.keys(config.versions).join(", ")
    return {
      error: NextResponse.json(
        { error: `Version '${version}' not available. Available: ${available}` },
        { status: 404 }
      )
    }
  }

  // Locale check
  if (config.locale && !["en", "fr", "es", "sr"].includes(locale)) {
    return { error: NextResponse.json({ error: `Unsupported locale: ${locale}` }, { status: 400 }) }
  }

  return { account, config }
}

// ─── GET — List ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { locale, version, category } = params
  const boot = await bootstrap(req, params)
  if (boot.error) return boot.error
  const { account, config } = boot

  const { searchParams } = new URL(req.url)

  // Pagination
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") ?? "10")), 100)
  const from = (page - 1) * limit

  // Sorting — only allow sortable fields from config
  const sortParam = searchParams.get("sort") ?? "created_at"
  const sort = config.sortable?.includes(sortParam) ? sortParam : "created_at"
  const order = searchParams.get("order") === "desc" ? false : true  // true = ascending

  // Search
  const search = searchParams.get("search")?.trim() ?? ""

  // Filters — e.g. ?category=electronics&inStock=true
  const filters: Record<string, string> = {}
  config.filterable?.forEach(field => {
    const val = searchParams.get(field)
    if (val) filters[field] = val
  })

  // Mine only
  const mineOnly = searchParams.get("mine_only") === "true"

  // Behaviour modifiers — ?delay=slow2, ?chaos=true, ?empty=true
  const modifier = extractModifier(searchParams)

  // Empty modifier — return empty immediately
  if (modifier === "empty") {
    return NextResponse.json({ data: [], meta: { total: 0, page, limit, totalPages: 0 } })
  }

  // Build query
  const supabase = createClient()
  let query = supabase
    .from("user_rows")
    .select("*", { count: "exact" })
    .eq("category", category)

  // Ownership filter
  if (config.locale) {
    const localeAdminId = await getLocaleAdminId(locale)
    if (mineOnly) {
      query = query.eq("user_id", account.id)
    } else {
      query = query.or(`user_id.eq.${account.id},user_id.eq.${localeAdminId}`)
    }
  } else {
    if (!mineOnly) {
      const systemAdminId = await getLocaleAdminId("en")
      query = query.or(`user_id.eq.${account.id},user_id.eq.${systemAdminId}`)
    } else {
      query = query.eq("user_id", account.id)
    }
  }

  // Search across searchable fields
  if (search && config.searchable?.length > 0) {
    const conditions = config.searchable
      .map(f => `data->>'${f}'.ilike.%${search}%`)
      .join(",")
    query = query.or(conditions)
  }

  // Filters on JSONB fields
  Object.entries(filters).forEach(([field, value]) => {
    query = query.eq(`data->>'${field}'`, value)
  })

  // Sort + paginate
  query = query
    .order(`data->>'${sort}'`, { ascending: order })
    .range(from, from + limit - 1)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: "Query failed", detail: error.message }, { status: 500 })

  // Apply version shape
  const versionFields = config.versions[version]
  const shaped = (data ?? []).map(row => applyVersionShape(row.data, versionFields))

  // Chaos modifier — randomly fail 30% of requests
  if (modifier === "chaos" && Math.random() < 0.3) {
    const chaosErrors = [
      { status: 500, error: "Internal Server Error" },
      { status: 503, error: "Service Unavailable" },
      { status: 504, error: "Gateway Timeout" },
    ]
    const pick = chaosErrors[Math.floor(Math.random() * chaosErrors.length)]
    return NextResponse.json({ error: pick.error }, { status: pick.status })
  }

  const response = NextResponse.json({
    data: shaped,
    meta: {
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
      locale,
      version,
    }
  })

  // Stale modifier — fake staleness headers
  if (modifier === "stale") {
    const staleDate = new Date(Date.now() - 86400000).toUTCString()
    response.headers.set("Last-Modified", staleDate)
    response.headers.set("X-Data-Age", "86400")
    response.headers.set("X-Stale", "true")
    response.headers.set("Cache-Control", "max-age=0")
  }

  // Apply delay modifier (slow1/slow2/slow3) — handled in middleware
  await applyModifier(modifier)

  return response
}

// ─── GET — Single row ─────────────────────────────────────────────────────

export async function GET_ONE(req: NextRequest, { params }: { params: Params & { id: string } }) {
  const { locale, version, category, id } = params
  const boot = await bootstrap(req, params)
  if (boot.error) return boot.error
  const { account, config } = boot

  const localeAdminId = await getLocaleAdminId(locale)
  const supabase = createClient()

  const { data, error } = await supabase
    .from("user_rows")
    .select("*")
    .eq("id", id)
    .eq("category", category)
    .or(`user_id.eq.${account.id},user_id.eq.${localeAdminId}`)
    .single()

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const versionFields = config.versions[version]
  return NextResponse.json(applyVersionShape(data.data, versionFields))
}

// ─── POST ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { locale, version, category } = params
  const boot = await bootstrap(req, params)
  if (boot.error) return boot.error
  const { account, config } = boot

  // Free tier cannot write
  if (account.tier === "free") {
    return NextResponse.json({ error: "Writing data requires a paid account" }, { status: 403 })
  }

  // Locale admins can only write their own locale
  if (account.role === "locale_admin" && account.locale !== locale) {
    return NextResponse.json({ error: "You can only write to your own locale" }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Validate payload size
  if (JSON.stringify(body).length > 10240) {
    return NextResponse.json({ error: "Payload too large (max 10kb)" }, { status: 413 })
  }

  // Validate fields against config schema
  const validation = validateFields(body, config.fields)
  if (!validation.valid) {
    return NextResponse.json({ error: "Validation failed", details: validation.errors }, { status: 422 })
  }

  // Row limit check (not for locale admins — they seed system data)
  if (account.role !== "locale_admin" && account.role !== "superadmin") {
    const supabase = createClient()
    const { count } = await supabase
      .from("user_rows")
      .select("*", { count: "exact", head: true })
      .eq("user_id", account.id)
      .eq("category", category)

    if ((count ?? 0) >= (config.maxUserRows ?? 100)) {
      return NextResponse.json(
        { error: `Row limit reached. Max ${config.maxUserRows} rows per category.` },
        { status: 429 }
      )
    }
  }

  // Auto fields
  if (config.fields.createdAt?.auto) body.createdAt = new Date().toISOString()

  const supabase = createClient()
  const { data, error } = await supabase
    .from("user_rows")
    .insert({
      user_id: account.id,
      category,
      locale: config.locale ? locale : "en",
      is_system: account.role === "locale_admin" || account.role === "superadmin",
      data: body
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: "Insert failed", detail: error.message }, { status: 500 })

  await logAudit(account.id, "POST", category, data.id)

  const versionFields = config.versions[version]
  return NextResponse.json(applyVersionShape(data.data, versionFields), { status: 201 })
}

// ─── PUT ──────────────────────────────────────────────────────────────────

export async function PUT(req: NextRequest, { params }: { params: Params & { id: string } }) {
  const { locale, version, category, id } = params
  const boot = await bootstrap(req, params)
  if (boot.error) return boot.error
  const { account, config } = boot

  if (account.tier === "free") {
    return NextResponse.json({ error: "Writing data requires a paid account" }, { status: 403 })
  }

  // Locale admin cannot DELETE — but can PUT (update)
  // Superadmin can do anything

  const supabase = createClient()

  // Fetch existing row — must belong to this user (or locale admin for their locale)
  const canEdit =
    account.role === "superadmin"
      ? `user_id.eq.${account.id}`
      : account.role === "locale_admin"
      ? `user_id.eq.${account.id}`
      : `user_id.eq.${account.id}`

  const { data: existing, error: fetchError } = await supabase
    .from("user_rows")
    .select("*")
    .eq("id", id)
    .eq("category", category)
    .or(canEdit)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Not found or not yours" }, { status: 404 })
  }

  // Cannot update system rows unless locale_admin or superadmin
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

  // Merge existing data with new data
  const merged = { ...existing.data, ...body }

  const { data, error } = await supabase
    .from("user_rows")
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

export async function DELETE(req: NextRequest, { params }: { params: Params & { id: string } }) {
  const { locale, version, category, id } = params
  const boot = await bootstrap(req, params)
  if (boot.error) return boot.error
  const { account, config } = boot

  if (account.tier === "free") {
    return NextResponse.json({ error: "Writing data requires a paid account" }, { status: 403 })
  }

  // Locale admins CANNOT delete — safety rule
  if (account.role === "locale_admin") {
    return NextResponse.json({ error: "Locale admins cannot delete rows" }, { status: 403 })
  }

  const supabase = createClient()

  const { data: existing, error: fetchError } = await supabase
    .from("user_rows")
    .select("*")
    .eq("id", id)
    .eq("category", category)
    .eq("user_id", account.id)   // can only delete own rows
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Not found or not yours" }, { status: 404 })
  }

  // Cannot delete system rows — ever
  if (existing.is_system) {
    return NextResponse.json({ error: "System rows cannot be deleted" }, { status: 403 })
  }

  const { error } = await supabase
    .from("user_rows")
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error: "Delete failed", detail: error.message }, { status: 500 })

  await logAudit(account.id, "DELETE", category, id)

  return new NextResponse(null, { status: 204 })
}
