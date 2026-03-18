import { notFound } from "next/navigation"
import registry from "@/config/registry"
import { createClient } from "@/lib/supabase/server"
import { getLocaleAdminId } from "@/lib/locales"

type Example = {
  title: string
  method: string
  url: string
  headers?: Record<string, string>
  body?: Record<string, unknown>
  response?: Record<string, unknown>
}

type FieldDef = {
  type?: unknown
  required?: unknown
  values?: unknown
  min?: unknown
  max?: unknown
  maxLength?: unknown
  maxItems?: unknown
  itemType?: unknown
  auto?: unknown
  unique?: unknown
  [key: string]: unknown
}

const methodColor: Record<string, string> = {
  GET: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
  POST: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950",
  PUT: "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950",
  DELETE: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950",
}

function fieldNotes(field: FieldDef): string {
  const parts: string[] = []
  if (Array.isArray(field.values)) parts.push(field.values.join(" | "))
  if (field.min !== undefined && field.max !== undefined) parts.push(`${field.min}–${field.max}`)
  else if (field.min !== undefined) parts.push(`≥ ${field.min}`)
  else if (field.max !== undefined) parts.push(`≤ ${field.max}`)
  if (field.maxLength !== undefined) parts.push(`max ${field.maxLength} chars`)
  if (field.itemType) parts.push(`items: ${field.itemType}`)
  if (field.maxItems !== undefined) parts.push(`max ${field.maxItems} items`)
  if (field.unique) parts.push("unique")
  if (field.auto) parts.push("auto-set")
  return parts.join(", ")
}

function camelToSnake(s: string): string {
  return s.replace(/([A-Z])/g, "_$1").toLowerCase()
}

type Props = {
  params: Promise<{ table: string }>
  searchParams: Promise<{ locale?: string }>
}

