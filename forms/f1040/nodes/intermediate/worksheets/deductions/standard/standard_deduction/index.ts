import { inputSchema as form8615SourceSchema } from "../../../../../inputs/taxes/investments/f8615/schema.ts";
import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../../core/types/node-context.ts";
import { FilingStatus } from "../../../../../types.ts";
import { f1040 } from "../../../../../outputs/general/return-assembly/f1040/index.ts";
import { income_tax_calculation } from "../../../taxes/calculation/income_tax_calculation/index.ts";
import { schedule_j_calculation } from "../../../../forms/taxes/income-averaging/schedule_j/index.ts";
import { form_1116 } from "../../../../forms/credits/foreign/form_1116/index.ts";
import { form8960 } from "../../../../forms/taxes/investments/form8960/index.ts";
import { CONFIG_BY_YEAR } from "../../../../../config/index.ts";
import type { F1040Config } from "../../../../../config/index.ts";
import {
  nonitemizerCharitableDeduction,
  overallItemizedLimitReduction,
} from "./deduction-limits-2026.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // From general node — required
  filing_status: z.nativeEnum(FilingStatus),

  // AGI (Form 1040 Line 11) — required; provided by the future AGI aggregator node.
  agi: z.number(),

  // Age / blindness flags — from general node
  taxpayer_age_65_or_older: z.boolean().optional(),
  taxpayer_blind: z.boolean().optional(),
  // Spouse factors only apply for MFJ, MFS, QSS
  spouse_age_65_or_older: z.boolean().optional(),
  spouse_blind: z.boolean().optional(),
  taxpayer_can_be_claimed_as_dependent: z.boolean().optional(),
  // A reviewed figure from the general node (scholarship and MFJ dependent
  // worksheets); otherwise the worksheet uses return_earned_income.
  dependent_earned_income: z.number().nonnegative().optional(),
  // From agi_aggregator: Form 1040 line 1z plus Schedule 1 lines 3, 6 and 8r,
  // minus Schedule 1 line 15 (Standard Deduction Worksheet for Dependents).
  return_earned_income: z.number().optional(),
  form8615_total_income: z.number().optional(),
  form8615_reviewed_unearned_income: z.number().nonnegative().optional(),
  form8615_reviewed_source: form8615SourceSchema.optional(),
  form8615_early_withdrawal_penalty: z.number().nonnegative().optional(),

  // MFS: if spouse is itemizing, taxpayer MUST itemize too (IRC §63(c)(6)(A))
  mfs_spouse_itemizing: z.boolean().optional(),

  // From schedule_a — total itemized deductions (Schedule A line 17)
  itemized_deductions: z.number().nonnegative().optional(),
  force_itemized: z.boolean().optional(),
  // Election to take the standard deduction even when itemized deductions are
  // larger (IRC §63(e); Form 1040 instructions, line 12e).
  force_standard: z.boolean().optional(),
  // From schedule_a: cash gifts eligible for the non-itemizer deduction
  // (1040 line 12f, IRC §170(p)). `unclassified` marks 50%-organization cash
  // gifts whose donor-advised-fund or supporting-organization share is unknown.
  nonitemizer_charitable_cash: z.number().nonnegative().optional(),
  nonitemizer_charitable_cash_unclassified: z.boolean().optional(),
  // Schedule A line 7, used for Form 6251 line 2a only if itemizing wins.
  itemized_taxes: z.number().nonnegative().optional(),
  itemized_investment_interest: z.number().nonnegative().optional(),
  niit_allocable_state_local_tax: z.number().nonnegative().optional(),

  // From Form 4684 line 15. A non-itemizer adds it to the standard deduction
  // (2025 Instructions for Form 1040, Line 12e, Exception 5); an itemizer
  // has it in itemized_deductions as Schedule A line 16.
  net_qualified_disaster_loss: z.number().int().positive().optional(),

  // From form8995 / form8995a — qualified business income deduction (Form 1040 Line 13)
  qbi_deduction: z.number().nonnegative().optional(),

  // From Schedule 1-A: qualified tips and other additional deductions (Form 1040 Line 13b)
  additional_deductions: z.number().nonnegative().optional(),

  // Schedule 1-A line 37 is added back for Form 6251 line 1b only.
  enhanced_senior_deduction: z.number().nonnegative().optional(),
  qualified_vehicle_loan_interest_deduction: z.number().nonnegative()
    .optional(),

  // From nol_carryforward — NOL deduction (IRC §172) applied after standard/itemized deduction
  // Post-2017 NOLs limited to 80% of pre-NOL taxable income; pre-2018 NOLs limited to 100%.
  nol_deduction: z.number().nonnegative().optional(),
  // The standard deduction the AGI aggregator assumed for the NOL 80% limit.
  nol_limit_standard_deduction: z.number().nonnegative().optional(),
  // A fully used NOL carryforward: the taxable income (before the NOL and
  // QBI deductions) it needs, and AGI before the NOL.
  nol_limit_required_taxable_income: z.number().nonnegative().optional(),
  nol_limit_agi_before_nol: z.number().optional(),

  // Finalized by this node for TY2026; never supplied by another node.
  standard_amount: z.number().nonnegative().optional(),
  overall_itemized_limit_reduction: z.number().nonnegative().optional(),
});

