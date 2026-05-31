// Pure precondition guard for activating a pass. Kept out of the route so the
// ownership + state rules are unit-testable without a DB. Only an `issued` pass
// owned by the caller can be activated.

export type ActivatablePass = {
  owner_user_profile_id: number;
  state: string;
};

export type ActivationCheck =
  | { ok: true }
  | { ok: false; error: string; status: number };

export function canActivatePass(
  pass: ActivatablePass | null | undefined,
  callerProfileId: number,
): ActivationCheck {
  if (!pass) return { ok: false, error: "Pase no encontrado.", status: 404 };
  if (pass.owner_user_profile_id !== callerProfileId)
    return { ok: false, error: "Este pase no te pertenece.", status: 403 };
  switch (pass.state) {
    case "issued":  return { ok: true };
    case "active":  return { ok: false, error: "Este pase ya está activo.", status: 409 };
    case "expired": return { ok: false, error: "Este pase ya expiró.", status: 409 };
    case "revoked": return { ok: false, error: "Este pase fue revocado.", status: 409 };
    default:        return { ok: false, error: "Este pase no se puede activar.", status: 409 };
  }
}

// Admin revoke precondition (no ownership check — admin-only). Any pass that
// isn't already revoked can be revoked; revoking is idempotent at the route via
// a state-guarded update.
export function canRevokePass(
  pass: { state: string } | null | undefined,
): { ok: true } | { ok: false; error: string; status: number } {
  if (!pass) return { ok: false, error: "Pase no encontrado.", status: 404 };
  if (pass.state === "revoked") return { ok: false, error: "Este pase ya fue revocado.", status: 409 };
  return { ok: true };
}
