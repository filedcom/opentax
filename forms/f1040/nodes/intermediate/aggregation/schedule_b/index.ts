import { z } from "zod";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import {
  type AtLeastOne,
  TaxNode,
} from "../../../../../../core/types/tax-node.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { agi_aggregator } from "../agi_aggregator/index.ts";
import { form8960 } from "../../forms/form8960/index.ts";
import { scheduleA } from "../../../inputs/schedule_a/index.ts";
import { normalizeArray } from "../../../utils.ts";

// ─── Schemas ─────────────────────────────────────────────────────────────────

// Executor accumulation pattern: multiple upstream NodeOutputs deposit fields
// that accumulate from scalar to array as each payer entry arrives.
const accumulable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]);

export const inputSchema = z.object({
  // ── Part I: Interest (from f1099int, one entry per payer) ──────────────────
  // Net taxable interest per payer (box1+box3+box10 - adjustments)
  taxable_interest_net: accumulable(z.number()).optional(),
  // Payer names (informational — not used in calculation, but part of schema)
  payer_name: accumulable(z.string()).optional(),
  // US obligations interest (EE/I bonds) — used for Form 8815 exclusion (line 3)
  box3_us_obligations: accumulable(z.number().nonnegative()).optional(),
  // Excludable EE/I bond interest (Form 8815 line 14) → Schedule B line 3
  ee_bond_exclusion: z.number().nonnegative().optional(),
  // ── Part II: Dividends (from f1099div, one entry per payer when needed) ────
  // Ordinary dividends per payer (box1a); nominee amounts already excluded upstream
  ordinaryDividends: accumulable(z.number().nonnegative()).optional(),
  // Payer names for dividends (informational)
  payerName: accumulable(z.string()).optional(),
  // Nominee flags (informational — f1099div already nets nominee amounts)
  isNominee: accumulable(z.boolean()).optional(),
});

type ScheduleBInput = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Part I — Line 2: sum all per-payer taxable interest amounts
function totalTaxableInterest(input: ScheduleBInput): number {
  return normalizeArray(input.taxable_interest_net)
    .reduce((sum, n) => sum + n, 0);
}

// Part I — Line 4: total interest minus EE/I bond exclusion (clamped to >= 0)
function line4TaxableInterest(input: ScheduleBInput): number {
  const line2 = totalTaxableInterest(input);
  const exclusion = input.ee_bond_exclusion ?? 0;
  return Math.max(0, line2 - exclusion);
}

// Part II — Line 6: sum all per-payer ordinary dividend amounts
function line6OrdinaryDividends(input: ScheduleBInput): number {
  return normalizeArray(input.ordinaryDividends)
    .reduce((sum, n) => sum + n, 0);
}

// ─── Node class ───────────────────────────────────────────────────────────────

class ScheduleBNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_b";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, agi_aggregator, form8960, scheduleA]);

  compute(_ctx: NodeContext, rawInput: ScheduleBInput): NodeResult {
    const input = inputSchema.parse(rawInput);

    const line4 = line4TaxableInterest(input);
    const line6 = line6OrdinaryDividends(input);

    if (line4 === 0 && line6 === 0) {
      return { outputs: [] };
    }

    const f1040Fields: Partial<z.infer<typeof f1040["inputSchema"]>> = {};
    if (line4 > 0) f1040Fields.line2b_taxable_interest = line4;
    if (line6 > 0) f1040Fields.line3b_ordinary_dividends = line6;

    const outputs: NodeOutput[] = [
      this.outputNodes.output(
        f1040,
        f1040Fields as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>,
      ),
    ];

    const agiFields: Partial<z.infer<typeof agi_aggregator["inputSchema"]>> = {};
    if (line4 > 0) agiFields.line2b_taxable_interest = line4;
    if (line6 > 0) agiFields.line3b_ordinary_dividends = line6;
    if (Object.keys(agiFields).length > 0) {
      outputs.push(this.outputNodes.output(
        agi_aggregator,
        agiFields as AtLeastOne<z.infer<typeof agi_aggregator["inputSchema"]>>,
      ));
    }

    // Route total taxable interest (Part I line 4) to Form 8960 line 1 for NIIT.
    // IRC §1411(c)(1)(A): taxable interest is net investment income.
    // Note: dividends are routed to form8960 directly by f1099div; schedule_b only handles interest.
    if (line4 > 0) {
      outputs.push(this.outputNodes.output(form8960, { line1_taxable_interest: line4 }));
      outputs.push(this.outputNodes.output(scheduleA, { investment_interest_taxable_interest: line4 }));
    }

    // ── Self-emit print-layer values for the PDF builder ─────────────────────
    // Per-payer rows (up to the form's row counts: 14 interest, 15 dividend)
    // plus the Part I/II totals. Part III (foreign accounts/trusts) has no
    // engine data source and is left for the taxpayer to complete when the
    // schedule is filed.
    const printFields: Record<string, number | string> = {};
    const intAmounts = normalizeArray(input.taxable_interest_net);
    const intNames = normalizeArray(input.payer_name as string | string[] | undefined);
    for (let i = 0; i < Math.min(intAmounts.length, 14); i++) {
      printFields[`print_int_payer_${i + 1}`] = intNames[i] ?? "";
      printFields[`print_int_amount_${i + 1}`] = intAmounts[i];
    }
    const divAmounts = normalizeArray(input.ordinaryDividends);
    const divNames = normalizeArray(input.payerName as string | string[] | undefined);
    for (let i = 0; i < Math.min(divAmounts.length, 15); i++) {
      printFields[`print_div_payer_${i + 1}`] = divNames[i] ?? "";
      printFields[`print_div_amount_${i + 1}`] = divAmounts[i];
    }
    if (line4 > 0 || intAmounts.length > 0) {
      printFields.print_line2_total = totalTaxableInterest(input);
      printFields.print_line4_total = line4;
    }
    if (line6 > 0) printFields.print_line6_total = line6;
    outputs.push({ nodeType: this.nodeType, fields: printFields });

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const schedule_b = new ScheduleBNode();
