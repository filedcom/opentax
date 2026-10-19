import { z } from "zod";

// ── Enums ─────────────────────────────────────────────────────────────────────

export enum NolType {
  PRE2018 = "PRE2018",
  POST2017 = "POST2017",
}

// ── Schemas ───────────────────────────────────────────────────────────────────

export const itemSchema = z.object({
  year: z.number().int().positive(),
  nol_amount: z.number().nonnegative(),
  nol_type: z.nativeEnum(NolType),
});

export type NolItem = z.infer<typeof itemSchema>;

// ── Pure helpers ──────────────────────────────────────────────────────────────

// IRC §172(b)(1)(A)(ii): a loss arising before 2018 carries forward 20 years.
const PRE2018_CARRYFORWARD_YEARS = 20;
// IRC §172(a)(2)(B)(ii): post-2017 losses are limited to 80% of taxable income.
const POST2017_LIMIT_RATE = 0.8;

function assertUsable(items: readonly NolItem[], taxYear: number): void {
  for (const item of items) {
    if (item.year >= taxYear) {
      throw new Error(
        `NOL carryforward from ${item.year} must arise before ${taxYear}`,
      );
    }
    if (
      item.nol_type === NolType.PRE2018 &&
      (item.year >= 2018 || item.year + PRE2018_CARRYFORWARD_YEARS < taxYear)
    ) {
      throw new Error(
        `Pre-2018 NOL from ${item.year} is not a usable 20-year carryforward in ${taxYear}`,
      );
    }
    if (item.nol_type === NolType.POST2017 && item.year < 2018) {
      throw new Error("Post-2017 NOL needs a loss year after 2017");
    }
  }
}

/** Absorb losses oldest first up to a limit; returns the amount used and the
 * unused remainder of each item, in the same order. */
function absorb(items: readonly NolItem[], limit: number) {
  let left = Math.max(0, limit);
  const remaining = [...items].sort((a, b) => a.year - b.year).map((item) => {
    const used = Math.min(item.nol_amount, left);
    left -= used;
    return { ...item, nol_amount: item.nol_amount - used };
  });
  return { used: Math.max(0, limit) - left, remaining };
}

/**
 * Schedule 1 line 8a NOL deduction (IRC §172(a); Pub. 536). Pre-2018 losses
 * are applied first without the 80% limit; post-2017 losses are limited to
 * 80% of taxable income figured without the NOL and QBI deductions, less the
 * pre-2018 deduction (§172(a)(2)(B)). Carrybacks, the alternative tax NOL
 * deduction (Form 6251 line 2f) and farming-loss carrybacks are not handled.
 */
export function calculateNolDeduction(
  rawItems: readonly NolItem[],
  taxableIncomeBeforeNol: number,
  taxYear: number,
) {
  const items = rawItems.map((item) => itemSchema.parse(item))
    .filter((item) => item.nol_amount > 0);
  assertUsable(items, taxYear);
  const base = Math.max(0, Math.round(taxableIncomeBeforeNol));
  const pre = absorb(
    items.filter((item) => item.nol_type === NolType.PRE2018),
    base,
  );
  const post = absorb(
    items.filter((item) => item.nol_type === NolType.POST2017),
    Math.floor((base - pre.used) * POST2017_LIMIT_RATE),
  );
  const carryforward = [...pre.remaining, ...post.remaining]
    .filter((item) => item.nol_amount > 0);
  return {
    deduction: pre.used + post.used,
    pre2018Deduction: pre.used,
    post2017Deduction: post.used,
    carryforward,
    pre2018Carryforward: pre.remaining.reduce((s, i) => s + i.nol_amount, 0),
    post2017Carryforward: post.remaining.reduce((s, i) => s + i.nol_amount, 0),
  };
}
