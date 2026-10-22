"use client";

// Turns whatever was typed into as much of "HH:MM" as it covers: digits only,
// with the colon inserted after the hour. A lone digit followed by a colon
// ("9:") is read as a one-digit hour.
function formatTime(raw: string) {
  const padded = raw.replace(/^(\d):/, "0$1");
  const digits = padded.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2
    ? `${digits.slice(0, 2)}:${digits.slice(2)}`
    : digits;
}

// A typed 24-hour time field. The native time input follows the device
// locale, which shows AM/PM on many machines.
export function TimeInput({
  id,
  value,
  onChange,
  invalid,
  className = "",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="00:00"
        maxLength={5}
        value={value}
        onChange={(event) => {
          const next = formatTime(event.target.value);
          // Typing the second hour digit adds the colon; deleting it does not
          // put it straight back.
          onChange(
            next.length === 2 && next.length > value.length ? `${next}:` : next,
          );
        }}
        aria-invalid={invalid}
        className="field pr-12"
      />
      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-muted">
        น.
      </span>
    </div>
  );
}
