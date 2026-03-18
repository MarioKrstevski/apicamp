import Link from "next/link"
import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { DocsLocalePicker } from "@/components/docs-locale-picker"

const categories = [
  { slug: "cats", label: "Cats" },
  { slug: "movies", label: "Movies" },
  { slug: "users", label: "Users" },
  // Add more categories here as you build them out
  // { slug: "products", label: "Products" },
  // { slug: "posts", label: "Posts" },
]

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="flex gap-10">
          {/* Sidebar */}
          <aside className="w-48 shrink-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Categories
            </p>
            <nav className="flex flex-col gap-1">
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/docs/${cat.slug}`}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {cat.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1">
            <div className="mb-6 flex items-center justify-end">
              <Suspense fallback={null}>
                <DocsLocalePicker />
              </Suspense>
            </div>
            {children}
          </main>
        </div>
      </div>

      <footer className="border-t border-border bg-muted/30 py-6">
        <div className="mx-auto max-w-6xl px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} apicamp</span>
          <nav className="flex gap-6">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/docs" className="hover:text-foreground transition-colors">
              Docs
            </Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">
              Pricing
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
