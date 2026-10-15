import { schedule_a_2026 } from "../nodes/schedule-a.ts";
import { form8919_2026 } from "./form8919.ts";
import { ct2_2026 } from "./ct2.ts";
import { form4137_2026 } from "./form4137.ts";
import { vehicle_loan_interest_2026 } from "./vehicle-loan-interest.ts";
import { cash_charity_2026 } from "./cash-charity.ts";
import { z } from "zod";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import {
  dependentCounts,
  DependentRelationship,
  educationDependentSourceEligible,
  eicChildSourceProjection,
  filedDependentsFromGeneral,
  filerCreditEligibility,
  inputSchema as sharedGeneralSchema,
  isAge65ByEndOfTaxYear,
} from "../../nodes/inputs/general/filing/general/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { identityInputSchema } from "../identity.ts";
import {
  dependent2026Schema,
  dependentFiling2026Schema,
  dependentRules2026,
  validateDependents2026,
} from "./dependents.ts";
import { reviewedResidence2026, validDate2026 } from "./dependent-residency.ts";
import { w2_2026 } from "./w2.ts";
import { agi_2026 } from "../nodes/agi.ts";
import { f1040_2026_node } from "../nodes/f1040.ts";
import { standard_deduction } from "../../nodes/intermediate/worksheets/deductions/standard/standard_deduction/index.ts";
import { eitc } from "../../nodes/intermediate/forms/credits/earned-income/eitc/index.ts";
import { f8812 } from "../../nodes/inputs/credits/child/f8812/index.ts";
import { schedule1a_2026 as schedule1a } from "../nodes/schedule1a.ts";
import { form8959_2026 } from "../nodes/form8959.ts";
import { form8880 } from "../../nodes/intermediate/forms/credits/individual/form8880/index.ts";
import { form8960 } from "../../nodes/intermediate/forms/taxes/investments/form8960/index.ts";
import { form8995 } from "../../nodes/intermediate/forms/deductions/business/form8995/index.ts";

const reference = z.string().trim().min(1);
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const statusReview = z.object({
  tax_year: z.literal(2026),
  record_reference: reference,
  unmarried_or_considered_unmarried: z.literal(true),
  qualifying_person_tin: tin,
  home_cost_record_reference: reference,
  entitled_to_joint_return_in_death_year: z.literal(true).optional(),
  child_home_all_year_verified: z.literal(true).optional(),
}).strict();

/** Source facts only: dependent counts, credit categories and ages are computed. */
export const inputSchema = identityInputSchema.omit({
  dependent_count: true,
  qualifying_child_tax_credit_count: true,
  other_dependent_count: true,
  dependent_details: true,
}).extend({
  tax_year: z.literal(2026),
  taxpayer_first_name: reference,
  taxpayer_last_name: reference,
  taxpayer_ssn: tin,
  taxpayer_dob: z.string().date(),
  taxpayer_blind: z.boolean(),
  taxpayer_can_be_claimed_as_dependent: z.boolean(),
  taxpayer_citizen_national_or_work_authorized: z.boolean(),
  digital_assets: z.boolean(),
  tax_residency: z.enum([
    "full_year_citizen_or_resident",
    "nonresident_or_dual_status",
  ]).optional(),
  short_tax_year_due_to_accounting_change: z.boolean().optional(),
  spouse_ssn: tin.optional(),
  spouse_dob: z.string().date().optional(),
  dependent_earned_income: z.never().optional(),
  // Earned income is supplied by source calculators, not asserted in general.
  dependents: z.array(dependent2026Schema).default([]),
  main_home_in_us_over_half_year:
    sharedGeneralSchema.shape.main_home_in_us_over_half_year,
  mfs_spouse_lived_with_taxpayer:
    sharedGeneralSchema.shape.mfs_spouse_lived_with_taxpayer,
  mfs_spouse_no_gross_income_not_dependent: z.literal(true).optional(),
  mfj_dependent_refund_only_review:
    sharedGeneralSchema.shape.mfj_dependent_refund_only_review,
  filing_status_2026_review: statusReview.optional(),
  do_not_claim_eic: z.boolean().optional(),
  wants_federal_public_benefit: z.boolean().optional(),
  eligible_for_federal_public_benefit: z.boolean().optional(),
  apply_overpayment_to_2027_estimated_tax_amount: z.number().int().positive()
    .optional(),
}).strict();

