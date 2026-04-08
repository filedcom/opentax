import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { FilingStatus } from "../../../types.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { income_tax_calculation } from "../income_tax_calculation/index.ts";
import {
  STANDARD_DEDUCTION_BASE_2025,
  STANDARD_DEDUCTION_ADDITIONAL_2025,
} from "../../../config/2025.ts";

// ─── Constants — TY2025 Standard Deduction Amounts ───────────────────────────
// Source: Rev. Proc. 2024-40, §3.14; IRC §63(c) — see config/2025.ts

const BASE_DEDUCTION = STANDARD_DEDUCTION_BASE_2025;
const ADDITIONAL_PER_FACTOR = STANDARD_DEDUCTION_ADDITIONAL_2025;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // From general node — required
  filing_status: z.nativeEnum(FilingStatus),

  // AGI (Form 1040 Line 11) — required; provided by the future AGI aggregator node.
  agi: z.number().nonnegative(),

  // Age / blindness flags — from general node
  taxpayer_age_65_or_older: z.boolean().optional(),
  taxpayer_blind: z.boolean().optional(),
  // Spouse factors only apply for MFJ, MFS, QSS
  spouse_age_65_or_older: z.boolean().optional(),
  spouse_blind: z.boolean().optional(),

  // MFS: if spouse is itemizing, taxpayer MUST itemize too (IRC §63(c)(6)(A))
  mfs_spouse_itemizing: z.boolean().optional(),

  // From schedule_a — total itemized deductions (Schedule A line 17)
  itemized_deductions: z.number().nonnegative().optional(),

  // From form8995 / form8995a — qualified business income deduction (Form 1040 Line 13)
  qbi_deduction: z.number().nonnegative().optional(),
});

type StandardDeductionInput = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Statuses for which spouse factors apply
const SPOUSE_STATUSES = new Set<FilingStatus>([
  FilingStatus.MFJ,
  FilingStatus.MFS,
  FilingStatus.QSS,
]);

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
function computeStandardAmount(input: StandardDeductionInput): number {
  const base = BASE_DEDUCTION[input.filing_status];
  const additionalPerFactor = ADDITIONAL_PER_FACTOR[input.filing_status];
  return base + additionalFactorCount(input) * additionalPerFactor;
}

// Determine the deduction to use and whether it is the standard deduction.
// Returns { deduction, takingStandard }.
function resolveDeduction(input: StandardDeductionInput): {
  deduction: number;
  takingStandard: boolean;
} {
  const standardAmount = computeStandardAmount(input);
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
  readonly outputNodes = new OutputNodes([f1040, income_tax_calculation]);

  compute(_ctx: NodeContext, rawInput: StandardDeductionInput): NodeResult {
    const input = inputSchema.parse(rawInput);

    const { deduction, takingStandard } = resolveDeduction(input);
    const qbi = input.qbi_deduction ?? 0;
    const preQbiTaxable = Math.max(0, input.agi - deduction);
    const taxableIncome = Math.max(0, preQbiTaxable - qbi);

    const outputs: NodeOutput[] = [];

    if (takingStandard) {
      outputs.push(
        this.outputNodes.output(f1040, { line12a_standard_deduction: deduction }),
      );
    }

    outputs.push(
      this.outputNodes.output(f1040, { line15_taxable_income: taxableIncome }),
      this.outputNodes.output(income_tax_calculation, {
        taxable_income: taxableIncome,
        filing_status: input.filing_status,
      }),
    );

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const standard_deduction = new StandardDeductionNode();
