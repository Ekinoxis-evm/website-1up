// Pure computation for a pass's active window (started_at / expires_at).
// Extracted from the deliver-pass route so the stacking math — the bug-prone
// part — is unit-testable without a DB. A new pass stacks on top of the user's
// current pass if (and only if) that pass is still active; otherwise its clock
// starts now.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computePassWindow(opts: {
  // expires_at of the user's currently-active pass, or null if they have none.
  activeExpiresAt: string | Date | null | undefined;
  durationDays: number;
  now?: Date;
}): { startedAt: Date; expiresAt: Date } {
  const now = opts.now ?? new Date();
  const active = opts.activeExpiresAt ? new Date(opts.activeExpiresAt) : null;
  // Stack only onto a pass that genuinely expires in the future; an already-
  // expired window can't be extended, so the new pass starts now.
  const startedAt = active && active.getTime() > now.getTime() ? active : now;
  const expiresAt = new Date(startedAt.getTime() + opts.durationDays * MS_PER_DAY);
  return { startedAt, expiresAt };
}
