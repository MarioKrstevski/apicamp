import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isLocaleAdmin } from "@/lib/locale-admin";
import { SignoutButton } from "@/components/signout-button";

export async function Navbar() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  const locale = user ? isLocaleAdmin(user.id) : null;
  const dashboardHref = locale !== null ? "/manage-dashboard" : "/dashboard";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-semibold text-foreground">
          apicamp
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/pricing" className="hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="/docs" className="hover:text-foreground transition-colors">
            Docs
          </Link>
          {user ? (
            <>
              <Link
                href={dashboardHref}
                className="hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <SignoutButton />
            </>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
