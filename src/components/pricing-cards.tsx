"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PatronCard } from "@/components/patron-card";

// ─── Edit these to update the pricing page ────────────────────────────────

const FREE_FEATURES: { label: string; included: boolean }[] = [
  { label: "GET requests only", included: true },
  { label: "All pre-seeded categories", included: true },
  { label: "50 requests / day", included: true },
  { label: "POST, PUT, DELETE", included: false },
  { label: "Custom tables", included: false },
  { label: "Auth practice accounts", included: false },
  { label: "Gift keys", included: false },
];

const LEARNER_FEATURES: { label: string }[] = [
  { label: "Full CRUD (GET, POST, PUT, DELETE)" },
  { label: "All pre-seeded categories" },
  { label: "1,000 requests / day" },
  { label: "Up to 3 custom tables" },
  { label: "Auth practice accounts" },
  { label: "2 gift keys to share" },
  { label: "Dev key + portfolio key" },
  { label: "Audit log, webhooks, file uploads" },
];

type PeriodId = "monthly" | "biannual" | "yearly";

const BILLING_PERIODS: {
  id: PeriodId;
  label: string;
  total: number;
  perMonth: number;
  billedNote: string;
  badge?: string;
}[] = [
  {
    id: "monthly",
    label: "Monthly",
    total: 2.5,
    perMonth: 2.5,
    billedNote: "Billed monthly",
  },
  {
    id: "biannual",
    label: "6 months",
    total: 12,
    perMonth: 2,
    billedNote: "Billed every 6 months",
  },
  {
    id: "yearly",
    label: "Yearly",
    total: 21,
    perMonth: 1.67,
    billedNote: "Billed yearly",
    badge: "Best value",
  },
];

// ──────────────────────────────────────────────────────────────────────────

export function PricingCards() {
  const [period, setPeriod] = useState<PeriodId>("yearly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const activePeriod = BILLING_PERIODS.find((p) => p.id === period)!

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: period }),
      });
      if (res.status === 401) {
        router.push("/auth/signup?next=/pricing");
        return;
      }
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push("/dashboard");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Billing period toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
          {BILLING_PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`relative rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                period === p.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
              {p.badge && (
                <span className="absolute -top-2.5 -right-1 rounded-full bg-foreground px-1.5 py-px text-[10px] font-semibold text-background">
                  {p.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Free */}
        <div className="rounded-lg border border-border p-6 flex flex-col">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-foreground">Free</h2>
            <p className="mt-1 text-3xl font-semibold text-foreground">$0</p>
            <p className="text-sm text-muted-foreground">forever</p>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground flex-1">
            {FREE_FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-2">
                <span className={`mt-0.5 ${f.included ? "text-foreground" : "text-muted-foreground/40"}`}>
                  {f.included ? "✓" : "✗"}
                </span>
                <span className={f.included ? undefined : "line-through opacity-50"}>{f.label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <a
              href="/register"
              className="block w-full rounded-md border border-border px-4 py-2 text-center text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Get started free
            </a>
          </div>
        </div>

        {/* Learner */}
        <div className="rounded-lg border-2 border-foreground p-6 relative flex flex-col">
          <div className="absolute -top-3 left-4 rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background">
            Most popular
          </div>
          <div className="mb-4">
            <h2 className="text-lg font-medium text-foreground">Learner</h2>
            <div className="mt-1 flex items-end gap-1.5">
              <p className="text-3xl font-semibold text-foreground">
                ${activePeriod.perMonth.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mb-0.5">/ mo</p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activePeriod.id === "monthly"
                ? "Billed monthly"
                : `$${activePeriod.total} ${activePeriod.billedNote.toLowerCase()}`}
            </p>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground flex-1">
            {LEARNER_FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-2">
                <span className="text-foreground mt-0.5">✓</span>
                <span>{f.label}</span>
              </li>
            ))}
          </ul>
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          <div className="mt-6">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="block w-full rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50 transition-colors"
            >
              {loading ? "Processing…" : "Get full access"}
            </button>
          </div>
        </div>

        {/* Patron */}
        <PatronCard />
      </div>
    </div>
  );
}
