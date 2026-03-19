"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Edit these to change patron tier config ───────────────────────────────
const PRICE_PER_SEAT = 8;
const DEFAULT_PRESET = 50;
const PRESETS = [20, 50, 100];
// ──────────────────────────────────────────────────────────────────────────

function calcGiftKeys(amount: number) {
  const total = Math.floor(amount / PRICE_PER_SEAT);
  return Math.max(0, total - 1);
}

export function PatronCard() {
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const activeAmount = custom !== "" ? Number(custom) : DEFAULT_PRESET;
  const giftKeys = calcGiftKeys(activeAmount);

  async function handleSubscribe() {
    if (activeAmount < PRICE_PER_SEAT) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "patron", amount: activeAmount }),
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
  }

  return (
    <div className="rounded-lg border border-border p-6 flex flex-col">
      <div className="mb-4">
        <h2 className="text-lg font-medium text-foreground">Patron</h2>
        <p className="mt-1 text-3xl font-semibold text-foreground">
          ${custom !== "" ? custom || "?" : DEFAULT_PRESET}
        </p>
        <p className="text-sm text-muted-foreground">per year, you choose</p>
      </div>

      <p className="text-xs text-muted-foreground mb-5 italic">
        Same access as Learner — pay more to cover accounts for others. Every ${PRICE_PER_SEAT} funds one full-access seat.
      </p>

      {/* Price picker */}
      <div className="mb-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Choose amount</p>
        <div className="flex gap-2">
          {PRESETS.map((preset) => {
            const isActive =
              preset === DEFAULT_PRESET ? custom === "" : custom === String(preset);
            return (
              <button
                key={preset}
                onClick={() => preset === DEFAULT_PRESET ? setCustom("") : setCustom(String(preset))}
                className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                ${preset}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
          <input
            type="number"
            min={PRICE_PER_SEAT}
            placeholder="Custom amount"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="w-full rounded-md border border-border bg-background pl-7 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="rounded-md bg-muted/50 border border-border px-4 py-3 mb-5 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Your account</span>
          <span className="font-medium text-foreground">1 seat</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Gift keys</span>
          <span className="font-medium text-foreground">
            {activeAmount >= PRICE_PER_SEAT ? `${giftKeys} ${giftKeys === 1 ? "key" : "keys"}` : "—"}
          </span>
        </div>
        {activeAmount >= PRICE_PER_SEAT && giftKeys > 0 && (
          <p className="text-xs text-muted-foreground pt-1 border-t border-border mt-1">
            Each gift key gives someone 1 year of full access.
          </p>
        )}
        {activeAmount > 0 && activeAmount < PRICE_PER_SEAT && (
          <p className="text-xs text-destructive pt-1">
            Minimum is ${PRICE_PER_SEAT} (one seat).
          </p>
        )}
      </div>

      {error && <p className="text-xs text-destructive mb-2">{error}</p>}
      <div className="mt-auto">
        <button
          onClick={handleSubscribe}
          disabled={loading || activeAmount < PRICE_PER_SEAT}
          className="block w-full rounded-md border border-border px-4 py-2 text-center text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
        >
          {loading ? "Processing…" : "Become a Patron"}
        </button>
      </div>
    </div>
  );
}
