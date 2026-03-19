export default function AuthProfileDocsPage() {
  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Profile Auth</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything in Token Auth, plus an editable profile linked to your account.
          Use <code className="text-xs bg-muted px-1 py-0.5 rounded">GET /me</code> to fetch both account and profile,{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">PUT /me</code> to update the profile, and{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">DELETE /me</code> to delete the account entirely.
          Good for practicing auth-protected CRUD on user-owned data.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Base URL</h2>
        <pre className="rounded-lg bg-muted px-4 py-3 text-sm font-mono overflow-x-auto">
          /api/[modifiers]/auth/profile/[action]
        </pre>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Endpoints</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-foreground">Method</th>
                <th className="px-4 py-2.5 text-left font-medium text-foreground">Path</th>
                <th className="px-4 py-2.5 text-left font-medium text-foreground">Auth</th>
                <th className="px-4 py-2.5 text-left font-medium text-foreground">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { method: "POST",   path: "/auth/profile/signup",              auth: false, desc: "Register + receive token" },
                { method: "POST",   path: "/auth/profile/signin",              auth: false, desc: "Sign in + receive token" },
                { method: "POST",   path: "/auth/profile/signout",             auth: true,  desc: "Invalidate token" },
                { method: "GET",    path: "/auth/profile/me",                  auth: true,  desc: "Get account + profile" },
                { method: "PUT",    path: "/auth/profile/me",                  auth: true,  desc: "Update profile fields" },
                { method: "DELETE", path: "/auth/profile/me",                  auth: true,  desc: "Delete account and profile" },
                { method: "GET",    path: "/auth/profile/verify-email?token=", auth: false, desc: "Verify email" },
                { method: "POST",   path: "/auth/profile/forgot-password",     auth: false, desc: "Request reset link" },
                { method: "POST",   path: "/auth/profile/reset-password?token=", auth: false, desc: "Set new password" },
              ].map(row => (
                <tr key={`${row.method}-${row.path}`}>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                      row.method === "GET"    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300" :
                      row.method === "PUT"    ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300" :
                      row.method === "DELETE" ? "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300" :
                      "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
                    }`}>{row.method}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.path}</td>
                  <td className="px-4 py-3 text-xs">{row.auth ? <span className="text-amber-600 dark:text-amber-400">Bearer</span> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Profile shape</h2>
        <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto">{`{
  "displayName": "Alice W.",     // max 80 chars
  "bio":         "I build things.", // max 500 chars
  "avatarUrl":   "https://...",   // valid URL or null
  "location":    "Berlin",
  "website":     "https://alice.dev", // valid URL or null
  "updatedAt":   "2025-01-01T00:00:00Z"
}`}</pre>
        <p className="text-sm text-muted-foreground">
          All fields are optional on <code className="text-xs bg-muted px-1 py-0.5 rounded">PUT</code> — only include what you want to change.
          The profile row is auto-created (all nulls) on signup.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Examples</h2>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">GET /auth/profile/me</p>
          <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto">{`// Header
Authorization: Bearer tok_4f9a2c1b...

// Response 200
{
  "account": { "id": "uuid", "email": "alice@example.com", "isVerified": true, "createdAt": "..." },
  "profile": { "displayName": null, "bio": null, "avatarUrl": null, "location": null, "website": null, "updatedAt": "..." }
}`}</pre>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">PUT /auth/profile/me</p>
          <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto">{`// Header
Authorization: Bearer tok_4f9a2c1b...

// Request body — all fields optional
{ "displayName": "Alice W.", "bio": "I build things.", "location": "Berlin" }

// Response 200
{ "profile": { "displayName": "Alice W.", "bio": "I build things.", ..., "updatedAt": "..." } }`}</pre>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">DELETE /auth/profile/me</p>
          <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto">{`// Header
Authorization: Bearer tok_4f9a2c1b...

// Response 200
{ "success": true, "message": "Account and profile deleted." }`}</pre>
        </div>
      </section>
    </div>
  )
}
