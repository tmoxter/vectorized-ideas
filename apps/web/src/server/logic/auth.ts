import "server-only";
import { createClient } from "@supabase/supabase-js";

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  return authHeader.replace("Bearer ", "");
}

export async function authenticateUser(
  token: string,
  supabaseUrl: string,
  supabaseKey: string
) {
  const sb = createClient(supabaseUrl, supabaseKey);
  const {
    data: { user },
    error,
  } = await sb.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: error || new Error("User not authenticated") };
  }

  return { user, error: null };
}
