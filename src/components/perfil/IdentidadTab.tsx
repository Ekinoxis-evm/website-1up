"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";

type Game = { id: number; name: string };

interface UserProfile {
  nombre: string | null;
  apellidos: string | null;
  username: string | null;
  phone_country: string | null;
  phone_number: string | null;
  game_ids: number[];
  tipo_documento: string | null;
  numero_documento: string | null;
  barrio: string | null;
  birth_date: string | null;
  referred_by_code: string | null;
}

const MONTHS = [
  { v: "1", l: "Enero" }, { v: "2", l: "Febrero" }, { v: "3", l: "Marzo" },
  { v: "4", l: "Abril" }, { v: "5", l: "Mayo" }, { v: "6", l: "Junio" },
  { v: "7", l: "Julio" }, { v: "8", l: "Agosto" }, { v: "9", l: "Septiembre" },
  { v: "10", l: "Octubre" }, { v: "11", l: "Noviembre" }, { v: "12", l: "Diciembre" },
];

function calcAge(day: string, month: string, year: string): number | null {
  const d = parseInt(day), m = parseInt(month), y = parseInt(year);
  if (!d || !m || !y || year.length < 4) return null;
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}

const TIPOS_DOCUMENTO = ["CC", "CE", "TI", "PP", "NIT"] as const;
const TIPO_LABELS: Record<string, string> = {
  CC: "Cédula de Ciudadanía",
  CE: "Cédula de Extranjería",
  TI: "Tarjeta de Identidad",
  PP: "Pasaporte",
  NIT: "NIT",
};

const PHONE_COUNTRIES = [
  { code: "+57",  label: "🇨🇴 +57 Colombia" },
  { code: "+1",   label: "🇺🇸 +1 USA / Canadá" },
  { code: "+52",  label: "🇲🇽 +52 México" },
  { code: "+54",  label: "🇦🇷 +54 Argentina" },
  { code: "+55",  label: "🇧🇷 +55 Brasil" },
  { code: "+56",  label: "🇨🇱 +56 Chile" },
  { code: "+51",  label: "🇵🇪 +51 Perú" },
  { code: "+58",  label: "🇻🇪 +58 Venezuela" },
  { code: "+593", label: "🇪🇨 +593 Ecuador" },
  { code: "+507", label: "🇵🇦 +507 Panamá" },
  { code: "+53",  label: "🇨🇺 +53 Cuba" },
  { code: "+34",  label: "🇪🇸 +34 España" },
  { code: "+44",  label: "🇬🇧 +44 Reino Unido" },
  { code: "+49",  label: "🇩🇪 +49 Alemania" },
];

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

type SectionStatus = "idle" | "saving" | "success" | "error";

function useSectionSave(getAccessToken: () => Promise<string | null>) {
  const [status, setStatus] = useState<SectionStatus>("idle");
  const [message, setMessage] = useState("");

  async function save(body: Record<string, unknown>): Promise<boolean> {
    setStatus("saving");
    setMessage("");
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Error al guardar.");
        setStatus("error");
        return false;
      }
      setMessage("Guardado correctamente.");
      setStatus("success");
      return true;
    } catch {
      setMessage("Error de red. Intenta nuevamente.");
      setStatus("error");
      return false;
    }
  }

  return { status, message, save, setStatus, setMessage };
}

type Props = { games?: Game[] };

