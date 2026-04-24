"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import type { SiteContent } from "@/types/database.types";
import { ImageUpload } from "./ImageUpload";

interface Props { items: SiteContent[] }

const LABELS: Record<string, { title: string; description: string; entityId: string }> = {
  equipment_highlight: {
    title: "ELITE HARDWARE — Imagen",
    description: "Imagen decorativa junto a los stats de hardware en la página Gaming Tower.",
    entityId: "equipment-highlight",
  },
  learning_path: {
    title: "ESTRUCTURA DE APRENDIZAJE — Imagen",
    description: "Imagen decorativa junto a los pasos de aprendizaje en la página Academia.",
    entityId: "learning-path",
  },
};

export function AdminSiteImagesClient({ items }: Props) {
  const { getAccessToken } = usePrivy();
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [urls, setUrls] = useState<Record<string, string | null>>(
    Object.fromEntries(items.map((i) => [i.key, i.image_url]))
  );

  async function handleUploaded(key: string, imageUrl: string) {
    setErrors((e) => ({ ...e, [key]: "" }));
    setUrls((u) => ({ ...u, [key]: imageUrl }));

    const token = await getAccessToken();
    const res = await fetch("/api/admin/site-images", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ key, imageUrl }),
    });

    if (!res.ok) {
      setErrors((e) => ({ ...e, [key]: "Error al guardar. Intenta de nuevo." }));
    } else {
      setSaved((s) => ({ ...s, [key]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 2000);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-headline font-black text-3xl uppercase tracking-tighter">
          IMÁGENES <span className="text-tertiary">SITIO</span>
        </h1>
        <div className="h-1 w-16 bg-tertiary mt-2" />
        <p className="font-body text-sm text-on-surface-variant mt-3">
          Imágenes decorativas usadas en secciones fijas del sitio. Se guardan automáticamente al subir.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item) => {
          const meta = LABELS[item.key];
          if (!meta) return null;
          return (
            <div key={item.key} className="bg-surface-container p-6 border-l-4 border-tertiary">
              <p className="font-headline font-black text-sm uppercase tracking-widest mb-1">{meta.title}</p>
              <p className="font-body text-xs text-on-surface-variant mb-4">{meta.description}</p>

              <ImageUpload
                currentUrl={urls[item.key] ?? null}
                folder="site"
                entityId={meta.entityId}
                aspectRatio="square"
                onUploaded={(url) => handleUploaded(item.key, url)}
                onUploadingChange={(v) => setUploading((u) => ({ ...u, [item.key]: v }))}
                getAccessToken={getAccessToken}
              />

              <div className="mt-3 h-5">
                {uploading[item.key] && (
                  <p className="font-headline font-bold text-xs uppercase text-outline">Subiendo...</p>
                )}
                {saved[item.key] && !uploading[item.key] && (
                  <p className="font-headline font-bold text-xs uppercase text-tertiary">Guardado</p>
                )}
                {errors[item.key] && (
                  <p className="font-headline font-bold text-xs uppercase text-error">{errors[item.key]}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
