import { z } from "zod";
import type { RentedHomeSource } from "./index.ts";

const reference = z.string().trim().min(1);
const wholeDollars = z.number().int().nonnegative().max(999_999_999_999_999);
export const expenseCategories = [
  "insurance_indirect",
  "rent_indirect",
  "repairs_direct",
  "repairs_indirect",
  "utilities_indirect",
  "other_indirect",
] as const;

/** Reviewed records, not a claim of external authenticity or accepted filing. */
export const rentedHomeEvidenceSchema = z.object({
  home_identifier: reference,
  business_reference: reference,
  recipient_tin: z.string().regex(/^\d{9}$/),
  lease_reference: reference,
  home_use_record: z.object({
    source_reference: reference,
    business_area_sqft: z.number().int().positive(),
    total_area_sqft: z.number().int().positive(),
    use_started_on: z.string().date().regex(/^2025-/),
    use_ended_on: z.string().date().regex(/^2025-/),
    qualifying_use: z.enum([
      "principal_place_of_business",
      "client_meeting_place",
      "separate_structure",
    ]),
    regular_and_exclusive_use_confirmed: z.literal(true),
  }).strict(),
  expenses: z.array(
    z.object({
      record_reference: reference,
      bill_reference: reference,
      payment_reference: reference,
      category: z.enum(expenseCategories),
      amount: wholeDollars.positive(),
      covered_from: z.string().date().regex(/^2025-/),
      covered_through: z.string().date().regex(/^2025-/),
      paid_on: z.string().date().regex(/^2025-/),
      not_claimed_elsewhere_confirmed: z.literal(true),
      no_reimbursement_or_tax_exempt_allocation_confirmed: z.literal(true),
      direct_repairs_business_area_only_confirmed: z.boolean(),
    }).strict(),
  ),
  carryover: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("none"),
      no_prior_unallowed_operating_expenses_confirmed: z.literal(true),
    }).strict(),
    z.object({
      kind: z.literal("prior_actual_return"),
      tax_year: z.literal(2024),
      return_reference: reference,
      form8829_reference: reference,
      home_identifier: reference,
      business_reference: reference,
      recipient_tin: z.string().regex(/^\d{9}$/),
      line43_operating_carryover: wholeDollars,
    }).strict(),
  ]),
}).strict();

export function reconcileRentedHomeEvidence(
  source: RentedHomeSource,
  ownerTin?: string,
): void {
  const evidence = rentedHomeEvidenceSchema.parse(source.source_evidence);
  const use = evidence.home_use_record;
  if (
    evidence.home_identifier !== source.home_identifier ||
    evidence.business_reference !== source.business_reference ||
    (ownerTin !== undefined &&
      evidence.recipient_tin !== ownerTin.replaceAll("-", "")) ||
    use.business_area_sqft !== source.business_area_sqft ||
    use.total_area_sqft !== source.total_area_sqft ||
    use.use_started_on > use.use_ended_on
  ) {
    throw new Error(
      "Form 8829 home-use records differ from the home, business, owner or measured area",
    );
  }
  const totals = Object.fromEntries(expenseCategories.map((key) => [key, 0]));
  const records = new Set<string>();
  for (const expense of evidence.expenses) {
    if (
      records.has(expense.record_reference) ||
      expense.covered_from > expense.covered_through ||
      expense.covered_from < use.use_started_on ||
      expense.covered_through > use.use_ended_on ||
      (expense.category === "repairs_direct" &&
        !expense.direct_repairs_business_area_only_confirmed)
    ) {
      throw new Error(
        "Form 8829 expense record is duplicated or outside the reviewed business-use scope",
      );
    }
    records.add(expense.record_reference);
    totals[expense.category] += expense.amount;
  }
  if (expenseCategories.some((key) => totals[key] !== source[key])) {
    throw new Error(
      "Form 8829 expense records differ from the direct and indirect totals",
    );
  }
  const prior = evidence.carryover;
  if (
    prior.kind === "none"
      ? source.prior_operating_carryover !== 0
      : prior.line43_operating_carryover !== source.prior_operating_carryover ||
        prior.home_identifier !== source.home_identifier ||
        prior.business_reference !== source.business_reference ||
        prior.recipient_tin !== evidence.recipient_tin
  ) {
    throw new Error(
      "Form 8829 prior operating carryover differs from its reviewed return record",
    );
  }
}
