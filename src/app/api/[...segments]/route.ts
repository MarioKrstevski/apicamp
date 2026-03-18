// app/api/[...segments]/route.ts
// All API traffic flows through here. Segments are classified by type —
// locale, version, behavior modifiers — with the first unrecognized segment
// being the resource name (= DB table name) and the one after it (if any) the id.
//
// Examples:
//   /api/users                         → en, v1, [], users, null
//   /api/en/v1/users                   → en, v1, [], users, null
//   /api/v2/fr/users                   → fr, v2, [], users, null
//   /api/slow2/chaos/users             → en, v1, [slow2,chaos], users, null
//   /api/en/v2/slow2/chaos/users/123   → en, v2, [slow2,chaos], users, 123

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTableConfig } from "@/lib/tables"
import { validateApiKey, type Account } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rateLimit"
import type { TableConfig } from "@/types/table"
import { applyVersionShape } from "@/lib/versioning"
import { validateFields } from "@/lib/validation"
import { getLocaleAdminId } from "@/lib/locales"
import { logAudit } from "@/lib/audit"

// ─── SEGMENT PARSER ───────────────────────────────────────────────────────────

const LOCALES   = new Set(["en", "fr", "es", "sr", "de", "mk"])
const VERSIONS  = new Set(["v1", "v2", "v3"])
const BEHAVIORS = new Set(["slow1", "slow2", "slow3", "chaos", "empty", "stale", "random", "numid", "uuid", "bothid"])

type ParsedSegments = {
  locale: string
  version: string
  behaviors: string[]
  resource: string | null   // = DB table name
  id: string | null
}

function parseSegments(segments: string[]): ParsedSegments {
  let locale   = "en"
  let version  = "v1"
  const behaviors: string[] = []
  let resource: string | null = null
  let id: string | null = null

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (LOCALES.has(seg))        { locale = seg; continue }
    if (VERSIONS.has(seg))       { version = seg; continue }
    if (BEHAVIORS.has(seg))      { behaviors.push(seg); continue }
    resource = seg
    id = segments[i + 1] ?? null
    break
  }

  return { locale, version, behaviors, resource, id }
}

// ─── BOOTSTRAP ────────────────────────────────────────────────────────────────

type BootstrapOk = { account: Account; config: TableConfig; parsed: ParsedSegments }
type BootstrapResult = { error: NextResponse } | BootstrapOk

async function bootstrap(req: NextRequest, parsed: ParsedSegments): Promise<BootstrapResult> {
  const { locale, version, resource } = parsed

  if (!resource) {
    return { error: NextResponse.json({ error: "No resource in URL" }, { status: 400 }) }
  }

  const apiKey = req.headers.get("x-api-key")
  const account = await validateApiKey(apiKey)
  if (!account) {
    return { error: NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 }) }
  }

  const limited = await checkRateLimit(account)
  if (limited) {
    return {
      error: NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "X-RateLimit-Reset": limited.resetAt } }
      )
    }
  }

  const config = getTableConfig(resource)
  if (!config) {
    return { error: NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 404 }) }
  }

  if (!config.versions[version]) {
    const available = Object.keys(config.versions).join(", ")
    return {
      error: NextResponse.json(
        { error: `Version '${version}' not available for '${resource}'. Available: ${available}` },
        { status: 404 }
      )
    }
  }

  if (config.locale && !LOCALES.has(locale)) {
    return { error: NextResponse.json({ error: `Unsupported locale: ${locale}` }, { status: 400 }) }
  }

  return { account, config, parsed }
}

// ─── BEHAVIOR MODIFIERS ───────────────────────────────────────────────────────

async function applyDelay(behaviors: string[]): Promise<void> {
  const ms = behaviors.includes("slow3") ? 3000
           : behaviors.includes("slow2") ? 1500
           : behaviors.includes("slow1") ? 500
           : 0
  if (ms > 0) await new Promise(r => setTimeout(r, ms))
}

