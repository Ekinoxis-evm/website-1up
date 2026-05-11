"use client";

import { buildIcsContent } from "@/lib/calendar";

interface Props {
  tournamentName: string;
  tournamentDate: string | null;
  locationType:   string;
  googleUrl:      string;
  onClose:        () => void;
}

export function CalendarPromptModal({ tournamentName, tournamentDate, locationType, googleUrl, onClose }: Props) {
  function downloadIcs() {
    if (!tournamentDate) return;
    const content = buildIcsContent({
      name:     tournamentName,
      date:     tournamentDate,
      location: locationType === "online" ? "Online" : "1UP Gaming Tower, Colombia",
    });
    const blob = new Blob([content], { type: "text/calendar" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${tournamentName.replace(/\s+/g, "-")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface-container w-full max-w-sm p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-outline hover:text-on-surface">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-3xl text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
            event_available
          </span>
          <div>
            <h3 className="font-headline font-black text-xl uppercase tracking-tighter text-on-surface">
              ¡Inscripción confirmada!
            </h3>
            <p className="font-body text-xs text-outline">Recibirás un email de confirmación</p>
          </div>
        </div>

        <p className="font-body text-sm text-on-surface/70 mb-6">
          ¿Quieres añadir <strong>{tournamentName}</strong> a tu calendario para no olvidarlo?
        </p>

        <div className="space-y-3">
          {googleUrl && (
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full bg-primary-container text-white font-headline font-black text-sm px-5 py-3 skew-fix hover:neo-shadow-pink transition-all"
            >
              <span className="block skew-content flex items-center gap-3">
                <span className="material-symbols-outlined text-sm">calendar_add_on</span>
                GOOGLE CALENDAR
              </span>
            </a>
          )}

          {tournamentDate && (
            <button
              onClick={downloadIcs}
              className="flex items-center gap-3 w-full bg-surface-container-high text-on-surface font-headline font-bold text-sm px-5 py-3 hover:bg-surface-container-highest transition-colors"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              DESCARGAR .ICS (Apple / Outlook)
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full font-headline font-bold text-xs uppercase tracking-widest text-outline hover:text-on-surface transition-colors pt-1"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
