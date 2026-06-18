// Maps each payment order_kind to its parent table and the public/admin paths to
// revalidate when a payment lands. Pure + DB-free so routes and tests share one
// source of truth for the polymorphic dispatch. Marketplace is intentionally
// absent until it exists.

export type OrderKind = "pass" | "tournament_entry" | "token_purchase" | "enrollment";

export const ORDER_KINDS: readonly OrderKind[] = [
  "pass",
  "tournament_entry",
  "token_purchase",
  "enrollment",
];

export interface OrderKindMeta {
  kind: OrderKind;
  table: string;
  label: string; // Spanish admin label
  // paths to revalidate after a payment confirms for this kind
  revalidate: string[];
}

export const ORDER_KIND_META: Record<OrderKind, OrderKindMeta> = {
  pass: {
    kind: "pass",
    table: "pass_orders",
    label: "1UP Pass",
    revalidate: ["/app/pass", "/admin/pass-orders"],
  },
  tournament_entry: {
    kind: "tournament_entry",
    table: "tournament_entry_orders",
    label: "Inscripción a torneo",
    revalidate: ["/torneos", "/admin/torneos"],
  },
  token_purchase: {
    kind: "token_purchase",
    table: "token_purchase_orders",
    label: "Compra de $1UP",
    revalidate: ["/admin/token-orders"],
  },
  enrollment: {
    kind: "enrollment",
    table: "enrollments",
    label: "Inscripción a curso",
    revalidate: ["/academia", "/admin/enrollments"],
  },
};

export function isOrderKind(v: unknown): v is OrderKind {
  return typeof v === "string" && (ORDER_KINDS as readonly string[]).includes(v);
}

export function orderTable(kind: OrderKind): string {
  return ORDER_KIND_META[kind].table;
}
