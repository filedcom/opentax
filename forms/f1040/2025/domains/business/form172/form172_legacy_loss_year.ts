import { z } from "zod";
import {
  calculateReviewedLossYear,
  reviewedLossYearSchema,
} from "../../../../nodes/inputs/nol_carryforward/reviewed_loss_year.ts";

const ref = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{9}$/);
const amount = z.number().int().nonnegative().max(1_000_000_000);
const signed = z.number().int().min(-1_000_000_000).max(1_000_000_000);
const year = z.number().int().min(2005).max(2017);
const status = reviewedLossYearSchema.innerType().shape.filing_status;
// All owner, duplicate-ID and capital exclusion refinements are also enforced
// by the full arithmetic adapter; picking fields here supplies structure only.
const inventory = reviewedLossYearSchema.innerType().pick({
  noncapital_income: true,
  noncapital_deductions: true,
  capital_gains: true,
  capital_losses: true,
  prior_nol_deductions: true,
}).strict();
export const reviewedLegacyLossYearSchema = z.object({
  source_format: z.literal("reviewed_legacy_loss_year"),
  reference: ref,
  tax_year: year,
  taxpayer_ssn: ssn,
  spouse_ssn: ssn.optional(),
  filing_status: status,
  inventory,
  reviewed_form1040: z.object({
    reference: ref,
    tax_year: year,
    taxpayer_ssn: ssn,
    spouse_ssn: ssn.optional(),
    filing_status: status,
    agi: signed,
    standard_or_itemized_deduction: amount,
    personal_exemptions: amount,
    reported_taxable_income: amount,
  }).strict(),
  section199_deduction: z.object({ reference: ref, amount }).strict(),
  limitations_review: z.object({
    reference: ref,
    at_risk_and_passive_limits_applied: z.literal(true),
    itemized_phaseout_applied: z.literal(true),
  }).strict(),
}).strict();

/** Historic regular-tax origin inventory (2005–2017). Personal exemptions and
 * section199 DPAD cannot create/increase the loss. This is a calculation review,
 * not a historical Form1045 PDF/native document, election or accepted carry.
 */
export function calculateReviewedLegacyLossYear(raw: unknown) {
  const v = reviewedLegacyLossYearSchema.parse(raw), r = v.reviewed_form1040;
  if (
    r.tax_year !== v.tax_year || r.taxpayer_ssn !== v.taxpayer_ssn ||
    r.spouse_ssn !== v.spouse_ssn || r.filing_status !== v.filing_status ||
    new Set([
        v.reference,
        r.reference,
        v.section199_deduction.reference,
        v.limitations_review.reference,
      ]).size !== 4
  ) {
    throw new Error(
      "Legacy loss needs matching return identity and distinct reviews",
    );
  }
  const trueTaxableIncome = r.agi - r.standard_or_itemized_deduction -
    r.personal_exemptions;
  if (r.reported_taxable_income !== Math.max(0, trueTaxableIncome)) {
    throw new Error("Legacy loss return taxable income does not reconcile");
  }
  for (const row of Object.values(v.inventory).flat()) {
    if (row.reference === v.section199_deduction.reference) {
      throw new Error(
        "DPAD review cannot also appear in the ordinary item inventory",
      );
    }
  }
  // The shared section172(d) engine receives AGI before DPAD and a computational
  // header. Adapter year2018 permits that engine's structural parse; neither
  // year nor regular-return verification flags are evidence of a filed return.
  const computation = calculateReviewedLossYear({
    ...v.inventory,
    tax_year: 2018,
    reference: v.reference,
    taxpayer_ssn: v.taxpayer_ssn,
    spouse_ssn: v.spouse_ssn,
    filing_status: v.filing_status,
    reviewed_form1040: {
      reference: r.reference,
      tax_year: 2018,
      taxpayer_ssn: v.taxpayer_ssn,
      spouse_ssn: v.spouse_ssn,
      filing_status: v.filing_status,
      line11_agi: r.agi + v.section199_deduction.amount,
      line12_standard_or_itemized_deduction: r.standard_or_itemized_deduction,
    },
    limitations_review: {
      reference: v.limitations_review.reference,
      at_risk_and_passive_limits_applied: true,
      // Engine does no EBL computation; pre-2018 origins have no EBL review.
      excess_business_loss_limit_applied: true,
    },
  });
  return {
    taxYear: v.tax_year,
    taxpayerSsn: v.taxpayer_ssn,
    spouseSsn: v.spouse_ssn,
    regularNol: computation.regularNol,
    capitalLossDeduction: computation.capitalLossDeduction,
    section172CalculationLines: computation.lines,
    trueTaxableIncome,
    personalExemptionModification: r.personal_exemptions,
    section199Modification: v.section199_deduction.amount,
    legacyOriginWorkpaperArithmeticReconciled: true as const,
    sourceClassificationVerified: false as const,
    limitationsVerified: false as const,
    priorAcceptanceVerified: false as const,
    carryAvailabilityVerified: false as const,
    amtNolReconciled: false as const,
    filingReady: false as const,
  };
}
