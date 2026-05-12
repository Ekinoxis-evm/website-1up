import { describe, it, expect, vi, afterEach } from "vitest";
import {
  verifyComfenalcoAffiliate,
  ComfenalcoConfigError,
  ComfenalcoApiError,
} from "@/lib/comfenalco";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("verifyComfenalcoAffiliate", () => {
  it("throws ComfenalcoConfigError when both env vars are missing", async () => {
    vi.stubEnv("COMFENALCO_API_URL", "");
    vi.stubEnv("COMFENALCO_API_KEY", "");
    await expect(verifyComfenalcoAffiliate("CC", "12345678")).rejects.toThrow(
      ComfenalcoConfigError,
    );
  });

  it("throws ComfenalcoConfigError when only API_URL is missing", async () => {
    vi.stubEnv("COMFENALCO_API_URL", "");
    vi.stubEnv("COMFENALCO_API_KEY", "test_key");
    await expect(verifyComfenalcoAffiliate("CC", "12345678")).rejects.toThrow(
      ComfenalcoConfigError,
    );
  });

  it("throws ComfenalcoConfigError when only API_KEY is missing", async () => {
    vi.stubEnv("COMFENALCO_API_URL", "https://api.comfenalco.com");
    vi.stubEnv("COMFENALCO_API_KEY", "");
    await expect(verifyComfenalcoAffiliate("CC", "12345678")).rejects.toThrow(
      ComfenalcoConfigError,
    );
  });

  it("returns isAffiliated=true when API responds with afiliado: true", async () => {
    vi.stubEnv("COMFENALCO_API_URL", "https://api.comfenalco.com");
    vi.stubEnv("COMFENALCO_API_KEY", "test_key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ afiliado: true, mensaje: "Afiliado verificado" }),
      }),
    );
    const result = await verifyComfenalcoAffiliate("CC", "12345678");
    expect(result.isAffiliated).toBe(true);
    expect(result.message).toBe("Afiliado verificado");
  });

  it("returns isAffiliated=false when API responds with afiliado: false", async () => {
    vi.stubEnv("COMFENALCO_API_URL", "https://api.comfenalco.com");
    vi.stubEnv("COMFENALCO_API_KEY", "test_key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ afiliado: false }),
      }),
    );
    const result = await verifyComfenalcoAffiliate("CC", "12345678");
    expect(result.isAffiliated).toBe(false);
    expect(result.message).toBe("No se encontró afiliación activa");
  });

  it("throws ComfenalcoApiError when the API returns a non-OK status", async () => {
    vi.stubEnv("COMFENALCO_API_URL", "https://api.comfenalco.com");
    vi.stubEnv("COMFENALCO_API_KEY", "test_key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      }),
    );
    await expect(verifyComfenalcoAffiliate("CC", "12345678")).rejects.toThrow(
      ComfenalcoApiError,
    );
  });

  it("ComfenalcoApiError carries the response status code", async () => {
    vi.stubEnv("COMFENALCO_API_URL", "https://api.comfenalco.com");
    vi.stubEnv("COMFENALCO_API_KEY", "test_key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      }),
    );
    try {
      await verifyComfenalcoAffiliate("CC", "12345678");
    } catch (err) {
      expect(err).toBeInstanceOf(ComfenalcoApiError);
      expect((err as ComfenalcoApiError).status).toBe(503);
    }
  });
});
