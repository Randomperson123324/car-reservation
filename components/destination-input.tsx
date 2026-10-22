"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Banknote,
  BookOpen,
  Building2,
  Bus,
  Camera,
  Church,
  Coffee,
  Factory,
  Fuel,
  GraduationCap,
  Hospital,
  Hotel,
  House,
  Landmark,
  MapPin,
  Pill,
  Plane,
  Route,
  School,
  Ship,
  ShoppingBag,
  SquareParking,
  Store,
  TrainFront,
  Trees,
  Trophy,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { EASE } from "@/components/page-transition";
import { PROVINCE_BOUNDS, SERVICE_AREA_BOUNDS } from "@/lib/province-shapes";
import type { Province } from "@/lib/reservation";

// Photon is a keyless, CORS-enabled geocoder built on OpenStreetMap data and
// made for search-as-you-type.
const PHOTON_URL = "https://photon.komoot.io/api/";
const MIN_QUERY = 2;
// Photon returns this many at most; all of them are listed, in a scroll box.
const FETCH_LIMIT = "15";
const DEBOUNCE_MS = 250;

type Suggestion = { name: string; detail: string; icon: LucideIcon };

// OpenStreetMap tags each place as key=value (amenity=hospital, shop=mall…).
// The specific value is looked up first, then the broader key.
const ICONS_BY_VALUE: Record<string, LucideIcon> = {
  hospital: Hospital,
  clinic: Hospital,
  doctors: Hospital,
  pharmacy: Pill,
  school: School,
  kindergarten: School,
  university: GraduationCap,
  college: GraduationCap,
  library: BookOpen,
  townhall: Landmark,
  courthouse: Landmark,
  embassy: Landmark,
  police: Landmark,
  post_office: Landmark,
  bank: Banknote,
  atm: Banknote,
  restaurant: Utensils,
  fast_food: Utensils,
  food_court: Utensils,
  cafe: Coffee,
  fuel: Fuel,
  parking: SquareParking,
  place_of_worship: Church,
  mall: ShoppingBag,
  department_store: ShoppingBag,
  hotel: Hotel,
  hostel: Hotel,
  guest_house: Hotel,
  museum: Camera,
  attraction: Camera,
  bus_station: Bus,
  bus_stop: Bus,
  ferry_terminal: Ship,
  industrial: Factory,
  residential: House,
  apartments: House,
  house: House,
  park: Trees,
  stadium: Trophy,
  sports_centre: Trophy,
};

const ICONS_BY_KEY: Record<string, LucideIcon> = {
  shop: Store,
  tourism: Camera,
  railway: TrainFront,
  aeroway: Plane,
  highway: Route,
  office: Building2,
  building: Building2,
  leisure: Trees,
  natural: Trees,
  man_made: Factory,
};

// Stations, halts and bus shelters are usually named after the landmark they
// serve, so a search for a hospital also returns the stop outside it.
function isTransitStop(key?: string, value?: string) {
  return (
    key === "railway" ||
    key === "highway" ||
    key === "public_transport" ||
    value === "shelter" ||
    value === "bus_stop" ||
    value === "bus_station"
  );
}

// What a Thai place name says it is, for stops named after a landmark and
// for places OpenStreetMap has not tagged.
const ICONS_BY_NAME_PREFIX: [string, LucideIcon][] = [
  ["โรงพยาบาล", Hospital],
  ["รพ.", Hospital],
  ["มหาวิทยาลัย", GraduationCap],
  ["วิทยาลัย", GraduationCap],
  ["โรงเรียน", School],
  ["โรงแรม", Hotel],
  ["ธนาคาร", Banknote],
  ["กระทรวง", Landmark],
  ["กรม", Landmark],
  ["สำนักงาน", Landmark],
  ["ศาล", Landmark],
  ["วัด", Church],
];

function placeIcon(name: string, key?: string, value?: string): LucideIcon {
  const tagged =
    (value && ICONS_BY_VALUE[value]) || (key && ICONS_BY_KEY[key]) || undefined;
  if (tagged && !isTransitStop(key, value)) return tagged;
  const named = ICONS_BY_NAME_PREFIX.find(([prefix]) =>
    name.startsWith(prefix),
  )?.[1];
  return named ?? tagged ?? MapPin;
}

type PhotonFeature = {
  properties: {
    name?: string;
    street?: string;
    district?: string;
    county?: string;
    city?: string;
    osm_key?: string;
    osm_value?: string;
  };
};

type Tab = "places" | "stations";

const TABS: { id: Tab; label: string; icon: LucideIcon; empty: string }[] = [
  { id: "places", label: "สถานที่", icon: MapPin, empty: "ไม่พบสถานที่" },
  {
    id: "stations",
    label: "สถานีรถไฟ",
    icon: TrainFront,
    empty: "ไม่พบสถานีรถไฟ",
  },
];

