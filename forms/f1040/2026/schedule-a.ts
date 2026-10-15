import { z } from "zod";
import { FilingStatus } from "../nodes/types.ts";
import { itemized2026 } from "../nodes/config/2026-itemized.ts";
import {
  medicalExpenseDeduction,
  reducedSaltLimit,
} from "../nodes/inputs/deductions/itemized/schedule_a/amounts.ts";
import { computeContributions } from "../nodes/inputs/deductions/itemized/schedule_a/index.ts";
import { seniorZeroExclusionsReviewSchema } from "../nodes/intermediate/forms/deductions/additional/schedule1a/calculation.ts";
import {
  cashGift2026Schema,
  reviewCashGifts2026,
} from "./inputs/cash-gift-source.ts";
import {
  calculateItemizedExpenseSources2026,
  expenseInput2026Schema,
} from "./inputs/itemized-expense-source.ts";
const ref = z.string().trim().min(1);
const amount = z.number().finite().nonnegative().max(
  Number.MAX_SAFE_INTEGER / 100,
);
const addback = z.object({ amount, source_reference: ref }).strict();
export const scopeReview2026Schema = z.object({
  record_reference: ref,
  no_other_deductible_taxes: z.literal(true),
  no_mortgage_or_investment_interest: z.literal(true),
  no_noncash_gifts_or_prior_charitable_carryovers: z.literal(true),
  no_casualty_or_other_itemized_deductions: z.literal(true),
  no_nol_carryback: z.literal(true),
}).strict();
export const scheduleASource2026Schema = expenseInput2026Schema.extend({
  tax_year: z.literal(2026),
  agi: z.number().int().safe(),
  source_scope_review: scopeReview2026Schema,
  salt_zero_exclusions_review: seniorZeroExclusionsReviewSchema.optional(),
  salt_addbacks: z.object({
    section933: addback,
    form2555_line45: addback,
    form2555_line50: addback,
    form4563_line15: addback,
  }).strict().optional(),
  form2555_line45_from_agi: amount.optional(),
  cash_gifts: z.array(cashGift2026Schema).default([]),
  cash_gift_classifications: z.array(
    z.object({
      contribution_id: ref,
      category: z.enum(["cash60", "cash30"]),
      classification_record_reference: ref,
      daf_exclusive_legal_control_acknowledgment_reference: ref.optional(),
    }).strict(),
  ).default([]),
}).strict();
export type ScheduleASource2026 = z.input<typeof scheduleASource2026Schema>;

