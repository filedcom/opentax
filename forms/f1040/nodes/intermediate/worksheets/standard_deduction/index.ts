import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { FilingStatus } from "../../../types.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { income_tax_calculation } from "../income_tax_calculation/index.ts";
import { form_1116 } from "../../forms/form_1116/index.ts";
import { form8960 } from "../../forms/form8960/index.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";

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
  dependent_earned_income: z.number().nonnegative().optional(),
  form8615_total_income: z.number().optional(),
  form8615_early_withdrawal_penalty: z.number().nonnegative().optional(),

  // MFS: if spouse is itemizing, taxpayer MUST itemize too (IRC §63(c)(6)(A))
  mfs_spouse_itemizing: z.boolean().optional(),

  // From schedule_a — total itemized deductions (Schedule A line 17)
  itemized_deductions: z.number().nonnegative().optional(),
  // Schedule A line 7, used for Form 6251 line 2a only if itemizing wins.
  itemized_taxes: z.number().nonnegative().optional(),

  // From form8995 / form8995a — qualified business income deduction (Form 1040 Line 13)
  qbi_deduction: z.number().nonnegative().optional(),

  // From Schedule 1-A: qualified tips and other additional deductions (Form 1040 Line 13b)
  additional_deductions: z.number().nonnegative().optional(),

  // Schedule 1-A line 37 is added back for Form 6251 line 1b only.
  enhanced_senior_deduction: z.number().nonnegative().optional(),

  // From nol_carryforward — NOL deduction (IRC §172) applied after standard/itemized deduction
  // Post-2017 NOLs limited to 80% of pre-NOL taxable income; pre-2018 NOLs limited to 100%.
  nol_deduction: z.number().nonnegative().optional(),
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

// Count the total number of additional-deduction factors for age/blindness.
// Each factor is $1,600 (MFJ/MFS/QSS) or $2,000 (Single/HOH) for TY2025 per OBBBA.
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
  cfg: import("../../../config/index.ts").F1040Config,
): number {
  const base = cfg.standardDeductionBase[input.filing_status];
  const additionalPerFactor =
    cfg.standardDeductionAdditional[input.filing_status];
  if (input.taxpayer_can_be_claimed_as_dependent === true) {
    if (input.dependent_earned_income === undefined) {
      throw new Error("Dependent standard deduction needs earned income");
    }
    const dependentBase = Math.min(
      base,
      Math.max(1_350, input.dependent_earned_income + 450),
    );
    return dependentBase + additionalFactorCount(input) * additionalPerFactor;
  }
  return base + additionalFactorCount(input) * additionalPerFactor;
}

// Determine the deduction to use and whether it is the standard deduction.
// Returns { deduction, takingStandard }.
function resolveDeduction(
  input: StandardDeductionInput,
  cfg: import("../../../config/index.ts").F1040Config,
): {
  deduction: number;
  takingStandard: boolean;
} {
  const standardAmount = computeStandardAmount(input, cfg);
  const itemized = input.itemized_deductions ?? 0;

  // IRC §63(c)(6)(A): MFS taxpayer whose spouse itemizes must also itemize.
  if (input.mfs_spouse_itemizing === true) {
    return { deduction: itemized, takingStandard: false };
  }

  if (itemized > standardAmount) {
    return { deduction: itemized, takingStandard: false };
  }

  return { deduction: standardAmount, takingStandard: true };
}

// ─── Node class ───────────────────────────────────────────────────────────────

class StandardDeductionNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "standard_deduction";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040,
    income_tax_calculation,
    form_1116,
  ]);

  compute(ctx: NodeContext, rawInput: StandardDeductionInput): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);

    const { deduction, takingStandard } = resolveDeduction(input, cfg);
    const qbi = input.qbi_deduction ?? 0;
    const additionalDeductions = input.additional_deductions ?? 0;
    const enhancedSeniorDeduction = input.enhanced_senior_deduction ?? 0;
    if (enhancedSeniorDeduction > additionalDeductions) {
      throw new Error(
        "Schedule 1-A senior deduction exceeds total additional deductions",
      );
    }
    const nol = input.nol_deduction ?? 0;
    const taxableIncome = Math.max(
      0,
      Math.max(0, input.agi - deduction) - qbi - additionalDeductions - nol,
    );
    // 2025 Form 6251 line 1a = Form 1040 line 14 minus Schedule 1-A line 37;
    // line 1b = AGI minus line 1a, without the Form 1040 line 15 zero floor.
    const form6251Line1b = input.agi - deduction - qbi -
      additionalDeductions + enhancedSeniorDeduction;
    // 2025 Form 6251 line 2a: Schedule A line 7 if itemizing, otherwise
    // Form 1040 line 12e (the standard deduction).
    const form6251Line2a = takingStandard
      ? deduction
      : input.itemized_taxes ?? 0;

    const outputs: NodeOutput[] = [];

    if (takingStandard) {
      outputs.push(
        this.outputNodes.output(f1040, {
          line12a_standard_deduction: deduction,
        }),
      );
    } else {
      outputs.push(
        this.outputNodes.output(f1040, {
          line12e_itemized_deductions: deduction,
        }),
      );
    }
    if (!takingStandard) {
      if ((input.investment_interest_for_niit ?? 0) > 0) {
        outputs.push(this.outputNodes.output(form8960, {
          line9a_investment_interest_expense: input.investment_interest_for_niit!,
        }));
      }
      if ((input.niit_allocable_state_local_tax ?? 0) > 0) {
        outputs.push(this.outputNodes.output(form8960, {
          line9b_state_local_tax: input.niit_allocable_state_local_tax!,
        }));
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
        ...(input.taxpayer_can_be_claimed_as_dependent === true &&
            input.dependent_earned_income !== undefined &&
            input.form8615_total_income !== undefined
          ? {
            form8615_computed_unearned_income: Math.max(
              0,
              input.form8615_total_income - input.dependent_earned_income -
                (input.form8615_early_withdrawal_penalty ?? 0),
            ),
          }
          : {}),
      }),
      this.outputNodes.output(form_1116, {
        general_deductions: deduction + qbi + additionalDeductions + nol,
        standard_or_itemized_deduction: deduction,
        other_deductions: qbi + additionalDeductions + nol,
      }),
    );

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const standard_deduction = new StandardDeductionNode();
