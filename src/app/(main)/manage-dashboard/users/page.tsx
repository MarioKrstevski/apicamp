import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SeedUsersForm } from './SeedUsersForm'

const PREVIEW_LIMIT = 5

export default async function ManageDashboardUsersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: rows, count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: false })
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })
    .limit(PREVIEW_LIMIT)

  const total = count ?? 0

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/manage-dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-semibold text-foreground">
        Users table
      </h1>
      <p className="mt-2 text-muted-foreground">
        Your seed data. Total: <strong>{total}</strong> {total === 1 ? 'entry' : 'entries'}.
        Showing latest {Math.min(PREVIEW_LIMIT, total)}.
      </p>

      <section className="mt-8">
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-foreground">name</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">first_name</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">last_name</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">email</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">age</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">role</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">created_at</th>
              </tr>
            </thead>
            <tbody>
              {(!rows || rows.length === 0) ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No entries yet. Paste an array of user objects below to seed.
                  </td>
                </tr>
              ) : (
                rows.map((row: Record<string, unknown>) => (
                  <tr key={String(row.id)} className="border-b border-border">
                    <td className="px-4 py-3 text-foreground">{String(row.name ?? '')}</td>
                    <td className="px-4 py-3 text-foreground">{String(row.first_name ?? '')}</td>
                    <td className="px-4 py-3 text-foreground">{String(row.last_name ?? '')}</td>
                    <td className="px-4 py-3 text-foreground">{String(row.email ?? '')}</td>
                    <td className="px-4 py-3 text-foreground">{row.age != null ? String(row.age) : '—'}</td>
                    <td className="px-4 py-3 text-foreground">{String(row.role ?? '')}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.created_at
                        ? new Date(String(row.created_at)).toLocaleString()
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Seed users
        </h2>
        <p className="text-sm text-muted-foreground mb-3">
          Paste a JSON array of user objects. Keys can be camelCase (e.g. firstName, lastName); they will be mapped to the table columns. <code className="rounded bg-muted px-1">created_by</code> is set to your user.
        </p>
        <SeedUsersForm />
      </section>
    </main>
  )
}
