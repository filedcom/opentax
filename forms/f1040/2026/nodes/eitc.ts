import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { f1040_2026_node } from "./f1040.ts";
import { f8812 } from "../../nodes/inputs/credits/child/f8812/index.ts";
import {
  computeEitcWithConfig,
  type EitcInput,
  priorEicDisallowanceReviewSchema,
} from "../../nodes/intermediate/forms/credits/earned-income/eitc/index.ts";
import { eic2026, eicPhaseoutEnds2026 } from "../../nodes/config/2026-eic.ts";
import {
  dependent2026Schema,
  dependentRules2026,
} from "../inputs/dependents.ts";
import {
  eicChildMeetsNonTinTests,
  eicChildSourceProjection,
} from "../../nodes/inputs/general/filing/general/index.ts";
import { reviewedResidence2026 } from "../inputs/dependent-residency.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";

const reference = z.string().trim().min(1);
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const money = z.number().finite().nonnegative();
export const eicClaim2026Schema = z.object({
  tax_year: z.literal(2026),
  review_reference: reference,
  not_qualifying_child_of_another_taxpayer: z.boolean(),
  prior_disallowance_review: priorEicDisallowanceReviewSchema.refine(
    (r) => r.status !== "requires_8862",
    "EIC needs the 2026 Form 8862 source owner",
  ),
  taxpayer_residency_record_reference: reference,
  spouse_residency_record_reference: reference.optional(),
  no_form2555: z.literal(true),
  no_business_farm_rental_passive_or_capital_disposition_sources: z.literal(
    true,
  ),
  no_retirement_disability_inmate_or_workfare_wages: z.literal(true),
  no_medicaid_waiver_payments: z.literal(true),
  no_community_property_allocation: z.literal(true),
  // These source cases need their own eligibility/attachment routes; a child
  // without a valid SSN can qualify a filer for self-only EIC under §32(c)(3)(D).
  no_qualifying_child_without_valid_ssn: z.literal(true),
  no_separated_spouse_special_rule: z.literal(true),
  hoh_unmarried_at_year_end: z.boolean().optional(),
  combat_pay_election: z.enum(["exclude", "include_if_better"]),
  child_reviews: z.array(
    z.object({
      child_tin: tin,
      record_reference: reference,
      no_competing_eic_claim: z.literal(true),
      unmarried_or_married_child_dependency_rules_satisfied: z.literal(true),
    }).strict(),
  ),
}).strict();

export const inputSchema = eicClaim2026Schema.partial().extend({
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: tin,
  spouse_ssn: tin.optional(),
  taxpayer_dob: z.string().date(),
  spouse_dob: z.string().date().optional(),
  taxpayer_can_be_claimed_as_dependent: z.boolean(),
  spouse_can_be_claimed_as_dependent: z.boolean().optional(),
  main_home_in_us_over_half_year: z.boolean().optional(),
  filer_has_valid_ssns: z.boolean(),
  filer_ssns_reviewed: z.boolean(),
  tax_residency: z.enum([
    "full_year_citizen_or_resident",
    "nonresident_or_dual_status",
  ]).optional(),
  do_not_claim_eic: z.boolean().optional(),
  qualifying_children: z.number().int().min(0).max(3),
  dependent_source_rows_2026: z.array(dependent2026Schema),
  qualifying_child_details: z.array(
    dependent2026Schema.extend({
      eic_printed_months: z.number().int().min(0).max(12).optional(),
    }),
  ).max(3),
  agi: z.number().finite(),
  investment_income_floor: money,
  earned_income: z.union([money, z.array(money)]).optional(),
  wage_income_from_agi: money,
  unsupported_eic_activity: z.boolean(),
  w2_eic_sources_2026: z.array(
    z.object({
      recipient: z.enum(["taxpayer", "spouse"]),
      source_reference: reference,
      combat_pay: money,
      statutory_employee: z.boolean(),
    }).strict(),
  ).default([]),
}).strict();
export type EicInput2026 = z.input<typeof inputSchema>;

