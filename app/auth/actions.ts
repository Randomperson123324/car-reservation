"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PASSWORD_MIN_LENGTH, safeRedirect } from "@/lib/auth";
import { getSupabaseAuth } from "@/lib/supabase";

const NOT_CONFIGURED = "ระบบยังไม่ได้เชื่อมต่อฐานข้อมูล กรุณาติดต่อผู้ดูแลระบบ";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A successful sign-in redirects, so only failures and the "check your inbox"
// outcome of a sign-up are ever returned.
export type AuthResult =
  { ok: true; message: string } | { ok: false; error: string };

// Server Actions are reachable by direct POST, so the payload is untrusted.
function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function translate(message: string) {
  if (message === "Invalid login credentials") {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  }
  if (message === "Email not confirmed") {
    return "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ";
  }
  if (message === "User already registered") {
    return "อีเมลนี้ถูกใช้สมัครสมาชิกแล้ว";
  }
  return message;
}

export async function signIn(
  rawEmail: string,
  rawPassword: string,
  redirectTo: string,
): Promise<AuthResult> {
  const email = text(rawEmail).trim();
  const password = text(rawPassword);
  if (!email || !password) {
    return { ok: false, error: "กรุณากรอกข้อมูลให้ครบ" };
  }

  const supabase = await getSupabaseAuth();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: translate(error.message) };

  redirect(safeRedirect(redirectTo));
}

export async function signUp(
  rawName: string,
  rawEmail: string,
  rawPassword: string,
  redirectTo: string,
): Promise<AuthResult> {
  const fullName = text(rawName).trim();
  const email = text(rawEmail).trim();
  const password = text(rawPassword);
  if (!fullName || !email || !password) {
    return { ok: false, error: "กรุณากรอกชื่อ อีเมล และรหัสผ่าน" };
  }
  if (fullName.length > 120) return { ok: false, error: "ชื่อยาวเกินไป" };
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "รูปแบบอีเมลไม่ถูกต้อง" };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      error: `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`,
    };
  }

  const supabase = await getSupabaseAuth();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED };

  const next = safeRedirect(redirectTo);
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    (await headers()).get("origin");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: origin
        ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
        : undefined,
    },
  });
  if (error) return { ok: false, error: translate(error.message) };
  // With email confirmation on, an address that is already registered comes
  // back as a user with no identities rather than as an error.
  if (data.user && data.user.identities?.length === 0) {
    return { ok: false, error: translate("User already registered") };
  }

  // With email confirmation off, the sign-up signs the user in straight away.
  if (data.session) redirect(next);

  return {
    ok: true,
    message: "ส่งอีเมลยืนยันแล้ว! กรุณาตรวจสอบกล่องจดหมายของคุณ",
  };
}

export async function signOut() {
  const supabase = await getSupabaseAuth();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