type StandardDeductionInput = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Statuses for which spouse factors apply
const SPOUSE_STATUSES = new Set<FilingStatus>([
  FilingStatus.MFJ,
  FilingStatus.MFS,
  FilingStatus.QSS,
]);

// ─── Standard Deduction helpers ───────────────────────────────────────────────

// Earned income on the Standard Deduction Worksheet for Dependents.
function dependentEarnedIncome(
  input: StandardDeductionInput,
): number | undefined {
  return input.dependent_earned_income ?? input.return_earned_income;
}

// Count the total number of additional-deduction factors for age/blindness.
function additionalFactorCount(input: StandardDeductionInput): number {
  let count = 0;
  if (input.taxpayer_age_65_or_older) count += 1;
  if (input.taxpayer_blind) count += 1;
  if (SPOUSE_STATUSES.has(input.filing_status)) {
    if (input.spouse_age_65_or_older) count += 1;
    if (input.spouse_blind) count += 1;
  }
  return count;
}

// Compute the standard deduction amount (base + additional for age/blindness).
function computeStandardAmount(
  input: StandardDeductionInput,
  cfg: F1040Config,
): number {
  const base = cfg.standardDeductionBase[input.filing_status];
  const additionalPerFactor =
    cfg.standardDeductionAdditional[input.filing_status];
  if (input.taxpayer_can_be_claimed_as_dependent === true) {
    const earned = dependentEarnedIncome(input);
    if (earned === undefined) {
      throw new Error("Dependent standard deduction needs earned income");
    }
    const dependentBase = Math.min(
      base,
      Math.max(
        cfg.dependentStandardDeductionFloor,
        earned + cfg.dependentStandardDeductionEarnedIncomeAddOn,
      ),
    );
    return dependentBase + additionalFactorCount(input) * additionalPerFactor;
  }
  return base + additionalFactorCount(input) * additionalPerFactor;
}

/** Match the deduction decision's comparison for Schedule A line 18. A
 * TY2026 run finalizes its standard amount; a TY2025 one does not. */
export function filedStandardAmount(input: StandardDeductionInput): number {
  const parsed = inputSchema.parse(input);
  return parsed.standard_amount ??
    computeStandardAmount(parsed, CONFIG_BY_YEAR[2025]);
}

type Resolved = {
  deduction: number;
  takingStandard: boolean;
  // Before any net qualified disaster loss increase.
  standardAmount: number;
  // Form 1040 line 12f; zero when itemizing.
  nonitemizerCharitable: number;
  // IRC §68 reduction already subtracted from an itemized `deduction`.
  overallLimitReduction: number;
};

// Choose standard (plus line 12f) or itemized (after the §68 limit), which
// ever is larger unless itemizing is elected or required.
function resolveDeduction(
  input: StandardDeductionInput,
  cfg: F1040Config,
): Resolved {
  const standardAmount = computeStandardAmount(input, cfg);
  const increasedStandard = standardAmount +
    (input.net_qualified_disaster_loss ?? 0);
  const grossItemized = input.itemized_deductions ?? 0;
  const overallLimitReduction = overallItemizedLimitReduction(
    cfg,
    input.filing_status,
    grossItemized,
    input.agi,
    input.qbi_deduction ?? 0,
    input.additional_deductions ?? 0,
  );
  const itemized = grossItemized - overallLimitReduction;
  const nonitemizerCharitable = nonitemizerCharitableDeduction(
    cfg,
    input.filing_status,
    input.nonitemizer_charitable_cash ?? 0,
  );
  const itemizing = {
    deduction: itemized,
    takingStandard: false,
    standardAmount,
    nonitemizerCharitable: 0,
    overallLimitReduction,
  };

  // IRC §63(c)(6)(A): MFS taxpayer whose spouse itemizes must also itemize.
  if (input.mfs_spouse_itemizing === true) {
    if (input.force_standard === true) {
      throw new Error(
        "A married-filing-separately return whose spouse itemizes cannot elect the standard deduction",
      );
    }
    return itemizing;
  }
  if (input.force_itemized === true) return itemizing;
  if (input.force_standard === true) {
    return {
      deduction: increasedStandard,
      takingStandard: true,
      standardAmount,
      nonitemizerCharitable,
      overallLimitReduction: 0,
    };
  }
  if (itemized > increasedStandard + nonitemizerCharitable) return itemizing;

  return {
    deduction: increasedStandard,
    takingStandard: true,
    standardAmount,
    nonitemizerCharitable,
    overallLimitReduction: 0,
  };
}

