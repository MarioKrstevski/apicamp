import { PricingCards } from "@/components/pricing-cards"

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-24">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Pricing</h1>
        <p className="mt-3 text-muted-foreground">Simple. No surprises.</p>
      </div>

      <PricingCards />

      {/* Creator nudge */}
      <div className="mt-8 flex items-center justify-between gap-4 rounded-lg border border-border p-5">
        <div>
          <h3 className="font-medium text-foreground">Teaching or making content?</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            If you have an audience learning APIs, we can give you gift keys to share with them. Reach out and we will sort something out.
          </p>
        </div>
        <a
          href="mailto:hello@apicamp.dev"
          className="shrink-0 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Contact us
        </a>
      </div>
    </main>
  )
}
