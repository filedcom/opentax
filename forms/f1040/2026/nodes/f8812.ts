import {
  calculateEnergyCarryforward2026,
  energySource2026Schema,
} from "../inputs/energy-source.ts";
import { schedule3_final_2026 } from "./schedule3-final.ts";
import { businessCreditEarnings2026 } from "../inputs/business-earned.ts";
import { businessReturnSource2026Schema } from "../inputs/business-qbi.ts";
import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { f1040_2026_node } from "./f1040.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { childCredit2026 } from "../../nodes/config/2026-child-credit.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import {
  calculateCreditLimitWorksheetBLines,
  calculateEarnedIncomeWorksheet,
  calculateSchedule8812LinesWithConfig,
  type EarnedIncomeWorksheet,
} from "../../nodes/inputs/credits/child/f8812/index.ts";

/** Scope answers are source reviews, never caller-supplied credit totals. */
export const childCreditClaim2026Schema = z.object({
  tax_year: z.literal(2026),
  review_reference: z.string().trim().min(1),
  prior_disallowance: z.enum(["none", "math_or_clerical_only"]),
  do_not_claim_actc: z.boolean(),
  no_nonrefundable_credits_other_than_dependent_care_and_education: z.literal(
    true,
  ).optional(),
  schedule_r_inventory_reference: z.string().trim().min(1).optional(),
  no_nonrefundable_credits_other_than_reviewed_sources: z.literal(
    true,
  ).optional(),
  energy_inventory_reference: z.string().trim().min(1).optional(),
  no_foreign_or_territory_exclusions: z.literal(true),
  not_bona_fide_puerto_rico_resident: z.literal(true),
  no_self_employment_or_statutory_employee_income: z.literal(true).optional(),
  business_inventory_reference: z.string().trim().min(1).optional(),
  no_medicaid_waiver_payments: z.literal(true),
}).strict();
const amount = z.number().finite().nonnegative();
export const inputSchema = childCreditClaim2026Schema.partial().extend({
  taxpayer_ssn: z.string().optional(),
  spouse_ssn: z.string().optional(),
  energy_sources_2026: energySource2026Schema.optional(),
  business_sources_2026: businessReturnSource2026Schema.optional(),
  auto_qualifying_children: z.number().int().nonnegative(),
  auto_other_dependents: z.number().int().nonnegative(),
  auto_filing_status: z.nativeEnum(FilingStatus),
  auto_agi: z.number().finite(),
  auto_income_tax_liability: amount,
  // Older wage emitters also deposit these facts; the worksheet uses the
  // normalized 1040 wage lines instead, including tips and Form 8919 wages.
  finalized_eic: amount.optional(),
  finalized_schedule_r_credit: amount.default(0),
  schedule_r_inventory_reference_from_source: z.string().trim().min(1)
    .optional(),
  finalized_dependent_care_credit: amount.default(0),
  finalized_education_credit: amount.default(0),
  finalized_excess_social_security: amount.optional(),
  payroll_sources_2026: z.array(
    z.object({
      source_reference: z.string().min(1),
      social_security_withheld: amount.optional(),
      medicare_withheld: amount.optional(),
      rrta: z.boolean(),
    }).strict(),
  ).default([]),
  excess_social_security_from_w2: amount.default(0),
  medicare_payroll_2026: z.object({
    wage_tax: amount,
    additional_wage_withheld: amount,
    has_rrta_or_self_employment: z.boolean(),
    has_rrta: z.boolean().optional(),
    self_employment_tax: amount.optional(),
    self_employment_earnings: amount.optional(),
  }).strict().optional(),
  schedule2_line16c: amount.optional(),
  schedule2_line17c: amount.optional(),
  auto_earned_income: z.union([amount, z.array(amount)]).optional(),
  auto_se_earned_income: amount.optional(),
  wage_income_from_agi: amount,
  unsupported_earned_income_activity: z.boolean(),
  nontaxable_combat_pay_from_w2: amount.optional(),
  statutory_employee_from_w2: z.boolean().optional(),
  schedule2_part1_tax: amount.default(0),
}).strict();
export type ChildCreditInput2026 = z.input<typeof inputSchema>;

