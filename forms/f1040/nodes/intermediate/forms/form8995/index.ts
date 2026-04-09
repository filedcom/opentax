import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { standard_deduction } from "../../worksheets/standard_deduction/index.ts";
import { FilingStatus } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";

// ── TY2025 Constants ─────────────────────────────────────────────────────────

const QBI_RATE = 0.20; // IRC §199A(a) — 20% of net QBI

// ── Schemas ──────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // QBI from sole proprietorships (Schedule C)
  qbi_from_schedule_c: z.number().nonnegative().optional(),
  // QBI from farming (Schedule F)
  qbi_from_schedule_f: z.number().nonnegative().optional(),
  // QBI from pass-through rentals/partnerships (Schedule E)
  qbi: z.number().optional(),
  // W-2 wages from pass-through (informational; not used in simplified form)
  w2_wages: z.number().nonnegative().optional(),
  // Unadjusted basis of qualified property (informational; not used in simplified form)
  unadjusted_basis: z.number().nonnegative().optional(),
  // Section 199A dividends from REITs (Form 1099-DIV box 5)
  line6_sec199a_dividends: z.number().nonnegative().optional(),
  // Taxable income before QBI deduction (AGI minus deductions).
  // When provided, caps QBI deduction at 20% of this amount (IRC §199A(a)).
  taxable_income: z.number().nonnegative().optional(),
  // Net capital gain (Form 1040 line 7 / Schedule D) — reduces income limitation base
  net_capital_gain: z.number().nonnegative().optional(),
  // Prior-year QBI net loss carryforward (must be zero or negative)
  qbi_loss_carryforward: z.number().nonpositive().optional(),
  // Prior-year REIT/PTP net loss carryforward (must be zero or negative)
  reit_loss_carryforward: z.number().nonpositive().optional(),
  // AGI — used to compute pre-QBI taxable income when taxable_income is not yet known
  agi: z.number().nonnegative().optional(),
  // Filing status — used to look up the standard deduction base for income limit
  filing_status: z.nativeEnum(FilingStatus).optional(),
  // Age/blindness flags — used to compute the full standard deduction (including additional factors)
  // so the QBI income limit uses the actual deduction amount rather than only the base.
  taxpayer_age_65_or_older: z.boolean().optional(),
  taxpayer_blind: z.boolean().optional(),
  spouse_age_65_or_older: z.boolean().optional(),
  spouse_blind: z.boolean().optional(),
});

type Form8995Input = z.infer<typeof inputSchema>;

// ── Pure helpers ──────────────────────────────────────────────────────────────

function totalQbi(input: Form8995Input): number {
  return (input.qbi_from_schedule_c ?? 0) + (input.qbi_from_schedule_f ?? 0) + (input.qbi ?? 0);
}

function netQbi(input: Form8995Input): number {
  return totalQbi(input) + (input.qbi_loss_carryforward ?? 0);
}

function qbiComponent(input: Form8995Input): number {
  const net = netQbi(input);
  if (net <= 0) return 0;
  return net * QBI_RATE;
}

function netReit(input: Form8995Input): number {
  return (input.line6_sec199a_dividends ?? 0) + (input.reit_loss_carryforward ?? 0);
}

function reitComponent(input: Form8995Input): number {
  const net = netReit(input);
  if (net <= 0) return 0;
  return net * QBI_RATE;
}

function totalBeforeLimit(input: Form8995Input): number {
  return qbiComponent(input) + reitComponent(input);
}

// Filing statuses for which spouse factors apply (same set as standard_deduction worksheet).
const SPOUSE_STATUSES = new Set<FilingStatus>([FilingStatus.MFJ, FilingStatus.MFS, FilingStatus.QSS]);

// Compute the effective standard deduction for a filing status, including age/blindness additions.
// This mirrors the logic in the standard_deduction worksheet so that the QBI income limit
// uses the same deduction amount that will ultimately be applied to taxable income.
function standardDeductionAmount(
  input: Form8995Input,
  cfg: import("../../../config/index.ts").F1040Config,
): number {
  const status = input.filing_status;
  if (status === undefined) return 0;
  const base = cfg.standardDeductionBase[status] ?? 0;
  const additionalPerFactor = cfg.standardDeductionAdditional[status] ?? 0;
  let factors = 0;
  if (input.taxpayer_age_65_or_older) factors += 1;
  if (input.taxpayer_blind) factors += 1;
  if (SPOUSE_STATUSES.has(status)) {
    if (input.spouse_age_65_or_older) factors += 1;
    if (input.spouse_blind) factors += 1;
  }
  return base + factors * additionalPerFactor;
}

function incomeLimitBase(
  input: Form8995Input,
  cfg: import("../../../config/index.ts").F1040Config,
): number {
  const capGain = input.net_capital_gain ?? 0;

  // Preferred: use explicit taxable_income (pre-QBI) when available
  if (input.taxable_income !== undefined) {
    return Math.max(0, input.taxable_income - capGain);
  }

  // Fallback: derive from AGI minus the full standard deduction (including age/blindness
  // additions) for the filing status. IRC §199A(a) caps the deduction at 20% of
  // (taxable income before QBI deduction). Using the full standard deduction amount
  // matches what the standard_deduction worksheet will compute.
  if (input.agi !== undefined) {
    const stdDed = standardDeductionAmount(input, cfg);
    return Math.max(0, input.agi - stdDed - capGain);
  }

  // No income information available — income limit cannot be applied; return Infinity
  // so the deduction is uncapped (will be corrected when agi is received).
  return Infinity;
}

function incomeLimit(
  input: Form8995Input,
  cfg: import("../../../config/index.ts").F1040Config,
): number {
  const base = incomeLimitBase(input, cfg);
  if (base === Infinity) return Infinity;
  return base * QBI_RATE;
}

function qbiDeduction(
  input: Form8995Input,
  cfg: import("../../../config/index.ts").F1040Config,
): number {
  const total = totalBeforeLimit(input);
  if (total <= 0) return 0;
  const limit = incomeLimit(input, cfg);
  if (limit === Infinity) return total;
  return Math.min(total, limit);
}

function hasQbiActivity(input: Form8995Input): boolean {
  return (
    (input.qbi_from_schedule_c ?? 0) > 0 ||
    (input.qbi ?? 0) !== 0 ||
    (input.line6_sec199a_dividends ?? 0) > 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0
  );
}

// ── Node class ────────────────────────────────────────────────────────────────

class Form8995Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8995";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, standard_deduction]);

  compute(ctx: NodeContext, rawInput: Form8995Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);

    if (!hasQbiActivity(input)) {
      return { outputs: [] };
    }

    const deduction = qbiDeduction(input, cfg);
    if (deduction <= 0) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040, { line13_qbi_deduction: deduction }),
      // Route QBI deduction to standard_deduction so it is subtracted from taxable income
      // before routing to income_tax_calculation (Form 1040 lines 13 → 14 → 15).
      this.outputNodes.output(standard_deduction, { qbi_deduction: deduction }),
    ];

    return { outputs };
  }
}

export const form8995 = new Form8995Node();
