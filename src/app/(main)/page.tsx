import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-24">
      {/* Hero */}
      <div className="text-center">
        <span className="inline-block rounded-full border border-border px-3 py-1 text-xs text-muted-foreground mb-6">
          Free to start · $8/year for full access
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          A real API to practice against
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
          Pre-seeded data across multiple categories. Full CRUD, auth practice,
          custom tables, and behavior modifiers — all under one API key.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/docs"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors"
          >
            Browse the API
          </Link>
          <Link
            href="/pricing"
            className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            See pricing
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="mt-24 grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-5">
          <h3 className="font-medium text-foreground">Pre-seeded data</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Cats, products, users, recipes, jokes — ready to query. No setup required.
          </p>
        </div>
        <div className="rounded-lg border border-border p-5">
          <h3 className="font-medium text-foreground">Behavior modifiers</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">/slow2/</code> or{" "}
            <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">/chaos/</code> to any
            endpoint to simulate real-world conditions.
          </p>
        </div>
        <div className="rounded-lg border border-border p-5">
          <h3 className="font-medium text-foreground">Auth practice</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Spin up disposable practice accounts to test sign-up and login flows.
          </p>
        </div>
      </div>

      {/* Quick example */}
      <div className="mt-16 rounded-lg border border-border bg-muted/50 p-6">
        <p className="text-xs font-mono text-muted-foreground mb-3">Example request</p>
        <pre className="text-sm font-mono text-foreground overflow-x-auto">
{`GET https://apicamp.dev/api/en/v1/cats
Authorization: Bearer YOUR_API_KEY`}
        </pre>
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-mono text-muted-foreground mb-3">Response</p>
          <pre className="text-sm font-mono text-foreground overflow-x-auto">
{`[
  { "id": 1, "name": "Whiskers", "breed": "Tabby", "age": 3, "color": "orange" },
  { "id": 2, "name": "Luna", "breed": "Siamese", "age": 5, "color": "cream" }
]`}
          </pre>
        </div>
      </div>
    </main>
  );
}
