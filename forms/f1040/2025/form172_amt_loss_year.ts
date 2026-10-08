import { z } from "zod";
import {
  calculateReviewedLossYear,
  reviewedLossYearSchema,
} from "../nodes/inputs/nol_carryforward/reviewed_loss_year.ts";

const amount = z.number().int().nonnegative().max(1_000_000_000);
const signed = z.number().int().min(-1_000_000_000).max(1_000_000_000);
const ref = z.string().trim().min(1);
// Structural inventory only. The complete existing schema is parsed again by
// the arithmetic adapter below, preserving all ownership/duplicate refinements.
const inventory = reviewedLossYearSchema.innerType().omit({
  reviewed_form1040: true,
  reviewed_form172: true,
  pdf_identity: true,
}).strict();
const schema = z.object({
  reference: ref,
  regular_origin_reference: ref,
  amt_inventory: inventory,
  reviewed_amt: z.object({
    reference: ref,
    tax_year: z.number().int().min(2018).max(2025),
    taxpayer_ssn: z.string().regex(/^\d{9}$/),
    spouse_ssn: z.string().regex(/^\d{9}$/).optional(),
    amti_before_atnold: signed,
    qbi_deduction: amount,
    section250_deduction: amount,
    all_amt_adjustments_and_preferences_applied: z.literal(true),
  }).strict(),
}).strict();

/** Independently refigured AMT inventory with section172(d) modifications.
 * The regular loss is computed only for identity and comparison, never copied
 * as the ATNOL. The regular engine is an internal section172 arithmetic adapter;
 * its constructed reconciliation header does not represent an actual Form1040.
 * Reviewed AMTI and eligibility declarations remain unauthenticated workpapers.
 */
export function calculateReviewedAmtLossYear(
  rawRegularOrigin: unknown,
  rawAmtReview: unknown,
) {
  const regular = reviewedLossYearSchema.parse(rawRegularOrigin);
  const regularCalculation = calculateReviewedLossYear(regular);
  const v = schema.parse(rawAmtReview);
  const a = v.amt_inventory, m = v.reviewed_amt;
  if (
    v.regular_origin_reference !== regular.reference ||
    a.tax_year !== regular.tax_year ||
    a.taxpayer_ssn !== regular.taxpayer_ssn ||
    a.spouse_ssn !== regular.spouse_ssn ||
    a.filing_status !== regular.filing_status ||
    m.tax_year !== a.tax_year || m.taxpayer_ssn !== a.taxpayer_ssn ||
    m.spouse_ssn !== a.spouse_ssn
  ) {
    throw new Error(
      "AMT loss inventory must match regular origin year and owners",
    );
  }
  if (
    new Set([v.reference, a.reference, m.reference, regular.reference]).size !==
      4
  ) {
    throw new Error("AMT origin needs separately identified review workpapers");
  }
  if (a.prior_nol_deductions.length !== 0) {
    throw new Error("AMT origin inventory must exclude the ATNOLD");
  }
  const deduction = a.noncapital_deductions
    .filter((row) => row.location === "line12")
    .reduce((n, row) => n + row.amount, 0);
  // Remove QBI/section250 from the section172(d) base. Nonbusiness deduction
  // and income limitations are then recomputed from AMT items by the engine.
  const modifiedBase = m.amti_before_atnold + m.qbi_deduction +
    m.section250_deduction;
  const adapted = calculateReviewedLossYear({
    ...a,
    reviewed_form1040: {
      reference: m.reference,
      tax_year: a.tax_year,
      taxpayer_ssn: a.taxpayer_ssn,
      spouse_ssn: a.spouse_ssn,
      filing_status: a.filing_status,
      line11_agi: modifiedBase + deduction,
      line12_standard_or_itemized_deduction: deduction,
    },
  });
  return {
    taxYear: a.tax_year,
    taxpayerSsn: a.taxpayer_ssn,
    spouseSsn: a.spouse_ssn,
    regularNol: regularCalculation.regularNol,
    amtNol: adapted.regularNol,
    amtLines: adapted.lines,
    reviewedAmtiBeforeAtnold: m.amti_before_atnold,
    amtSection172ModifiedBase: modifiedBase,
    amtCapitalLossDeduction: adapted.capitalLossDeduction,
    amtOriginWorkpaperArithmeticReconciled: true as const,
    amtAdjustmentsEligibilityVerified: false as const,
    sourceClassificationVerified: false as const,
    limitationsVerified: false as const,
    amtCarryAvailabilityVerified: false as const,
    priorAcceptanceVerified: false as const,
    sourceAuthenticityVerified: false as const,
    filingReady: false as const,
  };
}
