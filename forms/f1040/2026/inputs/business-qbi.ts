import {
  businessLossReview2026Schema,
  type BusinessLossSource2026,
} from "./business-loss-source.ts";
import { applyBusinessLossToQbi2026 } from "./business-loss-qbi.ts";
import { z } from "zod";
import {
  businessSources2026Schema,
  calculateBusinessSources2026,
} from "./business-source.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import { allocateSharedSeDeduction } from "../../nodes/inputs/income/business/schedule_c/qbi-multiple.ts";
import {
  qbiPriorLoss2026Schema,
  resolveQbiPriorLoss2026,
  simplifiedQbiCalculator2026,
} from "./qbi-common.ts";
import type { QbiCalculator2026 } from "../deduction-resolution.ts";

const ref = z.string().trim().min(1);
export const businessQbiReview2026Schema = z.object({
  record_reference: ref,
  no_current_qbi_sources_other_than_listed_businesses: z.boolean(),
  linked_land_qbi_inventory_reference: ref.optional(),
  not_a_patron_of_a_specified_cooperative: z.literal(true),
  no_released_suspended_losses_or_qualified_tip_deduction: z.literal(true),
  no_adjustments_other_than_deductible_half_se_tax: z.literal(true),
  not_business_of_trading_financial_instruments_or_commodities: z.literal(true),
  se_deduction_allocation: z.literal(
    "positive_net_profit_proportion_per_owner",
  ),
  businesses: z.array(
    z.object({
      business_reference: ref,
      record_reference: ref,
      section162_business_and_current_income_qualifies_under199a: z.literal(
        true,
      ),
      no_excluded_investment_capital_or_other_non_qbi_items: z.literal(true),
      no_former_employee_presumption_or_rebuttal_needed: z.literal(true),
    }).strict(),
  ).min(1),
  prior_losses: qbiPriorLoss2026Schema,
}).strict();

/** Schedule C component review; the caller separately owns the complete QBI inventory. */
export const businessQbiComponentReview2026Schema = businessQbiReview2026Schema
  .omit({
    no_current_qbi_sources_other_than_listed_businesses: true,
    linked_land_qbi_inventory_reference: true,
    prior_losses: true,
  });

export const businessReturnSource2026Schema = businessSources2026Schema.extend({
  qbi_review: businessQbiReview2026Schema,
  loss_limit_review: businessLossReview2026Schema.extend({
    qbi_loss_allocation: z.literal(
      "negative_qualified_business_income_proportion",
    ),
  }).strict().optional(),
}).strict();
export const businessClaim2026Schema = businessReturnSource2026Schema.omit({
  filing_status: true,
  taxpayer_tin: true,
  spouse_tin: true,
  w2s: true,
});
export type BusinessReturnSource2026 = z.input<
  typeof businessReturnSource2026Schema
>;

/** Replay business facts before allocating deductions; never accept caller QBI. */
export function resolveBusinessQbi2026(raw: BusinessReturnSource2026) {
  const source = businessReturnSource2026Schema.parse(raw);
  if (
    source.qbi_review.no_current_qbi_sources_other_than_listed_businesses ===
      Boolean(source.qbi_review.linked_land_qbi_inventory_reference)
  ) {
    throw new Error(
      "Schedule C QBI needs either a complete C inventory or a linked land inventory",
    );
  }
  const {
    qbi_review: review,
    loss_limit_review: _lossReview,
    ...businessSource
  } = source;
  const {
    prior_losses: prior,
    no_current_qbi_sources_other_than_listed_businesses: _complete,
    linked_land_qbi_inventory_reference: _land,
    ...componentReview
  } = review;
  const { review: _componentReview, ...component } =
    resolveBusinessQbiComponents2026(
      businessSource,
      componentReview,
    );
  return {
    ...component,
    source_input: source,
    ...resolveQbiPriorLoss2026(prior, source),
  };
}

export function resolveBusinessQbiComponents2026(
  raw: z.input<typeof businessSources2026Schema>,
  rawReview: z.input<typeof businessQbiComponentReview2026Schema>,
) {
  const businessSource = businessSources2026Schema.parse(raw);
  const review = businessQbiComponentReview2026Schema.parse(rawReview);
  const business = calculateBusinessSources2026(businessSource);
  const refs = new Set(review.businesses.map((b) => b.business_reference));
  if (
    refs.size !== review.businesses.length ||
    refs.size !== business.businesses.length ||
    business.businesses.some((b) => !refs.has(b.source.business_reference))
  ) {
    throw new Error("QBI reviews must identify every business exactly once");
  }
  const allocations = new Map<string, number>();
  for (const owner of business.owners) {
    const regular = business.businesses.filter((b) =>
      b.source.owner_tin === owner.owner_tin &&
      b.source.kind === "sole_proprietor"
    ).toSorted((a, b) =>
      a.source.business_reference < b.source.business_reference
        ? -1
        : a.source.business_reference > b.source.business_reference
        ? 1
        : 0
    );
    const shares = allocateSharedSeDeduction(
      regular.map((b) => b.lines.line31),
      owner.schedule_se?.line13 ?? 0,
    );
    regular.forEach((b, i) =>
      allocations.set(b.source.business_reference, shares[i])
    );
  }
  const rows = business.businesses.map((b) => {
    const deduction = allocations.get(b.source.business_reference) ?? 0;
    return {
      business_reference: b.source.business_reference,
      owner_tin: b.source.owner_tin,
      business_name: b.source.business_name ?? b.source.principal_business,
      identification_number: b.source.ein ?? b.source.owner_tin,
      net_profit: b.lines.line31,
      allocated_se_deduction: deduction,
      qbi_before_rounding: b.lines.line31 - deduction,
      qbi: roundWholeDollars(b.lines.line31 - deduction),
      materially_participated: true as const,
    };
  });
  const qbi = rows.reduce((n, r) => n + r.qbi, 0);
  const active = business.schedule1_line3 - business.schedule1_line15;
  return {
    source_input: businessSource,
    review,
    business,
    rows,
    qbi,
    active_qbi_before_rounding: active,
    minimum_deduction: active >= 1000 ? 400 : 0,
  };
}

export function businessQbiCalculator2026(
  raw: BusinessReturnSource2026,
  netCapitalGainAndQualifiedDividends: number,
  lossSource?: BusinessLossSource2026,
): QbiCalculator2026 {
  const base = resolveBusinessQbi2026(raw);
  if (base.source_input.qbi_review.linked_land_qbi_inventory_reference) {
    throw new Error("Linked land QBI requires the combined calculation owner");
  }
  const r = applyBusinessLossToQbi2026(base, lossSource);
  return simplifiedQbiCalculator2026(
    r,
    r.source_input.filing_status,
    netCapitalGainAndQualifiedDividends,
  );
}
