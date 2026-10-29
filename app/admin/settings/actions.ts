"use server";

import { refresh } from "next/cache";
import { getSupabaseAuth } from "@/lib/supabase";
import { normalizePhone } from "@/lib/reservation";

export type FleetKind = "vehicles" | "drivers";
export type FleetResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Postgres error codes the forms explain.
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

const DUPLICATE: Record<FleetKind, string> = {
  vehicles: "มีทะเบียนรถนี้อยู่แล้ว",
  drivers: "มีคนขับชื่อนี้อยู่แล้ว",
};

function isKind(kind: unknown): kind is FleetKind {
  return kind === "vehicles" || kind === "drivers";
}

function text(raw: unknown) {
  return typeof raw === "string" ? raw.trim() : "";
}

// The row to write from the form's two fields: a car's plate and description,
// or a driver's name and phone. Server Actions are reachable by direct POST,
// so both are checked here as well as by the table.
function toRow(
  kind: FleetKind,
  first: unknown,
  second: unknown,
):
  | { row: Record<string, string | null>; error?: never }
  | { row?: never; error: string } {
  const main = text(first);
  const extra = text(second);
  if (kind === "vehicles") {
    if (main.length < 2 || main.length > 30) {
      return { error: "กรุณากรอกทะเบียนรถ 2–30 ตัวอักษร" };
    }
    if (extra.length > 120) return { error: "รายละเอียดยาวเกินไป" };
    return { row: { plate: main, description: extra || null } };
  }
  if (main.length < 2 || main.length > 120) {
    return { error: "กรุณากรอกชื่อคนขับ" };
  }
  const phone = normalizePhone(extra);
  if (phone && !/^0\d{8,9}$/.test(phone)) {
    return { error: "กรุณากรอกเบอร์ติดต่อ 9–10 หลัก ขึ้นต้นด้วย 0" };
  }
  return { row: { name: main, phone: phone || null } };
}

function failure(kind: FleetKind, error: { code?: string }): FleetResult {
  if (error.code === UNIQUE_VIOLATION)
    return { ok: false, error: DUPLICATE[kind] };
  console.error(`fleet ${kind} write failed`, error);
  return { ok: false, error: GENERIC_ERROR };
}

// Adds a car or driver, or edits one when given its id. Row-level security
// lets only an admin write either table, so these actions need no check of
// their own; a non-admin's write changes no row.
export async function saveFleetItem(
  kind: FleetKind,
  id: string | null,
  first: string,
  second: string,
): Promise<FleetResult> {
  if (!isKind(kind) || (id !== null && !UUID_RE.test(String(id)))) {
    return { ok: false, error: GENERIC_ERROR };
  }
  const parsed = toRow(kind, first, second);
  if (!parsed.row) return { ok: false, error: parsed.error };

  const supabase = await getSupabaseAuth();
  if (!supabase) return { ok: false, error: GENERIC_ERROR };

  const { data, error } = id
    ? await supabase.from(kind).update(parsed.row).eq("id", id).select("id")
    : await supabase.from(kind).insert(parsed.row).select("id");
  if (error) return failure(kind, error);
  if (!data?.length) return { ok: false, error: "คุณไม่มีสิทธิ์ดำเนินการนี้" };
  refresh();
  return { ok: true };
}

// Stops offering a car or driver for new approvals, or offers it again.
export async function setFleetItemActive(
  kind: FleetKind,
  id: string,
  active: boolean,
): Promise<FleetResult> {
  if (!isKind(kind) || !UUID_RE.test(String(id))) {
    return { ok: false, error: GENERIC_ERROR };
  }
  const supabase = await getSupabaseAuth();
  if (!supabase) return { ok: false, error: GENERIC_ERROR };

  const { data, error } = await supabase
    .from(kind)
    .update({ active: active === true })
    .eq("id", id)
    .select("id");
  if (error) return failure(kind, error);
  if (!data?.length) return { ok: false, error: "คุณไม่มีสิทธิ์ดำเนินการนี้" };
  refresh();
  return { ok: true };
}

// Deletes a car or driver no booking has been assigned; one that has can only
// be deactivated, so past bookings keep it.
export async function deleteFleetItem(
  kind: FleetKind,
  id: string,
): Promise<FleetResult> {
  if (!isKind(kind) || !UUID_RE.test(String(id))) {
    return { ok: false, error: GENERIC_ERROR };
  }
  const supabase = await getSupabaseAuth();
  if (!supabase) return { ok: false, error: GENERIC_ERROR };

  const { data, error } = await supabase
    .from(kind)
    .delete()
    .eq("id", id)
    .select("id");
  if (error?.code === FOREIGN_KEY_VIOLATION) {
    return {
      ok: false,
      error: "มีการจองที่ใช้รายการนี้อยู่ จึงลบไม่ได้ ให้ปิดการใช้งานแทน",
    };
  }
  if (error) return failure(kind, error);
  if (!data?.length) return { ok: false, error: "คุณไม่มีสิทธิ์ดำเนินการนี้" };
  refresh();
  return { ok: true };
}
