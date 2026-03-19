export default function AuthExplainedPage() {
  return (
    <div className="max-w-3xl space-y-12">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Auth Explained</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A plain-language guide to how authentication works — what's happening in the database,
          why things are done the way they are, and what this API simplifies.
        </p>
      </div>

      {/* 1 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">What is authentication?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Authentication is the process of proving who you are. When you sign in to an app,
          you're telling the server "I am Alice" and backing it up with something only Alice knows — her password.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Don't confuse it with <strong className="text-foreground">authorization</strong>, which is about what you're allowed to do once
          the server knows who you are. Authentication comes first — you can't authorize someone whose identity you haven't verified.
        </p>
      </section>

      {/* 2 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Passwords and hashing</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Passwords are never stored in plaintext. If the database is leaked, an attacker shouldn't be able to read them.
          Instead, the server runs the password through a <strong className="text-foreground">hash function</strong> — a one-way transformation
          that produces a fixed-length string. The hash is what gets stored.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          When you sign in, the server hashes what you typed and compares it to the stored hash.
          If they match, the password was correct — without the server ever "knowing" the original password.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A plain hash isn't enough. Attackers precompute hash tables for common passwords ("rainbow tables").
          The fix is a <strong className="text-foreground">salt</strong> — a random string added to the password before hashing,
          unique per user. This means even two users with the same password produce different hashes.
        </p>
        <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto">{`// What gets stored in the database (this API uses scrypt):
"a3f9b2c1d4e5f6a7:8b2e4f6a1c3d5e7f9..."
 ─────────────── ──────────────────────
    salt (random)       hash`}</pre>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This API uses <code className="text-xs bg-muted px-1 py-0.5 rounded">scrypt</code> — a memory-hard algorithm designed to be slow,
          making brute-force attacks expensive even with specialized hardware.
        </p>
      </section>

      {/* 3 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Sessions and tokens</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          HTTP is stateless — each request is independent. The server doesn't remember you from one request to the next.
          Sending your password on every request would be insecure and cumbersome, so instead you trade it for a <strong className="text-foreground">token</strong>.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          On signin, the server creates a random token, stores a hash of it in the database, and returns the raw token to you.
          You include it on every subsequent request. The server looks it up, confirms it's valid, and knows who you are.
        </p>
        <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto">{`// Send the token in the Authorization header
Authorization: Bearer tok_4f9a2c1b8e3d7a2f...`}</pre>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Tokens can expire. When they do, the user must sign in again to get a new one.
          Signout deletes the token from the database — that token will never work again, even if someone has a copy of it.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This API issues <strong className="text-foreground">opaque session tokens</strong> — random strings with no embedded data.
          JWTs (JSON Web Tokens) are a popular alternative that encode claims directly in the token, but they're harder to invalidate.
          Session tokens are simpler to reason about and easier to revoke.
        </p>
      </section>

      {/* 4 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Email verification</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Verifying email proves that the person who signed up actually has access to that inbox.
          Without it, anyone could register as <code className="text-xs bg-muted px-1 py-0.5 rounded">ceo@bigcorp.com</code>.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The flow: on signup, the server generates a random one-time token, stores it on the account, and emails a link
          containing it. When the user opens the link, the server finds the matching token, marks the account as verified, and clears the token.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Since this is a practice API, no email is sent. Instead, the signup response includes a <code className="text-xs bg-muted px-1 py-0.5 rounded">debug</code> object
          with the verification URL you would normally receive by email. Open it to complete verification.
        </p>
        <pre className="rounded-lg bg-muted px-4 py-3 text-xs font-mono overflow-x-auto">{`// From the signup response:
"debug": {
  "note": "This is a practice API — no real email is sent. Use the url below.",
  "url": "/api/en/v1/auth/token/verify-email?token=abc123def456..."
}`}</pre>
      </section>

      {/* 5 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Password reset</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Password reset works like email verification — a short-lived token is generated and "emailed" to you.
          You submit it with your new password. The server verifies the token, updates the hash, and invalidates all existing sessions
          (you leaked your password, so existing sessions might be compromised too).
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Reset tokens expire quickly — <strong className="text-foreground">1 hour</strong> in this API. They're single-use credentials with a narrow window.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Notice that <code className="text-xs bg-muted px-1 py-0.5 rounded">POST /forgot-password</code> always returns the same response,
          whether or not the email exists. This prevents <strong className="text-foreground">user enumeration</strong> — attackers probing
          which email addresses are registered.
        </p>
      </section>

      {/* 6 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Protected endpoints</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A "protected" endpoint requires a valid token to respond. The server reads the{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">Authorization</code> header, hashes the token,
          looks it up in the sessions table, checks it hasn't expired, then proceeds. No token (or an expired/invalid one)
          returns a <code className="text-xs bg-muted px-1 py-0.5 rounded">401 Unauthorized</code>.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          In this API, <code className="text-xs bg-muted px-1 py-0.5 rounded">GET /me</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">PUT /me</code>,
          <code className="text-xs bg-muted px-1 py-0.5 rounded"> DELETE /me</code>, and <code className="text-xs bg-muted px-1 py-0.5 rounded">POST /signout</code> are all protected.
          Signup, signin, forgot-password, and verify-email are public — they're how you obtain a token in the first place.
        </p>
      </section>

      {/* 7 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Account vs user</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          An <strong className="text-foreground">account</strong> is credentials — an email and a password hash. It's how you prove identity.
          A <strong className="text-foreground">user</strong> (or profile) is data about a person — a display name, bio, avatar, location.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Many apps merge these into a single "users" table, which works fine at small scale. Keeping them separate is cleaner
          when you need to support multiple login methods (password, OAuth, magic link) all pointing at the same profile,
          or when different parts of the system have different access patterns.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The <a href="/docs/auth/profile" className="text-primary underline underline-offset-4">Profile Auth tier</a> in this API
          demonstrates the split: <code className="text-xs bg-muted px-1 py-0.5 rounded">auth_accounts_profile</code> holds credentials,
          <code className="text-xs bg-muted px-1 py-0.5 rounded"> auth_user_profiles</code> holds the editable profile data.
        </p>
      </section>

      {/* 8 */}
      <section className="rounded-lg border border-border p-5 space-y-3">
        <h2 className="text-base font-semibold text-foreground">What this API simplifies</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2"><span className="text-muted-foreground/50 shrink-0">—</span><span><strong className="text-foreground">No real emails.</strong> Verification and reset URLs are returned in the <code className="text-xs bg-muted px-1 py-0.5 rounded">debug</code> field of the response instead of being emailed.</span></li>
          <li className="flex gap-2"><span className="text-muted-foreground/50 shrink-0">—</span><span><strong className="text-foreground">Opaque tokens, not JWTs.</strong> Simpler to understand. No signature verification, no claims parsing — just a random string that the server looks up.</span></li>
          <li className="flex gap-2"><span className="text-muted-foreground/50 shrink-0">—</span><span><strong className="text-foreground">No refresh tokens.</strong> Tokens last 24 hours. A real production system typically uses short-lived access tokens (15 min) paired with long-lived refresh tokens.</span></li>
          <li className="flex gap-2"><span className="text-muted-foreground/50 shrink-0">—</span><span><strong className="text-foreground">Scoped to your API key.</strong> Each developer gets their own email namespace — two developers can both register <code className="text-xs bg-muted px-1 py-0.5 rounded">test@test.com</code> without conflict.</span></li>
        </ul>
      </section>
    </div>
  )
}