// ─── Node class ───────────────────────────────────────────────────────────────

class StandardDeductionNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "standard_deduction";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040,
    income_tax_calculation,
    schedule_j_calculation,
    form_1116,
    form8960,
  ]);

  compute(ctx: NodeContext, rawInput: StandardDeductionInput): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);
    // Form 1040 line 15 subtracts the amounts entered on lines 11b and 14.
    // Round the aggregated line operands before subtracting; rounding only
    // their difference can change the tax computation by a dollar.
    for (
      const key of [
        "agi",
        "itemized_deductions",
        "itemized_taxes",
        "qbi_deduction",
        "additional_deductions",
        "nonitemizer_charitable_cash",
        "net_qualified_disaster_loss",
        "enhanced_senior_deduction",
        "qualified_vehicle_loan_interest_deduction",
        "nol_deduction",
      ] as const
    ) {
      if (input[key] !== undefined) input[key] = Math.round(input[key]);
    }

    const resolved = resolveDeduction(input, cfg);
    const { deduction, takingStandard, nonitemizerCharitable } = resolved;
    // IRC §172(a)(2): the NOL limit uses taxable income without the NOL and
    // QBI deductions. The AGI aggregator assumed the filing-status standard
    // deduction; any other deduction needs the keyed taxable income.
    if (
      input.nol_limit_standard_deduction !== undefined &&
      (!takingStandard || deduction !== input.nol_limit_standard_deduction ||
        nonitemizerCharitable > 0 || (input.additional_deductions ?? 0) > 0)
    ) {
      throw new Error(
        "NOL 80% limit assumed the base standard deduction; enter nol_carryforward current_year_taxable_income for this return",
      );
    }
    if (
      input.nol_limit_required_taxable_income !== undefined &&
      (input.nol_limit_agi_before_nol ?? 0) - deduction - nonitemizerCharitable -
            (input.additional_deductions ?? 0) <
        input.nol_limit_required_taxable_income
    ) {
      throw new Error(
        "NOL carryforward is limited by this return's deductions; enter nol_carryforward current_year_taxable_income for this return",
      );
    }
    if (
      takingStandard && cfg.nonitemizerCharitableLimit > 0 &&
      input.nonitemizer_charitable_cash_unclassified === true
    ) {
      throw new Error(
        "Form 1040 line 12f needs the cash gifts to donor-advised funds and supporting organizations separated (IRC §170(p))",
      );
    }
    // Form 6251 line 2a must use Schedule A line 7 whenever the taxpayer
    // itemizes. Schedule A deposits this amount even when it is zero; an
    // absent deposit cannot be silently treated as zero.
    if (
      !takingStandard &&
      (input.itemized_taxes === undefined ||
        input.itemized_taxes > (input.itemized_deductions ?? 0))
    ) {
      throw new Error(
        "Form 6251 line 2a needs reconciled Schedule A line 7 taxes when itemizing",
      );
    }
    const qbi = input.qbi_deduction ?? 0;
    const additionalDeductions = input.additional_deductions ?? 0;
    const enhancedSeniorDeduction = input.enhanced_senior_deduction ?? 0;
    const vehicleInterestDeduction =
      input.qualified_vehicle_loan_interest_deduction ?? 0;
    if (
      enhancedSeniorDeduction + vehicleInterestDeduction > additionalDeductions
    ) {
      throw new Error(
        "Schedule 1-A senior and vehicle-interest deductions exceed total additional deductions",
      );
    }
    const nol = input.nol_deduction ?? 0;
    // The 2025 Form 1116 line 3b instructions exclude Schedule 1-A line 37.
    const form1116OtherDeductions = nonitemizerCharitable + qbi +
      additionalDeductions - enhancedSeniorDeduction -
      vehicleInterestDeduction + nol;
    const taxableIncome = Math.max(
      0,
      Math.max(0, input.agi - deduction - nonitemizerCharitable) - qbi -
        additionalDeductions - nol,
    );
    // 2025 Form 6251 line 1a = Form 1040 line 14 minus Schedule 1-A line 37;
    // line 1b = AGI minus line 1a, without the Form 1040 line 15 zero floor.
    const form6251Line1b = input.agi - deduction - nonitemizerCharitable -
      qbi - additionalDeductions + enhancedSeniorDeduction;
    // 2025 Form 6251 line 2a: Schedule A line 7 if itemizing, otherwise
    // Form 1040 line 12e (the standard deduction). The AMT adds back only the
    // standard deduction before a net qualified disaster loss increase
    // (2025 Instructions for Form 4684, Taxpayers who also file the 2025
    // Form 6251).
    const form6251Line2a = takingStandard
      ? resolved.standardAmount
      : input.itemized_taxes ?? 0;

    const outputs: NodeOutput[] = [];

    if (takingStandard) {
      outputs.push(
        this.outputNodes.output(f1040, {
          line12a_standard_deduction: deduction,
          ...(nonitemizerCharitable > 0
            ? { line12f_nonitemizer_charitable: nonitemizerCharitable }
            : {}),
        }),
      );
    } else {
      outputs.push(
        this.outputNodes.output(f1040, {
          line12e_itemized_deductions: deduction,
        }),
      );
      if (
        (input.itemized_investment_interest ?? 0) > 0 ||
        (input.niit_allocable_state_local_tax ?? 0) > 0
      ) {
        outputs.push(
          this.outputNodes.output(form8960, {
            line9a_investment_interest_expense:
              input.itemized_investment_interest ?? 0,
            line9b_state_local_tax: input.niit_allocable_state_local_tax ?? 0,
          }),
        );
      }
    }

    outputs.push(
      this.outputNodes.output(f1040, { line15_taxable_income: taxableIncome }),
      this.outputNodes.output(income_tax_calculation, {
        taxable_income: taxableIncome,
        form6251_line1b: form6251Line1b,
        form6251_line2a: form6251Line2a,
        filing_status: input.filing_status,
        taking_standard_deduction: takingStandard,
        ...(input.form8615_reviewed_source
          ? { form8615_reviewed_source: input.form8615_reviewed_source }
          : {}),
        form8615_child_agi: input.agi,
        form8615_child_deduction: deduction,
        ...(input.taxpayer_can_be_claimed_as_dependent === true &&
            dependentEarnedIncome(input) !== undefined &&
            input.form8615_total_income !== undefined
          ? {
            form8615_computed_unearned_income:
              input.form8615_reviewed_unearned_income ?? Math.max(
                0,
                input.form8615_total_income - dependentEarnedIncome(input)! -
                  (input.form8615_early_withdrawal_penalty ?? 0),
              ),
          }
          : {}),
      }),
      this.outputNodes.output(schedule_j_calculation, {
        current_year_taxable_income: taxableIncome,
        current_year_filing_status: input.filing_status,
        taking_standard_deduction: takingStandard,
        qbi_deduction: qbi,
        additional_deductions: additionalDeductions,
        nol_deduction: nol,
      }),
      this.outputNodes.output(form_1116, {
        // Form 1116 starts from the filed whole-dollar lines 11b and 14.
        worldwide_taxable_income: Math.round(input.agi) -
          Math.round(
            deduction + nonitemizerCharitable + qbi + additionalDeductions,
          ),
        general_deductions: deduction + form1116OtherDeductions,
        standard_or_itemized_deduction: deduction,
        other_deductions: form1116OtherDeductions,
        enhanced_senior_deduction: enhancedSeniorDeduction,
        qualified_vehicle_loan_interest_deduction: vehicleInterestDeduction,
      }),
    );

    // TY2026 Schedule A line 18 is the reduced amount; keep the standard
    // amount and the reduction for the filed itemize election check.
    const finalizations = cfg.itemizedDeductionReductionRate > 0
      ? [{
        nodeType: this.nodeType,
        fields: {
          standard_amount: resolved.standardAmount,
          overall_itemized_limit_reduction: resolved.overallLimitReduction,
        },
      }]
      : [];
    return { outputs, finalizations };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const standard_deduction = new StandardDeductionNode();
