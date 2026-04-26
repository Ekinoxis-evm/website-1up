"use client";

import { useState, useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

type Game = { id: number; name: string };

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
  { code: "+34",  label: "🇪🇸 +34 España" },
];
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const CURRENT_YEAR = new Date().getFullYear();

const STEPS = [
  { label: "Tu nombre",   icon: "person"           },
  { label: "Contacto",    icon: "phone"             },
  { label: "Identidad",   icon: "badge"             },
  { label: "Tus juegos",  icon: "sports_esports"    },
  { label: "Referido",    icon: "confirmation_number" },
] as const;

interface Props { games: Game[] }

export function OnboardingWizard({ games }: Props) {
  const { getAccessToken } = usePrivy();
  const router = useRouter();

  const [step, setStep] = useState(1);

  // Step 1
  const [nombre, setNombre]       = useState("");
  const [apellidos, setApellidos] = useState("");

  // Step 2
  const [username, setUsername]         = useState("");
  const [phoneCountry, setPhoneCountry] = useState("+57");
  const [phoneNumber, setPhoneNumber]   = useState("");

  // Step 3
  const [tipoDoc, setTipoDoc]   = useState("CC");
  const [numDoc, setNumDoc]     = useState("");
  const [barrio, setBarrio]     = useState("");
  const [birthYear, setBirthYear] = useState("");

  // Step 4
  const [gameIds, setGameIds] = useState<number[]>([]);

  // Step 5
  const [referralCode, setReferralCode]   = useState("");
  const [codeStatus, setCodeStatus]       = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [codeMessage, setCodeMessage]     = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const usernameError = username.length > 0 && !USERNAME_RE.test(username)
    ? "Solo letras minúsculas, números y _ (3–20 caracteres)"
    : null;

  const birthYearNum = parseInt(birthYear);
  const birthYearError = birthYear && (birthYearNum < 1930 || birthYearNum > CURRENT_YEAR - 5)
    ? `Debe estar entre 1930 y ${CURRENT_YEAR - 5}`
    : null;

  // Live referral code check
  useEffect(() => {
    if (!referralCode.trim()) { setCodeStatus("idle"); setCodeMessage(""); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCodeStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user/referral-codes/validate?code=${encodeURIComponent(referralCode.trim().toUpperCase())}`);
        const data = await res.json() as { valid: boolean; reason?: string };
        if (data.valid) {
          setCodeStatus("valid");
          setCodeMessage("Código válido");
        } else {
          setCodeStatus("invalid");
          setCodeMessage(data.reason ?? "Código inválido");
        }
      } catch {
        setCodeStatus("idle");
      }
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [referralCode]);

  function toggleGame(id: number) {
    setGameIds((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);
  }

  const step1Valid = nombre.trim().length > 0 && apellidos.trim().length > 0;
  const step2Valid = !usernameError;
  const step3Valid = barrio.trim().length > 0 && birthYear.length === 4 && !birthYearError;
  const step5Valid = codeStatus === "valid";

  async function handleSubmit() {
    if (!step5Valid) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nombre:          nombre.trim(),
          apellidos:       apellidos.trim(),
          username:        username.trim().toLowerCase() || undefined,
          phoneCountry:    phoneNumber.trim() ? phoneCountry : undefined,
          phoneNumber:     phoneNumber.trim() || undefined,
          tipoDocumento:   numDoc.trim() ? tipoDoc : undefined,
          numeroDocumento: numDoc.trim() || undefined,
          barrio:          barrio.trim(),
          birthYear:       birthYearNum,
          gameIds:         gameIds.length > 0 ? gameIds : undefined,
          referralCode:    referralCode.trim().toUpperCase(),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setSubmitError(d.error ?? "Error al guardar. Intenta de nuevo.");
        setSubmitting(false);
        return;
      }
      router.replace("/app");
    } catch {
      setSubmitError("Error de red. Intenta de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-lg">
      {/* Step progress */}
      <div className="flex gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div
            key={s.label}
            className={`flex-1 h-1 transition-colors ${i + 1 <= step ? "bg-primary-container" : "bg-surface-container-high"}`}
          />
        ))}
      </div>

      {/* Step label */}
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-primary-container text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          {STEPS[step - 1].icon}
        </span>
        <p className="font-headline text-xs uppercase tracking-widest text-outline">
          Paso {step} de {STEPS.length} — {STEPS[step - 1].label}
        </p>
      </div>

      {/* ── Step 1: Nombre ── */}
      {step === 1 && (
        <div>
          <h1 className="font-headline font-black text-4xl uppercase tracking-tighter mb-1">
            ¿Cómo te<br /><span className="text-primary-container">llamas?</span>
          </h1>
          <div className="h-1 w-16 bg-primary-container mb-8" />

          <div className="space-y-4">
            <div>
              <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Nombre *</label>
              <input
                autoFocus
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan"
                maxLength={100}
                className="w-full bg-surface-container text-on-background p-4 font-headline font-black text-xl border-none focus:outline-none placeholder:text-outline/30"
              />
            </div>
            <div>
              <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Apellidos *</label>
              <input
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Ej: García Martínez"
                maxLength={100}
                className="w-full bg-surface-container text-on-background p-4 font-headline font-black text-xl border-none focus:outline-none placeholder:text-outline/30"
              />
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!step1Valid}
            className="w-full mt-8 bg-primary-container text-white font-headline font-black text-lg py-4 uppercase tracking-tighter disabled:opacity-40 flex items-center justify-center gap-2"
          >
            SIGUIENTE
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      )}

      {/* ── Step 2: Contacto ── */}
      {step === 2 && (
        <div>
          <h1 className="font-headline font-black text-4xl uppercase tracking-tighter mb-1">
            Tu usuario<br /><span className="text-primary-container">y contacto</span>
          </h1>
          <div className="h-1 w-16 bg-primary-container mb-8" />

          <div className="space-y-4">
            <div>
              <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">
                @Username <span className="text-outline/50 normal-case font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-headline font-black text-outline text-xl">@</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="tu_username"
                  maxLength={20}
                  className="w-full bg-surface-container text-on-background pl-9 pr-4 py-4 font-headline font-black text-xl border-none focus:outline-none placeholder:text-outline/30"
                />
              </div>
              {usernameError && <p className="font-body text-xs text-error mt-1">{usernameError}</p>}
            </div>

            <div>
              <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">
                Teléfono <span className="text-outline/50 normal-case font-normal">(opcional)</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={phoneCountry}
                  onChange={(e) => setPhoneCountry(e.target.value)}
                  className="shrink-0 w-36 bg-surface-container text-on-background p-4 font-headline font-bold border-none appearance-none"
                >
                  {PHONE_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="3001234567"
                  maxLength={15}
                  className="flex-1 bg-surface-container text-on-background p-4 font-headline font-bold border-none focus:outline-none placeholder:text-outline/30"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => setStep(3)}
              disabled={!step2Valid}
              className="flex-1 bg-primary-container text-white font-headline font-black py-4 uppercase tracking-tighter disabled:opacity-40 flex items-center justify-center gap-2"
            >
              SIGUIENTE <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <button onClick={() => setStep(1)} className="px-6 bg-surface-container font-headline font-black uppercase">
              ATRÁS
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Identidad ── */}
      {step === 3 && (
        <div>
          <h1 className="font-headline font-black text-4xl uppercase tracking-tighter mb-1">
            Tu barrio<br /><span className="text-primary-container">e identidad</span>
          </h1>
          <div className="h-1 w-16 bg-primary-container mb-8" />

          <div className="space-y-4">
            <div>
              <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Barrio *</label>
              <input
                autoFocus
                value={barrio}
                onChange={(e) => setBarrio(e.target.value)}
                placeholder="Ej: El Poblado, Ciudad Jardín…"
                maxLength={100}
                className="w-full bg-surface-container text-on-background p-4 font-headline font-black text-xl border-none focus:outline-none placeholder:text-outline/30"
              />
            </div>

            <div>
              <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">Año de nacimiento *</label>
              <input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder={String(CURRENT_YEAR - 20)}
                min={1930}
                max={CURRENT_YEAR - 5}
                className="w-full bg-surface-container text-on-background p-4 font-headline font-black text-xl border-none focus:outline-none placeholder:text-outline/30"
              />
              {birthYearError && <p className="font-body text-xs text-error mt-1">{birthYearError}</p>}
              {birthYear.length === 4 && !birthYearError && (
                <p className="font-body text-xs text-secondary mt-1">
                  Edad aproximada: {CURRENT_YEAR - birthYearNum} años
                </p>
              )}
            </div>

            <div className="bg-surface-container p-4">
              <p className="font-headline font-bold text-xs uppercase tracking-widest text-outline mb-3">
                Documento <span className="text-outline/50 normal-case font-normal">(opcional)</span>
              </p>
              <div className="flex gap-2">
                <select
                  value={tipoDoc}
                  onChange={(e) => setTipoDoc(e.target.value)}
                  className="shrink-0 bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none appearance-none"
                >
                  {TIPOS_DOCUMENTO.map((t) => (
                    <option key={t} value={t}>{TIPO_LABELS[t]}</option>
                  ))}
                </select>
                <input
                  value={numDoc}
                  onChange={(e) => setNumDoc(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                  placeholder="Número de documento"
                  maxLength={50}
                  className="flex-1 bg-surface-container-lowest text-on-background p-3 font-headline font-bold border-none focus:outline-none placeholder:text-outline/30"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => setStep(4)}
              disabled={!step3Valid}
              className="flex-1 bg-primary-container text-white font-headline font-black py-4 uppercase tracking-tighter disabled:opacity-40 flex items-center justify-center gap-2"
            >
              SIGUIENTE <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <button onClick={() => setStep(2)} className="px-6 bg-surface-container font-headline font-black uppercase">
              ATRÁS
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Juegos ── */}
      {step === 4 && (
        <div>
          <h1 className="font-headline font-black text-4xl uppercase tracking-tighter mb-1">
            ¿Qué<br /><span className="text-primary-container">jugás?</span>
          </h1>
          <div className="h-1 w-16 bg-primary-container mb-2" />
          <p className="font-body text-sm text-outline mb-6">
            Selecciona tus juegos favoritos. Puedes saltar este paso.
          </p>

          <div className="flex flex-wrap gap-2 mb-2">
            {games.map((g) => {
              const selected = gameIds.includes(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => toggleGame(g.id)}
                  className={`px-4 py-2 font-headline font-bold text-xs uppercase tracking-tight transition-colors ${
                    selected
                      ? "bg-primary-container text-white"
                      : "bg-surface-container text-on-surface/70 hover:bg-surface-container-high"
                  }`}
                >
                  {selected && <span className="material-symbols-outlined text-xs mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                  {g.name}
                </button>
              );
            })}
          </div>
          {gameIds.length > 0 && (
            <p className="font-headline text-xs text-primary-container mt-2">{gameIds.length} seleccionado{gameIds.length !== 1 ? "s" : ""}</p>
          )}

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => setStep(5)}
              className="flex-1 bg-primary-container text-white font-headline font-black py-4 uppercase tracking-tighter flex items-center justify-center gap-2"
            >
              SIGUIENTE <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <button onClick={() => setStep(3)} className="px-6 bg-surface-container font-headline font-black uppercase">
              ATRÁS
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Código de referido ── */}
      {step === 5 && (
        <div>
          <h1 className="font-headline font-black text-4xl uppercase tracking-tighter mb-1">
            Código de<br /><span className="text-primary-container">referido</span>
          </h1>
          <div className="h-1 w-16 bg-primary-container mb-4" />
          <p className="font-body text-sm text-outline mb-6">
            Ingresa el código que te dieron para acceder a la plataforma.
          </p>

          <div>
            <label className="block font-headline font-bold text-xs uppercase tracking-widest text-outline mb-1">
              Código *
            </label>
            <div className="relative">
              <input
                autoFocus
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="EJ: 1UP2024"
                maxLength={30}
                className="w-full bg-surface-container text-on-background p-4 font-headline font-black text-2xl tracking-widest border-none focus:outline-none placeholder:text-outline/30 uppercase"
              />
              {codeStatus === "checking" && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline animate-spin text-lg">refresh</span>
              )}
              {codeStatus === "valid" && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              )}
              {codeStatus === "invalid" && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-error text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
              )}
            </div>
            {codeMessage && (
              <p className={`font-headline text-xs mt-1 ${codeStatus === "valid" ? "text-secondary" : "text-error"}`}>
                {codeMessage}
              </p>
            )}
          </div>

          {submitError && (
            <p className="font-body text-sm text-error mt-4 bg-error/10 p-3">{submitError}</p>
          )}

          <div className="flex gap-3 mt-8">
            <button
              onClick={handleSubmit}
              disabled={!step5Valid || submitting}
              className="flex-1 bg-primary-container text-white font-headline font-black py-4 uppercase tracking-tighter disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                  GUARDANDO…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                  ENTRAR AL 1UP
                </>
              )}
            </button>
            <button onClick={() => setStep(4)} className="px-6 bg-surface-container font-headline font-black uppercase">
              ATRÁS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
