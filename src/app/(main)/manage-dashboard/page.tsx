import { createClient } from "@/lib/supabase/server";
import { isLocaleAdmin } from "@/lib/locale-admin";
import registry from "@/config/registry";

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
        Manage your locale&apos;s seed data below.
      </p>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Available categories
        </h2>
        <ul className="flex flex-col gap-2">
          {categories.map((name) => (
            <li
              key={name}
              className="rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground"
            >
              {name}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