export function IdentidadTab({ games = [] }: Props) {
  const { getAccessToken, user } = usePrivy();

  const emailAccount  = user?.linkedAccounts.find((a) => a.type === "email");
  const googleAccount = user?.linkedAccounts.find((a) => a.type === "google_oauth");
  const loginEmail =
    (emailAccount  && "address" in emailAccount ? (emailAccount.address as string) : null) ??
    (googleAccount && "email"   in googleAccount ? (googleAccount.email   as string) : null) ??
    null;
  const [loading, setLoading] = useState(true);

  // Section state — personal
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [username, setUsername] = useState("");
  const personalSave = useSectionSave(getAccessToken);

  // Section state — phone
  const [phoneCountry, setPhoneCountry] = useState("+57");
  const [phoneNumber, setPhoneNumber] = useState("");
  const phoneSave = useSectionSave(getAccessToken);

  // Section state — location / age
  const [barrio, setBarrio]         = useState("");
  const [birthDay, setBirthDay]     = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear]   = useState("");
  const locationSave = useSectionSave(getAccessToken);

  // Section state — referral code
  const [referredByCode, setReferredByCode] = useState<string | null>(null);
  const [referralInput, setReferralInput]   = useState("");
  const [referralStatus, setReferralStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [referralMessage, setReferralMessage] = useState("");
  const referralSave = useSectionSave(getAccessToken);
  const referralDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Section state — games
  const [selectedGames, setSelectedGames] = useState<number[]>([]);
  const gamesSave = useSectionSave(getAccessToken);

  // Section state — document
  const [tipoDoc, setTipoDoc] = useState("CC");
  const [numDoc, setNumDoc] = useState("");
  const docSave = useSectionSave(getAccessToken);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/user/profile", {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: UserProfile = await res.json();
        setNombre(data.nombre ?? "");
        setApellidos(data.apellidos ?? "");
        setUsername(data.username ?? "");
        setPhoneCountry(data.phone_country ?? "+57");
        setPhoneNumber(data.phone_number ?? "");
        setSelectedGames(data.game_ids ?? []);
        setBarrio(data.barrio ?? "");
        if (data.birth_date) {
          const parts = data.birth_date.split("-");
          setBirthYear(parts[0] ?? "");
          setBirthMonth(parts[1] ? String(parseInt(parts[1])) : "");
          setBirthDay(parts[2] ? String(parseInt(parts[2])) : "");
        }
        setReferredByCode(data.referred_by_code ?? null);
        setTipoDoc(data.tipo_documento ?? "CC");
        setNumDoc(data.numero_documento ?? "");
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  useEffect(() => {
    if (!referralInput.trim()) { setReferralStatus("idle"); setReferralMessage(""); return; }
    if (referralDebounce.current) clearTimeout(referralDebounce.current);
    setReferralStatus("checking");
    referralDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user/referral-codes/validate?code=${encodeURIComponent(referralInput.trim().toUpperCase())}`);
        const data = await res.json() as { valid: boolean; reason?: string };
        setReferralStatus(data.valid ? "valid" : "invalid");
        setReferralMessage(data.valid ? "Código válido" : (data.reason ?? "Código inválido"));
      } catch { setReferralStatus("idle"); }
    }, 600);
    return () => { if (referralDebounce.current) clearTimeout(referralDebounce.current); };
  }, [referralInput]);

  function toggleGame(id: number) {
    setSelectedGames((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  const usernameError =
    username.length > 0 && !USERNAME_RE.test(username)
      ? "Solo letras minúsculas, números y _ (3–20 caracteres)"
      : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="material-symbols-outlined text-primary text-3xl animate-spin">refresh</span>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-8">

      {/* ── Email de acceso ─────────────────────────────────────── */}
      <div className="bg-surface-container p-6">
        <h2 className="font-headline font-black text-lg uppercase tracking-tighter mb-1">
          CORREO ELECTRÓNICO
        </h2>
        <div className="h-0.5 w-12 bg-secondary-container mb-5" />
        <div>
          <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">
            Email de inicio de sesión
          </label>
          <div className="bg-surface-container-lowest p-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-sm text-on-surface/30">mail</span>
            <span className="font-body text-sm text-on-surface/70">
              {loginEmail ?? "—"}
            </span>
            <span className="ml-auto text-[10px] font-headline uppercase text-on-surface/30 tracking-widest">
              Solo lectura
            </span>
          </div>
          <p className="font-body text-xs text-on-surface/30 mt-2">
            Este es el correo vinculado a tu cuenta. No se puede cambiar desde aquí.
          </p>
        </div>
      </div>

      {/* ── Datos personales ────────────────────────────────────── */}
      <div className="bg-surface-container p-6">
        <h2 className="font-headline font-black text-lg uppercase tracking-tighter mb-1">
          DATOS PERSONALES
        </h2>
        <div className="h-0.5 w-12 bg-primary-container mb-5" />

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">
                Nombre
              </label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan"
                maxLength={100}
                disabled={personalSave.status === "saving"}
                className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold placeholder:text-outline/40"
              />
            </div>
            <div>
              <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">
                Apellidos
              </label>
              <input
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Ej: García"
                maxLength={100}
                disabled={personalSave.status === "saving"}
                className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold placeholder:text-outline/40"
              />
            </div>
          </div>

          <div>
            <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-headline font-black text-outline">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="tu_username"
                maxLength={20}
                disabled={personalSave.status === "saving"}
                className="w-full bg-surface-container-lowest text-on-background pl-7 pr-3 py-3 border-none font-headline font-bold placeholder:text-outline/40"
              />
            </div>
            {usernameError && (
              <p className="font-body text-xs text-error mt-1">{usernameError}</p>
            )}
          </div>

          <button
            onClick={async () => {
              await personalSave.save({ nombre, apellidos, username: username || undefined });
            }}
            disabled={personalSave.status === "saving" || !!usernameError}
            className="w-full bg-surface-container-highest text-on-background font-headline font-black py-3 uppercase tracking-tighter disabled:opacity-50 hover:bg-surface-container-high transition-colors"
          >
            {personalSave.status === "saving" ? "GUARDANDO…" : "GUARDAR DATOS PERSONALES"}
          </button>

          <SectionFeedback status={personalSave.status} message={personalSave.message} />
        </div>
      </div>

      {/* ── Barrio y edad ───────────────────────────────────────── */}
      <div className="bg-surface-container p-6">
        <h2 className="font-headline font-black text-lg uppercase tracking-tighter mb-1">
          BARRIO Y EDAD
        </h2>
        <div className="h-0.5 w-12 bg-primary-container mb-5" />

        <div className="space-y-3">
          <div>
            <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">Barrio</label>
            <input
              value={barrio}
              onChange={(e) => setBarrio(e.target.value)}
              placeholder="Ej: El Poblado, Ciudad Jardín…"
              maxLength={100}
              disabled={locationSave.status === "saving"}
              className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold placeholder:text-outline/40"
            />
          </div>
          <div>
            <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">
              Fecha de nacimiento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="Día"
                min={1} max={31}
                disabled={locationSave.status === "saving"}
                className="bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold placeholder:text-outline/40 text-center"
              />
              <select
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                disabled={locationSave.status === "saving"}
                className="bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold appearance-none text-center"
              >
                <option value="">Mes</option>
                {MONTHS.map((m) => (
                  <option key={m.v} value={m.v}>{m.l}</option>
                ))}
              </select>
              <input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Año"
                min={1930} max={new Date().getFullYear() - 5}
                disabled={locationSave.status === "saving"}
                className="bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold placeholder:text-outline/40 text-center"
              />
            </div>
            {birthDay && birthMonth && birthYear.length === 4 && (
              <p className="font-body text-xs text-outline mt-1">
                Edad: {calcAge(birthDay, birthMonth, birthYear)} años
              </p>
            )}
          </div>

          <button
            onClick={async () => {
              const bd = birthDay && birthMonth && birthYear.length === 4
                ? `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`
                : undefined;
              await locationSave.save({ barrio: barrio || undefined, birthDate: bd });
            }}
            disabled={locationSave.status === "saving"}
            className="w-full bg-surface-container-highest text-on-background font-headline font-black py-3 uppercase tracking-tighter disabled:opacity-50 hover:bg-surface-container-high transition-colors"
          >
            {locationSave.status === "saving" ? "GUARDANDO…" : "GUARDAR BARRIO Y EDAD"}
          </button>
          <SectionFeedback status={locationSave.status} message={locationSave.message} />
        </div>
      </div>

      {/* ── Teléfono ─────────────────────────────────────────────── */}
      <div className="bg-surface-container p-6">
        <h2 className="font-headline font-black text-lg uppercase tracking-tighter mb-1">
          TELÉFONO
        </h2>
        <div className="h-0.5 w-12 bg-secondary-container mb-5" />

        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="shrink-0 w-44">
              <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">
                País
              </label>
              <select
                value={phoneCountry}
                onChange={(e) => setPhoneCountry(e.target.value)}
                disabled={phoneSave.status === "saving"}
                className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold appearance-none"
              >
                {PHONE_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">
                Número
              </label>
              <input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="3001234567"
                maxLength={20}
                disabled={phoneSave.status === "saving"}
                className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold placeholder:text-outline/40"
              />
            </div>
          </div>

          <button
            onClick={async () => {
              await phoneSave.save({ phoneCountry, phoneNumber: phoneNumber || undefined });
            }}
            disabled={phoneSave.status === "saving"}
            className="w-full bg-surface-container-highest text-on-background font-headline font-black py-3 uppercase tracking-tighter disabled:opacity-50 hover:bg-surface-container-high transition-colors"
          >
            {phoneSave.status === "saving" ? "GUARDANDO…" : "GUARDAR TELÉFONO"}
          </button>

          <SectionFeedback status={phoneSave.status} message={phoneSave.message} />
        </div>
      </div>

      {/* ── Juegos favoritos ─────────────────────────────────────── */}
      {games.length > 0 && (
        <div className="bg-surface-container p-6">
          <h2 className="font-headline font-black text-lg uppercase tracking-tighter mb-1">
            JUEGOS FAVORITOS
          </h2>
          <div className="h-0.5 w-12 bg-tertiary mb-5" />

          <div className="flex flex-wrap gap-2 mb-4">
            {games.map((g) => {
              const active = selectedGames.includes(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => toggleGame(g.id)}
                  className={`font-headline font-bold text-xs uppercase tracking-wider px-3 py-1.5 transition-colors ${
                    active
                      ? "bg-primary-container text-white"
                      : "bg-surface-container-high text-on-surface/60 hover:text-on-surface"
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>

          <button
            onClick={async () => {
              await gamesSave.save({ gameIds: selectedGames });
            }}
            disabled={gamesSave.status === "saving"}
            className="w-full bg-surface-container-highest text-on-background font-headline font-black py-3 uppercase tracking-tighter disabled:opacity-50 hover:bg-surface-container-high transition-colors"
          >
            {gamesSave.status === "saving" ? "GUARDANDO…" : "GUARDAR SELECCIÓN"}
          </button>

          <SectionFeedback status={gamesSave.status} message={gamesSave.message} />
        </div>
      )}

      {/* ── Documento de identidad ───────────────────────────────── */}
      <div className="bg-surface-container p-6">
        <h2 className="font-headline font-black text-lg uppercase tracking-tighter mb-1">
          DOCUMENTO DE IDENTIDAD
        </h2>
        <div className="h-0.5 w-12 bg-secondary-container mb-5" />

        <div className="space-y-3">
          <div>
            <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">
              Tipo de documento
            </label>
            <select
              value={tipoDoc}
              onChange={(e) => setTipoDoc(e.target.value)}
              disabled={docSave.status === "saving"}
              className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold appearance-none"
            >
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t} value={t}>{TIPO_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">
              Número de documento
            </label>
            <input
              value={numDoc}
              onChange={(e) => setNumDoc(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
              placeholder="Ej: 1020304050"
              disabled={docSave.status === "saving"}
              className="w-full bg-surface-container-lowest text-on-background p-3 border-none font-headline font-bold placeholder:text-outline/40"
            />
          </div>

          <button
            onClick={async () => {
              await docSave.save({ tipoDocumento: tipoDoc, numeroDocumento: numDoc });
            }}
            disabled={docSave.status === "saving" || !numDoc.trim()}
            className="w-full bg-surface-container-highest text-on-background font-headline font-black py-3 uppercase tracking-tighter disabled:opacity-50 hover:bg-surface-container-high transition-colors"
          >
            {docSave.status === "saving" ? "GUARDANDO…" : "GUARDAR DOCUMENTO"}
          </button>

          <SectionFeedback status={docSave.status} message={docSave.message} />

          {numDoc.trim() && (
            <p className="font-body text-xs text-outline/60 pt-1">
              Este número se usa para verificar beneficios con aliados.{" "}
              <a href="/app/beneficios" className="text-primary-container hover:underline">
                Ver mis beneficios →
              </a>
            </p>
          )}
        </div>
      </div>

      {/* ── Código de referido ───────────────────────────────────── */}
      <div className="bg-surface-container p-6">
        <h2 className="font-headline font-black text-lg uppercase tracking-tighter mb-1">
          CÓDIGO DE REFERIDO
        </h2>
        <div className="h-0.5 w-12 bg-primary-container mb-5" />

        {referredByCode ? (
          <div className="flex items-center gap-3 bg-surface-container-lowest p-4">
            <span className="material-symbols-outlined text-secondary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>confirmation_number</span>
            <div>
              <p className="font-headline font-black text-lg tracking-widest text-secondary">{referredByCode}</p>
              <p className="font-body text-xs text-on-surface/40 mt-0.5">Código asignado — no se puede cambiar</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-body text-sm text-on-surface/60">
              No tienes un código de referido asignado. Si alguien te invitó, puedes agregarlo aquí.
            </p>
            <div>
              <label className="font-headline font-bold text-xs uppercase tracking-widest text-outline block mb-1">Código</label>
              <div className="relative">
                <input
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                  placeholder="EJ: 1UP2024"
                  maxLength={30}
                  disabled={referralSave.status === "saving"}
                  className="w-full bg-surface-container-lowest text-on-background p-3 font-headline font-black tracking-widest border-none focus:outline-none placeholder:text-outline/30 uppercase"
                />
                {referralStatus === "checking" && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline animate-spin text-sm">refresh</span>
                )}
                {referralStatus === "valid" && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                )}
                {referralStatus === "invalid" && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-error text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                )}
              </div>
              {referralMessage && (
                <p className={`font-headline text-xs mt-1 ${referralStatus === "valid" ? "text-secondary" : "text-error"}`}>
                  {referralMessage}
                </p>
              )}
            </div>
            <button
              onClick={async () => {
                const ok = await referralSave.save({ referralCode: referralInput.trim().toUpperCase() });
                if (ok) setReferredByCode(referralInput.trim().toUpperCase());
              }}
              disabled={referralSave.status === "saving" || referralStatus !== "valid"}
              className="w-full bg-surface-container-highest text-on-background font-headline font-black py-3 uppercase tracking-tighter disabled:opacity-50 hover:bg-surface-container-high transition-colors"
            >
              {referralSave.status === "saving" ? "GUARDANDO…" : "GUARDAR CÓDIGO"}
            </button>
            <SectionFeedback status={referralSave.status} message={referralSave.message} />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionFeedback({ status, message }: { status: SectionStatus; message: string }) {
  if (!message) return null;
  return (
    <p className={`font-body text-sm px-1 ${status === "error" ? "text-error" : "text-primary-container"}`}>
      {message}
    </p>
  );
}
