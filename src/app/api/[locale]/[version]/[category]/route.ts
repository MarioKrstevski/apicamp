// app/api/[locale]/[version]/[category]/route.ts
// FULL PRODUCTION VERSION — handles all variations, modifiers, edge cases

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCategoryConfig } from "@/lib/categories"
import { getTableForCategory } from "@/lib/table-for-category"
import { validateApiKey, type Account } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rateLimit"
import type { CategoryConfig } from "@/types/category"
import { applyVersionShape } from "@/lib/versioning"
import { validateFields } from "@/lib/validation"
import { getLocaleAdminId } from "@/lib/locales"
import { logAudit } from "@/lib/audit"
import { applyModifier, extractModifier } from "@/lib/modifiers"

export type Params = {
  locale: string
  version: string
  category: string
}

// ─── MIDDLEWARE HELPERS ───────────────────────────────────────────────────

export type BootstrapResult =
  | { error: NextResponse }
  | { account: Account; config: CategoryConfig }

export async function bootstrap(req: NextRequest, params: Params): Promise<BootstrapResult> {
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

export async function GET(req: NextRequest, { params: _params }: { params: Promise<Params> }) {
  const params = await _params
  const { locale, version, category } = params
  const boot = await bootstrap(req, params)
  if ("error" in boot) return boot.error
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
  config.filterable?.forEach((field: string) => {
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

  // Build query (platform tables: products, users; else user_rows with category filter)
  const { table, isPlatformTable } = getTableForCategory(category)
  const supabase = await createClient()
  let query = supabase
    .from(table)
    .select("*", { count: "exact" })
  if (!isPlatformTable) query = query.eq("category", category)

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

  // Search across searchable fields (config.searchable can be string[] or boolean)
  const searchable = Array.isArray(config.searchable) ? config.searchable : []
  if (search && searchable.length > 0) {
    const conditions = searchable
      .map((f: string) => `data->>'${f}'.ilike.%${search}%`)
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
  const shaped = (data ?? []).map((row: { data: unknown }) => applyVersionShape(row.data, versionFields))

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

// ─── POST ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params: _params }: { params: Promise<Params> }) {
  const params = await _params
  const { locale, version, category } = params
  const boot = await bootstrap(req, params)
  if ("error" in boot) return boot.error
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
  const { table: insertTable, isPlatformTable: insertIsPlatform } = getTableForCategory(category)
  if (account.role !== "locale_admin" && account.role !== "superadmin") {
    const supabase = await createClient()
    let limitQuery = supabase
      .from(insertTable)
      .select("*", { count: "exact", head: true })
      .eq("user_id", account.id)
    if (!insertIsPlatform) limitQuery = limitQuery.eq("category", category)
    const { count } = await limitQuery

    if ((count ?? 0) >= (config.maxUserRows ?? 100)) {
      return NextResponse.json(
        { error: `Row limit reached. Max ${config.maxUserRows} rows per category.` },
        { status: 429 }
      )
    }
  }

  // Auto fields
  if (config.fields.createdAt?.auto) body.createdAt = new Date().toISOString()

  const supabase = await createClient()
  const insertPayload: Record<string, unknown> = {
    user_id: account.id,
    locale: config.locale ? locale : "en",
    is_system: account.role === "locale_admin" || account.role === "superadmin",
    data: body
  }
  if (!insertIsPlatform) insertPayload.category = category

  const { data, error } = await supabase
    .from(insertTable)
    .insert(insertPayload)
    .select()
    .single()

  if (error) return NextResponse.json({ error: "Insert failed", detail: error.message }, { status: 500 })

  await logAudit(account.id, "POST", category, data.id)

  const versionFields = config.versions[version]
  return NextResponse.json(applyVersionShape(data.data, versionFields), { status: 201 })
}
