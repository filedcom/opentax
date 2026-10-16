import { z } from "zod";
const ref = z.string().trim().min(1),
  whole = z.number().int().nonnegative().max(1e9);
const origin = z.object({
  tax_year: z.number().int().min(2021).max(2025),
  amount: whole,
  origin_return_reference: ref,
  eligible_joint_return_when_married_verified: z.literal(true),
}).strict();
/** IRS 2025 systemic adjustment FAQ, Topic G Q7. Its increase is a credit
 * amount, never the cash refund or balance-due change on the account notice. */
export const adoptionCarryforward2026Schema = z.object({
  filed_2025_return_reference: ref,
  parent_tin: z.string().regex(/^\d{9}$/),
  current_filed_2025_nonrefundable_carryforward_total: whole,
  complete_origin_history_and_no_intervening_use_verified: z.literal(true),
  origins: z.array(origin).max(5),
  irs_2025_account_review: z.object({
    record_reference: ref,
    reviewed_on: z.string().date(),
    account_transcript_reference: ref,
    no_pending_adoption_adjustment_verified: z.literal(true),
    outcome: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("no_adjustment") }).strict(),
      z.object({
        kind: z.literal("adjusted"),
        notice_reference: ref,
        corrected_carryforward_worksheet_reference: ref,
        refundable_adoption_credit_increase: whole.positive(),
        original_form8839_line18_nonrefundable_used: whole,
        available_2025_by_origin: z.array(origin.extend({
          tax_year: z.number().int().min(2020).max(2025),
        })).min(1).max(6),
        corrected_2026_carryforward_total: whole,
      }).strict(),
    ]),
  }).strict(),
}).strict();
export function reconcileAdoptionCarryforward2026(
  raw: z.input<typeof adoptionCarryforward2026Schema>,
  inventoryReviewDate: string,
) {
  const c = adoptionCarryforward2026Schema.parse(raw),
    review = c.irs_2025_account_review;
  const total = c.origins.reduce((n, r) => n + r.amount, 0);
  if (
    new Set(c.origins.map((r) => r.tax_year)).size !== c.origins.length ||
    total !== c.current_filed_2025_nonrefundable_carryforward_total
  ) {
    throw Error(
      "Adoption carryforward must reconcile the filed 2025 total and distinct origin years",
    );
  }
  if (
    review.reviewed_on < "2027-01-01" ||
    review.reviewed_on > inventoryReviewDate
  ) {
    throw Error(
      "Adoption carryforward account review must precede the completed-year inventory review",
    );
  }
  const a = review.outcome;
  if (a.kind === "no_adjustment") {
    return { origins: c.origins, adjustment: undefined };
  }
  const opening = [...a.available_2025_by_origin].sort((a, b) =>
    a.tax_year - b.tax_year
  );
  const available = opening.reduce((n, r) => n + r.amount, 0);
  if (
    new Set(opening.map((r) => r.tax_year)).size !== opening.length ||
    a.original_form8839_line18_nonrefundable_used +
          a.refundable_adoption_credit_increase > available
  ) {
    throw Error(
      "Adoption adjustment needs distinct 2025 origins and cannot exceed available credit",
    );
  }
  const allocate = (used: number) =>
    opening.map((r) => {
      const consumed = Math.min(used, r.amount);
      used -= consumed;
      const remaining = r.amount - consumed;
      return {
        ...r,
        used: consumed,
        expired: r.tax_year === 2020 ? remaining : 0,
        carryforward_2026: r.tax_year === 2020 ? 0 : remaining,
      };
    });
  const original = allocate(a.original_form8839_line18_nonrefundable_used);
  const filed = new Map(c.origins.map((r) => [r.tax_year, r]));
  if (
    original.some((r) =>
      r.carryforward_2026 !== (filed.get(r.tax_year)?.amount ?? 0)
    ) ||
    c.origins.some((r) =>
      !opening.some((o) =>
        o.tax_year === r.tax_year &&
        o.origin_return_reference === r.origin_return_reference
      )
    )
  ) {
    throw Error(
      "Original 2025 adoption worksheet does not reconcile filed carryforward origins",
    );
  }
  const corrected = allocate(
    a.original_form8839_line18_nonrefundable_used +
      a.refundable_adoption_credit_increase,
  );
  const correctedTotal = corrected.reduce((n, r) => n + r.carryforward_2026, 0);
  if (correctedTotal !== a.corrected_2026_carryforward_total) {
    throw Error(
      "IRS adoption adjustment must reconcile the corrected carryforward worksheet",
    );
  }
  return {
    origins: corrected.filter((r) => r.carryforward_2026 > 0).map((r) => ({
      tax_year: r.tax_year,
      amount: r.carryforward_2026,
      origin_return_reference: r.origin_return_reference,
      eligible_joint_return_when_married_verified:
        r.eligible_joint_return_when_married_verified,
    })),
    adjustment: {
      review,
      original_allocations: original,
      corrected_allocations: corrected,
      corrected_2026_carryforward_total: correctedTotal,
    },
  };
}