function chaosResponse(behaviors: string[]): NextResponse | null {
  if (!behaviors.includes("chaos") || Math.random() >= 0.3) return null
  const pool = [
    { status: 500, error: "Internal Server Error" },
    { status: 503, error: "Service Unavailable" },
    { status: 504, error: "Gateway Timeout" },
  ]
  const pick = pool[Math.floor(Math.random() * pool.length)]
  return NextResponse.json({ error: pick.error }, { status: pick.status })
}

function setStaleHeaders(res: NextResponse, behaviors: string[]): void {
  if (!behaviors.includes("stale")) return
  const ago = new Date(Date.now() - 86400000).toUTCString()
  res.headers.set("Last-Modified", ago)
  res.headers.set("X-Data-Age", "86400")
  res.headers.set("X-Stale", "true")
  res.headers.set("Cache-Control", "max-age=0")
}

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────

/** camelCase → snake_case  (e.g. "firstName" → "first_name") */
function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/** snake_case → camelCase  (e.g. "first_name" → "firstName") */
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/** Ownership columns and other internal cols to strip from API responses. */
const INTERNAL_COLS = new Set(["user_id", "created_by"])

/** Convert a DB row (snake_case cols) to an API payload (camelCase keys). */
function rowToPayload(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (INTERNAL_COLS.has(k)) continue
    out[snakeToCamel(k)] = v
  }
  return out
}

/** Convert a camelCase request body to snake_case DB columns for insert/update. */
function bodyToRow(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    out[camelToSnake(k)] = v
  }
  return out
}

/** True when the id segment is all digits — routes to num_id column instead of UUID id. */
function isNumericId(id: string): boolean {
  return /^\d+$/.test(id)
}

/** Column to query by, based on the id format. */
function idCol(id: string): "num_id" | "id" {
  return isNumericId(id) ? "num_id" : "id"
}

/**
 * Apply version shape, then inject the correct id fields based on the active
 * id modifier. The modifier controls the response — not the DB lookup.
 *
 *   default / numid → { id: <num_id>, ...fields }      beginner-friendly
 *   uuid            → { id: <uuid>,   ...fields }      production-realistic
 *   bothid          → { num_id, id: <uuid>, ...fields } educational
 */
function shape(
  payload: Record<string, unknown>,
  fields: unknown,
  behaviors: string[],
): Record<string, unknown> {
  const versioned = applyVersionShape(payload, fields)
  // Strip any id fields the version config may have included — we own them.
  delete versioned.id
  delete versioned.numId
  delete versioned.num_id

  if (behaviors.includes("uuid")) {
    return { id: payload.id, ...versioned }
  }
  if (behaviors.includes("bothid")) {
    return { numId: payload.numId, id: payload.id, ...versioned }
  }
  // Default and /numid/ — numeric id presented as "id"
  return { id: payload.numId, ...versioned }
}

/** Ownership column: declared in table config, falls back to "user_id". */
function ownerCol(config: TableConfig): string {
  return config.ownershipCol ?? "user_id"
}

