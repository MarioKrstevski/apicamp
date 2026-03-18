import { createClient } from "@/lib/supabase/server"
import { getLocaleAdminId } from "@/lib/locales"

const endpoints = [
  { method: "GET", path: "/api/en/v1/users", description: "List users", auth: "any" },
  { method: "GET", path: "/api/en/v2/users", description: "List users (v2 fields)", auth: "any" },
  { method: "GET", path: "/api/en/v3/users", description: "List users (v3 fields)", auth: "any" },
  { method: "GET", path: "/api/en/v1/users/:id", description: "Get a single user", auth: "any" },
  { method: "POST", path: "/api/en/v1/users", description: "Create a user", auth: "paid" },
  { method: "PUT", path: "/api/en/v1/users/:id", description: "Update your user", auth: "paid" },
  { method: "DELETE", path: "/api/en/v1/users/:id", description: "Delete your user", auth: "paid" },
]

const methodColor: Record<string, string> = {
  GET: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
  POST: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950",
  PUT: "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950",
  DELETE: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950",
}

const fieldsSchema = [
  { field: "id", type: "uuid", description: "Unique identifier (auto)" },
  { field: "created_by", type: "uuid", description: "Owner (auth user id)" },
  { field: "name", type: "string", description: "Full name" },
  { field: "first_name", type: "string", description: "First name" },
  { field: "last_name", type: "string", description: "Last name" },
  { field: "email", type: "string", description: "Email address" },
  { field: "age", type: "integer", description: "Age (1–120)" },
  { field: "avatar", type: "string", description: "Avatar URL" },
  { field: "phone", type: "string", description: "Phone number" },
  { field: "is_active", type: "boolean", description: "Active flag" },
  { field: "role", type: "string", description: "admin | user | moderator | guest" },
  { field: "address", type: "object", description: "Nested address" },
  { field: "tags", type: "array", description: "Tags" },
  { field: "social_links", type: "array", description: "Social links" },
  { field: "birth_date", type: "date", description: "Birth date" },
  { field: "created_at", type: "timestamptz", description: "Created at (auto)" },
]

const DISPLAY_COLUMNS = ["id", "name", "first_name", "last_name", "email", "age", "role", "created_at"]

type UsersDocsPageProps = {
  searchParams: Promise<{ locale?: string }>
}

export default async function UsersDocsPage({ searchParams }: UsersDocsPageProps) {
  const params = await searchParams
  const locale = params.locale || "en"

  let sampleRows: Record<string, unknown>[] = []
  const localeAdminId = getLocaleAdminId(locale)

  if (localeAdminId) {
    try {
      const supabase = await createClient()
      const { data: rows, error } = await supabase
        .from("users")
        .select(DISPLAY_COLUMNS.join(","))
        .eq("created_by", localeAdminId)
        .order("created_at", { ascending: false })
        .limit(10)
      if (!error && rows) sampleRows = rows
    } catch {
      sampleRows = []
    }
  }

  const hasSample = sampleRows.length > 0
  const columns = hasSample ? Object.keys(sampleRows[0]) : DISPLAY_COLUMNS

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Users</h1>
        <p className="mt-2 text-muted-foreground">
          Demo user profiles (not auth users). System rows are read-only; paid users can add their own.
          Seed from the manage dashboard.
        </p>
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
                <th className="text-left px-4 py-2.5 font-medium text-foreground">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fieldsSchema.map((row) => (
                <tr key={row.field}>
                  <td className="px-4 py-2.5 font-mono text-xs text-foreground">{row.field}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.type}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sample data (from DB) — filtered by Results locale picker */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Sample data (from database)
        </h2>
        <p className="text-xs text-muted-foreground mb-2">
          Showing rows for locale <strong>{locale}</strong> (created_by = locale admin). Use the &quot;Results locale&quot; picker above to switch.
        </p>
        {!localeAdminId ? (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            No locale admin configured for <strong>{locale}</strong>. Set <code className="rounded bg-muted px-1">LOCALE_ADMIN_{locale.toUpperCase()}</code> in .env.
          </div>
        ) : !hasSample ? (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
            No sample data for this locale. Seed the users table from the manage dashboard as the {locale} admin.
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {columns.map((key) => (
                    <th key={key} className="text-left px-4 py-2.5 font-medium text-foreground">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sampleRows.map((row: Record<string, unknown>) => (
                  <tr key={String(row.id)}>
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-2.5 text-muted-foreground font-mono text-xs max-w-[200px] truncate" title={String(row[col] ?? "")}>
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

      {/* Example response */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Example response
        </h2>
        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <p className="text-xs font-mono text-muted-foreground mb-2">GET /api/en/v1/users</p>
          <pre className="text-sm font-mono text-foreground overflow-x-auto">
            {hasSample
              ? JSON.stringify(
                  sampleRows.slice(0, 2).map((r: Record<string, unknown>) => ({
                    id: r.id,
                    name: r.name,
                    email: r.email,
                  })),
                  null,
                  2
                )
              : `[
  { "id": "...", "name": "Jane Doe", "email": "jane@example.com" },
  { "id": "...", "name": "John Smith", "email": "john@example.com" }
]`}
          </pre>
        </div>
      </div>
    </div>
  )
}