class General2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "general";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    w2_2026,
    cash_charity_2026,
    schedule_a_2026,
    vehicle_loan_interest_2026,
    form4137_2026,
    form8919_2026,
    agi_2026,
    f1040_2026_node,
    standard_deduction,
    eitc,
    f8812,
    schedule1a,
    form8959_2026,
    ct2_2026,
    form8880,
    form8960,
    form8995,
  ]);
  compute(ctx: NodeContext, rawInput: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("2026 general input needs f1040:2026 context");
    }
    const input = inputSchema.parse(rawInput);
    const joint = input.filing_status === FilingStatus.MFJ;
    const mfs = input.filing_status === FilingStatus.MFS;
    validDate2026(input.taxpayer_dob, "Taxpayer birth date");
    if (
      input.taxpayer_deceased || input.taxpayer_death_date ||
      input.spouse_deceased || input.spouse_death_date
    ) {
      throw new Error(
        "Deceased filer needs reviewed 2026 age and filing-status handling",
      );
    }
    if (
      !joint && input.spouse_citizen_national_or_work_authorized !== undefined
    ) {
      throw new Error(
        "Spouse work-authorization answer requires a joint return",
      );
    }

    if (
      (joint || mfs) &&
      (!input.spouse_ssn || !input.spouse_first_name?.trim() ||
        !input.spouse_last_name?.trim())
    ) throw new Error("Married return needs identified spouse");
    if (
      input.spouse_ssn?.replaceAll("-", "") ===
        input.taxpayer_ssn.replaceAll("-", "")
    ) throw new Error("Taxpayer and spouse need distinct TINs");
    if (
      joint &&
      (!input.spouse_dob || input.spouse_blind === undefined ||
        input.spouse_can_be_claimed_as_dependent === undefined ||
        input.spouse_citizen_national_or_work_authorized === undefined)
    ) {
      throw new Error(
        "Joint return needs spouse date of birth and dependency, blindness and work-authorization answers",
      );
    }
    if (mfs && input.mfs_spouse_itemizing === undefined) {
      throw new Error(
        "MFS standard-deduction eligibility needs spouse itemizing answer",
      );
    }
    if (
      !joint && !mfs &&
      (input.spouse_ssn || input.spouse_dob || input.spouse_age_65_or_older ||
        input.spouse_blind || input.spouse_can_be_claimed_as_dependent)
    ) throw new Error("Spouse facts require a current married filing status");
    const taxpayerAge65 = isAge65ByEndOfTaxYear(
      input.taxpayer_dob,
      2026,
      "taxpayer",
    )!;
    if (input.spouse_dob) validDate2026(input.spouse_dob, "Spouse birth date");
    const spouseAge65 = isAge65ByEndOfTaxYear(input.spouse_dob, 2026, "spouse");
    if (
      input.taxpayer_age_65_or_older !== undefined &&
      input.taxpayer_age_65_or_older !== taxpayerAge65
    ) {
      throw new Error(
        "Taxpayer age-65 answer conflicts with 2026 birth-date calculation",
      );
    }
    if (
      input.spouse_age_65_or_older !== undefined &&
      input.spouse_age_65_or_older !== spouseAge65
    ) {
      throw new Error(
        "Spouse age-65 answer conflicts with 2026 birth-date calculation",
      );
    }
    const jointDependent = joint &&
      (input.taxpayer_can_be_claimed_as_dependent ||
        input.spouse_can_be_claimed_as_dependent === true);
    if (
      jointDependent !== (input.mfj_dependent_refund_only_review !== undefined)
    ) {
      throw new Error(
        "Joint dependent return needs a matching refund-only review",
      );
    }
    if (!joint && input.spouse_can_be_claimed_as_dependent === true) {
      throw new Error("Spouse dependent checkbox requires a joint return");
    }
    if (
      (input.taxpayer_can_be_claimed_as_dependent ||
        input.spouse_can_be_claimed_as_dependent) &&
      input.dependents.some((dep) =>
        dep.claim_as_dependent && !dep.dependent_on_another_return
      )
    ) {
      throw new Error(
        "A filer claimable as a dependent cannot claim dependents",
      );
    }
    validateDependents2026(input.dependents, [
      input.taxpayer_ssn,
      ...(input.spouse_ssn ? [input.spouse_ssn] : []),
    ]);
    const children = input.dependents.map((dep) => {
      const review = reviewedResidence2026(dep);
      return review
        ? { ...dep, lived_in_us_over_half_year: review.overHalfInUs }
        : dep;
    });
    const rules = dependentRules2026(
      input.taxpayer_dob,
      joint ? input.spouse_dob : undefined,
    );
    const effective = {
      ...input,
      dependents: children,
      taxpayer_age_65_or_older: taxpayerAge65,
      spouse_age_65_or_older: spouseAge65,
    };
    const filer = filerCreditEligibility(effective);
    const claimedChildren = children.filter((child) =>
      child.claim_as_dependent
    );
    for (const child of claimedChildren) {
      if (
        child.dependent_on_another_return !== true &&
        !educationDependentSourceEligible(child, rules)
      ) {
        throw new Error(
          "Claimed dependent needs ordinary qualifying-child/relative facts or a reviewed 2026 exception",
        );
      }
    }
    const counts = dependentCounts(claimedChildren, filer, rules);
    const filed = dependentFiling2026Schema.array().parse(
      filedDependentsFromGeneral(
        { ...effective, dependents: claimedChildren },
        rules,
      ),
    );
    const eic = eicChildSourceProjection(effective, rules);
    const eicChildren = dependent2026Schema.array().parse(eic.children);
    if (
      input.filing_status === FilingStatus.HOH ||
      input.filing_status === FilingStatus.QSS
    ) {
      const review = input.filing_status_2026_review;
      const person = claimedChildren.find((dep) =>
        (dep.ssn ?? dep.itin ?? dep.atin)?.replaceAll("-", "") ===
          review?.qualifying_person_tin.replaceAll("-", "") &&
        dep.dependent_on_another_return !== true
      );
      if (
        !review || !person ||
        input.hoh_paid_more_than_half_home_costs !== true ||
        person.relationship === DependentRelationship.Other
      ) {
        throw new Error(
          "HOH/QSS needs reviewed home costs and a listed qualifying family member",
        );
      }
      if (
        input.filing_status === FilingStatus.HOH &&
        person.relationship !== DependentRelationship.Parent &&
        !rules.livedWithFilerOverHalfYear(person)
      ) {
        throw new Error(
          "HOH qualifying person must share the home for more than half the year unless a parent",
        );
      }
      if (
        input.filing_status === FilingStatus.QSS &&
        (![2024, 2025].includes(input.qss_spouse_death_year ?? 0) ||
          review.entitled_to_joint_return_in_death_year !== true ||
          review.child_home_all_year_verified !== true ||
          ![
            DependentRelationship.Son,
            DependentRelationship.Daughter,
            DependentRelationship.StepChild,
          ].includes(person.relationship))
      ) {
        throw new Error(
          "QSS needs a qualifying child, 2024/2025 spouse death and all-year-home/joint-return eligibility evidence",
        );
      }
    } else if (input.filing_status_2026_review) {
      throw new Error("HOH/QSS review requires that filing status");
    }
    const spouseAdditionEligible = joint ||
      (mfs && input.mfs_spouse_no_gross_income_not_dependent === true);
    const header = identityInputSchema.parse({
      ...effective,
      ...counts,
      dependent_details: filed,
      spouse_age_65_or_older: spouseAdditionEligible ? spouseAge65 : undefined,
      spouse_blind: spouseAdditionEligible ? input.spouse_blind : undefined,
    });
    if (
      (input.tax_residency === undefined) !==
        (input.short_tax_year_due_to_accounting_change === undefined)
    ) {
      throw new Error(
        "Standard deduction needs both tax-residency and accounting-period answers",
      );
    }
    const deductionFacts = {
      filing_status: input.filing_status,
      taxpayer_age_65_or_older: taxpayerAge65,
      taxpayer_blind: input.taxpayer_blind,
      spouse_age_65_or_older: spouseAdditionEligible ? spouseAge65 : undefined,
      spouse_blind: spouseAdditionEligible ? input.spouse_blind : undefined,
      taxpayer_can_be_claimed_as_dependent:
        input.taxpayer_can_be_claimed_as_dependent ||
        input.spouse_can_be_claimed_as_dependent === true,
      mfs_spouse_itemizing: input.mfs_spouse_itemizing,
      ...(input.tax_residency === undefined ? {} : {
        standard_deduction_eligible:
          input.tax_residency === "full_year_citizen_or_resident" &&
          input.short_tax_year_due_to_accounting_change === false,
      }),
    };
    const owner = {
      filing_status: input.filing_status,
      taxpayer_ssn: input.taxpayer_ssn,
      ...(input.spouse_ssn ? { spouse_ssn: input.spouse_ssn } : {}),
    };
    return {
      outputs: [
        {
          nodeType: "f1040",
          fields: {
            ...header,
            line27c_declines_eic: input.do_not_claim_eic,
            wants_federal_public_benefit: input.wants_federal_public_benefit,
            eligible_for_federal_public_benefit:
              input.eligible_for_federal_public_benefit,
            ...(input.apply_overpayment_to_2027_estimated_tax_amount ===
                undefined
              ? {}
              : {
                line36_apply_to_2027:
                  input.apply_overpayment_to_2027_estimated_tax_amount,
              }),
          },
        },
        { nodeType: "w2", fields: owner },
        { nodeType: "cash_charity", fields: owner },
        { nodeType: "schedule_a", fields: owner },
        { nodeType: "vehicle_loan_interest", fields: owner },
        { nodeType: "form4137", fields: owner },
        { nodeType: "form8919", fields: owner },
        {
          nodeType: "agi_aggregator",
          fields: {
            filing_status: input.filing_status,
            ...(input.mfs_spouse_lived_with_taxpayer === undefined ? {} : {
              mfs_lived_with_spouse: input.mfs_spouse_lived_with_taxpayer,
            }),
          },
        },
        { nodeType: "standard_deduction", fields: deductionFacts },
        {
          nodeType: "eitc",
          fields: {
            ...owner,
            taxpayer_dob: input.taxpayer_dob,
            spouse_dob: input.spouse_dob,
            main_home_in_us_over_half_year:
              input.main_home_in_us_over_half_year,
            taxpayer_can_be_claimed_as_dependent:
              input.taxpayer_can_be_claimed_as_dependent,
            spouse_can_be_claimed_as_dependent:
              input.spouse_can_be_claimed_as_dependent,
            filer_has_valid_ssns: filer.eitc,
            do_not_claim_eic: input.do_not_claim_eic,
            qualifying_children: eic.count,
            dependent_source_rows_2026: children,
            qualifying_child_details: eicChildren.slice(0, 3).map((dep) => ({
              ...dep,
              eic_printed_months:
                reviewedResidence2026(dep)?.eicPrintedMonths ??
                  (dep.dob.startsWith("2026-") || dep.death_date
                    ? 12
                    : dep.months_lived_with_you_in_us),
            })),
          },
        },
        {
          nodeType: "f8812",
          fields: {
            auto_qualifying_children: counts.qualifying_child_tax_credit_count,
            auto_other_dependents: counts.other_dependent_count,
            auto_filing_status: input.filing_status,
          },
        },
        {
          nodeType: "schedule1a",
          fields: {
            ...owner,
            taxpayer_ssn_review_complete:
              input.taxpayer_ssn_valid_for_employment !== undefined &&
              input.taxpayer_ssn_issued_before_due_date !== undefined &&
              input.taxpayer_tin_issued_by_due_date !== undefined,
            spouse_ssn_review_complete: joint &&
              input.spouse_ssn_valid_for_employment !== undefined &&
              input.spouse_ssn_issued_before_due_date !== undefined &&
              input.spouse_tin_issued_by_due_date !== undefined,
            taxpayer_has_valid_ssn: filer.taxpayerValidSsn,
            spouse_has_valid_ssn: filer.spouseValidSsn,
            taxpayer_age_65_or_older: taxpayerAge65,
            spouse_age_65_or_older: joint ? spouseAge65 : undefined,
          },
        },
        { nodeType: "form8959", fields: owner },
        { nodeType: "ct2", fields: owner },
        {
          nodeType: "form8880",
          fields: {
            ...owner,
            taxpayer_dob: input.taxpayer_dob,
            spouse_dob: input.spouse_dob,
          },
        },
        {
          nodeType: "form8960",
          fields: { filing_status: input.filing_status },
        },
        { nodeType: "form8995", fields: { ...owner, ...deductionFacts } },
      ],
    };
  }
}
export const general_2026 = new General2026Node();