export function calculateChildCredit2026(raw: ChildCreditInput2026) {
  const input = inputSchema.parse(raw);
  const children = input.auto_qualifying_children;
  const others = input.auto_other_dependents;
  const energySource = input.energy_sources_2026;
  const tax = input.auto_income_tax_liability + input.schedule2_part1_tax;
  const earlierCredits = input.finalized_schedule_r_credit +
    input.finalized_dependent_care_credit +
    input.finalized_education_credit;
  if (
    energySource &&
    (energySource.taxpayer_ssn !== input.taxpayer_ssn?.replaceAll("-", "") ||
      energySource.filing_status !== input.auto_filing_status ||
      energySource.spouse_ssn !== input.spouse_ssn?.replaceAll("-", ""))
  ) {
    throw new Error(
      "Energy carryforward differs from the current return owner",
    );
  }
  if (
    energySource &&
    (energySource.claim.schedule_r_inventory_reference !== undefined ||
      input.finalized_schedule_r_credit > 0) &&
    (!energySource.claim.schedule_r_inventory_reference ||
      energySource.claim.schedule_r_inventory_reference !==
        input.schedule_r_inventory_reference_from_source)
  ) {
    throw Error("Energy credit must include the actual Schedule R inventory");
  }
  if (children + others === 0) {
    return {
      source_input: input,
      energy_credit: energySource
        ? calculateEnergyCarryforward2026(energySource, tax, earlierCredits, 0)
        : undefined,
      lines: null,
      file_schedule8812: false,
      do_not_claim_actc: input.do_not_claim_actc ?? false,
    };
  }
  const review = childCreditClaim2026Schema.parse(Object.fromEntries(
    Object.keys(childCreditClaim2026Schema.shape).map((
      key,
    ) => [key, input[key as keyof typeof input]]),
  ));
  const scheduleRReviewed =
    review.schedule_r_inventory_reference !== undefined ||
    review.no_nonrefundable_credits_other_than_reviewed_sources !== undefined;
  if (scheduleRReviewed || input.finalized_schedule_r_credit > 0) {
    if (
      !review.schedule_r_inventory_reference ||
      review.schedule_r_inventory_reference !==
        input.schedule_r_inventory_reference_from_source ||
      review
          .no_nonrefundable_credits_other_than_dependent_care_and_education !==
        undefined ||
      review.no_nonrefundable_credits_other_than_reviewed_sources !== true
    ) {
      throw new Error(
        "Child credit needs the actual Schedule R inventory and an updated other-credit review",
      );
    }
  }
  if (energySource) {
    if (
      review.energy_inventory_reference !==
        energySource.claim.record_reference ||
      review
          .no_nonrefundable_credits_other_than_dependent_care_and_education !==
        undefined
    ) {
      throw new Error(
        "Child credit needs the matching energy inventory and no contradictory no-energy answer",
      );
    }
  } else if (
    (!scheduleRReviewed &&
      review
          .no_nonrefundable_credits_other_than_dependent_care_and_education !==
        true) || review.energy_inventory_reference !== undefined
  ) {
    throw new Error(
      "Child credit needs its complete nonrefundable-credit inventory",
    );
  }
  const business = input.business_sources_2026
    ? businessCreditEarnings2026(
      input.business_sources_2026,
      input.auto_filing_status,
      input,
    )
    : undefined;
  if (business) {
    if (
      review.business_inventory_reference !==
        business.source_input.record_reference ||
      review.no_self_employment_or_statutory_employee_income !== undefined
    ) {
      throw new Error(
        "Child credit needs the matching business inventory review and no contradictory no-business answer",
      );
    }
  } else if (
    review.no_self_employment_or_statutory_employee_income !== true ||
    review.business_inventory_reference !== undefined
  ) {
    throw new Error(
      "Child credit business review requires a complete retained business inventory",
    );
  }
  if (
    input.unsupported_earned_income_activity ||
    (!business &&
      (input.statutory_employee_from_w2 ||
        (input.auto_se_earned_income ?? 0) !== 0))
  ) {
    throw new Error(
      "2026 child credit needs the self-employment, statutory-employee or foreign-income worksheet owner",
    );
  }
  const earned: EarnedIncomeWorksheet = {
    form1040_line1z_wages: input.wage_income_from_agi,
    nontaxable_combat_pay: roundWholeDollars(
      input.nontaxable_combat_pay_from_w2 ?? 0,
    ),
    schedule_c_statutory_employee_income: business?.statutory_gross_income ?? 0,
    nonfarm_schedule_c_and_k1_net: business?.regular_net_profit ?? 0,
    farm_schedule_f_and_k1_net: 0,
    farm_optional_method_used: false,
    excluded_medicaid_waiver_payments: 0,
    schedule1_line15_se_deduction: business?.se_deduction ?? 0,
  };
  const resolvePartIIB = () => {
    const payroll = input.medicare_payroll_2026;
    if (
      input.finalized_eic === undefined ||
      input.finalized_excess_social_security === undefined || !payroll ||
      input.schedule2_line16c === undefined ||
      input.schedule2_line17c === undefined
    ) {
      throw new Error(
        "2026 Schedule 8812 Part II-B needs finalized EIC, Schedule 3, Medicare and Schedule 2 sources",
      );
    }
    if (
      payroll.has_rrta === true ||
      (payroll.has_rrta_or_self_employment &&
        (!business || payroll.has_rrta !== false)) ||
      input.payroll_sources_2026.some((s) => s.rrta)
    ) {
      throw new Error(
        "2026 Schedule 8812 Part II-B needs the RRTA/self-employment payroll worksheet owner",
      );
    }
    if (
      business &&
      (payroll.self_employment_earnings !== business.se_medicare_earnings ||
        payroll.self_employment_tax === undefined)
    ) {
      throw new Error(
        "Schedule 8812 needs Medicare sources matching the business SE earnings",
      );
    }
    if (
      input.excess_social_security_from_w2 !==
        input.finalized_excess_social_security
    ) {
      throw new Error(
        "2026 Schedule 8812 Part II-B Schedule 3 excess-withholding credit differs from W-2 source",
      );
    }
    if (
      input.payroll_sources_2026.some((s) =>
        s.social_security_withheld === undefined ||
        s.medicare_withheld === undefined
      )
    ) {
      throw new Error(
        "2026 Schedule 8812 Part II-B needs actual W-2 boxes 4 and 6, including explicit zero amounts",
      );
    }
    const ss = roundWholeDollars(
      input.payroll_sources_2026.reduce(
        (sum, s) => sum + s.social_security_withheld!,
        0,
      ),
    );
    const medicare = roundWholeDollars(
      input.payroll_sources_2026.reduce(
        (sum, s) => sum + s.medicare_withheld!,
        0,
      ),
    );
    const line21 = ss + medicare + payroll.wage_tax -
      payroll.additional_wage_withheld +
      roundWholeDollars((payroll.self_employment_tax ?? 0) * .5);
    if (line21 < 0) {
      throw new Error(
        "Schedule 8812 Medicare withholding exceeds reconciled payroll sources",
      );
    }
    // Adapter to the preserved 2025 semantic arithmetic. These are the 2026
    // line 22 operands, and the misleading legacy adoption field is excess SS.
    return {
      line21_w2_withheld_social_security_medicare: line21,
      schedule1_line15: business?.se_deduction ?? 0,
      schedule2_line5: input.schedule2_line16c,
      schedule2_line6: input.schedule2_line17c,
      schedule2_line13: 0,
      form1040_line27a_eic: input.finalized_eic,
      schedule3_line11_adoption_credit: input.finalized_excess_social_security,
    };
  };
  // Dependent care and education are finalized before this worksheet.
  // The retained energy source is resolved below; the review excludes other credits.
  // The old 5b field is deliberately zero: 2026 Worksheet A no longer uses it.
  const sharedInput = {
    f8812s: [{
      qualifying_children_count: children,
      other_dependents_count: others,
      filing_status: input.auto_filing_status,
      agi: input.auto_agi,
      income_tax_liability: input.auto_income_tax_liability +
        input.schedule2_part1_tax,
      do_not_claim_actc: review.do_not_claim_actc,
    }],
    earned_income_worksheet: earned,
    credit_limit_worksheet: {
      schedule3_line1: 0,
      schedule3_line2: input.finalized_dependent_care_credit,
      schedule3_line3: input.finalized_education_credit,
      schedule3_line4: 0,
      schedule3_line5b: 0,
      schedule3_line6d: input.finalized_schedule_r_credit,
      schedule3_line6f: 0,
      schedule3_line6l: 0,
      schedule3_line6m: 0,
      worksheet_b_applies: false,
    },
  };
  const options = { roundActcEarnedIncome: true, resolvePartIIB };
  const provisional = calculateSchedule8812LinesWithConfig(
    childCredit2026,
    sharedInput,
    options,
  );
  const worksheetBApplies = !!energySource && children > 0 && !!provisional;
  const earnedLine5 = roundWholeDollars(
    Math.max(0, calculateEarnedIncomeWorksheet(earned).line7 - 2500) * .15,
  );
  const payrollForB =
    worksheetBApplies && children >= 3 && earnedLine5 < provisional!.line12
      ? resolvePartIIB()
      : undefined;
  const worksheetB = worksheetBApplies
    ? calculateCreditLimitWorksheetBLines(
      provisional!.line12,
      children,
      earned,
      false,
      payrollForB,
      true,
    )
    : undefined;
  const energy = energySource
    ? calculateEnergyCarryforward2026(
      energySource,
      tax,
      earlierCredits,
      worksheetB?.line14 ?? provisional?.line14 ?? 0,
    )
    : undefined;
  const calculated = worksheetBApplies
    ? calculateSchedule8812LinesWithConfig(childCredit2026, {
      ...sharedInput,
      part_iib: payrollForB,
      credit_limit_worksheet: {
        ...sharedInput.credit_limit_worksheet,
        worksheet_b_applies: true,
        worksheet_b_line15: energy!.lines.line3,
      },
    }, options)
    : provisional;
  const lines = calculated && {
    ...calculated,
    // ODC-only filers still follow line 16a before stopping at zero children.
    line16a: Math.max(0, calculated.line12 - calculated.line14),
    line20: roundWholeDollars(calculated.line20),
    line27: roundWholeDollars(calculated.line27),
  };
  return {
    source_input: input,
    energy_credit: energy,
    credit_limit_worksheet_b: worksheetB &&
      { ...worksheetB, line15: energy!.lines.line3 },
    earned_income_worksheet: earned,
    business_earned_income_workpaper: business,
    lines,
    do_not_claim_actc: review.do_not_claim_actc,
    file_schedule8812: !!lines && (lines.line14 > 0 || lines.line27 > 0),
  };
}

