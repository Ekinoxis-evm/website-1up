// Pure business logic for academia course enrollment payment methods (v2.44.0).
// Kept out of the route so the method gates are unit-testable without a DB —
// same approach as tournamentEntry.ts. Cash is the new method here: it reuses
// the manual-review (bank) path, selected by the user and admin-approved with a
// mandatory note (no comprobante upload).

export type CourseFeeColumns = {
  price_cop:   number | null;
  price_token: number | null;
};

// DB-level method values stored on enrollments.payment_method (free text). `bank`
// is the wire transfer (relabeled "Transferencia" in the UI). `cash` reuses the
// manual-review path — selected by the user, attested/approved by an admin (no
// comprobante). `mercadopago` exists historically but isn't user-selectable here.
export type EnrollmentMethod = "token" | "bank" | "cash" | "card";

// Per-service toggles from service_payment_methods (service = 'enrollment').
// Default = today's live behavior (token + wire on; cash/card off) so callers
// without a config row are unaffected.
export type EnrollmentMethodFlags = {
  token_enabled: boolean;
  wire_enabled:  boolean;
  cash_enabled:  boolean;
  card_enabled:  boolean;
};

export const DEFAULT_ENROLLMENT_METHOD_FLAGS: EnrollmentMethodFlags = {
  token_enabled: true,
  wire_enabled:  true,
  cash_enabled:  false,
  card_enabled:  false,
};

export type EnrollmentMethodOpts = {
  // card (Stripe Checkout) only appears when its service toggle is on AND the
  // PAYMENTS_CARD_LIVE kill-switch is on — design-only otherwise.
  cardLiveEnv?: boolean;
};

// Which methods to OFFER for a course: a method needs BOTH its price unit set on
// the course AND the service-level toggle on. token needs price_token; bank/cash/
// card are COP and need price_cop. card additionally needs the env kill-switch.
export function availableCourseMethods(
  course: CourseFeeColumns,
  cfg: EnrollmentMethodFlags = DEFAULT_ENROLLMENT_METHOD_FLAGS,
  opts: EnrollmentMethodOpts = {},
): EnrollmentMethod[] {
  const hasToken = course.price_token != null && Number(course.price_token) > 0;
  const hasCop   = course.price_cop != null && Number(course.price_cop) > 0;
  const out: EnrollmentMethod[] = [];
  if (hasToken && cfg.token_enabled) out.push("token");
  if (hasCop && cfg.wire_enabled)    out.push("bank");
  if (hasCop && cfg.cash_enabled)    out.push("cash");
  if (hasCop && cfg.card_enabled && opts.cardLiveEnv) out.push("card");
  return out;
}

// True iff the course can be paid in cash right now: a COP price AND the admin's
// per-service cash toggle on. The route enforces this server-side; the wizard
// mirrors it to show/hide the "Efectivo" option.
export function courseCashAvailable(
  course: CourseFeeColumns,
  cfg: EnrollmentMethodFlags = DEFAULT_ENROLLMENT_METHOD_FLAGS,
): boolean {
  return availableCourseMethods(course, cfg).includes("cash");
}

// True iff the course can be paid by card right now: a COP price, the admin's
// per-service card toggle on, AND the PAYMENTS_CARD_LIVE env kill-switch on. The
// route enforces this server-side; the wizard mirrors it to show/hide the card
// option.
export function courseCardAvailable(
  course: CourseFeeColumns,
  cfg: EnrollmentMethodFlags = DEFAULT_ENROLLMENT_METHOD_FLAGS,
  opts: EnrollmentMethodOpts = {},
): boolean {
  return availableCourseMethods(course, cfg, opts).includes("card");
}

export type EnrollmentMethodCheck =
  | { ok: true }
  | { ok: false; error: string; status: number; reason?: string };

function methodUnavailableMsg(method: EnrollmentMethod): string {
  switch (method) {
    case "token": return "Este curso no acepta pago con $1UP.";
    case "bank":  return "Este curso no acepta pago por transferencia bancaria.";
    case "cash":  return "Este curso no acepta pago en efectivo.";
    case "card":  return "Este curso no acepta pago con tarjeta.";
  }
}

// Gate for selecting a payment method when creating an enrollment order. Mirrors
// canCreateEntryOrder: the method must be both priced on the course and enabled
// in the service config.
export function canSelectCourseMethod(
  course: CourseFeeColumns,
  method: EnrollmentMethod,
  cfg: EnrollmentMethodFlags = DEFAULT_ENROLLMENT_METHOD_FLAGS,
  opts: EnrollmentMethodOpts = {},
): EnrollmentMethodCheck {
  if (!availableCourseMethods(course, cfg, opts).includes(method)) {
    return { ok: false, error: methodUnavailableMsg(method), status: 400, reason: "method_unavailable" };
  }
  return { ok: true };
}

export type ReviewableEnrollment = {
  payment_method: string;
  payment_status: string | null;
};

// Admin approve/reject precondition — only a manually-reviewed enrollment
// (token, bank/wire, or cash) still in `pending` can be reviewed. Token orders
// were verified on-chain at creation but still land approved via this path in
// the existing flow, so they remain reviewable. Mirrors canReviewEntryOrder.
export function canReviewEnrollment(
  enrollment: ReviewableEnrollment | null | undefined,
): EnrollmentMethodCheck {
  if (!enrollment) return { ok: false, error: "Inscripción no encontrada.", status: 404 };
  if (
    enrollment.payment_method !== "token" &&
    enrollment.payment_method !== "bank" &&
    enrollment.payment_method !== "cash"
  ) {
    return { ok: false, error: "Solo se pueden gestionar inscripciones token, bank o cash.", status: 409 };
  }
  switch (enrollment.payment_status) {
    case "pending":   return { ok: true };
    case "approved":  return { ok: false, error: "Esta inscripción ya fue aprobada.", status: 409 };
    case "rejected":  return { ok: false, error: "Esta inscripción ya fue rechazada.", status: 409 };
    case "cancelled": return { ok: false, error: "Esta inscripción fue cancelada.", status: 409 };
    default:          return { ok: false, error: "Esta inscripción no se puede revisar.", status: 409 };
  }
}
