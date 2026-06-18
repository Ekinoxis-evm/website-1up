// Pure business logic for paid tournament entry (v2.41.0). Kept out of the
// routes so the fee gates, admin fee validation, and order-state transitions
// are unit-testable without a DB — same approach as passOrders.ts/passActivation.ts.

// Display convention across the platform: 1 $1UP = 1,000 COP.
export const TOKEN_COP_RATE = 1000;

export type EntryFee = { tokens: number | null; cop: number | null };

export type EntryFeeColumns = {
  entry_fee_tokens: number | null;
  entry_fee_cop: number | null;
};

// null = free tournament (both columns null/0) — the existing free
// registration flow stays untouched in that case.
export function tournamentEntryFee(t: EntryFeeColumns): EntryFee | null {
  const tokens = t.entry_fee_tokens != null && Number(t.entry_fee_tokens) > 0 ? Number(t.entry_fee_tokens) : null;
  const cop    = t.entry_fee_cop    != null && t.entry_fee_cop > 0            ? t.entry_fee_cop : null;
  if (tokens == null && cop == null) return null;
  return { tokens, cop };
}

export type EntryFeeParse =
  | { ok: true; tokens: number | null; cop: number | null; treasury: string | null }
  | { ok: false; error: string };

// Each tournament defines its own treasury wallet for $1UP entry fees — fees
// never reuse the pass treasury. A token fee is meaningless without somewhere
// to send it, so the two are coupled at parse time.
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isValidTreasuryAddress(raw: unknown): raw is string {
  return typeof raw === "string" && EVM_ADDRESS_RE.test(raw.trim());
}

// Admin editor input → DB columns. Empty/null/undefined means "no fee on this
// method"; anything else must be a positive number (COP additionally integer).
// `rawTreasury` is the per-tournament wallet: required (and validated) whenever
// a token fee is set, ignored/null otherwise.
export function parseEntryFeeInput(rawTokens: unknown, rawCop: unknown, rawTreasury?: unknown): EntryFeeParse {
  const tokens = parseFeeValue(rawTokens, false);
  if (tokens.error) return { ok: false, error: "El costo en $1UP debe ser un número mayor a 0." };
  const cop = parseFeeValue(rawCop, true);
  if (cop.error) return { ok: false, error: "El costo en COP debe ser un número entero mayor a 0." };

  const treasuryStr = typeof rawTreasury === "string" ? rawTreasury.trim() : "";
  if (tokens.value != null) {
    if (!treasuryStr) {
      return { ok: false, error: "Define la tesorería (wallet) del torneo para cobrar la inscripción en $1UP." };
    }
    if (!isValidTreasuryAddress(treasuryStr)) {
      return { ok: false, error: "La tesorería debe ser una dirección EVM válida (0x seguido de 40 caracteres)." };
    }
  } else if (treasuryStr && !isValidTreasuryAddress(treasuryStr)) {
    // A treasury without a token fee is harmless but a malformed one is still rejected.
    return { ok: false, error: "La tesorería debe ser una dirección EVM válida (0x seguido de 40 caracteres)." };
  }

  return { ok: true, tokens: tokens.value, cop: cop.value, treasury: treasuryStr || null };
}

function parseFeeValue(raw: unknown, integer: boolean): { value: number | null; error?: true } {
  if (raw == null || raw === "") return { value: null };
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return { value: null, error: true };
  if (integer && !Number.isInteger(n)) return { value: null, error: true };
  return { value: n };
}

export type EntryOrderMethod = "token" | "bank";

export type EntryCheck =
  | { ok: true }
  | { ok: false; error: string; status: number; reason?: string };

export type EntryPrecheckTournament = EntryFeeColumns & {
  status: string;
  is_active: boolean;
  is_registration_open: boolean;
};

// Gate for creating an entry order. Capacity itself is NOT checked here — the
// slot is only taken at confirmation time by the register_for_tournament RPC.
export function canCreateEntryOrder(
  t: EntryPrecheckTournament | null | undefined,
  method: EntryOrderMethod,
): EntryCheck {
  if (!t || !t.is_active) return { ok: false, error: "Torneo no encontrado.", status: 404, reason: "not_found" };
  const fee = tournamentEntryFee(t);
  if (!fee) return { ok: false, error: "Este torneo es gratuito — inscríbete directamente.", status: 400, reason: "free" };
  if (t.status !== "upcoming" || !t.is_registration_open)
    return { ok: false, error: "El registro para este torneo está cerrado.", status: 400, reason: "closed" };
  if (method === "token" && fee.tokens == null)
    return { ok: false, error: "Este torneo no acepta pago con $1UP.", status: 400, reason: "method_unavailable" };
  if (method === "bank" && fee.cop == null)
    return { ok: false, error: "Este torneo no acepta pago por transferencia bancaria.", status: 400, reason: "method_unavailable" };
  return { ok: true };
}

export type ReviewableEntryOrder = {
  status: string;
  payment_method: string;
};

// Admin approve/reject precondition — only a bank order still in pending_bank
// can be reviewed. Mirrors canActivatePass/canRevokePass.
export function canReviewEntryOrder(
  order: ReviewableEntryOrder | null | undefined,
): EntryCheck {
  if (!order) return { ok: false, error: "Orden no encontrada.", status: 404 };
  if (order.payment_method !== "bank")
    return { ok: false, error: "Solo las órdenes bancarias requieren revisión manual.", status: 409 };
  switch (order.status) {
    case "pending_bank": return { ok: true };
    case "confirmed":    return { ok: false, error: "Esta orden ya fue confirmada.", status: 409 };
    case "rejected":     return { ok: false, error: "Esta orden ya fue rechazada.", status: 409 };
    case "cancelled":    return { ok: false, error: "Esta orden fue cancelada.", status: 409 };
    default:             return { ok: false, error: "Esta orden no se puede revisar.", status: 409 };
  }
}

// No refunds in v1: when the RPC rejects a registration AFTER an on-chain
// payment was already verified, the money moved but no slot exists — that is
// the manual-refund situation and the message must say so explicitly.
export function paidRegistrationFailureMessage(reason: string | undefined): string {
  switch (reason) {
    case "full":
      return "El torneo se llenó antes de confirmar tu pago. Tu pago quedó registrado y el equipo gestionará el reembolso manualmente — contáctanos para coordinarlo.";
    case "already_registered":
      return "Ya estabas inscrito en este torneo. Tu pago quedó registrado y el equipo gestionará el reembolso manualmente.";
    default:
      return "No se pudo completar la inscripción, pero tu pago quedó registrado. El equipo lo revisará y gestionará el reembolso manualmente.";
  }
}
