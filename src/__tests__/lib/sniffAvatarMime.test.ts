// Magic-byte sniffer for avatar uploads — must reject anything that isn't a
// real JPEG, PNG, or WebP (file.type is client-set and can lie).

import { describe, it, expect } from "vitest";
import { sniffAvatarMime } from "@/lib/imageSniff";

function fileFrom(bytes: number[], name = "x.bin"): File {
  return new File([new Uint8Array(bytes)], name);
}

describe("sniffAvatarMime", () => {
  it("detects JPEG by FF D8 FF magic bytes", async () => {
    const f = fileFrom([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(await sniffAvatarMime(f)).toBe("image/jpeg");
  });

  it("detects PNG by full 8-byte signature", async () => {
    const f = fileFrom([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(await sniffAvatarMime(f)).toBe("image/png");
  });

  it("detects WebP via RIFF…WEBP container header", async () => {
    const f = fileFrom([
      0x52, 0x49, 0x46, 0x46,   // RIFF
      0,    0,    0,    0,       // file size (don't care)
      0x57, 0x45, 0x42, 0x50,   // WEBP
    ]);
    expect(await sniffAvatarMime(f)).toBe("image/webp");
  });

  it("rejects PDF (no PDF allowed for avatars — distinct from comprobantes)", async () => {
    // %PDF-1.4
    const f = fileFrom([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0, 0, 0, 0]);
    expect(await sniffAvatarMime(f)).toBeNull();
  });

  it("rejects PNG with corrupted second-half signature (partial match attack)", async () => {
    // Looks like PNG for first 4 bytes but tail is wrong.
    const f = fileFrom([0x89, 0x50, 0x4e, 0x47, 0xff, 0xff, 0xff, 0xff, 0, 0, 0, 0]);
    expect(await sniffAvatarMime(f)).toBeNull();
  });

  it("rejects empty / short buffer", async () => {
    expect(await sniffAvatarMime(fileFrom([]))).toBeNull();
    expect(await sniffAvatarMime(fileFrom([0xff, 0xd8]))).toBeNull(); // truncated JPEG header
  });

  it("rejects arbitrary text masquerading as image/jpeg", async () => {
    // ASCII "hello world!" — exact 12 bytes
    const f = fileFrom([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x21]);
    expect(await sniffAvatarMime(f)).toBeNull();
  });
});
