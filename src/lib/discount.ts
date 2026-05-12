export function selectBestDiscount(
  rules: Array<{ id: number; discount_pct: number; trigger_type: string }>,
  isComfenalcoAffiliate: boolean,
): { ruleId: number | null; discountPct: number } {
  let best = { ruleId: null as number | null, discountPct: 0 };

  for (const rule of rules) {
    if (rule.trigger_type === "comfenalco" && !isComfenalcoAffiliate) continue;
    if (rule.discount_pct > best.discountPct) {
      best = { ruleId: rule.id, discountPct: rule.discount_pct };
    }
  }

  return best;
}
