"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { SocialLink } from "@/types/database.types";
import { SOCIAL_ICON, SOCIAL_LABEL } from "@/lib/socialIcons";

interface Props { links: SocialLink[] }

export function AdminSocialLinksClient({ links }: Props) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [form, setForm] = useState<Record<number, { url: string; isActive: boolean }>>(
    Object.fromEntries(links.map((l) => [l.id, { url: l.url ?? "", isActive: l.is_active ?? true }]))
  );
  const [saving, setSaving] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave(link: SocialLink) {
    setSaving(link.id);
    setSaveError(null);
    const token = await getAccessToken();
    const res = await fetch("/api/admin/social-links", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: link.id, url: form[link.id].url, isActive: form[link.id].isActive, sortOrder: link.sort_order }),
    });
    setSaving(null);
    if (!res.ok) { setSaveError("Error al guardar. Intenta de nuevo."); return; }
    router.refresh();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
          REDES <span className="text-secondary-container">SOCIALES</span>
        </h1>
        <div className="h-1 w-16 bg-secondary-container mt-2" />
        <p className="font-body text-sm text-on-surface/50 mt-3">
          Configura los enlaces del footer del sitio web. Solo se muestran los activos con URL.
        </p>
      </div>

      {saveError && <p className="text-error font-headline font-bold text-xs uppercase mb-4">{saveError}</p>}

      <div className="space-y-3">
        {links.map((link) => (
          <div key={link.id} className="bg-surface-container p-5 flex items-center gap-5 border-l-4 border-secondary-container">
            <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-surface-container-high">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={SOCIAL_ICON[link.platform] ?? `/socialmedia/${link.platform}.png`}
                alt={link.platform}
                className="w-6 h-6 object-contain"
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-headline font-black text-xs uppercase tracking-widest text-on-surface mb-2">
                {SOCIAL_LABEL[link.platform] ?? link.platform}
              </p>
              <input
                value={form[link.id]?.url ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [link.id]: { ...f[link.id], url: e.target.value } }))}
                placeholder={`https://${link.platform}.com/1upesports`}
                className="w-full bg-surface-container-lowest text-on-background p-2.5 border-none font-body text-sm"
              />
            </div>

            <label className="flex items-center gap-2 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={form[link.id]?.isActive ?? true}
                onChange={(e) => setForm((f) => ({ ...f, [link.id]: { ...f[link.id], isActive: e.target.checked } }))}
                className="w-4 h-4"
              />
              <span className="font-headline font-bold text-xs uppercase text-on-surface/60">Activo</span>
            </label>

            <button
              onClick={() => handleSave(link)}
              disabled={saving === link.id}
              className="bg-secondary-container text-white font-headline font-black text-xs px-5 py-2.5 uppercase shrink-0 disabled:opacity-50"
            >
              {saving === link.id ? "..." : "GUARDAR"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
