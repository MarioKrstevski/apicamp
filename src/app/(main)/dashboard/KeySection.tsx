"use client"

import { useState } from "react"
import type { ApiKeyRow } from "@/lib/keys"

type Props = {
  activeKey: ApiKeyRow | null
  expiredKey: ApiKeyRow | null
  hasActiveSub: boolean
  everPaid: boolean
}

export function KeySection({ activeKey, expiredKey, hasActiveSub, everPaid }: Props) {
  const [newKey, setNewKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/keys/generate", { method: "POST" })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setNewKey(data.raw)
    } catch {
      setError("Network error — please try again")
    } finally {
      setLoading(false)
    }
  }

  function copyKey() {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (newKey) {
    return (
      <section className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-6 space-y-3">
        <h2 className="font-semibold text-foreground">Your new API key</h2>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Copy this now — it won&apos;t be shown again.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all">{newKey}</code>
          <button onClick={copyKey} className="shrink-0 rounded border border-border px-3 py-2 text-sm hover:bg-muted transition-colors">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </section>
    )
  }

  if (activeKey) {
    const expires = new Date(activeKey.expiresAt!)
    const daysLeft = Math.ceil((expires.getTime() - Date.now()) / 86400000)
    return (
      <section className="rounded-lg border border-border p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Your API key</h2>
        <div className="flex items-center justify-between">
          <code className="text-sm font-mono text-foreground">{activeKey.prefix}••••••••••••••••</code>
          <span className={`text-xs ${daysLeft <= 3 ? "text-destructive" : "text-muted-foreground"}`}>
            Expires in {daysLeft}d
          </span>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          onClick={handleGenerate}
          disabled={loading || !hasActiveSub}
          className="text-sm text-primary underline underline-offset-4 disabled:opacity-50 disabled:no-underline"
        >
          {loading ? "Regenerating…" : "Regenerate key"}
        </button>
        {!hasActiveSub && (
          <p className="text-xs text-muted-foreground">Renew your subscription to regenerate.</p>
        )}
      </section>
    )
  }

  if (expiredKey) {
    return (
      <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 space-y-3">
        <h2 className="font-semibold text-foreground">Your key has expired</h2>
        <p className="text-sm text-muted-foreground">
          {hasActiveSub
            ? "Regenerate to get a new key and restore API access."
            : "Renew your subscription to get a new key."}
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {hasActiveSub ? (
          <button onClick={handleGenerate} disabled={loading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50">
            {loading ? "Regenerating…" : "Regenerate key"}
          </button>
        ) : (
          <a href="/pricing" className="text-sm text-primary underline underline-offset-4">
            View plans →
          </a>
        )}
      </section>
    )
  }

  // No key at all, has subscription (e.g. just signed up)
  if (hasActiveSub) {
    return (
      <section className="rounded-lg border border-border p-6 space-y-3">
        <h2 className="font-semibold text-foreground">Generate your API key</h2>
        <p className="text-sm text-muted-foreground">You&apos;re subscribed — generate your key to start using the API.</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button onClick={handleGenerate} disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50">
          {loading ? "Generating…" : "Generate key"}
        </button>
      </section>
    )
  }

  // No key, no subscription — ever_paid doesn't affect this state (pool request shown in parent)
  void everPaid
  return (
    <section className="rounded-lg border border-border p-6 space-y-3">
      <h2 className="font-semibold text-foreground">API key</h2>
      <p className="text-sm text-muted-foreground">Subscribe to generate an API key.</p>
      <a href="/pricing" className="text-sm text-primary underline underline-offset-4">View plans →</a>
    </section>
  )
}
