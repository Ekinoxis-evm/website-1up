"use client";

import { useRef, useState } from "react";

interface Props {
  currentUrl: string | null;
  folder: "players" | "courses" | "games" | "floors" | "masters" | "aliados";
  onUploaded: (url: string) => void;
  getAccessToken: () => Promise<string | null>;
  aspectRatio?: "square" | "video";
}

export function ImageUpload({ currentUrl, folder, onUploaded, getAccessToken, aspectRatio = "video" }: Props) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview immediately
    setPreview(URL.createObjectURL(file));
    setError(null);
    setUploading(true);

    try {
      const token = await getAccessToken();
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      onUploaded(data.url);
    } catch {
      setError("Error de red al subir imagen");
    } finally {
      setUploading(false);
    }
  }

  const aspect = aspectRatio === "square" ? "aspect-square" : "aspect-video";

  return (
    <div className="w-full">
      <div
        className={`relative w-full ${aspect} bg-surface-container-high overflow-hidden cursor-pointer group`}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-outline">
            <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
            <span className="font-headline font-bold text-xs uppercase tracking-widest">Subir Imagen</span>
          </div>
        )}

        {/* Hover overlay */}
        {!uploading && (
          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-white">edit</span>
          </div>
        )}

        {/* Upload in progress overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <span className="font-headline font-black text-sm text-on-background uppercase tracking-widest animate-pulse">
              SUBIENDO…
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 font-body text-xs text-error">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
