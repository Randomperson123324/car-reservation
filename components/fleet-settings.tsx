"use client";

import { useState, useTransition } from "react";
import { CarFront, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import {
  deleteFleetItem,
  saveFleetItem,
  setFleetItemActive,
  type FleetKind,
} from "@/app/admin/settings/actions";
import type { Driver, Vehicle } from "@/lib/reservation";

// One car or driver as the editor sees it: the main field (plate or name)
// and the optional one (description or phone).
type Item = {
  id: string;
  main: string;
  extra: string;
  active: boolean;
};

type Fields = {
  title: string;
  icon: typeof CarFront;
  main: string;
  mainPlaceholder: string;
  extra: string;
  extraPlaceholder: string;
  empty: string;
};

const FIELDS: Record<FleetKind, Fields> = {
  vehicles: {
    title: "ทะเบียนรถ",
    icon: CarFront,
    main: "ทะเบียนรถ",
    mainPlaceholder: "เช่น กข 1234 กรุงเทพมหานคร",
    extra: "รายละเอียด",
    extraPlaceholder: "เช่น รถตู้ 12 ที่นั่ง (ไม่บังคับ)",
    empty: "ยังไม่มีรถ เพิ่มรถคันแรกด้านบน",
  },
  drivers: {
    title: "คนขับ",
    icon: UserRound,
    main: "ชื่อ-นามสกุล",
    mainPlaceholder: "เช่น สมชาย ใจดี",
    extra: "เบอร์ติดต่อ",
    extraPlaceholder: "เช่น 0812345678 (ไม่บังคับ)",
    empty: "ยังไม่มีคนขับ เพิ่มคนขับคนแรกด้านบน",
  },
};

export function FleetSettings({
  vehicles,
  drivers,
}: {
  vehicles: Vehicle[];
  drivers: Driver[];
}) {
  return (
    <div className="space-y-6">
      <FleetList
        kind="vehicles"
        items={vehicles.map((v) => ({
          id: v.id,
          main: v.plate,
          extra: v.description ?? "",
          active: v.active,
        }))}
      />
      <FleetList
        kind="drivers"
        items={drivers.map((d) => ({
          id: d.id,
          main: d.name,
          extra: d.phone ?? "",
          active: d.active,
        }))}
      />
    </div>
  );
}

function FleetList({ kind, items }: { kind: FleetKind; items: Item[] }) {
  const fields = FIELDS[kind];
  const Icon = fields.icon;
  return (
    <section className="card rounded-2xl p-5">
      <h2 className="flex items-center gap-2 text-xl text-ink">
        <Icon size={22} className="text-brand-600" aria-hidden />
        {fields.title}
        <span className="rounded-full bg-surface-muted px-2.5 text-sm text-ink-muted">
          {items.length}
        </span>
      </h2>
      <ItemForm kind={kind} />
      {items.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-ink-muted">
          {fields.empty}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {items.map((item) => (
            <ItemRow key={item.id} kind={kind} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

// Adds an item, or edits the given one.
function ItemForm({
  kind,
  item,
  onDone,
}: {
  kind: FleetKind;
  item?: Item;
  onDone?: () => void;
}) {
  const fields = FIELDS[kind];
  const [main, setMain] = useState(item?.main ?? "");
  const [extra, setExtra] = useState(item?.extra ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const idBase = `${kind}-${item?.id ?? "new"}`;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await saveFleetItem(kind, item?.id ?? null, main, extra);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!item) {
        setMain("");
        setExtra("");
      }
      onDone?.();
    });
  }

  return (
    <form onSubmit={submit} className={item ? "" : "mt-4"}>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor={`${idBase}-main`} className="font-semibold text-ink">
            {fields.main}
          </label>
          <input
            id={`${idBase}-main`}
            value={main}
            onChange={(e) => setMain(e.target.value)}
            placeholder={fields.mainPlaceholder}
            maxLength={kind === "vehicles" ? 30 : 120}
            className="field mt-2"
          />
        </div>
        <div>
          <label htmlFor={`${idBase}-extra`} className="font-semibold text-ink">
            {fields.extra}
          </label>
          <input
            id={`${idBase}-extra`}
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder={fields.extraPlaceholder}
            inputMode={kind === "drivers" ? "tel" : undefined}
            maxLength={kind === "vehicles" ? 120 : 20}
            className="field mt-2"
          />
        </div>
        <div className="flex gap-2">
          {onDone && item && (
            <button
              type="button"
              disabled={pending}
              onClick={onDone}
              className="btn btn-ghost px-4 py-2 text-base"
            >
              ยกเลิก
            </button>
          )}
          <button
            type="submit"
            disabled={pending || main.trim().length < 2}
            className="btn btn-primary px-4 py-2 text-base"
          >
            {pending ? (
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              !item && <Plus size={18} aria-hidden />
            )}
            {item ? "บันทึก" : "เพิ่ม"}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-brand-700">
          {error}
        </p>
      )}
    </form>
  );
}

function ItemRow({ kind, item }: { kind: FleetKind; item: Item }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    startTransition(async () => {
      const result = await action();
      setConfirming(false);
      if (!result.ok) setError(result.error ?? "");
    });
  }

  if (editing) {
    return (
      <li className="bg-surface-muted px-4 py-3">
        <ItemForm kind={kind} item={item} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`font-semibold break-words ${
              item.active ? "text-ink" : "text-ink-subtle line-through"
            }`}
          >
            {item.main}
          </p>
          {item.extra && (
            <p className="text-sm break-words text-ink-muted">{item.extra}</p>
          )}
        </div>
        {!item.active && (
          <span className="rounded-full border border-line-strong bg-surface-muted px-3 py-1 text-sm font-semibold text-ink-muted">
            ปิดใช้งาน
          </span>
        )}
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink">ยืนยันการลบ?</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="btn btn-ghost px-3 py-1.5 text-base"
            >
              ไม่ลบ
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deleteFleetItem(kind, item.id))}
              className="btn btn-primary px-3 py-1.5 text-base"
            >
              ลบ
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => setFleetItemActive(kind, item.id, !item.active))
              }
              className="btn btn-ghost px-3 py-1.5 text-sm"
            >
              {item.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
            </button>
            <button
              type="button"
              disabled={pending}
              aria-label={`แก้ไข ${item.main}`}
              onClick={() => {
                setError("");
                setEditing(true);
              }}
              className="btn btn-ghost p-2"
            >
              <Pencil size={18} aria-hidden />
            </button>
            <button
              type="button"
              disabled={pending}
              aria-label={`ลบ ${item.main}`}
              onClick={() => {
                setError("");
                setConfirming(true);
              }}
              className="btn btn-ghost p-2 text-brand-700"
            >
              <Trash2 size={18} aria-hidden />
            </button>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-brand-700">
          {error}
        </p>
      )}
    </li>
  );
}
