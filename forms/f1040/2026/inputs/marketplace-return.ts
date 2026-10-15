import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import { inputSchema as sharedPtcSchema } from "../../nodes/intermediate/forms/credits/health/form8962/index.ts";
import { calculateForm8962_2026 } from "../form8962.ts";
import { marketplaceTaxFamily2026Schema } from "./marketplace-family.ts";
import {
  marketplacePreparation2026Schema,
  prepareMarketplace2026,
} from "./marketplace-preparation.ts";

const ref = z.string().trim().min(1);
const medicalReview = z.discriminatedUnion("treatment", [
  z.object({
    treatment: z.literal("not_claimed"),
    record_reference: ref,
    reviewed_on: z.string().date(),
    marketplace_premiums_excluded_from_other_deductions_verified: z.literal(
      true,
    ),
  }).strict(),
  z.object({
    treatment: z.literal("schedule_a"),
    record_reference: ref,
    reviewed_on: z.string().date(),
    all_covered_people_eligible_under_section213_verified: z.literal(true),
    no_reimbursements_tax_free_funding_or_other_deductions_verified: z.literal(
      true,
    ),
    all_personal_premiums_paid_in_2026_verified: z.literal(true),
  }).strict(),
]);
export const marketplaceReturnClaim2026Schema = marketplacePreparation2026Schema
  .extend({
    medical_review: medicalReview,
    income_review: z.object({
      tax_year: z.literal(2026),
      record_reference: ref,
      reviewed_on: z.string().date(),
      reviewer_name: ref,
      reviewed_filer_tins: z.array(z.string().regex(/^\d{9}$/)).min(1).max(2),
      all_taxable_income_and_magi_addback_sources_included_verified: z.literal(
        true,
      ),
      all_adjustment_sources_included_verified: z.literal(true),
      all_filer_income_reported_once_verified: z.literal(true),
    }).strict(),
  }).strict();
export const marketplaceReturnSources2026Schema =
  marketplaceReturnClaim2026Schema.extend({
    tax_family: marketplaceTaxFamily2026Schema,
  }).strict();
const dollars = z.number().finite().int().safe();
export const marketplaceReturnInput2026Schema = z.object({
  marketplace_sources_2026: marketplaceReturnSources2026Schema,
  taxpayer_modified_agi: dollars,
  pub974_income_audit: sharedPtcSchema.shape.pub974_income_audit.unwrap(),
  qsehra_w2_reported_benefit: z.number().finite().nonnegative().optional(),
}).strict();
export type MarketplaceReturnInput2026 = z.input<
  typeof marketplaceReturnInput2026Schema
>;

/** Replayable source contract shared by the return, AMT and itemized deductions. */
export function calculateMarketplaceReturn2026(
  raw: MarketplaceReturnInput2026,
) {
  const input = marketplaceReturnInput2026Schema.parse(raw);
  const { tax_family, ...claim } = input.marketplace_sources_2026;
  const prepared = prepareMarketplace2026(tax_family, {
    claim: claim.claim,
    family_review: claim.family_review,
  });
  const owners = [
    tax_family.taxpayer_tin,
    ...(tax_family.filing_status === FilingStatus.MFJ
      ? [tax_family.spouse_tin!]
      : []),
  ];
  const incomeReview = claim.income_review;
  if (
    incomeReview.reviewed_on < "2027-01-01" ||
    incomeReview.reviewed_on > claim.claim.reviewed_on ||
    new Set(incomeReview.reviewed_filer_tins).size !== owners.length ||
    incomeReview.reviewed_filer_tins.length !== owners.length ||
    owners.some((tin) => !incomeReview.reviewed_filer_tins.includes(tin))
  ) {
    throw new Error(
      "2026 Marketplace income inventory must review each actual filer once after year end",
    );
  }
  const audit = input.pub974_income_audit;
  for (const value of Object.values(audit)) {
    if (typeof value === "number") dollars.parse(value);
  }
  if (audit.schedule1_line17_se_health_insurance !== 0) {
    throw new Error(
      "2026 Marketplace self-employed health deduction needs the coordinated Pub. 974 calculation",
    );
  }
  if ((input.qsehra_w2_reported_benefit ?? 0) > 0) {
    throw new Error(
      "2026 Marketplace W-2 QSEHRA benefits need a current-year affordability calculation",
    );
  }
  const magi = audit.form1040_line9_total_income -
    audit.schedule1_adjustments_except_line17 -
    audit.schedule1_line17_se_health_insurance +
    audit.form1040_line2a_tax_exempt_interest +
    audit.form1040_nontaxable_social_security + audit.form2555_lines45_and_50;
  if (magi !== input.taxpayer_modified_agi) {
    throw new Error(
      "2026 Marketplace taxpayer MAGI must reconcile to the executed AGI workpaper",
    );
  }
  const calculation = calculateForm8962_2026({
    ...prepared.calculation_input,
    taxpayer_modified_agi: magi,
  });
  const medical = claim.medical_review;
  if (
    medical.reviewed_on < "2027-01-01" ||
    medical.reviewed_on > claim.claim.reviewed_on
  ) {
    throw new Error(
      "2026 Marketplace medical review must precede the complete claim review after year end",
    );
  }
  const current = new Set(prepared.policies.current_document_references);
  const months = claim.claim.month_reviews.filter((r) =>
    current.has(r.source_document_reference)
  );
  let medicalPremiums = 0;
  if (medical.treatment === "schedule_a") {
    const owners = [
      tax_family.taxpayer_tin,
      ...(tax_family.filing_status === FilingStatus.MFJ
        ? [tax_family.spouse_tin!]
        : []),
    ];
    for (const row of months) {
      const policy = claim.claim.copies.find((c) =>
        c.source_document_reference === row.source_document_reference
      )!;
      const ownPremiumCents = Math.max(
        0,
        Math.round(policy.monthly_premiums[row.month - 1] * 100) -
          Math.round(policy.monthly_aptcs[row.month - 1] * 100),
      );
      if (
        Math.round(row.premium_payment.amount * 100) !== ownPremiumCents ||
        (ownPremiumCents > 0 &&
          (!row.premium_payment.paid_on.startsWith("2026-") ||
            !owners.includes(row.premium_payment.payer_tin ?? "")))
      ) {
        throw new Error(
          "2026 Marketplace medical deduction needs exact 2026 after-tax premium payments by the return filers",
        );
      }
    }
    // Pub. 502 PTC examples: paid premiums less the allowed PTC, including
    // repaid advances. No 2025 repayment cap survives in the 2026 calculation.
    const allowedPtc = z.number().nonnegative().parse(
      calculation.fields.total_premium_tax_credit ?? 0,
    );
    medicalPremiums = Math.max(
      0,
      Math.round(prepared.policies.annual_premium * 100) - allowedPtc * 100,
    ) / 100;
  }
  return {
    source_input: input,
    prepared,
    calculation,
    medical: {
      treatment: medical.treatment,
      eligible_premiums: medicalPremiums,
      payment_references: months.map((r) => r.premium_payment.reference),
      document_references: claim.claim.copies.map((c) =>
        c.source_document_reference
      ),
    },
  };
}
