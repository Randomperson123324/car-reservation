import "server-only";
import { getSupabaseAuth } from "@/lib/supabase";

export type SessionUser = { id: string; email: string; name: string };

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
    return {
      id: claims.sub,
      email,
      name: typeof fullName === "string" && fullName ? fullName : email,
    };
  } catch (error) {
    console.error("getSessionUser failed", error);
    return null;
  }
}
