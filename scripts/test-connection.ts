import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load .env (not .env.local — adjust if needed)
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  console.log("Testing Supabase connection...");
  console.log("URL:", url);

  // Simple auth check — just verifies the project is reachable
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Connection failed:", error.message);
    process.exit(1);
  }

  console.log("Connection successful!");
  console.log("Session:", data.session ? "active" : "none (expected for anon)");
}

main();
