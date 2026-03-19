"use client"

import { useState } from "react"

type Review = {
  id: string
  comment: string
  rating: number
  project_url: string | null
  project_label: string | null
  approved: boolean
  approved_at: string | null
}

type ProfileData = {
  display_name: string | null
  title: string | null
  avatar_url: string | null
}

type Props = {
  initialReview: Review | null
  profile: ProfileData
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-2xl transition-colors ${n <= value ? "text-amber-400" : "text-muted-foreground/30 hover:text-amber-300"}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={`text-lg ${n <= value ? "text-amber-400" : "text-muted-foreground/20"}`}>★</span>
      ))}
    </div>
  )
}

export function ReviewSection({ initialReview, profile: initialProfile }: Props) {
  const [review, setReview]     = useState<Review | null>(initialReview)
  const [profile, setProfile]   = useState(initialProfile)
  const [editing, setEditing]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Profile form state
  const [profileName,  setProfileName]  = useState(initialProfile.display_name ?? "")
  const [profileTitle, setProfileTitle] = useState(initialProfile.title ?? "")

  // Review form state
  const [comment,      setComment]      = useState(initialReview?.comment ?? "")
  const [rating,       setRating]       = useState(initialReview?.rating ?? 5)
  const [projectUrl,   setProjectUrl]   = useState(initialReview?.project_url ?? "")
  const [projectLabel, setProjectLabel] = useState(initialReview?.project_label ?? "")
  const [avatarUrl,    setAvatarUrl]    = useState(initialProfile.avatar_url ?? "")

  const profileComplete = !!(profile.display_name?.trim() && profile.title?.trim())

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profileName.trim() || !profileTitle.trim()) {
      setError("Name and title are required")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/profiles/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: profileName.trim(), title: profileTitle.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setProfile(p => ({ ...p, display_name: profileName.trim(), title: profileTitle.trim() }))
    } catch {
      setError("Network error — please try again")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // Save avatar_url to profile if changed
      if (avatarUrl !== (profile.avatar_url ?? "")) {
        await fetch("/api/profiles/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar_url: avatarUrl || null }),
        })
        setProfile(p => ({ ...p, avatar_url: avatarUrl || null }))
      }

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment,
          rating,
          project_url:   projectUrl  || undefined,
          project_label: projectLabel || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }

      // Re-fetch own review to get the saved row
      const mineRes = await fetch("/api/reviews/mine")
      const mineData = await mineRes.json()
      setReview(mineData.review)
      setEditing(false)
    } catch {
      setError("Network error — please try again")
    } finally {
      setLoading(false)
    }
  }

  // State 1: Profile incomplete
  if (!profileComplete) {
    return (
      <section className="rounded-lg border border-border p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Leave a review</h2>
        <p className="text-sm text-muted-foreground">
          Add your name and title before leaving a review — these appear on the landing page.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Name</label>
            <input
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder="Alice Walker"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title</label>
            <input
              value={profileTitle}
              onChange={e => setProfileTitle(e.target.value)}
              placeholder="Frontend Developer, Bootcamp Student, …"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving…" : "Save and continue"}
          </button>
        </form>
      </section>
    )
  }

  // State 2 / 3 (editing): Review form
  if (!review || editing) {
    return (
      <section className="rounded-lg border border-border p-6 space-y-4">
        <h2 className="font-semibold text-foreground">
          {review ? "Edit your review" : "Leave a review"}
        </h2>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <form onSubmit={handleSubmitReview} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Rating</label>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Comment <span className="text-muted-foreground font-normal">(10–500 chars)</span>
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              minLength={10}
              maxLength={500}
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{comment.length}/500</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Project link <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={projectUrl}
              onChange={e => setProjectUrl(e.target.value)}
              placeholder="https://my-weather-app.vercel.app"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {projectUrl && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Link label <span className="text-muted-foreground font-normal">(optional, max 60 chars)</span>
              </label>
              <input
                value={projectLabel}
                onChange={e => setProjectLabel(e.target.value)}
                maxLength={60}
                placeholder="My weather app"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Photo URL <span className="text-muted-foreground font-normal">(optional — a photo makes your review stand out)</span>
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving…" : "Submit review"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => { setEditing(false); setError(null) }}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
    )
  }

  // State 3: Pending approval
  if (!review.approved) {
    return (
      <section className="rounded-lg border border-border p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Your review</h2>
          <span className="text-xs rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5">
            Pending approval
          </span>
        </div>
        <StarDisplay value={review.rating} />
        <p className="text-sm text-muted-foreground italic">&ldquo;{review.comment}&rdquo;</p>
        <button
          onClick={() => {
            setEditing(true)
            setComment(review.comment)
            setRating(review.rating)
            setProjectUrl(review.project_url ?? "")
            setProjectLabel(review.project_label ?? "")
          }}
          className="text-sm text-primary underline underline-offset-4"
        >
          Edit review
        </button>
      </section>
    )
  }

  // State 4: Approved / live
  return (
    <section className="rounded-lg border border-border p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Your review</h2>
        <span className="text-xs rounded-full bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 px-2 py-0.5">
          Live on landing page
        </span>
      </div>
      <StarDisplay value={review.rating} />
      <p className="text-sm text-muted-foreground italic">&ldquo;{review.comment}&rdquo;</p>
      <button
        onClick={() => {
          setEditing(true)
          setComment(review.comment)
          setRating(review.rating)
          setProjectUrl(review.project_url ?? "")
          setProjectLabel(review.project_label ?? "")
        }}
        className="text-sm text-primary underline underline-offset-4"
      >
        Edit review (will require re-approval)
      </button>
    </section>
  )
}
