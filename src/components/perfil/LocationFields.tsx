"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ICountry, IState, ICity } from "country-state-city";
import { isLocationValid, type LocationValue } from "@/lib/location";

export type { LocationValue };

type Mod = typeof import("country-state-city");

// The country-state-city dataset (~8MB of cities) is loaded with a dynamic
// import so it lands in its own chunk and never bloats the onboarding bundle —
// the data is only fetched when this component first mounts.
let modPromise: Promise<Mod> | null = null;
function loadCsc(): Promise<Mod> {
  if (!modPromise) modPromise = import("country-state-city");
  return modPromise;
}

type Size = "lg" | "md";
type Tone = "container" | "lowest";

export function LocationFields({
  value,
  onChange,
  onValidityChange,
  size = "md",
  tone = "lowest",
  disabled = false,
}: {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  onValidityChange?: (valid: boolean) => void;
  size?: Size;
  tone?: Tone;
  disabled?: boolean;
}) {
  const [mod, setMod] = useState<Mod | null>(null);

  useEffect(() => {
    let alive = true;
    loadCsc().then((m) => { if (alive) setMod(m); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const countries: ICountry[] = useMemo(
    () => (mod ? mod.Country.getAllCountries() : []),
    [mod],
  );
  const countryIso = useMemo(
    () => countries.find((c) => c.name === value.country)?.isoCode ?? "",
    [countries, value.country],
  );
  const states: IState[] = useMemo(
    () => (mod && countryIso ? mod.State.getStatesOfCountry(countryIso) : []),
    [mod, countryIso],
  );
  const stateIso = useMemo(
    () => states.find((s) => s.name === value.state)?.isoCode ?? "",
    [states, value.state],
  );
  const cities: ICity[] = useMemo(
    () => (mod && countryIso && stateIso ? mod.City.getCitiesOfState(countryIso, stateIso) : []),
    [mod, countryIso, stateIso],
  );

  // Report validity upward without re-running on every parent render.
  const validityRef = useRef(onValidityChange);
  validityRef.current = onValidityChange;
  const valid = isLocationValid(value, states.length > 0, cities.length > 0);
  useEffect(() => { validityRef.current?.(valid); }, [valid]);

  const loading = mod === null;

  return (
    <div className="space-y-3">
      <SearchableSelect
        label="País *"
        value={value.country}
        options={countries.map((c) => c.name)}
        onSelect={(name) => onChange({ country: name, state: "", city: "" })}
        placeholder={loading ? "Cargando…" : "Selecciona tu país"}
        disabled={disabled || loading}
        size={size}
        tone={tone}
      />
      <SearchableSelect
        label="Estado / Departamento"
        value={value.state}
        options={states.map((s) => s.name)}
        onSelect={(name) => onChange({ ...value, state: name, city: "" })}
        placeholder={!value.country ? "Elige un país primero" : states.length === 0 ? "No aplica" : "Selecciona"}
        disabled={disabled || loading || !value.country || states.length === 0}
        size={size}
        tone={tone}
      />
      <SearchableSelect
        label="Ciudad"
        value={value.city}
        options={cities.map((c) => c.name)}
        onSelect={(name) => onChange({ ...value, city: name })}
        placeholder={!value.state ? "Elige un estado primero" : cities.length === 0 ? "No aplica" : "Selecciona"}
        disabled={disabled || loading || !value.state || cities.length === 0}
        size={size}
        tone={tone}
      />
    </div>
  );
}

const MAX_RESULTS = 100;

function SearchableSelect({
  label,
  value,
  options,
  onSelect,
  placeholder,
  disabled,
  size,
  tone,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (name: string) => void;
  placeholder: string;
  disabled: boolean;
  size: Size;
  tone: Tone;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
    return base.slice(0, MAX_RESULTS);
  }, [options, query]);

  const bg = tone === "container" ? "bg-surface-container" : "bg-surface-container-lowest";
  const pad = size === "lg" ? "p-4" : "p-3";
  const weight = size === "lg" ? "font-black text-xl" : "font-bold";

  return (
    <div ref={ref} className="relative">
      <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">
        {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen((o) => !o); setQuery(""); }}
        className={`w-full ${bg} ${pad} font-headline ${weight} border-none text-left flex items-center justify-between gap-2 disabled:opacity-40 ${value ? "text-on-background" : "text-outline/40"}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <span className="material-symbols-outlined shrink-0 text-outline">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div className={`absolute z-30 mt-1 w-full ${bg} shadow-lg`}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar…"
            className="w-full bg-surface-container-high text-on-background p-3 font-headline font-bold border-none focus:outline-none placeholder:text-outline/40"
          />
          <ul className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="p-3 font-body text-sm text-outline/60">Sin resultados</li>
            )}
            {filtered.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => { onSelect(name); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 font-headline font-bold text-sm hover:bg-surface-container-high transition-colors ${name === value ? "text-primary-container" : "text-on-surface/80"}`}
                >
                  {name}
                </button>
              </li>
            ))}
            {options.length > MAX_RESULTS && filtered.length === MAX_RESULTS && (
              <li className="px-3 py-2 font-body text-xs text-outline/50">
                Refina tu búsqueda para ver más…
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
