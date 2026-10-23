"use server";

import { randomInt } from "node:crypto";
import { refresh } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { getSupabase, getSupabaseAuth } from "@/lib/supabase";
import {
  EMPTY_RESERVATION,
  CODE_PREFIX,
  CODE_RE,
  REJECT_REASON_MAX,
  bangkokToday,
  normalizeCode,
  normalizePhone,
  submittedTimes,
  validateReservation,
  type ReservationErrors,
  type ReservationField,
  type ReservationInput,
  type ReservationSummary,
} from "@/lib/reservation";

const NOT_CONFIGURED = "ระบบยังไม่ได้เชื่อมต่อฐานข้อมูล กรุณาติดต่อผู้ดูแลระบบ";
const NOT_SIGNED_IN = "กรุณาเข้าสู่ระบบก่อนจองรถ";
const GENERIC_ERROR = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const UNIQUE_VIOLATION = "23505";

export type CreateReservationResult =
  | { ok: true; code: string; sentDate: string }
  | { ok: false; error: string; fieldErrors?: ReservationErrors };

export type LookupResult =
  { ok: true; items: ReservationSummary[] } | { ok: false; error: string };

function newCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return `${CODE_PREFIX}-${code}`;
}

// Server Actions are reachable by direct POST, so the payload is untrusted.
function toInput(raw: unknown): ReservationInput {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const input: Record<string, string> = { ...EMPTY_RESERVATION };
  for (const key of Object.keys(EMPTY_RESERVATION) as ReservationField[]) {
    if (typeof source[key] === "string") input[key] = source[key];
  }
  return input as ReservationInput;
}

export async function createReservation(
  raw: ReservationInput,
): Promise<CreateReservationResult> {
  // The proxy only keeps signed-out visitors off the booking page; the action
  // itself has to refuse them too.
  const user = await getSessionUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };

  const input = toInput(raw);
  const fieldErrors = validateReservation(input, bangkokToday());
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "กรุณาตรวจสอบข้อมูลอีกครั้ง", fieldErrors };
  }

  // Inserted as the signed-in user, so the booking belongs to them.
  const supabase = await getSupabaseAuth();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED };

  const times = submittedTimes(input);
  const row = {
    user_id: user.id,
    travel_date: input.travelDate,
    trip_type: input.tripType,
    depart_time: times.departTime,
    arrive_time: times.arriveTime,
    return_time: times.returnTime,
    requester_name: input.name.trim(),
    // The column predates the switch from a free-text department to a
    // position picked from a list.
    department: input.position || null,
    phone: normalizePhone(input.phone),
    passengers: Number(input.passengers),
    province: input.province,
    destination: input.destination.trim(),
    note: input.note.trim() || null,
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newCode();
    const { error } = await supabase
      .from("reservations")
      .insert({ ...row, code });
    if (!error) return { ok: true, code, sentDate: bangkokToday() };
    if (error.code !== UNIQUE_VIOLATION) {
      console.error("createReservation failed", error);
      break;
    }
  }
  return { ok: false, error: GENERIC_ERROR };
}

export type CancelResult = { ok: true } | { ok: false; error: string };

