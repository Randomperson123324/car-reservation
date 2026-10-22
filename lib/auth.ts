import "server-only";
import { getSupabaseAuth } from "@/lib/supabase";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

export const PASSWORD_MIN_LENGTH = 8;

// Only same-site paths may be used as a post-login destination.
export function safeRedirect(path: unknown) {
  return typeof path === "string" && /^\/(?![/\\])/.test(path) ? path : "/";
}

export async function getSessionUser(): Promise<SessionUser | null> {
  // Outside the try: while prerendering, reading cookies must be left to
  // suspend rather than be caught as a failure.
  const supabase = await getSupabaseAuth();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims) return null;
    const email = typeof claims.email === "string" ? claims.email : "";
    const fullName = claims.user_metadata?.full_name;
    // Looked up rather than read from the token, so granting or revoking
    // admin rights takes effect on the next page load.
    const { data: isAdmin, error } = await supabase.rpc("is_admin");
    if (error) console.error("is_admin failed", error);
    return {
      id: claims.sub,
      email,
      name: typeof fullName === "string" && fullName ? fullName : email,
      isAdmin: isAdmin === true,
    };
  } catch (error) {
    console.error("getSessionUser failed", error);
    return null;
  }
}
