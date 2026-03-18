import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isLocaleAdmin } from "@/lib/locale-admin";

const TABLES = [
  { name: "users",    label: "Users",    description: "User profiles with contact info, preferences, and metadata." },
  { name: "quotes",   label: "Quotes",   description: "Famous quotes from authors, philosophers, scientists, and artists." },
  { name: "books",    label: "Books",    description: "Book catalog with rich metadata — titles, authors, genres, ratings." },
  { name: "students", label: "Students", description: "University and college student profiles with academic records and GPA." },
  { name: "resumes",  label: "Resumes",  description: "IT and tech professional CVs with skills, tech stack, and certifications." },
  { name: "animals",  label: "Animals",  description: "Wildlife catalog spanning mammals, birds, reptiles, and more." },
]

export default async function ManageDashboardPage() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();

  const locale = isLocaleAdmin(user!.id);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-foreground">
        Welcome, {locale} admin.
      </h1>
      <p className="mt-3 text-muted-foreground mb-8">
        Manage seed data for each table. Click a table to view rows and add new entries.
      </p>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Tables
        </h2>
        {TABLES.map((t) => (
          <div key={t.name} className="rounded-md border border-border bg-card px-4 py-4">
            <h3 className="text-base font-medium text-foreground mb-1">{t.label}</h3>
            <p className="text-sm text-muted-foreground mb-3">{t.description}</p>
            <Link
              href={`/manage-dashboard/${t.name}`}
              className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Open {t.label} table →
            </Link>
          </div>
        ))}
      </section>
    </main>
  );
}