// Cancels one of the signed-in user's own bookings; the database function
// refuses anyone else's, and ones already rejected or cancelled.
export async function cancelReservation(code: string): Promise<CancelResult> {
  const normalized = normalizeCode(typeof code === "string" ? code : "");
  if (!CODE_RE.test(normalized)) return { ok: false, error: GENERIC_ERROR };

  const supabase = await getSupabaseAuth();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED };

  const { data, error } = await supabase.rpc("cancel_my_reservation", {
    p_code: normalized,
  });
  if (error) {
    console.error("cancelReservation failed", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  refresh();
  if (!data) return { ok: false, error: "ไม่สามารถยกเลิกการจองนี้ได้" };
  return { ok: true };
}

export type AdminDecision = "approved" | "rejected";

const REASON_REQUIRED = "กรุณาระบุหมายเหตุที่ไม่อนุมัติ";

// The reason a rejection must give, trimmed; null when it is missing or too
// long. Approvals carry none.
function rejectReason(status: AdminDecision, raw: unknown) {
  if (status !== "rejected") return "";
  const reason = typeof raw === "string" ? raw.trim() : "";
  return reason && reason.length <= REJECT_REASON_MAX ? reason : null;
}

// Approves or rejects a booking. The database function checks that the caller
// is an admin, so this action needs no check of its own.
export async function setReservationStatus(
  code: string,
  status: AdminDecision,
  reason?: string,
): Promise<CancelResult> {
  const normalized = normalizeCode(typeof code === "string" ? code : "");
  if (!CODE_RE.test(normalized) || !["approved", "rejected"].includes(status)) {
    return { ok: false, error: GENERIC_ERROR };
  }
  const note = rejectReason(status, reason);
  if (note === null) return { ok: false, error: REASON_REQUIRED };

  const supabase = await getSupabaseAuth();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED };

  const { data, error } = await supabase.rpc("set_reservation_status", {
    p_code: normalized,
    p_status: status,
    p_reason: note || null,
  });
  if (error) {
    console.error("setReservationStatus failed", error);
    return {
      ok: false,
      error:
        error.code === "42501" ? "คุณไม่มีสิทธิ์ดำเนินการนี้" : GENERIC_ERROR,
    };
  }
  refresh();
  if (!data) return { ok: false, error: "ไม่สามารถเปลี่ยนสถานะการจองนี้ได้" };
  return { ok: true };
}

export type BulkResult =
  { ok: true; changed: number } | { ok: false; error: string };

// Approves or rejects many bookings in one go, under the same rules as one.
export async function setReservationStatuses(
  codes: string[],
  status: AdminDecision,
  reason?: string,
): Promise<BulkResult> {
  const normalized = Array.isArray(codes)
    ? [
        ...new Set(
          codes.map((c) => normalizeCode(typeof c === "string" ? c : "")),
        ),
      ]
    : [];
  if (
    normalized.length === 0 ||
    normalized.length > 500 ||
    !normalized.every((c) => CODE_RE.test(c)) ||
    !["approved", "rejected"].includes(status)
  ) {
    return { ok: false, error: GENERIC_ERROR };
  }
  const note = rejectReason(status, reason);
  if (note === null) return { ok: false, error: REASON_REQUIRED };

  const supabase = await getSupabaseAuth();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED };

  const { data, error } = await supabase.rpc("set_reservation_statuses", {
    p_codes: normalized,
    p_status: status,
    p_reason: note || null,
  });
  if (error) {
    console.error("setReservationStatuses failed", error);
    return {
      ok: false,
      error:
        error.code === "42501" ? "คุณไม่มีสิทธิ์ดำเนินการนี้" : GENERIC_ERROR,
    };
  }
  refresh();
  return { ok: true, changed: typeof data === "number" ? data : 0 };
}

// A well-formed code that matches nothing and a malformed one both come back
// as an empty list: either way there is no such booking.
export async function lookupReservationByCode(
  code: string,
): Promise<LookupResult> {
  const normalized = normalizeCode(typeof code === "string" ? code : "");
  if (!CODE_RE.test(normalized)) return { ok: true, items: [] };

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED };

  const { data, error } = await supabase.rpc("lookup_reservation_by_code", {
    p_code: normalized,
  });
  if (error) {
    console.error("lookupReservationByCode failed", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  return { ok: true, items: (data ?? []) as ReservationSummary[] };
}

export async function lookupReservations(phone: string): Promise<LookupResult> {
  const normalized = normalizePhone(typeof phone === "string" ? phone : "");
  if (!/^0\d{8,9}$/.test(normalized)) {
    return { ok: false, error: "กรุณากรอกเบอร์ติดต่อ 9–10 หลัก ขึ้นต้นด้วย 0" };
  }

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED };

  const { data, error } = await supabase.rpc("lookup_reservations", {
    p_phone: normalized,
  });
  if (error) {
    console.error("lookupReservations failed", error);
    return { ok: false, error: GENERIC_ERROR };
  }
  return { ok: true, items: (data ?? []) as ReservationSummary[] };
}
