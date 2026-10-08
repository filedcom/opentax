import { z } from "zod";
import { calculateReviewedNolOrigin } from "./form172_nol_origin.ts";
import { calculateForm172CarryAbsorption } from "./form172_carry_absorption.ts";

const ref = z.string().trim().min(1);
const policy = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("reviewed_waiver"),
    reference: ref,
    waiver_timeliness_reviewed: z.literal(true),
  }).strict(),
  z.object({
    kind: z.literal("reviewed_no_carryback"),
    reference: ref,
    nonfarming_loss_only: z.literal(true),
  }).strict(),
  z.object({
    kind: z.literal("reviewed_full_loss_carryback"),
    reference: ref,
    whole_loss_carryback_eligibility_reviewed: z.literal(true),
    farming_loss_only: z.literal(true).optional(),
    legacy_general_two_year_rule_reviewed: z.literal(true).optional(),
    section965_years_absent_reviewed: z.literal(true),
  }).strict(),
]);
const historySchema = z.object({
  reference: ref,
  opening_tax_year: z.literal(2025),
  carry_policy: policy,
  annual_reviews: z.array(z.record(z.unknown())),
}).strict();

/** Calendar-year regular-tax history. Every applicable year is required, even
 * after exhaustion. Reviewed policy declarations are not election, eligibility,
 * source-authenticity or prior-acceptance evidence. Mixed farming components and
 * section965 exceptions require separate calculations; this is not filing intake.
 */
export function calculateForm172CarryHistory(
  rawOrigin: unknown,
  rawHistory: unknown,
) {
  const origin = calculateReviewedNolOrigin(rawOrigin);
  const history = historySchema.parse(rawHistory);
  if (origin.taxYear >= history.opening_tax_year) {
    throw new Error("Carry history origin must precede the opening year");
  }
  if (
    history.carry_policy.kind === "reviewed_no_carryback" &&
    origin.taxYear <= 2020
  ) {
    throw new Error("Pre-2021 origins need a reviewed carryback or waiver");
  }
  if (
    history.carry_policy.kind === "reviewed_full_loss_carryback" &&
    origin.taxYear >= 2021 && !history.carry_policy.farming_loss_only
  ) {
    throw new Error(
      "Post-2020 full carryback needs a whole farming loss review",
    );
  }
  if (
    origin.taxYear < 2018 &&
    history.carry_policy.kind === "reviewed_full_loss_carryback" &&
    !history.carry_policy.legacy_general_two_year_rule_reviewed
  ) {
    throw new Error(
      "Legacy full carryback needs reviewed general two-year eligibility",
    );
  }
  const expectedYears: number[] = [];
  if (history.carry_policy.kind === "reviewed_full_loss_carryback") {
    const period = origin.taxYear >= 2018 && origin.taxYear <= 2020 ? 5 : 2;
    for (let y = origin.taxYear - period; y < origin.taxYear; y++) {
      expectedYears.push(y);
    }
  }
  for (let y = origin.taxYear + 1; y < history.opening_tax_year; y++) {
    expectedYears.push(y);
  }
  if (history.annual_reviews.length !== expectedYears.length) {
    throw new Error("Carry history needs every applicable annual return");
  }
  const prior: {
    item_id: string;
    reference: string;
    tax_year: number;
    absorbed: number;
  }[] = [];
  const references = new Set<string>([
    history.reference,
    history.carry_policy.reference,
  ]);
  if (references.size !== 2) {
    throw new Error("History and carry-policy references must differ");
  }
  const annualResults = history.annual_reviews.map((annual, i) => {
    if (Object.hasOwn(annual, "prior_absorption_records")) {
      throw new Error(
        "History derives prior absorption; caller records are forbidden",
      );
    }
    if (annual.tax_year !== expectedYears[i]) {
      throw new Error(
        "Carry history years must match the complete chronological sequence",
      );
    }
    for (const field of ["reference", "return_reference"]) {
      const value = ref.parse(annual[field]);
      if (references.has(value)) {
        throw new Error(
          "Carry history needs distinct annual source references",
        );
      }
      references.add(value);
    }
    const result = calculateForm172CarryAbsorption(rawOrigin, {
      ...annual,
      prior_absorption_records: [...prior],
    });
    prior.push({
      item_id: `computed-absorption-${result.applicationYear}`,
      reference: String(annual.reference).trim(),
      tax_year: result.applicationYear,
      absorbed: result.absorbed,
    });
    return result;
  });
  return {
    originYear: origin.taxYear,
    openingTaxYear: history.opening_tax_year,
    originLoss: origin.regularNol,
    expiresAfterTaxYear: origin.taxYear < 2018
      ? origin.taxYear + 20
      : undefined,
    expectedYears,
    annualResults,
    computedAbsorptionRecords: prior,
    openingLoss: annualResults.at(-1)?.remainingLoss ?? origin.regularNol,
    completeAnnualArithmeticChainReconciled: true as const,
    completeCarryHistoryVerified: false as const,
    carryPolicyAuthenticityVerified: false as const,
    sourceAuthenticityVerified: false as const,
    priorAcceptanceVerified: false as const,
    acceptedCarryImportVerified: false as const,
    amtNolReconciled: false as const,
    filingReady: false as const,
  };
}
