// Canonical payment-method registry for the unified payment layer (v2.42.0).
// Pure + dependency-free so it can be imported from routes, components, and
// tests alike. The four methods are the same across every paid service; which
// ones a given service accepts is data (service_payment_methods), read through
// `enabledMethods`.

export type PaymentMethod = "token" | "wire" | "cash" | "card";

export const PAYMENT_METHODS: readonly PaymentMethod[] = ["token", "wire", "cash", "card"];

export type MethodUnit = "tokens" | "cop";

export interface MethodMeta {
  id: PaymentMethod;
  label: string; // Spanish label for admin + user UI
  unit: MethodUnit;
  userInitiated: boolean; // a user can start this flow themselves
  adminRecorded: boolean; // an admin records/approves it
  requiresComprobante: boolean;
}

export const METHOD_META: Record<PaymentMethod, MethodMeta> = {
  token: { id: "token", label: "$1UP", unit: "tokens", userInitiated: true, adminRecorded: false, requiresComprobante: false },
  wire: { id: "wire", label: "Transferencia", unit: "cop", userInitiated: true, adminRecorded: true, requiresComprobante: true },
  cash: { id: "cash", label: "Efectivo", unit: "cop", userInitiated: false, adminRecorded: true, requiresComprobante: false },
  card: { id: "card", label: "Tarjeta / Apple Pay", unit: "cop", userInitiated: true, adminRecorded: false, requiresComprobante: false },
};

// Legacy DB rows store the bank-transfer method as 'bank'; the canonical name is
// now 'wire'. We never rewrite stored values — we bridge here. Unknown strings
// fail closed so method drift surfaces loudly instead of silently mis-routing.
export function normalizeMethod(raw: string): PaymentMethod {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "bank" || v === "wire") return "wire";
  if (v === "token" || v === "cash" || v === "card") return v;
  throw new Error(`Unknown payment method: ${raw}`);
}

export function toLegacyMethod(m: PaymentMethod): string {
  return m === "wire" ? "bank" : m;
}

export interface ServiceMethodConfig {
  token_enabled: boolean;
  wire_enabled: boolean;
  cash_enabled: boolean;
  card_enabled: boolean;
}

export interface EnabledOpts {
  // card never reaches the actionable set unless PAYMENTS_CARD_LIVE is on —
  // the per-service toggle alone keeps it design-only (disabled slot).
  cardLiveEnv?: boolean;
}

export function enabledMethods(cfg: ServiceMethodConfig, opts: EnabledOpts = {}): PaymentMethod[] {
  const out: PaymentMethod[] = [];
  if (cfg.token_enabled) out.push("token");
  if (cfg.wire_enabled) out.push("wire");
  if (cfg.cash_enabled) out.push("cash");
  if (cfg.card_enabled && opts.cardLiveEnv) out.push("card");
  return out;
}

export function isMethodEnabled(cfg: ServiceMethodConfig, m: PaymentMethod, opts: EnabledOpts = {}): boolean {
  return enabledMethods(cfg, opts).includes(m);
}
