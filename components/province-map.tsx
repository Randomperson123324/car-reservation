"use client";

import { useState } from "react";
import { PROVINCES, type Province } from "@/lib/reservation";
import { PROVINCE_MAP_VIEWBOX, PROVINCE_SHAPES } from "@/lib/province-shapes";

// Names too long to sit inside their own outline get a shorter map label.
const MAP_LABELS: Partial<Record<Province, string>> = {
  กรุงเทพมหานคร: "กรุงเทพฯ",
};

export function ProvinceMap({
  value,
  onChange,
  invalid,
}: {
  value: Province | "";
  onChange: (province: Province) => void;
  invalid?: boolean;
}) {
  const [hovered, setHovered] = useState<Province | "">("");

  // Paint order: the hovered and selected outlines go last so their thicker
  // borders are not covered by a neighbour.
  const ordered = [...PROVINCES].sort(
    (a, b) =>
      Number(a === value) * 2 +
      Number(a === hovered) -
      (Number(b === value) * 2 + Number(b === hovered)),
  );

  return (
    <div role="radiogroup" aria-label="จังหวัด">
      <div
        className={`rounded-2xl border bg-brand-50 p-3 transition sm:p-5 ${
          invalid ? "border-brand-500" : "border-line-strong"
        }`}
      >
        <svg viewBox={PROVINCE_MAP_VIEWBOX} className="block h-auto w-full">
          {ordered.map((province) => {
            const selected = province === value;
            const active = province === hovered;
            return (
              <path
                key={province}
                d={PROVINCE_SHAPES[province].d}
                role="radio"
                aria-checked={selected}
                aria-label={province}
                tabIndex={0}
                onClick={() => onChange(province)}
                onKeyDown={(event) => {
                  // Enter on the province already picked is left alone, so it
                  // can move the form on.
                  if (
                    event.key === " " ||
                    (event.key === "Enter" && !selected)
                  ) {
                    event.preventDefault();
                    onChange(province);
                  }
                }}
                onMouseEnter={() => setHovered(province)}
                onMouseLeave={() => setHovered("")}
                onFocus={() => setHovered(province)}
                onBlur={() => setHovered("")}
                strokeLinejoin="round"
                className={`cursor-pointer outline-none transition-colors duration-200 ${
                  selected
                    ? "fill-brand-600 stroke-brand-800"
                    : active
                      ? "fill-brand-100 stroke-brand-600"
                      : "fill-surface stroke-brand-500"
                }`}
                strokeWidth={selected || active ? 2 : 1.25}
              />
            );
          })}
          {PROVINCES.map((province) => (
            <text
              key={province}
              x={PROVINCE_SHAPES[province].x}
              y={PROVINCE_SHAPES[province].y}
              aria-hidden
              textAnchor="middle"
              dominantBaseline="middle"
              className={`pointer-events-none font-display text-[13px] font-semibold transition-colors duration-200 select-none ${
                province === value ? "fill-white" : "fill-brand-800"
              }`}
            >
              {MAP_LABELS[province] ?? province}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
