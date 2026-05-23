// Magic-byte sniffers for user uploads. Extracted from `blob.ts` so they're
// testable in isolation — `blob.ts` pulls in the Supabase client which needs
// `NEXT_PUBLIC_SUPABASE_URL` at import time, which test environments don't have.
//
// The client-declared `file.type` is trusted by `formData()` parsers but can
// be lied about; these functions re-verify against the actual file header and
// return the canonical MIME or null.

export async function sniffAvatarMime(
  file: File,
): Promise<"image/jpeg" | "image/png" | "image/webp" | null> {
  const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
      buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A) return "image/png";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  return null;
}

// Same as `sniffAvatarMime` but also accepts PDF (for payment receipts).
export async function sniffComprobanteMime(
  file: File,
): Promise<"image/jpeg" | "image/png" | "image/webp" | "application/pdf" | null> {
  const buf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
      buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A) return "image/png";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
  return null;
}
