import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client, server-only. RLS is enabled with no policies on every
// table, so this is the only client capable of reading/writing — never send
// this key to the browser.
export function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
