"use client"

import { useState } from "react"

type ReviewWithProfile = {
  id: string
  comment: string
  rating: number
  project_url: string | null
  project_label: string | null
  approved: boolean
  approved_at: string | null
  created_at: string
  profiles: {
    display_name: string | null
    title: string | null
    avatar_url: string | null
    ever_paid: boolean
  } | null
}

type Props = {
  initialPending:  ReviewWithProfile[]
  initialApproved: ReviewWithProfile[]
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="text-sm">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? "text-amber-400" : "text-muted-foreground/20"}>★</span>
      ))}
    </span>
  )
}

function ReviewCard({
  review,
  onApprove,
  onDelete,
  approving,
  deleting,
}: {
  review: ReviewWithProfile
  onApprove?: () => void
  onDelete:   () => void
  approving?: boolean
  deleting:   boolean
}) {
  const p = review.profiles
  const name = p?.display_name ?? "Unknown"
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleDeleteClick() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setConfirmDelete(false)
    onDelete()
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">{name}</p>
          {p?.title && <p className="text-xs text-muted-foreground">{p.title}</p>}
          {p?.ever_paid && (
            <span className="inline-block text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium mt-1">
              Paid member
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StarDisplay rating={review.rating} />
          <span className="text-xs text-muted-foreground">
            Submitted {new Date(review.created_at).toLocaleDateString()}
          </span>
          {review.approved_at && (
            <span className="text-xs text-muted-foreground">
              Approved {new Date(review.approved_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{review.comment}</p>

      {review.project_url && (
        <a
          href={review.project_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary underline underline-offset-4"
        >
          {review.project_label ?? review.project_url} →
        </a>
      )}

      <div className="flex gap-2 pt-1 items-center">
        {onApprove && (
          <button
            onClick={onApprove}
            disabled={approving}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50 transition-colors"
          >
            {approving ? "Approving…" : "Approve"}
          </button>
        )}
        {confirmDelete ? (
          <>
            <span className="text-xs text-muted-foreground">Are you sure?</span>
            <button
              onClick={handleDeleteClick}
              disabled={deleting}
              className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-white hover:bg-destructive/80 disabled:opacity-50 transition-colors"
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-muted-foreground underline underline-offset-4"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={handleDeleteClick}
            disabled={deleting}
            className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50 transition-colors"
          >
            {review.approved ? "Revoke" : "Reject"}
          </button>
        )}
      </div>
    </div>
  )
}

export function ReviewsPanel({ initialPending, initialApproved }: Props) {
  const [tab,      setTab]      = useState<"pending" | "approved">("pending")
  const [pending,  setPending]  = useState(initialPending)
  const [approved, setApproved] = useState(initialApproved)
  const [loading,  setLoading]  = useState<Record<string, "approving" | "deleting" | null>>({})
  const [error,    setError]    = useState<string | null>(null)

  async function handleApprove(id: string) {
    setLoading(l => ({ ...l, [id]: "approving" }))
    setError(null)
    try {
      const res = await fetch(`/api/admin/reviews/${id}/approve`, { method: "POST" })
      if (!res.ok) { setError("Failed to approve"); return }
      const item = pending.find(r => r.id === id)
      if (item) {
        setPending(p => p.filter(r => r.id !== id))
        setApproved(a => [{ ...item, approved: true, approved_at: new Date().toISOString() }, ...a])
      }
    } catch {
      setError("Network error — please try again")
    } finally {
      setLoading(l => ({ ...l, [id]: null }))
    }
  }

  async function handleDelete(id: string) {
    setLoading(l => ({ ...l, [id]: "deleting" }))
    setError(null)
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" })
      if (!res.ok) { setError("Failed to delete"); return }
      setPending(p  => p.filter(r => r.id !== id))
      setApproved(a => a.filter(r => r.id !== id))
    } catch {
      setError("Network error — please try again")
    } finally {
      setLoading(l => ({ ...l, [id]: null }))
    }
  }

  const list = tab === "pending" ? pending : approved

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["pending", "approved"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t} {t === "pending" ? `(${pending.length})` : `(${approved.length})`}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No {tab} reviews.
        </p>
      ) : (
        <div className="space-y-3">
          {list.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              onApprove={tab === "pending" ? () => handleApprove(review.id) : undefined}
              onDelete={() => handleDelete(review.id)}
              approving={loading[review.id] === "approving"}
              deleting={loading[review.id] === "deleting"}
            />
          ))}
        </div>
      )}
    </div>
  )
}
