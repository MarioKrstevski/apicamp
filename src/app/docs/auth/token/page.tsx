export default function AuthTokenDocsPage() {
  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Token Auth</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Stateful token-based auth. Signup and signin return a <code className="text-xs bg-muted px-1 py-0.5 rounded">tok_</code> session
          token. Send it as <code className="text-xs bg-muted px-1 py-0.5 rounded">Authorization: Bearer &lt;token&gt;</code> to access protected endpoints.
          Signout invalidates the token server-side.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Base URL</h2>
        <pre className="rounded-lg bg-muted px-4 py-3 text-sm font-mono overflow-x-auto">
          /api/[modifiers]/auth/token/[action]
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
                { method: "POST", path: "/auth/token/signup",           auth: false, desc: "Register + receive token" },
                { method: "POST", path: "/auth/token/signin",           auth: false, desc: "Sign in + receive token" },
                { method: "POST", path: "/auth/token/signout",          auth: true,  desc: "Invalidate token" },
                { method: "GET",  path: "/auth/token/me",               auth: true,  desc: "Get current account" },
                { method: "GET",  path: "/auth/token/verify-email?token=", auth: false, desc: "Verify email" },
                { method: "POST", path: "/auth/token/forgot-password",  auth: false, desc: "Request reset link (in debug)" },
                { method: "POST", path: "/auth/token/reset-password?token=", auth: false, desc: "Set new password" },
              ].map(row => (
                <tr key={row.path}>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                      row.method === "GET"
                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300"
                        : "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
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
        <h2 className="text-base font-semibold text-foreground">Token format</h2>
        <p className="text-sm text-muted-foreground">
          Tokens are <code className="text-xs bg-muted px-1 py-0.5 rounded">tok_</code> followed by 64 hex characters (68 chars total).
          They expire after <strong>24 hours</strong>. You can have multiple active tokens (one per signin).
          Signout deletes only the token used in that request.
        </p>
        <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto">
          tok_4f9a2c1b8e3d7a2f...  (68 chars)
        </pre>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Examples</h2>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">POST /auth/token/signup → token returned</p>
          <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto">{`// Response 201
{
  "success": true,
  "token": "tok_4f9a2c1b...",
  "account": { "id": "uuid", "email": "alice@example.com", "isVerified": false, "createdAt": "..." },
  "debug": { "note": "...", "url": "/api/en/v1/auth/token/verify-email?token=abc" }
}`}</pre>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">GET /auth/token/me — protected endpoint</p>
          <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto">{`// Header required
Authorization: Bearer tok_4f9a2c1b...

// Response 200
{ "account": { "id": "uuid", "email": "alice@example.com", "isVerified": true, "createdAt": "..." } }`}</pre>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">POST /auth/token/forgot-password</p>
          <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto">{`// Request body
{ "email": "alice@example.com" }

// Response 200 — always, even if email doesn't exist
{
  "message": "If that email is registered, a reset link has been sent.",
  "debug": { "note": "...", "url": "/api/en/v1/auth/token/reset-password?token=xyz" }
}`}</pre>
        </div>
      </section>
    </div>
  )
}
