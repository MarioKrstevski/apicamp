export default function AuthBasicDocsPage() {
  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Basic Auth</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The simplest auth flow — register, sign in, verify your email. No tokens issued.
          Great for understanding the concept before moving to stateful sessions.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Base URL</h2>
        <pre className="rounded-lg bg-muted px-4 py-3 text-sm font-mono overflow-x-auto">
          /api/[modifiers]/auth/basic/[action]
        </pre>
        <p className="text-sm text-muted-foreground">
          All existing modifiers work: <code className="text-xs bg-muted px-1 py-0.5 rounded">slow1</code>{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">slow2</code>{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">chaos</code>{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">stale</code>.
          The <code className="text-xs bg-muted px-1 py-0.5 rounded">empty</code> and{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">random</code> modifiers are ignored for auth endpoints.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Endpoints</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-foreground">Method</th>
                <th className="px-4 py-2.5 text-left font-medium text-foreground">Path</th>
                <th className="px-4 py-2.5 text-left font-medium text-foreground">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3"><span className="font-mono text-xs bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 px-1.5 py-0.5 rounded">POST</span></td>
                <td className="px-4 py-3 font-mono text-xs">/auth/basic/signup</td>
                <td className="px-4 py-3 text-muted-foreground">Register a new account</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><span className="font-mono text-xs bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 px-1.5 py-0.5 rounded">POST</span></td>
                <td className="px-4 py-3 font-mono text-xs">/auth/basic/signin</td>
                <td className="px-4 py-3 text-muted-foreground">Sign in with email + password</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><span className="font-mono text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded">GET</span></td>
                <td className="px-4 py-3 font-mono text-xs">/auth/basic/verify-email?token=</td>
                <td className="px-4 py-3 text-muted-foreground">Verify email with token from signup response</td>
              </tr>
              <tr>
                <td className="px-4 py-3"><span className="font-mono text-xs bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 px-1.5 py-0.5 rounded">POST</span></td>
                <td className="px-4 py-3 font-mono text-xs">/auth/basic/signout</td>
                <td className="px-4 py-3 text-muted-foreground">Conceptual signout (no token to invalidate)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Examples</h2>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">POST /auth/basic/signup</p>
          <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto">{`// Request body
{ "email": "alice@example.com", "password": "hunter2!!" }

// Response 201
{
  "success": true,
  "account": { "id": "uuid", "email": "alice@example.com", "isVerified": false, "createdAt": "..." },
  "debug": {
    "note": "This is a practice API — no real email is sent. Use the url below.",
    "url": "/api/en/v1/auth/basic/verify-email?token=abc123"
  }
}`}</pre>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">POST /auth/basic/signin</p>
          <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto">{`// Request body
{ "email": "alice@example.com", "password": "hunter2!!" }

// Response 200
{ "success": true, "account": { "id": "uuid", "email": "alice@example.com", "isVerified": true, "createdAt": "..." } }`}</pre>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">GET /auth/basic/verify-email?token=abc123</p>
          <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto">{`// Response 200
{ "success": true, "message": "Email verified. You can now sign in." }`}</pre>
        </div>
      </section>

      <section className="rounded-lg border border-border p-4 space-y-1">
        <p className="text-sm font-medium text-foreground">No tokens at this tier</p>
        <p className="text-sm text-muted-foreground">
          Basic auth returns account data but no session token. Every request is independent.
          Move to <a href="/docs/auth/token" className="text-primary underline underline-offset-4">Token Auth</a> to
          practice stateful sessions with Bearer tokens.
        </p>
      </section>
    </div>
  )
}
