export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { getInitials, getAvatarColor, shuffle } from "@/lib/wall-of-love"

type ReviewRow = {
  id: string
  user_id: string
  comment: string
  rating: number
  project_url: string | null
  project_label: string | null
  profiles: {
    display_name: string | null
    title: string | null
    avatar_url: string | null
  } | null
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-sm">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? "text-amber-400" : "text-muted-foreground/20"}>★</span>
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: ReviewRow }) {
  const p = review.profiles
  const name = p?.display_name ?? "Anonymous"
  const comment = review.comment.length > 180
    ? review.comment.slice(0, 177) + "…"
    : review.comment
  const initials = getInitials(p?.display_name ?? null)
  const colorClass = getAvatarColor(review.user_id)

  return (
    <div className="w-72 shrink-0 rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-3">
        {p?.avatar_url ? (
          <img
            src={p.avatar_url}
            alt={name}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${colorClass}`}>
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{name}</p>
          {p?.title && (
            <p className="text-xs text-muted-foreground truncate">{p.title}</p>
          )}
        </div>
        <span className="ml-auto shrink-0 text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">
          Paid
        </span>
      </div>

      <StarRating rating={review.rating} />

      <p className="text-sm text-muted-foreground leading-relaxed">{comment}</p>

      {review.project_url && (
        <a
          href={review.project_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-4"
        >
          {review.project_label ?? "View project"} →
        </a>
      )}
    </div>
  )
}

export async function WallOfLove() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("reviews")
    .select("id, user_id, comment, rating, project_url, project_label, profiles(display_name, title, avatar_url)")
    .eq("approved", true)

  const reviews = (data as ReviewRow[] | null) ?? []
  if (reviews.length < 4) return null

  const shuffled = shuffle(reviews)

  return (
    <section className="mt-16">
      <h2 className="text-center text-lg font-semibold text-foreground mb-8">
        Loved by developers
      </h2>
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex gap-4 w-max animate-marquee hover:[animation-play-state:paused]">
          {[...shuffled, ...shuffled].map((review, i) => (
            <ReviewCard key={`${review.id}-${i}`} review={review} />
          ))}
        </div>
      </div>
    </section>
  )
}
