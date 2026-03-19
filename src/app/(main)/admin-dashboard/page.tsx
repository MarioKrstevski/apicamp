import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ReviewsPanel } from "./ReviewsPanel"
import { GrantAccessPanel } from "./GrantAccessPanel"
import type { ReviewWithProfile } from "./ReviewsPanel"

type Props = { searchParams: Promise<{ section?: string }> }

const NAV_ITEMS = [
  { id: "reviews",  label: "Reviews" },
  { id: "users",    label: "Users" },
] as const

const COMING_SOON = ["YouTube videos", "Tutorials", "Repo links"]

export default async function AdminDashboardPage({ searchParams }: Props) {
  const { section = "reviews" } = await searchParams

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

      <div className="flex gap-8">
        {/* Sidebar nav */}
        <nav className="w-40 shrink-0">
          <ul className="space-y-1">
            {NAV_ITEMS.map(item => (
              <li key={item.id}>
                <a
                  href={`/admin-dashboard?section=${item.id}`}
                  className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    section === item.id
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
            {COMING_SOON.map(label => (
              <li key={label}>
                <span className="block rounded-md px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed">
                  {label}
                  <span className="ml-1 text-xs opacity-60">(soon)</span>
                </span>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {section === "reviews" && (
            <>
              <h2 className="text-lg font-medium text-foreground mb-4">Reviews</h2>
              <ReviewsPanel
                initialPending={(pendingResult.data ?? []) as unknown as ReviewWithProfile[]}
                initialApproved={(approvedResult.data ?? []) as unknown as ReviewWithProfile[]}
              />
            </>
          )}

          {section === "users" && (
            <>
              <h2 className="text-lg font-medium text-foreground mb-4">Grant paid access</h2>
              <GrantAccessPanel />
            </>
          )}
        </div>
      </div>
    </main>
  )
}
