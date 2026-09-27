import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import { config2026 } from "../../nodes/config/2026.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { calculateDeductions2026 } from "../deductions.ts";
import { f1040_2026_node } from "./f1040.ts";
import { income_tax_calculation } from "../../nodes/intermediate/worksheets/income_tax_calculation/index.ts";

export const inputSchema = z.object({
  filing_status: z.nativeEnum(FilingStatus),
  line9_total_income: z.number().finite(),
  line10_adjustments: z.number().finite().nonnegative().default(0),
  taxpayer_age_65_or_older: z.boolean().optional(),
  taxpayer_blind: z.boolean().optional(),
  spouse_age_65_or_older: z.boolean().optional(),
  spouse_blind: z.boolean().optional(),
  taxpayer_can_be_claimed_as_dependent: z.boolean().optional(),
  dependent_earned_income: z.number().finite().nonnegative().optional(),
  mfs_spouse_itemizing: z.boolean().optional(),
  itemized_deductions: z.number().finite().nonnegative().optional(),
  itemized_taxes: z.number().finite().nonnegative().optional(),
  nonitemizer_cash_contributions: z.number().finite().nonnegative().optional(),
  schedule1a_line44: z.number().finite().nonnegative().optional(),
  schedule1a_line43: z.number().finite().nonnegative().optional(),
  qbi_deduction: z.number().finite().nonnegative().optional(),
}).strict();

type Input = z.infer<typeof inputSchema>;

function standardAmount(input: Input): number {
  const base = config2026.standardDeductionBase[input.filing_status];
  const additional =
    config2026.standardDeductionAdditional[input.filing_status];
  const spouseApplies = input.filing_status === FilingStatus.MFJ ||
    input.filing_status === FilingStatus.MFS ||
    input.filing_status === FilingStatus.QSS;
  const factors = Number(input.taxpayer_age_65_or_older === true) +
    Number(input.taxpayer_blind === true) +
    (spouseApplies
      ? Number(input.spouse_age_65_or_older === true) +
        Number(input.spouse_blind === true)
      : 0);
  if (input.taxpayer_can_be_claimed_as_dependent) {
    if (input.dependent_earned_income === undefined) {
      throw new Error("Dependent standard deduction needs earned income");
    }
    return Math.min(
      base,
      Math.max(
        config2026.kiddieStandardDeductionFloor,
        input.dependent_earned_income + 450,
      ),
    ) + factors * additional;
  }
  return base + factors * additional;
}

class StandardDeduction2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "standard_deduction";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040_2026_node,
    income_tax_calculation,
  ]);

  compute(ctx: NodeContext, rawInput: z.input<typeof inputSchema>) {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 deduction node requires f1040:2026 context");
    }
    const input = inputSchema.parse(rawInput);
    if (
      input.mfs_spouse_itemizing && input.filing_status !== FilingStatus.MFS
    ) {
      throw new Error("Spouse itemizing election requires MFS filing status");
    }
    const agi = input.line9_total_income - input.line10_adjustments;
    const standard = standardAmount(input);
    const itemized = input.itemized_deductions ?? 0;
    const nonitemizerCap = input.filing_status === FilingStatus.MFJ
      ? 2_000
      : 1_000;
    const standardWithCharity = standard + Math.min(
      input.nonitemizer_cash_contributions ?? 0,
      nonitemizerCap,
    );
    const takingStandard = input.mfs_spouse_itemizing !== true &&
      standardWithCharity >= itemized;
    const method = takingStandard ? "standard" as const : "itemized" as const;
    const schedule1aLine44 = input.schedule1a_line44 ?? 0;
    const schedule1aLine43 = input.schedule1a_line43 ?? 0;
    if (schedule1aLine43 > schedule1aLine44) {
      throw new Error("Schedule 1-A line 43 exceeds line 44");
    }
    const deductions = calculateDeductions2026({
      filingStatus: input.filing_status,
      adjustedGrossIncome: agi,
      method,
      standardDeduction: standard,
      itemizedDeductions: itemized,
      nonitemizerCashContributions: input.nonitemizer_cash_contributions ?? 0,
      schedule1aLine44,
      qbiDeduction: input.qbi_deduction ?? 0,
    });
    // Draft 2026 Form 6251, lines 1a–1b and 2a. Line 1a removes only
    // Schedule 1-A line 43 from Form 1040 line 14, not all of line 44.
    const form6251Line1b = agi -
      (deductions.line14TotalDeductions - schedule1aLine43);
    const form6251Line2a = takingStandard
      ? deductions.line12eStandardOrItemized
      : input.itemized_taxes ?? 0;
    return {
      outputs: [
        this.outputNodes.output(f1040_2026_node, {
          line9_total_income: input.line9_total_income,
          line10_adjustments: input.line10_adjustments,
          filing_status: input.filing_status,
          deduction_method: method,
          standard_deduction: standard,
          itemized_deductions: itemized,
          nonitemizer_cash_contributions:
            input.nonitemizer_cash_contributions ?? 0,
          schedule1a_line44: schedule1aLine44,
          qbi_deduction: input.qbi_deduction ?? 0,
        }),
        this.outputNodes.output(income_tax_calculation, {
          taxable_income: deductions.line15TaxableIncome,
          form6251_line1b: form6251Line1b,
          form6251_line2a: form6251Line2a,
          filing_status: input.filing_status,
          taking_standard_deduction: takingStandard,
        }),
      ],
    };
  }
}

export const standard_deduction_2026 = new StandardDeduction2026Node();
