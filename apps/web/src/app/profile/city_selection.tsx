"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type City = {
  id: number; name: string; admin1?: string | null; country: string; iso2: string;
  label: string; // `${name}, ${admin1} (${country})`
  population: number | null;
};

export function CityPicker({
  defaultCity,
  onChange,
  countryIso2,
  required = true,
}: {
  defaultCity?: City | null;
  onChange: (city: City | null) => void;
  countryIso2?: string;
  required?: boolean;
}) {
  const [query, setQuery] = useState(defaultCity?.label ?? "");
  const [selected, setSelected] = useState<City | null>(defaultCity ?? null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const listRef = useRef<HTMLUListElement | null>(null);
  const cache = useRef<Map<string, City[]>>(new Map());

  const debouncedFetch = useMemo(() => {
    let t: any;
    return (q: string, fn: () => void) => {
      clearTimeout(t);
      t = setTimeout(fn, 180);
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setItems([]); setOpen(false); setActiveIdx(-1);
      return;
    }
    debouncedFetch(q, async () => {
      const key = `${countryIso2 ?? ""}|${q.toLowerCase()}`;
      if (cache.current.has(key)) {
        setItems(cache.current.get(key)!); setOpen(true); setLoading(false);
        return;
      }
      setLoading(true);
      const params = new URLSearchParams({ q, limit: "10" });
      if (countryIso2) params.set("country", countryIso2.toUpperCase());
      const res = await fetch(`/api/cities?${params}`, { cache: "no-store" });
      setLoading(false);
      if (!res.ok) return;
      const data = await res.json();
      cache.current.set(key, data.items);
      setItems(data.items);
      setOpen(true);
      setActiveIdx(data.items.length ? 0 : -1);
    });
  }, [query, countryIso2, debouncedFetch]);

  function commitSelection(city: City) {
    setSelected(city);
    setQuery(city.label);
    setOpen(false);
    setActiveIdx(-1);
    onChange(city);
  }

  function onBlur() {
    // Enforce selection: if typed text doesn’t match selected label, clear.
    if (!selected || selected.label !== query) {
      setSelected(null);
      onChange(null);
      setQuery("");
    }
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0) commitSelection(items[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative" aria-haspopup="listbox" aria-expanded={open}>
      <input
        className="w-full rounded border p-2"
        placeholder="Type your city"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
        onFocus={() => items.length && setOpen(true)}
        onBlur={onBlur}
        aria-autocomplete="list"
        aria-controls="city-listbox"
        aria-activedescendant={activeIdx >= 0 ? `city-opt-${items[activeIdx].id}` : undefined}
      />
      {/* hidden field to submit city_id in forms */}
      <input type="hidden" name="city_id" value={selected?.id ?? ""} />
      {open && (
        <ul
          id="city-listbox"
          role="listbox"
          ref={listRef}
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded border bg-white shadow"
        >
          {loading && <li className="px-3 py-2 text-sm text-gray-500">Searching…</li>}
          {!loading && items.length === 0 && query.trim().length >= 2 && (
            <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
          )}
          {items.map((it, idx) => (
            <li
              id={`city-opt-${it.id}`}
              key={it.id}
              role="option"
              aria-selected={idx === activeIdx}
              onMouseDown={(e) => { e.preventDefault(); commitSelection(it); }}
              className={
                "cursor-pointer px-3 py-2 text-sm hover:bg-gray-50 " +
                (idx === activeIdx ? "bg-gray-100" : "")
              }
            >
              <div>{it.label}</div>
              <div className="text-xs text-gray-500">
                {it.iso2}{it.admin1 ? ` — ${it.admin1}` : ""} · {new Intl.NumberFormat().format(it.population || 0)}
              </div>
            </li>
          ))}
        </ul>
      )}
      {required && !selected && query === "" && (
        <p className="mt-1 text-xs text-red-600">Please choose a city from the list.</p>
      )}
    </div>
  );
}