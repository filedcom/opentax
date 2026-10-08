import { z } from "zod";
import { calculateReviewedLossYear } from "../../../../../nodes/inputs/income/business/nol_carryforward/reviewed_loss_year.ts";
import {
  calculateReviewedNolOrigin,
  parseReviewedNolOrigin,
} from "./form172_nol_origin.ts";

const ref = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{9}$/);
const reviewSchema = z.object({
  reference: ref,
  origin_reference: ref,
  tax_year: z.number().int().min(2005).max(2025),
  taxpayer_ssn: ssn,
  spouse_ssn: ssn.optional(),
  farming_item_ids: z.array(ref).min(1),
  nonfarming_business_item_ids: z.array(ref),
  section263a_farming_classification_reviewed: z.literal(true),
  loss_limitations_refigured_for_farming_subset: z.literal(true),
}).strict();

/** Section172(b)(1)(B)(ii) arithmetic: farm-only NOL capped by whole-year NOL.
 * Selection names retained origin items; no independent farm-loss amount is
 * accepted. Classification/limitation declarations are reviewed assertions,
 * not legal eligibility or source authenticity. Portion histories are separate.
 */
export function calculateForm172FarmingLossSplit(
  rawOrigin: unknown,
  rawFarmingReview: unknown,
) {
  const source = parseReviewedNolOrigin(rawOrigin);
  const origin = calculateReviewedNolOrigin(source);
  const v = reviewSchema.parse(rawFarmingReview);
  if (
    v.origin_reference !== source.reference ||
    v.reference === source.reference || v.tax_year !== origin.taxYear ||
    v.taxpayer_ssn !== origin.taxpayerSsn || v.spouse_ssn !== origin.spouseSsn
  ) {
    throw new Error(
      "Farming subset review must match the original loss identity",
    );
  }
  const items = "source_format" in source ? source.inventory : source;
  const eligibleItems = [
    ...items.noncapital_income,
    ...items.noncapital_deductions,
    ...items.capital_gains,
    ...items.capital_losses,
  ];
  const selected = new Set(v.farming_item_ids);
  if (selected.size !== v.farming_item_ids.length) {
    throw new Error("Farming item IDs must be distinct");
  }
  const allItems = new Map(eligibleItems.map((row) => [row.item_id, row]));
  const classified = new Set([
    ...v.farming_item_ids,
    ...v.nonfarming_business_item_ids,
  ]);
  const businessIds = eligibleItems.filter((row) => row.business).map((row) =>
    row.item_id
  );
  if (
    classified.size !==
      v.farming_item_ids.length + v.nonfarming_business_item_ids.length ||
    classified.size !== businessIds.length ||
    businessIds.some((id) => !classified.has(id))
  ) {
    throw new Error(
      "Every origin business item needs exactly one farming classification",
    );
  }
  for (const id of v.nonfarming_business_item_ids) {
    if (!allItems.get(id)?.business) {
      throw new Error(
        "Nonfarming business classification needs origin business items",
      );
    }
  }
  for (const id of selected) {
    const item = allItems.get(id);
    if (!item || !item.business) {
      throw new Error(
        "Farming subset needs identified business items from the origin",
      );
    }
  }
  const choose = <T extends { item_id: string }>(rows: T[]) =>
    rows.filter((row) => selected.has(row.item_id));
  const farm = {
    noncapital_income: choose(items.noncapital_income),
    noncapital_deductions: choose(items.noncapital_deductions),
    capital_gains: choose(items.capital_gains),
    capital_losses: choose(items.capital_losses),
    prior_nol_deductions: [],
  };
  const sum = (rows: readonly { amount: number }[]) =>
    rows.reduce((n, row) => n + row.amount, 0);
  const capitalNet = sum(farm.capital_gains) - sum(farm.capital_losses) -
    farm.capital_gains.reduce((n, row) => n + row.section1202_excluded, 0);
  const agi = sum(farm.noncapital_income) + Math.max(0, capitalNet) -
    Math.min(
      Math.max(0, -capitalNet),
      source.filing_status === "married_filing_separately" ? 1500 : 3000,
    ) -
    sum(farm.noncapital_deductions.filter((row) => row.location === "agi"));
  const deduction = sum(
    farm.noncapital_deductions.filter((row) => row.location === "line12"),
  );
  // Internal section172 arithmetic adapter, not a filed return or attachment.
  // Year2018 supplies engine structure for both historic and modern inventories.
  const farmingOnly = calculateReviewedLossYear({
    ...farm,
    tax_year: 2018,
    reference: v.reference,
    taxpayer_ssn: source.taxpayer_ssn,
    spouse_ssn: source.spouse_ssn,
    filing_status: source.filing_status,
    reviewed_form1040: {
      reference: `${v.reference}:computed-farming-only-reconciliation`,
      tax_year: 2018,
      taxpayer_ssn: source.taxpayer_ssn,
      spouse_ssn: source.spouse_ssn,
      filing_status: source.filing_status,
      line11_agi: agi,
      line12_standard_or_itemized_deduction: deduction,
    },
    limitations_review: {
      reference: v.reference,
      at_risk_and_passive_limits_applied: true,
      excess_business_loss_limit_applied: true,
    },
  });
  const farmingLoss = Math.min(origin.regularNol, farmingOnly.regularNol);
  return {
    originYear: origin.taxYear,
    taxpayerSsn: origin.taxpayerSsn,
    spouseSsn: origin.spouseSsn,
    originLoss: origin.regularNol,
    farmingOnlyNol: farmingOnly.regularNol,
    farmingLoss,
    nonfarmingLoss: origin.regularNol - farmingLoss,
    farmingItemReferences: v.farming_item_ids.map((id) => ({
      item_id: id,
      reference: allItems.get(id)!.reference,
    })),
    farmingSplitArithmeticReconciled: true as const,
    farmingClassificationVerified: false as const,
    farmingSubsetLimitationsVerified: false as const,
    portionCarryHistoriesReconciled: false as const,
    carrybackEligibilityVerified: false as const,
    sourceAuthenticityVerified: false as const,
    priorAcceptanceVerified: false as const,
    amtNolReconciled: false as const,
    filingReady: false as const,
  };
}