function toSuggestions(features: PhotonFeature[], tab: Tab): Suggestion[] {
  const seen = new Set<string>();
  const suggestions: Suggestion[] = [];
  // The place itself goes before the stops named after it, so it is the one
  // that survives de-duplication.
  const ranked = [...features].sort(
    (a, b) =>
      Number(isTransitStop(a.properties.osm_key, a.properties.osm_value)) -
      Number(isTransitStop(b.properties.osm_key, b.properties.osm_value)),
  );
  for (const { properties: p } of ranked) {
    if (!p.name) continue;
    // Stations have their own tab.
    if (tab === "places" && p.osm_key === "railway") continue;
    const detail = [p.street, p.district, p.county ?? p.city]
      .filter(Boolean)
      .join(" · ");
    // Stops and entrances of one place share a name and district.
    const key = `${p.name}|${p.district ?? detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({
      name: p.name,
      detail,
      icon:
        tab === "stations"
          ? TrainFront
          : placeIcon(p.name, p.osm_key, p.osm_value),
    });
  }
  return suggestions;
}

export function DestinationInput({
  id,
  value,
  onChange,
  province,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  province: Province | "";
  invalid?: boolean;
}) {
  // What the user typed last; picking a suggestion clears it so the list
  // does not reopen for the picked name.
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("places");
  const [results, setResults] = useState<{
    query: string;
    tab: Tab;
    items: Suggestion[];
  }>({ query: "", tab: "places", items: [] });
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The panel animates to the measured height of its content, so it also
  // grows and shrinks smoothly when the results or the tab change.
  const [contentHeight, setContentHeight] = useState<number>();
  const contentRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(() =>
      setContentHeight(node.offsetHeight),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < MIN_QUERY) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const bounds = province ? PROVINCE_BOUNDS[province] : SERVICE_AREA_BOUNDS;
      const params = new URLSearchParams({
        q: trimmed,
        limit: FETCH_LIMIT,
        // Local (Thai) names, whatever language the browser asks for.
        lang: "default",
        bbox: bounds.join(","),
      });
      if (tab === "stations") params.set("osm_tag", "railway");
      try {
        const response = await fetch(`${PHOTON_URL}?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data: { features: PhotonFeature[] } = await response.json();
        setResults({
          query: trimmed,
          tab,
          items: toSuggestions(data.features, tab),
        });
        setHighlighted(-1);
      } catch {
        // Suggestions are a convenience; the field still accepts free text.
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, province, tab]);

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  const searching = trimmed.length >= MIN_QUERY;
  // Not gated on `searching`, so the list keeps its rows while it collapses.
  const items = results.tab === tab ? results.items : [];
  const loaded = results.tab === tab && results.query === trimmed;
  const expanded = open && searching;
  const listId = `${id}-suggestions`;

  function moveHighlight(index: number) {
    setHighlighted(index);
    document
      .getElementById(`${listId}-${index}`)
      ?.scrollIntoView({ block: "nearest" });
  }

  function pick(suggestion: Suggestion) {
    onChange(suggestion.name);
    setQuery("");
    setOpen(false);
    setHighlighted(-1);
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          expanded && highlighted >= 0 ? `${listId}-${highlighted}` : undefined
        }
        autoComplete="off"
        placeholder="พิมพ์ชื่ออาคาร หน่วยงาน หรือที่อยู่"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delayed so a click on a suggestion lands before the list closes.
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(event) => {
          if (!expanded) return;
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (items.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            moveHighlight((highlighted + 1) % items.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            moveHighlight(
              highlighted <= 0 ? items.length - 1 : highlighted - 1,
            );
          } else if (event.key === "Enter" && highlighted >= 0) {
            event.preventDefault();
            pick(items[highlighted]);
          }
        }}
        aria-invalid={invalid}
        className="field"
      />

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{
              // +2 for the panel border, which the content box excludes.
              height: contentHeight ? contentHeight + 2 : "auto",
            }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-line-strong bg-surface shadow-card-hover"
          >
            <div ref={contentRef}>
              <div className="flex gap-2 border-b border-line p-2">
                {TABS.map(({ id: tabId, label, icon: TabIcon }) => (
                  <button
                    key={tabId}
                    type="button"
                    tabIndex={-1}
                    aria-pressed={tab === tabId}
                    // Keeps focus in the input so the list does not close first.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setTab(tabId);
                      setHighlighted(-1);
                    }}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      tab === tabId
                        ? "bg-brand-600 text-white"
                        : "text-ink-muted hover:bg-surface-hover hover:text-ink"
                    }`}
                  >
                    <TabIcon className="size-4" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
              {items.length === 0 && (
                <p className="px-4 py-4 text-center text-sm text-ink-muted">
                  {loaded
                    ? TABS.find((t) => t.id === tab)?.empty
                    : "กำลังค้นหา…"}
                </p>
              )}
              <ul
                id={listId}
                role="listbox"
                aria-label="สถานที่ที่แนะนำ"
                className="max-h-72 overflow-y-auto"
              >
                {items.map((suggestion, index) => {
                  const Icon = suggestion.icon;
                  return (
                    <li
                      key={`${suggestion.name}|${suggestion.detail}`}
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={index === highlighted}
                      onMouseEnter={() => setHighlighted(index)}
                      // Keeps focus in the input so the list does not close first.
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pick(suggestion)}
                      className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors ${
                        index === highlighted ? "bg-brand-50" : ""
                      }`}
                    >
                      <Icon
                        className="mt-0.5 size-4 shrink-0 text-brand-600"
                        aria-hidden
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">
                          {suggestion.name}
                        </span>
                        {suggestion.detail && (
                          <span className="block truncate text-sm text-ink-muted">
                            {suggestion.detail}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="border-t border-line px-4 py-1.5 text-right text-xs text-ink-subtle">
                © OpenStreetMap contributors
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
