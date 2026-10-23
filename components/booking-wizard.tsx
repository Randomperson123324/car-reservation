"use client";

import {
  useEffect,
  useEffectEvent,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  CalendarDays,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock,
  Hourglass,
  MapPin,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { BookingSuccess } from "@/components/booking-success";
import { Collapse } from "@/components/collapse";
import { DatePicker } from "@/components/date-picker";
import { DestinationInput } from "@/components/destination-input";
import { ProvinceMap } from "@/components/province-map";
import { Select } from "@/components/select";
import { TimeInput } from "@/components/time-input";
import { createReservation } from "@/app/actions";
import {
  EMPTY_RESERVATION,
  MAX_PASSENGERS,
  POSITIONS,
  TRIP_TYPES,
  formatThaiDate,
  formatTime,
  tripTypeLabel,
  validateReservation,
  type ReservationErrors,
  type ReservationField,
  type ReservationInput,
  type TripTypeId,
} from "@/lib/reservation";

const STEPS: {
  title: string;
  heading: string;
  icon: LucideIcon;
  fields: ReservationField[];
}[] = [
  {
    title: "วันเดินทาง",
    heading: "เดินทางวันไหน และแบบใด",
    icon: CalendarDays,
    fields: ["travelDate", "tripType"],
  },
  {
    title: "เวลา",
    heading: "ระบุเวลาเดินทาง",
    icon: Clock,
    fields: ["departTime", "arriveTime", "returnTime"],
  },
  {
    title: "ผู้ใช้บริการ",
    heading: "รายละเอียดผู้ใช้บริการ",
    icon: UserRound,
    fields: ["name", "position", "phone", "passengers"],
  },
  {
    title: "สถานที่",
    heading: "ต้องการไปที่ไหน",
    icon: MapPin,
    fields: ["province", "destination", "note"],
  },
  {
    title: "ยืนยัน",
    heading: "ตรวจสอบและยืนยันการจอง",
    icon: ClipboardCheck,
    fields: [],
  },
];

const TRIP_ICONS: Record<TripTypeId, LucideIcon> = {
  drop_off: ArrowRight,
  pick_up: ArrowLeft,
  drop_and_pick: ArrowLeftRight,
  drop_and_wait: Hourglass,
};

const LAST_STEP = STEPS.length - 1;

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

// Steps slide in from the side they are headed toward.
const stepSlideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? "100%" : "-100%" }),
  center: {
    x: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 28 },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    transition: { duration: 0.2, ease: "easeIn" as const },
  }),
};

