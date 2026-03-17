import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isLocaleAdmin } from "@/lib/locale-admin";
import registry from "@/config/registry";
import { AddSeedForm } from "./AddSeedForm";

export default async function ManageDashboardPage() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  // Middleware guarantees this is a locale admin — user.id is safe to use
  const locale = isLocaleAdmin(user!.id);
  const categories = Object.keys(registry);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-foreground">
        Welcome, {locale} admin.
      </h1>
      <p className="mt-3 text-muted-foreground mb-8">
        Manage your locale&apos;s seed data below. Paste JSON (one object or an array of objects) to insert rows.
      </p>

      <section className="flex flex-col gap-8">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Categories
        </h2>
        <div className="rounded-md border border-border bg-card px-4 py-4">
          <h3 className="text-base font-medium text-foreground mb-3">Users table</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Seed the <code className="rounded bg-muted px-1">public.users</code> table (columns). View entries and paste an array of objects.
          </p>
          <Link
            href="/manage-dashboard/users"
            className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Open users table →
          </Link>
        </div>
        {categories.map((name) => (
          <div
            key={name}
            className="rounded-md border border-border bg-card px-4 py-4"
          >
            <h3 className="text-base font-medium text-foreground mb-3">{name}</h3>
            <AddSeedForm category={name} />
          </div>
        ))}
      </section>
    </main>
  );
}
