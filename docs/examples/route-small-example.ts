// app/api/[locale]/[version]/[category]/route.ts
// SMALL EXAMPLE — simplified to show the core concept clearly

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCategoryConfig } from "@/lib/categories"
import { validateApiKey, getRateLimitTier } from "@/lib/auth"
import { applyVersionShape } from "@/lib/versioning"

type Params = {
  locale: string      // "en" | "fr" | "es" | "sr"
  version: string     // "v1" | "v2" | "v3"
  category: string    // "cats" | "dogs" | "products" etc.
}

// ─── GET /api/[locale]/[version]/[category] ───────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { locale, version, category } = params

  // 1. Validate API key
  const apiKey = req.headers.get("x-api-key")
  const account = await validateApiKey(apiKey)
  if (!account) return NextResponse.json({ error: "Invalid API key" }, { status: 401 })

  // 2. Load category config
  const config = getCategoryConfig(category)
  if (!config) return NextResponse.json({ error: "Unknown category" }, { status: 404 })

  // 3. Check version exists
  if (!config.versions[version]) {
    return NextResponse.json({ error: `Version ${version} not available for ${category}` }, { status: 404 })
  }

  // 4. Parse query params
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 100)
  const sort = searchParams.get("sort") ?? "created_at"
  const order = searchParams.get("order") === "desc" ? "desc" : "asc"
  const search = searchParams.get("search") ?? ""
  const mineOnly = searchParams.get("mine_only") === "true"

  // 5. Build query
  const supabase = createClient()
  let query = supabase
    .from("user_rows")
    .select("*", { count: "exact" })
    .eq("category", category)

  // Locale filter — pull system rows for this locale + user's own rows
  if (config.locale) {
    const localeAdminId = await getLocaleAdminId(locale)
    if (mineOnly) {
      query = query.eq("user_id", account.id)
    } else {
      query = query.or(`user_id.eq.${account.id},user_id.eq.${localeAdminId}`)
    }
  }

  // Search
  if (search && config.searchable.length > 0) {
    const searchConditions = config.searchable
      .map(field => `data->>'${field}'.ilike.%${search}%`)
      .join(",")
    query = query.or(searchConditions)
  }

  // Pagination + sort
  const from = (page - 1) * limit
  query = query
    .order(`data->>'${sort}'`, { ascending: order === "asc" })
    .range(from, from + limit - 1)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 })

  // 6. Apply version shape — only return fields for this version
  const versionFields = config.versions[version]
  const shaped = data.map(row => applyVersionShape(row.data, versionFields))

  // 7. Return
  return NextResponse.json({
    data: shaped,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit)
    }
  })
}

// ─── POST /api/[locale]/[version]/[category] ─────────────────────────────

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { locale, version, category } = params

  const apiKey = req.headers.get("x-api-key")
  const account = await validateApiKey(apiKey)
  if (!account) return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
  if (account.tier === "free") return NextResponse.json({ error: "Paid plan required" }, { status: 403 })

  const config = getCategoryConfig(category)
  if (!config) return NextResponse.json({ error: "Unknown category" }, { status: 404 })

  const body = await req.json()

  // Validate against config fields
  const validation = validateFields(body, config.fields)
  if (!validation.valid) {
    return NextResponse.json({ error: "Validation failed", details: validation.errors }, { status: 400 })
  }

  // Check row limit
  const supabase = createClient()
  const { count } = await supabase
    .from("user_rows")
    .select("*", { count: "exact", head: true })
    .eq("user_id", account.id)
    .eq("category", category)

  if ((count ?? 0) >= config.maxUserRows) {
    return NextResponse.json({ error: `Max ${config.maxUserRows} rows per category` }, { status: 429 })
  }

  const { data, error } = await supabase
    .from("user_rows")
    .insert({ user_id: account.id, category, data: body })
    .select()
    .single()

  if (error) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

  const versionFields = config.versions[version]
  return NextResponse.json(applyVersionShape(data.data, versionFields), { status: 201 })
}
