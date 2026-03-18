// app/api/[...segments]/route.ts
// SMALL EXAMPLE — simplified to show the core concept clearly

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTableConfig } from "@/lib/tables"
import { validateApiKey } from "@/lib/auth"

// URL: /api/[locale]/[version]/[modifiers...]/[resource]
// Segments are parsed from the catch-all [...segments] param

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, l) => l.toUpperCase())
}

function rowToPayload(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (k === "user_id") continue
    out[snakeToCamel(k)] = v
  }
  return out
}

// ─── GET /api/en/v1/quotes ──────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ segments: string[] }> }) {
  const { segments } = await params
  // Parse segments: locale, version, modifiers, resource
  const locale = segments[0]   // "en"
  const version = segments[1]  // "v1"
  const resource = segments[segments.length - 1] // "quotes"

  // 1. Validate API key
  const apiKey = req.headers.get("x-api-key")
  const account = await validateApiKey(apiKey)
  if (!account) return NextResponse.json({ error: "Invalid API key" }, { status: 401 })

  // 2. Load table config
  const config = getTableConfig(resource)
  if (!config) return NextResponse.json({ error: "Unknown resource" }, { status: 404 })

  // 3. Check version exists
  if (!config.versions[version]) {
    return NextResponse.json({ error: `Version ${version} not available` }, { status: 404 })
  }

  // 4. Parse query params
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 100)
  const sort = searchParams.get("sort") ?? "created_at"
  const order = searchParams.get("order") === "desc" ? "desc" : "asc"
  const search = searchParams.get("search") ?? ""

  // 5. Build query — flat columns, not JSONB
  const supabase = await createClient()
  let query = supabase
    .from(resource)          // each table has its own DB table
    .select("*", { count: "exact" })

  // Locale filter — pull locale admin rows + user's own rows
  if (config.locale) {
    const localeAdminId = process.env[`LOCALE_ADMIN_${locale.toUpperCase()}`]
    query = query.or(`user_id.eq.${account.id},user_id.eq.${localeAdminId}`)
  }

  // Search — uses flat column names
  if (search && config.searchable.length > 0) {
    const conditions = config.searchable
      .map(field => `${camelToSnake(field)}.ilike.%${search}%`)
      .join(",")
    query = query.or(conditions)
  }

  // Pagination + sort
  const from = (page - 1) * limit
  query = query
    .order(camelToSnake(sort), { ascending: order === "asc" })
    .range(from, from + limit - 1)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 })

  // 6. Apply version shape — only return fields for this version
  const versionFields = config.versions[version]
  const shaped = (data ?? []).map(row => {
    const payload = rowToPayload(row as Record<string, unknown>)
    const out: Record<string, unknown> = { id: payload.id }
    for (const field of versionFields) {
      if (field in payload) out[field] = payload[field]
    }
    return out
  })

  // 7. Return
  return NextResponse.json({
    data: shaped,
    meta: { total: count, page, limit, totalPages: Math.ceil((count ?? 0) / limit) }
  })
}