/** Source-derived candidate before the §68 limit, which belongs to the joint resolver. */
export function calculateScheduleA2026(raw: ScheduleASource2026) {
  const input = scheduleASource2026Schema.parse(raw);
  if (!!input.salt_zero_exclusions_review === !!input.salt_addbacks) {
    throw new Error(
      "Schedule A needs either a zero-exclusions review or all sourced SALT addbacks",
    );
  }
  if (
    input.form2555_line45_from_agi !== undefined &&
    Math.round(input.form2555_line45_from_agi) !==
      Math.round(input.salt_addbacks?.form2555_line45.amount ?? 0)
  ) {
    throw new Error("Schedule A Form 2555 exclusion disagrees with AGI");
  }
  const expenses = calculateItemizedExpenseSources2026({
    filing_status: input.filing_status,
    taxpayer_ssn: input.taxpayer_ssn,
    spouse_ssn: input.spouse_ssn,
    medical_payments: input.medical_payments,
    tax_payments: input.tax_payments,
    w2_tax_sources: input.w2_tax_sources,
    tax_election: input.tax_election,
    spouse_sales_tax_method: input.spouse_sales_tax_method,
  });
  const cash = reviewCashGifts2026({
    filing_status: input.filing_status,
    taxpayer_ssn: input.taxpayer_ssn,
    spouse_ssn: input.spouse_ssn,
    cash_gifts: input.cash_gifts,
  });
  const classifications = new Map<
    string,
    typeof input.cash_gift_classifications[number]
  >();
  for (const review of input.cash_gift_classifications) {
    if (
      classifications.has(review.contribution_id) ||
      !cash.some((gift) => gift.contribution_id === review.contribution_id)
    ) {
      throw new Error(
        "Schedule A cash classification needs one matching contribution",
      );
    }
    classifications.set(review.contribution_id, review);
  }
  let source60 = 0, source30 = 0;
  for (const gift of cash) {
    if (
      gift.from_ira_qualified_charitable_distribution ||
      gift.recipient_class === "not_qualified"
    ) continue;
    const review = classifications.get(gift.contribution_id);
    if (gift.recipient_class !== "section170b1A" && !review) {
      throw new Error(
        "Schedule A needs the cash gift's percentage-limit classification",
      );
    }
    if (
      gift.recipient_class === "section170b1A" && review?.category === "cash30"
    ) {
      throw new Error(
        "Cash paid directly to a section 170(b)(1)(A) organization uses the cash 60% category",
      );
    }
    if (
      gift.recipient_class === "donor_advised_fund" &&
      !review?.daf_exclusive_legal_control_acknowledgment_reference
    ) {
      throw new Error(
        "DAF itemization needs the sponsoring organization's exclusive-control acknowledgment",
      );
    }
    if ((review?.category ?? "cash60") === "cash60") {
      source60 += gift.charitable_amount;
    } else source30 += gift.charitable_amount;
  }
  source60 = Math.round(source60);
  source30 = Math.round(source30);
  const contributionBase = Math.max(0, input.agi);
  const limited = computeContributions(
    {
      cash_contributions_to_50_percent_organizations: source60,
      cash_contributions_other_30: source30,
    },
    contributionBase,
    2026,
    itemized2026.cashOnlyOther30OffsetRate,
  );
  const allowed60 = Math.round(
    source60 - limited.carryforwards.charitable_cash_60_2026,
  );
  const allowed30 = Math.round(
    source30 - limited.carryforwards.charitable_cash_other_30_2026,
  );
  const floor = Math.round(contributionBase * itemized2026.charitableFloorRate);
  // §170(b)(1)(I): other-30 (B) absorbs the floor before cash-60 (G).
  const floor30 = Math.min(allowed30, floor);
  const floor60 = Math.min(allowed60, floor - floor30);
  const excess60 = source60 - allowed60, excess30 = source30 - allowed30;
  const hasPercentageExcess = excess60 + excess30 > 0;
  const saltMagi = input.agi +
    Object.values(input.salt_addbacks ?? {}).reduce(
      (n, row) => n + Math.round(row.amount),
      0,
    );
  // §164(b)(7) reduces the full applicable limitation; §164(b)(6)(B)
  // then halves that limitation for MFS. Do not double the MFS phase-down.
  const isMfs = input.filing_status === FilingStatus.MFS;
  const saltLimit = Math.round(
    reducedSaltLimit(saltMagi, {
      cap: itemized2026.saltCap,
      threshold: isMfs
        ? itemized2026.saltPhaseoutThresholdMfs
        : itemized2026.saltPhaseoutThreshold,
      floor: itemized2026.saltFloor,
      reductionRate: itemized2026.saltPhaseoutRate,
      roundReduction: true,
    }) / (isMfs ? 2 : 1),
  );
  const line1 = Math.round(expenses.amounts.medical);
  const line3 = Math.round(Math.max(0, input.agi) * .075);
  const line4 = medicalExpenseDeduction(expenses.amounts.medical, input.agi);
  const line5a = Math.round(expenses.selectedStateOrSales),
    line5b = Math.round(expenses.amounts.realEstate),
    line5c = Math.round(expenses.amounts.personalProperty);
  const line5d = line5a + line5b + line5c, line5e = Math.min(line5d, saltLimit);
  const line11 = allowed60 + allowed30, line13 = line11 - floor30 - floor60;
  const beforeOverallLimit = line4 + line5e + line13;
  if (
    [
      saltMagi,
      line1,
      line3,
      line4,
      line5a,
      line5b,
      line5c,
      line5d,
      line5e,
      line11,
      line13,
      beforeOverallLimit,
    ]
      .some((n) => !Number.isSafeInteger(Math.round(n)))
  ) throw new Error("Schedule A amounts exceed whole-dollar range");
  return {
    source_input: input,
    expenses,
    cash_gifts: cash,
    saltMagi,
    saltLimit,
    lines: {
      line1,
      line2: input.agi,
      line3,
      line4,
      line5a,
      line5b,
      line5c,
      line5d,
      line5e,
      line6: 0,
      line7: line5e,
      line8a: 0,
      line8b: 0,
      line8c: 0,
      line8d: 0,
      line8e: 0,
      line9: 0,
      line10: 0,
      line11,
      line12: 0,
      line13,
      line14: 0,
      line15: line13,
      line16: 0,
      line17z: 0,
    },
    beforeOverallLimit,
    charity: {
      source60,
      source30,
      allowed60,
      allowed30,
      floor,
      floor60,
      floor30,
      // Candidate only: persist carryovers after deduction selection and the
      // applicable standard-deduction/NOL/carryover rules are finalized.
      carryforward_candidate: {
        cash60: excess60 + (hasPercentageExcess ? floor60 : 0),
        cash30: excess30 + (hasPercentageExcess ? floor30 : 0),
      },
      floor_not_carried: hasPercentageExcess ? 0 : floor60 + floor30,
    },
  };
}
