import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

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
  // Taxable income before QBI deduction (Form 1040 line 11)
  taxable_income: z.number().nonnegative().optional(),
  // Net capital gain (Form 1040 line 7 / Schedule D) — reduces income limitation base
  net_capital_gain: z.number().nonnegative().optional(),
  // Prior-year QBI net loss carryforward (must be zero or negative)
  qbi_loss_carryforward: z.number().nonpositive().optional(),
  // Prior-year REIT/PTP net loss carryforward (must be zero or negative)
  reit_loss_carryforward: z.number().nonpositive().optional(),
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

function incomeLimitBase(input: Form8995Input): number {
  const ti = input.taxable_income ?? 0;
  const capGain = input.net_capital_gain ?? 0;
  return Math.max(0, ti - capGain);
}

function incomeLimit(input: Form8995Input): number {
  return incomeLimitBase(input) * QBI_RATE;
}

function qbiDeduction(input: Form8995Input): number {
  const total = totalBeforeLimit(input);
  if (total <= 0) return 0;
  return Math.min(total, incomeLimit(input));
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
  readonly outputNodes = new OutputNodes([f1040]);

  compute(rawInput: Form8995Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    if (!hasQbiActivity(input)) {
      return { outputs: [] };
    }

    const deduction = qbiDeduction(input);
    if (deduction <= 0) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040, { line13_qbi_deduction: deduction }),
    ];

    return { outputs };
  }
}

export const form8995 = new Form8995Node();