export function BookingWizard({ today }: { today: string }) {
  const [form, setForm] = useState<ReservationInput>(EMPTY_RESERVATION);
  const [errors, setErrors] = useState<ReservationErrors>({});
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitError, setSubmitError] = useState("");
  const [code, setCode] = useState("");
  const [sentDate, setSentDate] = useState("");
  const [pending, startTransition] = useTransition();

  function set<K extends ReservationField>(key: K, value: ReservationInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function goToStep(target: number) {
    setDirection(target > step ? 1 : -1);
    setStep(target);
  }

  function next() {
    const all = validateReservation(form, today);
    const stepErrors: ReservationErrors = {};
    for (const field of STEPS[step].fields) {
      if (all[field]) stepErrors[field] = all[field];
    }
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) goToStep(step + 1);
  }

  function submit() {
    setSubmitError("");
    startTransition(async () => {
      const result = await createReservation(form);
      if (result.ok) {
        setSentDate(result.sentDate);
        setCode(result.code);
        return;
      }
      if (result.fieldErrors) {
        const fieldErrors = result.fieldErrors;
        setErrors(fieldErrors);
        const firstBad = STEPS.findIndex((s) =>
          s.fields.some((field) => fieldErrors[field]),
        );
        if (firstBad >= 0) goToStep(firstBad);
      }
      setSubmitError(result.error);
    });
  }

  // Enter moves on from anywhere on the page, not only from inside a text
  // field. Handlers that use Enter themselves (picking a suggestion or a
  // province) call preventDefault, which leaves the key to them.
  const onEnter = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Enter" || event.defaultPrevented) return;
    if (event.isComposing || event.shiftKey || event.ctrlKey) return;
    if (event.altKey || event.metaKey) return;
    // The last step sends the booking, which stays a deliberate click.
    if (code || pending || step === LAST_STEP) return;
    const target = event.target as HTMLElement;
    // Enter keeps its own meaning in the note (new line), in the navbar, and
    // on a focused dropdown option.
    if (target.closest("textarea, nav, [role=option], [data-enter-native]"))
      return;
    event.preventDefault();
    next();
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onEnter(event);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  if (code) {
    return <BookingSuccess code={code} sentDate={sentDate} form={form} />;
  }

  const StepIcon = STEPS[step].icon;

  return (
    <>
      <section className="bg-linear-to-b from-brand-100/40 to-transparent pt-16">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Stepper current={step} />
        </div>
      </section>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 sm:px-6">
        <p className="mb-6 mt-8 text-lg text-ink-muted">
          กรอกข้อมูลทีละขั้นตอนเพื่อจองรถสถาบัน
        </p>

        {/* Clips the horizontal slide so off-screen steps don't add a scrollbar. */}
        <div className="-mx-4 overflow-x-clip px-4 sm:-mx-6 sm:px-6">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.form
              key={step}
              custom={direction}
              variants={stepSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="card rounded-2xl p-6 sm:p-8"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                if (step === LAST_STEP) submit();
                else next();
              }}
            >
              <h2 className="flex items-center gap-2 text-ink">
                <StepIcon
                  size={24}
                  className="shrink-0 text-brand-600"
                  aria-hidden
                />
                {STEPS[step].heading}
              </h2>

              <div className="mt-6 space-y-6">
                {step === 0 && (
                  <>
                    <Field
                      id="travelDate"
                      label="วันเดินทาง"
                      error={errors.travelDate}
                    >
                      <DatePicker
                        id="travelDate"
                        today={today}
                        value={form.travelDate}
                        onChange={(date) => set("travelDate", date)}
                        invalid={!!errors.travelDate}
                      />
                    </Field>

                    <fieldset>
                      <legend className="font-semibold text-ink">
                        รูปแบบการเดินทาง
                      </legend>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        {TRIP_TYPES.map((trip) => {
                          const Icon = TRIP_ICONS[trip.id];
                          return (
                            <label
                              key={trip.id}
                              className="group cursor-pointer"
                            >
                              <input
                                type="radio"
                                name="tripType"
                                value={trip.id}
                                checked={form.tripType === trip.id}
                                onChange={() => set("tripType", trip.id)}
                                className="peer sr-only"
                              />
                              <span className="flex h-full items-start gap-3 rounded-2xl border border-line-strong bg-surface p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-200">
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-has-checked:bg-brand-600 group-has-checked:text-white">
                                  <Icon className="size-5" aria-hidden />
                                </span>
                                <span>
                                  <span className="block font-semibold text-ink">
                                    {trip.label}
                                  </span>
                                  <span className="mt-0.5 block text-sm leading-relaxed text-ink-muted">
                                    {trip.desc}
                                  </span>
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <ErrorText message={errors.tripType} />
                    </fieldset>
                  </>
                )}

                {step === 1 && (
                  <>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <Field
                        id="departTime"
                        label="เวลาออกเดินทาง"
                        error={errors.departTime}
                      >
                        <TimeInput
                          id="departTime"
                          value={form.departTime}
                          onChange={(time) => set("departTime", time)}
                          invalid={!!errors.departTime}
                        />
                      </Field>
                      <Field
                        id="arriveTime"
                        label="เวลาถึงสถานที่"
                        error={errors.arriveTime}
                      >
                        <TimeInput
                          id="arriveTime"
                          value={form.arriveTime}
                          onChange={(time) => set("arriveTime", time)}
                          invalid={!!errors.arriveTime}
                        />
                      </Field>
                    </div>
                    {form.tripType === "drop_and_pick" && (
                      <Field
                        id="returnTime"
                        label="เวลาที่ให้ไปรับกลับ"
                        error={errors.returnTime}
                      >
                        <TimeInput
                          id="returnTime"
                          value={form.returnTime}
                          onChange={(time) => set("returnTime", time)}
                          invalid={!!errors.returnTime}
                          className="sm:max-w-[calc(50%-0.75rem)]"
                        />
                      </Field>
                    )}
                    <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink-muted">
                      {formatThaiDate(form.travelDate)} ·{" "}
                      {tripTypeLabel(form.tripType)}
                    </p>
                  </>
                )}

                {step === 2 && (
                  <>
                    <Field id="name" label="ชื่อ-นามสกุล" error={errors.name}>
                      <input
                        id="name"
                        type="text"
                        autoComplete="name"
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                        aria-invalid={!!errors.name}
                        className="field"
                      />
                    </Field>
                    <Field
                      id="position"
                      label="ตำแหน่ง"
                      error={errors.position}
                    >
                      <Select
                        id="position"
                        options={POSITIONS}
                        value={form.position}
                        onChange={(position) => set("position", position)}
                        invalid={!!errors.position}
                      />
                    </Field>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <Field
                        id="phone"
                        label="เบอร์ติดต่อ"
                        error={errors.phone}
                      >
                        <input
                          id="phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="08x-xxx-xxxx"
                          value={form.phone}
                          onChange={(e) => set("phone", e.target.value)}
                          aria-invalid={!!errors.phone}
                          className="field"
                        />
                      </Field>
                      <Field
                        id="passengers"
                        label="จำนวนผู้โดยสาร"
                        error={errors.passengers}
                      >
                        <input
                          id="passengers"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={MAX_PASSENGERS}
                          value={form.passengers}
                          onChange={(e) => set("passengers", e.target.value)}
                          aria-invalid={!!errors.passengers}
                          className="field"
                        />
                      </Field>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <fieldset>
                      <legend className="font-semibold text-ink">
                        จังหวัด
                      </legend>
                      <div className="mt-2">
                        <ProvinceMap
                          value={form.province}
                          onChange={(province) => set("province", province)}
                          invalid={!!errors.province}
                        />
                      </div>
                      <ErrorText message={errors.province} />
                    </fieldset>
                    <Field
                      id="destination"
                      label="ชื่อสถานที่ที่ต้องการไป"
                      error={errors.destination}
                    >
                      <DestinationInput
                        id="destination"
                        value={form.destination}
                        onChange={(value) => set("destination", value)}
                        province={form.province}
                        invalid={!!errors.destination}
                      />
                    </Field>
                    <Field
                      id="note"
                      label="หมายเหตุ"
                      optional
                      error={errors.note}
                    >
                      <textarea
                        id="note"
                        rows={3}
                        value={form.note}
                        onChange={(e) => set("note", e.target.value)}
                        aria-invalid={!!errors.note}
                        className="field resize-none"
                      />
                    </Field>
                  </>
                )}

                {step === LAST_STEP && <Summary form={form} />}
              </div>

              <Collapse open={!!submitError}>
                <div className="pt-6">
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800"
                  >
                    <CircleAlert
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden
                    />
                    {submitError}
                  </p>
                </div>
              </Collapse>

              <div className="mt-10 flex items-center justify-between gap-3">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitError("");
                      goToStep(step - 1);
                    }}
                    disabled={pending}
                    data-enter-native
                    className="btn btn-ghost"
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                    ย้อนกลับ
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={pending}
                  className="btn btn-primary"
                >
                  {step === LAST_STEP ? (
                    <>
                      {pending ? (
                        <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      ) : (
                        <Check className="size-4" aria-hidden />
                      )}
                      {pending ? "กำลังส่งคำขอ" : "ยืนยันการจอง"}
                    </>
                  ) : (
                    <>
                      ถัดไป
                      <ArrowRight className="size-4" aria-hidden />
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}

// The current step grows into the page title while the others shrink; each
// item keeps its DOM node, so `layout` animates the size and position change.
function Stepper({ current }: { current: number }) {
  return (
    <>
      <h1 className="sr-only">จองรถสถาบัน · {STEPS[current].title}</h1>

      <ol className="hidden flex-nowrap items-center justify-center gap-3 md:flex">
        {STEPS.map((s, index) => {
          const active = index === current;
          const done = index < current;
          return (
            <li
              key={s.title}
              aria-current={active ? "step" : undefined}
              className="flex items-center gap-3"
            >
              <motion.span
                layout
                transition={SPRING}
                className={`grid shrink-0 place-items-center rounded-full border-2 font-display font-bold transition-colors duration-300 ${
                  active
                    ? "size-16 border-brand-600 bg-brand-600 text-3xl text-white"
                    : done
                      ? "size-9 border-brand-600 bg-brand-600 text-white"
                      : "size-9 border-line-strong text-ink-subtle"
                }`}
              >
                {done ? <Check size={18} aria-hidden /> : index + 1}
              </motion.span>
              <motion.span
                layout
                transition={SPRING}
                className={`whitespace-nowrap font-display transition-colors duration-300 ${
                  active
                    ? "text-4xl font-bold leading-tight text-ink lg:text-5xl"
                    : `hidden font-semibold lg:block ${
                        done ? "text-ink-muted" : "text-ink-subtle"
                      }`
                }`}
              >
                {s.title}
              </motion.span>
              {index < LAST_STEP && (
                <span
                  aria-hidden
                  className={`h-px w-8 transition-colors duration-300 ${
                    done ? "bg-brand-600" : "bg-line-strong"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>

      <div className="md:hidden">
        <p className="font-display font-semibold text-brand-600">
          ขั้นตอนที่ {current + 1} จาก {STEPS.length}
        </p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={current}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="font-display text-4xl font-bold leading-tight text-ink"
          >
            {STEPS[current].title}
          </motion.p>
        </AnimatePresence>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
          <motion.div
            className="h-full rounded-full bg-brand-600"
            initial={false}
            animate={{ width: `${((current + 1) / STEPS.length) * 100}%` }}
            transition={SPRING}
          />
        </div>
      </div>
    </>
  );
}

function Field({
  id,
  label,
  optional,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="font-semibold text-ink">
        {label}
        {optional && (
          <span className="ml-2 font-normal text-ink-subtle">ไม่บังคับ</span>
        )}
      </label>
      <div className="mt-2">{children}</div>
      <ErrorText message={error} />
    </div>
  );
}

function ErrorText({ message }: { message?: string }) {
  return (
    <Collapse open={!!message}>
      <p role="alert" className="pt-2 text-sm font-semibold text-brand-700">
        {message}
      </p>
    </Collapse>
  );
}

function Summary({ form }: { form: ReservationInput }) {
  const rows: [string, string][] = [
    ["วันเดินทาง", formatThaiDate(form.travelDate)],
    ["รูปแบบการเดินทาง", tripTypeLabel(form.tripType)],
    ["เวลาออกเดินทาง", formatTime(form.departTime)],
    ["เวลาถึงสถานที่", formatTime(form.arriveTime)],
  ];
  if (form.tripType === "drop_and_pick") {
    rows.push(["เวลาที่ให้ไปรับกลับ", formatTime(form.returnTime)]);
  }
  rows.push(["ผู้ใช้บริการ", form.name.trim()]);
  if (form.position) rows.push(["ตำแหน่ง", form.position]);
  rows.push(
    ["เบอร์ติดต่อ", form.phone.trim()],
    ["จำนวนผู้โดยสาร", `${form.passengers} คน`],
    ["จังหวัด", form.province],
    ["สถานที่", form.destination.trim()],
  );
  if (form.note.trim()) rows.push(["หมายเหตุ", form.note.trim()]);

  return (
    <dl className="divide-y divide-line rounded-2xl border border-line-strong bg-surface-muted px-5">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex flex-col gap-1 py-3.5 sm:flex-row sm:justify-between sm:gap-6"
        >
          <dt className="shrink-0 text-sm text-ink-muted">{label}</dt>
          <dd className="font-medium break-words text-ink sm:text-right">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