export function calculateEic2026(raw: EicInput2026) {
  const input = inputSchema.parse(raw);
  const children = eicChildSourceProjection(
    {
      filing_status: input.filing_status,
      taxpayer_ssn: input.taxpayer_ssn,
      spouse_ssn: input.spouse_ssn,
      dependents: input.dependent_source_rows_2026,
    },
    dependentRules2026(
      input.taxpayer_dob,
      input.filing_status === FilingStatus.MFJ ? input.spouse_dob : undefined,
    ),
  );
  if (
    children.count !== input.qualifying_children ||
    JSON.stringify(children.children.slice(0, 3).map((c) => c.ssn)) !==
      JSON.stringify(input.qualifying_child_details.map((c) => c.ssn))
  ) {
    throw new Error(
      "EIC child counts and details must reconcile to general source rows",
    );
  }
  const base = {
    source_input: input,
    credit_amount: 0,
    file_schedule_eic: false,
    qualifying_children: children.count,
    qualifying_child_details: children.children.slice(0, 3).map((child) => ({
      ...child,
      eic_printed_months: reviewedResidence2026(child)?.eicPrintedMonths ??
        child.months_lived_with_you_in_us,
    })),
    combat_pay_elected: { taxpayer: false, spouse: false },
    elected_combat_pay: 0,
    earned_income_for_eic: input.wage_income_from_agi,
  };
  if (input.do_not_claim_eic === true) {
    return { ...base, disposition: "declined" };
  }
  const maxIncome = eicPhaseoutEnds2026[
    input.filing_status === FilingStatus.MFJ ? "joint" : "other"
  ][children.count];
  if (input.agi >= maxIncome) return { ...base, disposition: "agi_phaseout" };
  if (
    input.unsupported_eic_activity ||
    input.w2_eic_sources_2026.some((s) => s.statutory_employee)
  ) {
    throw new Error(
      "EIC needs the business, foreign, retirement or statutory-employee source owner",
    );
  }
  const combat = Object.fromEntries(
    ["taxpayer", "spouse"].map((
      owner,
    ) => [
      owner,
      input.w2_eic_sources_2026.filter((s) => s.recipient === owner).reduce(
        (sum, s) => sum + Math.round(s.combat_pay * 100),
        0,
      ) / 100,
    ]),
  ) as Record<"taxpayer" | "spouse", number>;
  if (input.wage_income_from_agi + combat.taxpayer + combat.spouse === 0) {
    return { ...base, disposition: "no_earned_income" };
  }
  if (!input.filer_ssns_reviewed) {
    throw new Error(
      "EIC needs explicit filer SSN issuance and employment-validity answers",
    );
  }
  if (!input.filer_has_valid_ssns) {
    return { ...base, disposition: "invalid_filer_ssn" };
  }
  if (
    input.taxpayer_can_be_claimed_as_dependent ||
    input.spouse_can_be_claimed_as_dependent
  ) {
    // IRC 32(c)(1)(A)(ii)(III) excludes dependent filers only from childless
    // EIC. A dependent parent with a qualifying child needs a separate reviewed
    // route; do not inherit the broader dependency check of the legacy helper.
    if (children.count > 0) {
      throw new Error(
        "Child-based EIC for a dependent filer needs the qualifying-relative versus qualifying-child review route",
      );
    }
    return { ...base, disposition: "filer_is_dependent" };
  }
  if (input.investment_income_floor > eic2026.investmentIncomeLimit) {
    return { ...base, disposition: "excess_investment_income" };
  }
  const review = eicClaim2026Schema.parse(
    Object.fromEntries(
      Object.keys(eicClaim2026Schema.shape).map((
        key,
      ) => [key, input[key as keyof typeof input]]),
    ),
  );
  if (
    input.tax_residency !== "full_year_citizen_or_resident" ||
    (input.filing_status === FilingStatus.MFJ &&
      !review.spouse_residency_record_reference)
  ) {
    throw new Error(
      "EIC needs reviewed full-year residence for both joint filers or a supported election",
    );
  }
  if (input.filing_status === FilingStatus.MFS) {
    throw new Error(
      "MFS EIC needs reviewed separated-spouse eligibility and its 2026 filing indicator",
    );
  }
  const reviewTins = review.child_reviews.map((r) =>
    r.child_tin.replaceAll("-", "")
  );
  const childTins = children.children.map((c) => c.ssn.replaceAll("-", ""));
  if (
    new Set(reviewTins).size !== reviewTins.length ||
    reviewTins.length !== childTins.length ||
    childTins.some((tin) => !reviewTins.includes(tin))
  ) {
    throw new Error(
      "EIC needs one source eligibility review for every qualifying child",
    );
  }
  if (
    children.count === 0 && input.main_home_in_us_over_half_year === undefined
  ) {
    throw new Error("Childless EIC needs the filer's U.S. home answer");
  }
  if (
    children.count === 0 && input.filing_status === FilingStatus.HOH &&
    review.hoh_unmarried_at_year_end === undefined
  ) {
    throw new Error(
      "Childless HOH EIC needs the year-end unmarried-status source review",
    );
  }
  if (
    input.dependent_source_rows_2026.some((child) =>
      child.dependent_on_another_return !== true &&
      eicChildMeetsNonTinTests(
        child,
        dependentRules2026(
          input.taxpayer_dob,
          input.filing_status === FilingStatus.MFJ
            ? input.spouse_dob
            : undefined,
        ),
      ) &&
      (!child.ssn || child.ssn_valid_for_employment !== true ||
        child.tin_issued_by_due_date !== true ||
        child.ssn_issued_before_due_date !== true)
    )
  ) {
    throw new Error(
      "EIC needs the self-only child-without-valid-SSN attachment review",
    );
  }
  if (!review.not_qualifying_child_of_another_taxpayer) {
    return { ...base, disposition: "filer_is_qualifying_child" };
  }
  const shared: EitcInput = {
    ...input,
    // Keep source validation/2026 residency fields in this adapter; the shared
    // arithmetic and eligibility helpers consume only reviewed semantic facts.
    qualifying_child_details: undefined,
    earned_income: input.wage_income_from_agi,
    prior_eic_disallowance_review: review.prior_disallowance_review,
    childless_eic_review: {
      not_qualifying_child_of_another_taxpayer_verified: true,
      qualifying_child_status_record_reference: review.review_reference,
      ...(review.hoh_unmarried_at_year_end === true
        ? { hoh_unmarried_at_year_end_verified: true as const }
        : {}),
    },
    child_eic_filer_review: {
      not_qualifying_child_of_another_taxpayer_verified: true,
      relationship_age_residence_record_reference: review.review_reference,
    },
    eic_tax_residency_review: {
      status: "all_year_resident",
      taxpayer_status_record_reference:
        review.taxpayer_residency_record_reference,
      spouse_status_record_reference: review.spouse_residency_record_reference,
    },
  };
  let best = {
    credit: computeEitcWithConfig(shared, eic2026),
    taxpayer: false,
    spouse: false,
    amount: 0,
  };
  const comparisons = [best];
  if (review.combat_pay_election === "include_if_better") {
    for (
      const [taxpayer, spouse] of [[true, false], [false, true], [true, true]]
    ) {
      if (
        (taxpayer && combat.taxpayer === 0) || (spouse && combat.spouse === 0)
      ) continue;
      const amount = roundWholeDollars(
        (taxpayer ? combat.taxpayer : 0) +
          (spouse ? combat.spouse : 0),
      );
      const candidate = {
        taxpayer,
        spouse,
        amount,
        credit: computeEitcWithConfig({
          ...shared,
          earned_income: input.wage_income_from_agi + amount,
        }, eic2026),
      };
      comparisons.push(candidate);
      if (candidate.credit > best.credit) best = candidate;
    }
  }
  return {
    ...base,
    disposition: "calculated",
    credit_amount: best.credit,
    file_schedule_eic: best.credit > 0 && children.count > 0,
    combat_pay_elected: { taxpayer: best.taxpayer, spouse: best.spouse },
    elected_combat_pay: best.amount,
    earned_income_for_eic: input.wage_income_from_agi + best.amount,
    combat_pay_comparisons: comparisons,
  };
}

class EicNode2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "eitc";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040_2026_node, f8812]);
  compute(ctx: NodeContext, raw: EicInput2026): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("EIC needs f1040:2026 context");
    }
    const calculation = calculateEic2026(raw);
    return {
      outputs: [
        { nodeType: "eitc", fields: { calculation_2026: calculation } },
        {
          nodeType: "f1040",
          fields: {
            line27a_eic: calculation.credit_amount,
            eic_finalized: true,
            line1i_combat_pay: calculation.elected_combat_pay,
          },
        },
        {
          nodeType: "f8812",
          fields: { finalized_eic: calculation.credit_amount },
        },
      ],
    };
  }
}
export const eitc_2026 = new EicNode2026();
