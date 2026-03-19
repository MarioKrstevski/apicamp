"use client"

import { useState } from "react"

export function GrantAccessPanel() {
  const [email, setEmail]     = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/users/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: "error", text: data.error })
      } else {
        setMessage({ type: "success", text: `Paid access granted to ${data.email}` })
        setEmail("")
      }
    } catch {
      setMessage({ type: "error", text: "Network error — please try again" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Grant 1 year of paid access to any account. Inserts a subscription row and sets{" "}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">ever_paid = true</code>.
      </p>
      <form onSubmit={handleGrant} className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-foreground mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50 transition-colors"
        >
          {loading ? "Granting…" : "Grant access"}
        </button>
      </form>
      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