class ChildCreditNode2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8812";
  readonly inputSchema = inputSchema;
  override get outputNodeTypes() {
    return [...this.outputNodes.nodeTypes, "form1062"];
  }
  readonly outputNodes = new OutputNodes([
    f1040_2026_node,
    schedule3_final_2026,
  ]);
  compute(ctx: NodeContext, raw: ChildCreditInput2026): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Schedule 8812 needs f1040:2026 context");
    }
    const calculation = calculateChildCredit2026(raw);
    return {
      outputs: [
        {
          nodeType: "form1062",
          fields: {
            child: calculation.source_input,
            line19_child_tax_credit: calculation.lines?.line14 ?? 0,
            line28_actc: calculation.lines?.line27 ?? 0,
            line20_nonrefundable_credits:
              calculation.source_input.finalized_schedule_r_credit +
              (calculation.source_input.finalized_dependent_care_credit ?? 0) +
              (calculation.source_input.finalized_education_credit ?? 0) +
              (calculation.energy_credit?.lines.line3 ?? 0),
          },
        },
        { nodeType: "f8812", fields: { calculation_2026: calculation } },
        {
          nodeType: "schedule3_final",
          fields: {
            line6d_elderly_disabled_credit:
              calculation.source_input.finalized_schedule_r_credit,
            line2_childcare_credit:
              calculation.source_input.finalized_dependent_care_credit,
            line3_education_credit:
              calculation.source_input.finalized_education_credit,
            line11_excess_ss:
              calculation.source_input.finalized_excess_social_security ?? 0,
            line5a_residential_clean_energy:
              calculation.energy_credit?.lines.line3 ?? 0,
          },
        },
        {
          nodeType: "f1040",
          fields: {
            schedule8812_finalized: true,
            line19_child_tax_credit: calculation.lines?.line14 ?? 0,
            line28_actc: calculation.lines?.line27 ?? 0,
            line28_declines_actc: calculation.do_not_claim_actc,
          },
        },
      ],
    };
  }
}
export const f8812_2026 = new ChildCreditNode2026();