async function getOwnedRow(
  resource: string,
  id: string,
  accountId: string,
  locale: string,
  config: TableConfig,
) {
  const col      = ownerCol(config)
  const adminId  = config.locale ? getLocaleAdminId(locale) : getLocaleAdminId("en")
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(resource)
    .select("*")
    .eq(idCol(id), id)
    .or(`${col}.eq.${accountId},${col}.eq.${adminId}`)
    .single()

  return error || !data ? null : data
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params: _params }: { params: Promise<{ segments: string[] }> }
) {
  const { segments } = await _params
  const parsed = parseSegments(segments)
  const { locale, version, behaviors, resource, id } = parsed

  const boot = await bootstrap(req, parsed)
  if ("error" in boot) return boot.error
  const { account, config } = boot

  const col = ownerCol(config)

  // ── Single resource ──────────────────────────────────────────────────────
  if (id) {
    if (behaviors.includes("empty")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const chaos = chaosResponse(behaviors)
    if (chaos) return chaos

    const row = await getOwnedRow(resource!, id, account.id, locale, config)
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const res = NextResponse.json(shape(rowToPayload(row), config.versions[version], behaviors))
    setStaleHeaders(res, behaviors)
    await applyDelay(behaviors)
    return res
  }

  // ── List ─────────────────────────────────────────────────────────────────
  if (behaviors.includes("empty")) {
    return NextResponse.json({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })
  }

  const chaos = chaosResponse(behaviors)
  if (chaos) return chaos

  const { searchParams } = new URL(req.url)
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1"))
  const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") ?? "10")), 100)
  const from  = (page - 1) * limit

  const sortParam = searchParams.get("sort") ?? "createdAt"
  const sort  = config.sortable?.includes(sortParam) ? sortParam : "createdAt"
  const order = searchParams.get("order") === "desc" ? false : true

  const search   = searchParams.get("search")?.trim() ?? ""
  const mineOnly = searchParams.get("mine_only") === "true"

  const filters: Record<string, string> = {}
  config.filterable?.forEach((field: string) => {
    const val = searchParams.get(field)
    if (val) filters[field] = val
  })

  const supabase = await createClient()
  let query = supabase.from(resource!).select("*", { count: "exact" })

  const localeAdminId = getLocaleAdminId(locale)
  const systemAdminId = getLocaleAdminId("en")

  if (config.locale) {
    if (mineOnly) {
      query = query.eq(col, account.id)
    } else if (localeAdminId) {
      query = query.or(`${col}.eq.${account.id},${col}.eq.${localeAdminId}`)
    } else {
      query = query.eq(col, account.id)
    }
  } else {
    if (!mineOnly && systemAdminId) {
      query = query.or(`${col}.eq.${account.id},${col}.eq.${systemAdminId}`)
    } else {
      query = query.eq(col, account.id)
    }
  }

  // Search — all tables use flat columns now
  const searchable = Array.isArray(config.searchable) ? config.searchable : []
  if (search && searchable.length > 0) {
    const cols = searchable.map(f => camelToSnake(f))
    query = query.or(cols.map(c => `${c}.ilike.%${search}%`).join(","))
  }

  // Filters
  Object.entries(filters).forEach(([field, value]) => {
    query = query.eq(camelToSnake(field), value)
  })

  // Sort + paginate
  const sortCol = camelToSnake(sort)
  query = query.order(sortCol, { ascending: order }).range(from, from + limit - 1)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: "Query failed", detail: error.message }, { status: 500 })

  let shaped = (data ?? []).map((row: Record<string, unknown>) =>
    shape(rowToPayload(row), config.versions[version], behaviors)
  )

  if (behaviors.includes("random")) shaped = shaped.sort(() => Math.random() - 0.5)

  const res = NextResponse.json({
    data: shaped,
    meta: { total: count ?? 0, page, limit, totalPages: Math.ceil((count ?? 0) / limit), locale, version },
  })
  setStaleHeaders(res, behaviors)
  await applyDelay(behaviors)
  return res
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params: _params }: { params: Promise<{ segments: string[] }> }
) {
  const { segments } = await _params
  const parsed = parseSegments(segments)
  const { version, behaviors, resource } = parsed

  const boot = await bootstrap(req, parsed)
  if ("error" in boot) return boot.error
  const { account, config } = boot

  if (account.tier === "free") {
    return NextResponse.json({ error: "Writing data requires a paid account" }, { status: 403 })
  }

  if (account.role === "locale_admin" && account.locale !== parsed.locale) {
    return NextResponse.json({ error: "You can only write to your own locale" }, { status: 403 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) }

  if (JSON.stringify(body).length > 10240) {
    return NextResponse.json({ error: "Payload too large (max 10kb)" }, { status: 413 })
  }

  const validation = validateFields(body, config.fields)
  if (!validation.valid) {
    return NextResponse.json({ error: "Validation failed", details: validation.errors }, { status: 422 })
  }

  const col      = ownerCol(config)
  const supabase = await createClient()

  if (account.role !== "locale_admin" && account.role !== "superadmin") {
    const { count } = await supabase
      .from(resource!)
      .select("*", { count: "exact", head: true })
      .eq(col, account.id)
    if ((count ?? 0) >= (config.maxUserRows ?? 100)) {
      return NextResponse.json(
        { error: `Row limit reached. Max ${config.maxUserRows} rows per resource.` },
        { status: 429 }
      )
    }
  }

  if (config.fields.createdAt?.auto) body.createdAt = new Date().toISOString()

  const insertPayload: Record<string, unknown> = {
    [col]: account.id,
    ...bodyToRow(body),
  }

  const { data, error } = await supabase.from(resource!).insert(insertPayload).select().single()
  if (error) return NextResponse.json({ error: "Insert failed", detail: error.message }, { status: 500 })

  await logAudit(account.id, "POST", resource!, data.id)
  return NextResponse.json(shape(rowToPayload(data), config.versions[version], behaviors), { status: 201 })
}

// ─── PUT ──────────────────────────────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params: _params }: { params: Promise<{ segments: string[] }> }
) {
  const { segments } = await _params
  const parsed = parseSegments(segments)
  const { version, behaviors, resource, id } = parsed

  if (!id) return NextResponse.json({ error: "ID required for PUT" }, { status: 400 })

  const boot = await bootstrap(req, parsed)
  if ("error" in boot) return boot.error
  const { account, config } = boot

  if (account.tier === "free") {
    return NextResponse.json({ error: "Writing data requires a paid account" }, { status: 403 })
  }

  const col      = ownerCol(config)
  const supabase = await createClient()

  const { data: existing, error: fetchError } = await supabase
    .from(resource!)
    .select("*")
    .eq(idCol(id), id)
    .eq(col, account.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Not found or not yours" }, { status: 404 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) }

  if (JSON.stringify(body).length > 10240) {
    return NextResponse.json({ error: "Payload too large (max 10kb)" }, { status: 413 })
  }

  const validation = validateFields(body, config.fields, { partial: true })
  if (!validation.valid) {
    return NextResponse.json({ error: "Validation failed", details: validation.errors }, { status: 422 })
  }

  const updatePayload = bodyToRow(body)
  const { data, error } = await supabase
    .from(resource!).update(updatePayload).eq("id", existing.id).select().single()
  if (error) return NextResponse.json({ error: "Update failed", detail: error.message }, { status: 500 })

  await logAudit(account.id, "PUT", resource!, existing.id)
  return NextResponse.json(shape(rowToPayload(data), config.versions[version], behaviors))
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params: _params }: { params: Promise<{ segments: string[] }> }
) {
  const { segments } = await _params
  const parsed = parseSegments(segments)
  const { resource, id } = parsed

  if (!id) return NextResponse.json({ error: "ID required for DELETE" }, { status: 400 })

  const boot = await bootstrap(req, parsed)
  if ("error" in boot) return boot.error
  const { account, config } = boot

  if (account.tier === "free") {
    return NextResponse.json({ error: "Writing data requires a paid account" }, { status: 403 })
  }
  if (account.role === "locale_admin") {
    return NextResponse.json({ error: "Locale admins cannot delete rows" }, { status: 403 })
  }

  const col      = ownerCol(config)
  const supabase = await createClient()

  // Only matches rows owned by the current user — seed rows (owned by locale admin) are untouchable
  const { data: existing, error: fetchError } = await supabase
    .from(resource!)
    .select("*")
    .eq(idCol(id), id)
    .eq(col, account.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Not found or not yours" }, { status: 404 })
  }

  const { error } = await supabase.from(resource!).delete().eq("id", existing.id)
  if (error) return NextResponse.json({ error: "Delete failed", detail: error.message }, { status: 500 })

  await logAudit(account.id, "DELETE", resource!, existing.id)
  return new NextResponse(null, { status: 204 })
}
