"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { Check, Settings, X } from "lucide-react";
import Link from "next/link";
import {
  setReservationStatus,
  setReservationStatuses,
  type AdminDecision,
  type Assignment,
} from "@/app/actions";
import { Collapse } from "@/components/collapse";
import { Select } from "@/components/select";
import {
  REJECT_REASON_MAX,
  vehicleLabel,
  type Driver,
  type Vehicle,
} from "@/lib/reservation";

// Every car and driver, inactive ones included so past bookings can still name
// theirs; only active ones are offered.
export type Fleet = { vehicles: Vehicle[]; drivers: Driver[] };

const FleetContext = createContext<Fleet>({ vehicles: [], drivers: [] });
export const FleetProvider = FleetContext.Provider;

export function useFleet() {
  return useContext(FleetContext);
}

export const NO_ASSIGNMENT: Assignment = { vehicleId: "", driverId: "" };

// The car and driver pickers an approval needs.
export function AssignmentFields({
  id,
  value,
  onChange,
  dropUp,
}: {
  id: string;
  value: Assignment;
  onChange: (value: Assignment) => void;
  // Opens the lists upward, for the bar docked to the bottom of the screen.
  dropUp?: boolean;
}) {
  const { vehicles, drivers } = useFleet();
  const activeVehicles = vehicles.filter((v) => v.active);
  const activeDrivers = drivers.filter((d) => d.active);
  const vehicle = activeVehicles.find((v) => v.id === value.vehicleId);
  const driver = activeDrivers.find((d) => d.id === value.driverId);

  if (activeVehicles.length === 0 || activeDrivers.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line-strong px-4 py-3 text-ink-muted">
        ยังไม่มี{activeVehicles.length === 0 ? "รถ" : "คนขับ"}ให้เลือก{" "}
        <Link
          href="/admin/settings"
          className="font-semibold text-brand-700 underline-offset-2 hover:underline"
        >
          เพิ่มในหน้าตั้งค่า
        </Link>
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor={`${id}-vehicle`} className="font-semibold text-ink">
          ทะเบียนรถ
        </label>
        <div className="mt-2">
          <Select
            id={`${id}-vehicle`}
            options={activeVehicles.map(vehicleLabel)}
            value={vehicle ? vehicleLabel(vehicle) : ""}
            onChange={(label) =>
              onChange({
                ...value,
                vehicleId:
                  activeVehicles.find((v) => vehicleLabel(v) === label)?.id ??
                  "",
              })
            }
            placeholder="เลือกทะเบียนรถ"
            dropUp={dropUp}
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-driver`} className="font-semibold text-ink">
          คนขับ
        </label>
        <div className="mt-2">
          <Select
            id={`${id}-driver`}
            options={activeDrivers.map((d) => d.name)}
            value={driver?.name ?? ""}
            onChange={(name) =>
              onChange({
                ...value,
                driverId: activeDrivers.find((d) => d.name === name)?.id ?? "",
              })
            }
            placeholder="เลือกคนขับ"
            dropUp={dropUp}
          />
        </div>
      </div>
    </div>
  );
}

// Approve / reject buttons for one booking, or for several at once. Both are
// offered until a decision is made; afterwards the opposite one, so a decision
// can be reversed, and for an approval a way to change its car and driver.
// Rejecting asks for the reason, which the requester is shown; approving asks
// for the car and driver.
export function AdminActions({
  codes,
  statuses,
  assigned,
  label,
  bare,
}: {
  codes: string[];
  statuses: string[];
  // The car and driver already assigned, to start the pickers from.
  assigned?: Assignment;
  // Shown before the buttons, e.g. what a group's buttons apply to.
  label?: string;
  // Leaves out the divider above, for a row that has its own.
  bare?: boolean;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [deciding, setDeciding] = useState<AdminDecision | null>(null);
  const [mode, setMode] = useState<AdminDecision | null>(null);
  const [reason, setReason] = useState("");
  const [assignment, setAssignment] = useState<Assignment>(
    assigned ?? NO_ASSIGNMENT,
  );
  const idBase = `decide-${codes.join("-")}`;
  const allApproved = statuses.every((status) => status === "approved");

  function open(next: AdminDecision) {
    setMode(next);
    setError("");
  }

  function decide(decision: AdminDecision) {
    setError("");
    setDeciding(decision);
    startTransition(async () => {
      const result =
        codes.length === 1
          ? await setReservationStatus(codes[0], decision, reason, assignment)
          : await setReservationStatuses(codes, decision, reason, assignment);
      setDeciding(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMode(null);
      setReason("");
    });
  }

  const spinner = (
    <span className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
  );

  return (
    <div className={bare ? "" : "mt-4 border-t border-line pt-4"}>
      <Collapse open={mode === "rejected"}>
        {/* Room for the field's focus ring inside the clipped panel. */}
        <div className="-mx-1 px-1 pb-3 pt-1">
          <label htmlFor={`${idBase}-reason`} className="font-semibold text-ink">
            หมายเหตุที่ไม่อนุมัติ
          </label>
          <textarea
            id={`${idBase}-reason`}
            rows={2}
            maxLength={REJECT_REASON_MAX}
            placeholder={
              codes.length === 1
                ? "เช่น ไม่มีรถว่างในวันดังกล่าว"
                : `ใช้กับทั้ง ${codes.length} วัน`
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="field mt-2 resize-y"
          />
        </div>
      </Collapse>
      <Collapse open={mode === "approved"} spill>
        <div className="-mx-1 px-1 pb-3 pt-1">
          <AssignmentFields
            id={idBase}
            value={assignment}
            onChange={setAssignment}
          />
        </div>
      </Collapse>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {error ? (
          <p
            role="alert"
            className="mr-auto text-sm font-semibold text-brand-700"
          >
            {error}
          </p>
        ) : (
          label && <p className="mr-auto text-sm text-ink-muted">{label}</p>
        )}
        {mode ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setMode(null);
                setError("");
              }}
              className="btn btn-ghost px-4 py-2 text-base"
            >
              ยกเลิก
            </button>
            {mode === "rejected" ? (
              <button
                type="button"
                disabled={pending || !reason.trim()}
                onClick={() => decide("rejected")}
                className="btn btn-primary px-4 py-2 text-base"
              >
                {deciding ? spinner : <X size={18} aria-hidden />}
                ยืนยันไม่อนุมัติ
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  pending || !assignment.vehicleId || !assignment.driverId
                }
                onClick={() => decide("approved")}
                className="btn bg-green-600 px-4 py-2 text-base text-white hover:-translate-y-px hover:bg-green-700"
              >
                {deciding ? spinner : <Check size={18} aria-hidden />}
                {allApproved ? "บันทึกรถและคนขับ" : "ยืนยันอนุมัติ"}
              </button>
            )}
          </>
        ) : (
          <>
            {statuses.some((status) => status !== "rejected") && (
              <button
                type="button"
                disabled={pending}
                onClick={() => open("rejected")}
                className="btn btn-outline px-4 py-2 text-base"
              >
                <X size={18} aria-hidden />
                ไม่อนุมัติ
              </button>
            )}
            {allApproved ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => open("approved")}
                className="btn btn-outline px-4 py-2 text-base"
              >
                <Settings size={18} aria-hidden />
                เปลี่ยนรถ/คนขับ
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => open("approved")}
                className="btn bg-green-600 px-4 py-2 text-base text-white hover:-translate-y-px hover:bg-green-700"
              >
                <Check size={18} aria-hidden />
                อนุมัติ
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
