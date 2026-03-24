"use client";

import { usePrivy, useLinkAccount } from "@privy-io/react-auth";

type LinkedAccount = {
  type: string;
  [key: string]: unknown;
};

export function SettingsTab() {
  const { user, unlinkGoogle, unlinkDiscord } = usePrivy();
  const { linkGoogle, linkDiscord, linkPasskey } = useLinkAccount();

  const accounts     = (user?.linkedAccounts ?? []) as unknown as LinkedAccount[];
  const linkedCount  = accounts.length;

  const googleAcc  = accounts.find((a) => a.type === "google_oauth");
  const discordAcc = accounts.find((a) => a.type === "discord_oauth");
  const emailAcc   = accounts.find((a) => a.type === "email");
  const passkeys   = accounts.filter((a) => a.type === "passkey");

  const googleEmail   = googleAcc  ? (googleAcc["email"]    as string | undefined) : undefined;
  const discordName   = discordAcc ? (discordAcc["username"] as string | undefined) : undefined;
  const emailAddress  = emailAcc   ? (emailAcc["address"]   as string | undefined) : undefined;

  const canUnlink = linkedCount > 1;

  const AUTH_METHODS = [
    {
      id:          "google",
      label:       "GOOGLE",
      icon:        "mail",
      description: googleEmail ?? "No vinculado",
      linked:      !!googleAcc,
      onLink:      linkGoogle,
      onUnlink:    googleAcc && canUnlink
        ? () => unlinkGoogle(googleAcc["subject"] as string)
        : undefined,
    },
    {
      id:          "discord",
      label:       "DISCORD",
      icon:        "forum",
      description: discordName ? `@${discordName}` : "No vinculado",
      linked:      !!discordAcc,
      onLink:      linkDiscord,
      onUnlink:    discordAcc && canUnlink
        ? () => unlinkDiscord(discordAcc["subject"] as string)
        : undefined,
    },
  ] as const;

  return (
    <div className="space-y-10">

      {/* Headline */}
      <div>
        <h1 className="font-headline font-black text-5xl md:text-6xl text-on-surface leading-none tracking-tighter">
          AJUSTES DE{" "}
          <span className="text-secondary">CUENTA</span>
        </h1>
        <div className="h-1 w-16 bg-primary-container mt-3" />
      </div>

      {/* Account overview */}
      <div className="bg-surface-container-low border-l-8 border-secondary-container p-8 shadow-[12px_12px_0px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-primary-container flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-white text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              person
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-headline font-black text-xl text-on-surface uppercase truncate">
              {emailAddress ?? googleEmail ?? "—"}
            </p>
            <p className="text-xs font-headline uppercase tracking-widest text-on-surface/40">
              {linkedCount} método{linkedCount !== 1 ? "s" : ""} vinculado{linkedCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-3 border border-outline-variant/10">
          <p className="text-[10px] font-headline uppercase tracking-widest text-on-surface/30 mb-1">
            PRIVY ID
          </p>
          <p className="font-mono text-xs text-on-surface/40 break-all">{user?.id}</p>
        </div>
      </div>

      {/* ── Social auth methods ─────────────────────────────── */}
      <section>
        <h2 className="font-headline font-bold text-xs uppercase tracking-widest text-on-surface/40 mb-4">
          Métodos de Autenticación
        </h2>
        <div className="space-y-3">
          {AUTH_METHODS.map(({ id, label, icon, description, linked, onLink, onUnlink }) => (
            <div
              key={id}
              className="bg-surface-container-low flex items-center justify-between p-6 hover:bg-surface-container transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 flex items-center justify-center shrink-0 ${
                    linked ? "bg-primary-container" : "bg-surface-container-highest"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined ${linked ? "text-white" : "text-on-surface/30"}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {icon}
                  </span>
                </div>
                <div>
                  <p className="font-headline font-bold uppercase text-sm text-on-surface">
                    {label}
                  </p>
                  <p className={`text-xs font-body ${linked ? "text-secondary" : "text-on-surface/30"}`}>
                    {description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-4">
                {linked ? (
                  <>
                    <span className="text-[10px] font-headline uppercase text-tertiary border border-tertiary/30 px-2 py-1">
                      ACTIVO
                    </span>
                    {onUnlink && (
                      <button
                        onClick={onUnlink}
                        className="text-[10px] font-headline uppercase text-error/50 border border-error/20 px-2 py-1 hover:text-error hover:border-error/50 transition-colors"
                      >
                        DESVINCULAR
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={onLink}
                    className="text-[10px] font-headline uppercase text-secondary border border-secondary/40 px-3 py-1 hover:bg-secondary-container hover:text-white transition-all"
                  >
                    VINCULAR
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Passkeys ───────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline font-bold text-xs uppercase tracking-widest text-on-surface/40">
            Passkeys
          </h2>
          <button
            onClick={linkPasskey}
            className="flex items-center gap-2 text-[10px] font-headline uppercase text-tertiary border border-tertiary/40 px-3 py-1.5 hover:bg-tertiary hover:text-surface transition-all"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            AGREGAR PASSKEY
          </button>
        </div>

        {passkeys.length === 0 ? (
          <div className="bg-surface-container-lowest p-10 flex flex-col items-center justify-center gap-3 border border-outline-variant/10">
            <span className="material-symbols-outlined text-on-surface/15 text-5xl">
              fingerprint
            </span>
            <p className="text-xs font-headline uppercase tracking-widest text-on-surface/30">
              Sin passkeys registradas
            </p>
            <p className="text-xs font-body text-on-surface/20 text-center max-w-xs">
              Agrega una passkey para iniciar sesión con Face ID, Touch ID o
              llave de seguridad física.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {passkeys.map((pk, i) => (
              <div
                key={i}
                className="bg-surface-container-low flex items-center justify-between p-6 hover:bg-surface-container transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-tertiary/10 border border-tertiary/30 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-tertiary">fingerprint</span>
                  </div>
                  <div>
                    <p className="font-headline font-bold uppercase text-sm text-on-surface">
                      PASSKEY {i + 1}
                    </p>
                    <p className="font-mono text-xs text-on-surface/30">
                      {pk["credentialId"]
                        ? `${(pk["credentialId"] as string).slice(0, 18)}…`
                        : "Passkey activa"}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-headline uppercase text-tertiary border border-tertiary/30 px-2 py-1 shrink-0">
                  ACTIVA
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Danger zone ────────────────────────────────────── */}
      <section className="border border-error/20 p-6">
        <h2 className="font-headline font-bold text-xs uppercase tracking-widest text-error/50 mb-5">
          Zona de Peligro
        </h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-headline font-bold text-sm text-on-surface uppercase">
              Cerrar Sesión
            </p>
            <p className="text-xs font-body text-on-surface/30 mt-0.5">
              Salir de tu cuenta en este dispositivo
            </p>
          </div>
          <p className="text-[10px] font-headline uppercase text-on-surface/20 shrink-0">
            Usa "Exit" en el menú
          </p>
        </div>
      </section>
    </div>
  );
}
