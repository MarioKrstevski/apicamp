"use client"

import { useState } from "react"
import type { ApiKeyRow } from "@/lib/keys"

type Props = {
  giftKeys: ApiKeyRow[]
  giftKeysEarned: number
  giftKeysUsed: number
}

export function GiftKeySection({ giftKeys, giftKeysEarned, giftKeysUsed }: Props) {
  const [newKey, setNewKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [localUsed, setLocalUsed] = useState(giftKeysUsed)
  const canGenerate = localUsed < giftKeysEarned

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/keys/gift", { method: "POST" })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setNewKey(data.raw)
      setLocalUsed(prev => prev + 1)
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

  return (
    <section className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Gift keys</h2>
        <span className="text-xs text-muted-foreground">{localUsed} / {giftKeysEarned} used</span>
      </div>

      {newKey && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2">
          <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">Copy this key now — it won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all">{newKey}</code>
            <button onClick={copyKey} className="shrink-0 rounded border border-border px-3 py-2 text-sm hover:bg-muted transition-colors">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        onClick={handleGenerate}
        disabled={loading || !canGenerate}
        className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
      >
        {loading ? "Generating…" : canGenerate ? "Generate gift key" : "Gift key quota used"}
      </button>

      {giftKeys.length > 0 && (
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden mt-2">
          {giftKeys.map(key => (
            <div key={key.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="font-mono text-xs text-foreground">{key.prefix}••••••••</span>
              <span className={`text-xs rounded-full px-2 py-0.5 ${
                key.status === "active"    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" :
                key.status === "unclaimed" ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" :
                "bg-muted text-muted-foreground"
              }`}>{key.status}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
