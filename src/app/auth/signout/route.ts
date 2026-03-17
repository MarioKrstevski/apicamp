import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const client = await createClient();
  await client.auth.signOut();
  return NextResponse.redirect(
    new URL("/", process.env.NEXT_PUBLIC_APP_URL!)
  );
}