export default async function TableDocsPage({ params, searchParams }: Props) {
  const { table } = await params
  const { locale = "en" } = await searchParams

  const config = registry[table]
  if (!config) notFound()

  // Fields table — system fields + config fields
  const systemFields = [
    { name: "id", type: "uuid", required: true, notes: "auto-set" },
    { name: "created_at", type: "datetime", required: false, notes: "auto-set" },
  ]
  const configFields = Object.entries(config.fields).map(([name, def]) => ({
    name,
    type: String((def as FieldDef).type ?? "string"),
    required: Boolean((def as FieldDef).required),
    notes: fieldNotes(def as FieldDef),
  }))

  // Endpoints — generated from config
  const versions = Object.keys(config.versions)
  const firstVersion = versions[0]
  const singular = config.label.replace(/s$/i, "").toLowerCase()
  const endpoints = [
    ...versions.map((v) => ({
      method: "GET",
      path: `/api/en/${v}/${table}`,
      description: `List ${config.label} (${v} fields)`,
      auth: "any",
    })),
    {
      method: "GET",
      path: `/api/en/${firstVersion}/${table}/:id`,
      description: `Get a single ${singular}`,
      auth: "any",
    },
    ...(config.allowUserRows
      ? [
          { method: "POST", path: `/api/en/${firstVersion}/${table}`, description: `Create a ${singular}`, auth: "paid" },
          { method: "PUT", path: `/api/en/${firstVersion}/${table}/:id`, description: `Update your ${singular}`, auth: "paid" },
          { method: "DELETE", path: `/api/en/${firstVersion}/${table}/:id`, description: `Delete your ${singular}`, auth: "paid" },
        ]
      : []),
  ]

  // Examples from config docs
  const examples = ((config.docs as { examples?: Example[] } | undefined)?.examples) ?? []

  // Sample data from DB
  const v1Fields = config.versions[firstVersion] ?? []
  const displayCols = ["id", ...v1Fields.filter((f) => f !== "id").slice(0, 5)]
  const dbCols = displayCols.map(camelToSnake)
  const ownerCol = camelToSnake(config.ownershipCol ?? "userId")
  const localeAdminId = config.locale ? getLocaleAdminId(locale) : getLocaleAdminId("en")

  let sampleRows: Record<string, unknown>[] = []
  if (localeAdminId) {
    try {
      const supabase = await createClient()
      const { data } = await supabase
        .from(table)
        .select(dbCols.join(","))
        .eq(ownerCol, localeAdminId)
        .order("created_at", { ascending: false })
        .limit(8)
      if (data) sampleRows = data as Record<string, unknown>[]
    } catch {
      sampleRows = []
    }
  }
  const cols = sampleRows.length > 0 ? Object.keys(sampleRows[0]) : dbCols

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{config.label}</h1>
        {config.description && (
          <p className="mt-2 text-muted-foreground">{config.description}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {config.locale && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              locale-aware
            </span>
          )}
          {config.allowUserRows && (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-700 dark:bg-green-950 dark:text-green-300">
              writable (paid)
            </span>
          )}
          {config.maxUserRows && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              max {config.maxUserRows} rows/user
            </span>
          )}
          {config.searchable && config.searchable !== false && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              searchable
            </span>
          )}
        </div>
      </div>

      {/* Fields */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Fields
        </h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-foreground">Field</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground">Type</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground">Required</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...systemFields, ...configFields].map((row) => (
                <tr key={row.name}>
                  <td className="px-4 py-2.5 font-mono text-xs text-foreground">{row.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.type}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.required ? "yes" : "no"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{row.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Versions */}
      {versions.length > 1 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Versions
          </h2>
          <div className="flex flex-col gap-3">
            {Object.entries(config.versions).map(([v, fields]) => (
              <div key={v} className="rounded-lg border border-border px-4 py-3">
                <p className="font-mono text-sm font-medium text-foreground mb-1">{v}</p>
                <p className="text-xs text-muted-foreground font-mono">{fields.join(", ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sortable / Filterable */}
      {((config.sortable && config.sortable.length > 0) || (config.filterable && config.filterable.length > 0)) && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Query params
          </h2>
          <div className="flex flex-col gap-2 text-sm">
            {config.sortable && config.sortable.length > 0 && (
              <p className="text-muted-foreground">
                <span className="font-mono text-foreground">?sort=</span>{" "}
                {config.sortable.join(", ")}
              </p>
            )}
            {config.filterable && config.filterable.length > 0 && (
              <p className="text-muted-foreground">
                <span className="font-mono text-foreground">?{config.filterable[0]}=</span>{" "}
                filter by: {config.filterable.join(", ")}
              </p>
            )}
            {config.searchable && config.searchable !== false && (
              <p className="text-muted-foreground">
                <span className="font-mono text-foreground">?search=</span>{" "}
                full-text search
              </p>
            )}
          </div>
        </div>
      )}

      {/* Endpoints */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Endpoints
        </h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-foreground w-20">Method</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground">Path</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground">Description</th>
                <th className="text-left px-4 py-2.5 font-medium text-foreground">Auth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {endpoints.map((ep) => (
                <tr key={ep.method + ep.path}>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold font-mono ${methodColor[ep.method]}`}>
                      {ep.method}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-foreground">{ep.path}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{ep.description}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{ep.auth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sample data */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Sample data
        </h2>
        {config.locale && (
          <p className="text-xs text-muted-foreground mb-2">
            Showing rows for locale <strong>{locale}</strong>. Use the &quot;Results locale&quot; picker above to switch.
          </p>
        )}
        {!localeAdminId ? (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            No locale admin configured for <strong>{locale}</strong>. Set{" "}
            <code className="rounded bg-muted px-1">LOCALE_ADMIN_{locale.toUpperCase()}</code> in .env.
          </div>
        ) : sampleRows.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            No rows found. Seed the {config.label.toLowerCase()} table from the manage dashboard.
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {cols.map((k) => (
                    <th key={k} className="text-left px-4 py-2.5 font-medium text-foreground">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sampleRows.map((row, i) => (
                  <tr key={String(row.id ?? i)}>
                    {cols.map((col) => (
                      <td
                        key={col}
                        className="px-4 py-2.5 text-muted-foreground font-mono text-xs max-w-[200px] truncate"
                        title={String(row[col] ?? "")}
                      >
                        {row[col] != null ? String(row[col]) : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Examples from config */}
      {examples.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Examples
          </h2>
          <div className="flex flex-col gap-4">
            {examples.map((ex, i) => (
              <div key={i} className="rounded-lg border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b border-border">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold font-mono ${methodColor[ex.method]}`}>
                    {ex.method}
                  </span>
                  <span className="font-mono text-xs text-foreground">{ex.url}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{ex.title}</span>
                </div>
                {(ex.headers || ex.body || ex.response) && (
                  <div className="p-4 space-y-3">
                    {ex.headers && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Headers</p>
                        <pre className="text-xs font-mono text-foreground bg-muted/30 rounded p-3 overflow-x-auto">
                          {JSON.stringify(ex.headers, null, 2)}
                        </pre>
                      </div>
                    )}
                    {ex.body && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Body</p>
                        <pre className="text-xs font-mono text-foreground bg-muted/30 rounded p-3 overflow-x-auto">
                          {JSON.stringify(ex.body, null, 2)}
                        </pre>
                      </div>
                    )}
                    {ex.response && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Response</p>
                        <pre className="text-xs font-mono text-foreground bg-muted/30 rounded p-3 overflow-x-auto">
                          {JSON.stringify(ex.response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
