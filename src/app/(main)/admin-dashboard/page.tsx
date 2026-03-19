import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ReviewsPanel } from "./ReviewsPanel"

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "superadmin") redirect("/")

  const [pendingResult, approvedResult] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, comment, rating, project_url, project_label, approved, approved_at, created_at, profiles(display_name, title, avatar_url, ever_paid)")
      .eq("approved", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("id, comment, rating, project_url, project_label, approved, approved_at, created_at, profiles(display_name, title, avatar_url, ever_paid)")
      .eq("approved", true)
      .order("approved_at", { ascending: false }),
  ])

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Superadmin tools</p>
      </div>

      {/* Sidebar nav */}
      <div className="flex gap-8">
        <nav className="w-40 shrink-0">
          <ul className="space-y-1">
            <li>
              <span className="block rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground">
                Reviews
              </span>
            </li>
            <li>
              <span className="block rounded-md px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
                YouTube videos
                <span className="ml-1 text-xs opacity-60">(soon)</span>
              </span>
            </li>
            <li>
              <span className="block rounded-md px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
                Tutorials
                <span className="ml-1 text-xs opacity-60">(soon)</span>
              </span>
            </li>
            <li>
              <span className="block rounded-md px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
                Repo links
                <span className="ml-1 text-xs opacity-60">(soon)</span>
              </span>
            </li>
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-medium text-foreground mb-4">Reviews</h2>
          <ReviewsPanel
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialPending={(pendingResult.data ?? []) as any[]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialApproved={(approvedResult.data ?? []) as any[]}
          />
        </div>
      </div>
    </main>
  )
}
