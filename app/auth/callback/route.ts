import { NextResponse, type NextRequest } from "next/server";
import { safeRedirect } from "@/lib/auth";
import { getSupabaseAuth } from "@/lib/supabase";

// Where the link in the confirmation email lands: trades its one-time code
// for a session, then continues to the page the user was heading for.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await getSupabaseAuth();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(
          `${origin}${safeRedirect(searchParams.get("next"))}`,
        );
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_error`);
}
