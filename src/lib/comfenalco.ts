/**
 * Comfenalco affiliation verification client.
 *
 * STATUS: Stub — pending API documentation and credentials from Comfenalco.
 *
 * To activate:
 *  1. Set COMFENALCO_API_URL and COMFENALCO_API_KEY in environment variables.
 *  2. Replace the body of `verifyComfenalcoAffiliate` with the real HTTP call
 *     once Comfenalco shares their API specification.
 */

export type TipoDocumento = "CC" | "CE" | "TI" | "PP" | "NIT";

export interface ComfenalcoVerifyResult {
  isAffiliated: boolean;
  /** Human-readable message to display to the user */
  message: string;
}

export class ComfenalcoConfigError extends Error {
  constructor() {
    super("Comfenalco API is not configured. Set COMFENALCO_API_URL and COMFENALCO_API_KEY.");
    this.name = "ComfenalcoConfigError";
  }
}

export class ComfenalcoApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ComfenalcoApiError";
  }
}

/**
 * Verify whether a user is a Comfenalco affiliate.
 *
 * @throws {ComfenalcoConfigError} when env vars are missing
 * @throws {ComfenalcoApiError}    when the remote API returns an error status
 */
export async function verifyComfenalcoAffiliate(
  tipoDocumento: TipoDocumento,
  numeroDocumento: string,
): Promise<ComfenalcoVerifyResult> {
  const apiUrl = process.env.COMFENALCO_API_URL;
  const apiKey = process.env.COMFENALCO_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new ComfenalcoConfigError();
  }

  // ─────────────────────────────────────────────────────────────────
  // TODO: Replace this block with the real Comfenalco API call once
  //       their documentation and sandbox credentials are available.
  //
  // Expected request shape (adjust when API docs arrive):
  //   POST {apiUrl}/verificar-afiliado
  //   Headers: { Authorization: `Bearer ${apiKey}`, Content-Type: "application/json" }
  //   Body: { tipo_documento: tipoDocumento, numero_documento: numeroDocumento }
  //
  // Expected response shape:
  //   { afiliado: boolean, mensaje: string }
  // ─────────────────────────────────────────────────────────────────

  const response = await fetch(`${apiUrl}/verificar-afiliado`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tipo_documento: tipoDocumento,
      numero_documento: numeroDocumento,
    }),
    // Prevent credentials leaking in server logs
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ComfenalcoApiError(
      response.status,
      `Comfenalco API returned ${response.status}: ${response.statusText}`,
    );
  }

  // TODO: Adjust destructuring to match real response schema
  const json = await response.json() as { afiliado: boolean; mensaje?: string };

  return {
    isAffiliated: json.afiliado === true,
    message: json.mensaje ?? (json.afiliado ? "Afiliado verificado" : "No se encontró afiliación activa"),
  };
}
