import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Per-entry schema — one 1099-PATR from one cooperative
export const itemSchema = z.object({
  box1_patronage_dividends: z.number().nonnegative().optional(),
  box2_nonpatronage_distributions: z.number().nonnegative().optional(),
  box3_per_unit_retain: z.number().nonnegative().optional(),
  box4_federal_withheld: z.number().nonnegative().optional(),
  box5_redeemed_nonqualified: z.number().nonnegative().optional(),
  // Box 6 — Domestic production activities deduction (DPAD) — expired after 2017
  // May appear on historical forms; no current-year routing
  box6_dpad: z.number().nonnegative().optional(),
  // Box 7 — Qualified payments (affects §199A QBI calculation)
  // Informational for Form 8995/8995-A; tracked here but no direct output
  box7_qualified_payments: z.number().nonnegative().optional(),
  // Box 8 — Qualified written notice of allocation
  box8_qualified_written_notice: z.number().nonnegative().optional(),
  // Box 9 — Section 199A(g) deduction (cooperative-level deduction)
  box9_section199a_deduction: z.number().nonnegative().optional(),
  payer_name: z.string().optional(),
  payer_tin: z.string().optional(),
  account_number: z.string().optional(),
  // Whether income is from a trade or business (routes to Schedule C/F vs. other income)
  trade_or_business: z.boolean().optional(),
});

export const inputSchema = z.object({
  f1099patrs: z.array(itemSchema).min(1),
});

type PATRItem = z.infer<typeof itemSchema>;
type PATRItems = PATRItem[];

function nonBusinessItems(items: PATRItems): PATRItems {
  return items.filter((item) => item.trade_or_business !== true);
}

function totalPatronageDividends(items: PATRItems): number {
  return items.reduce((sum, item) => sum + (item.box1_patronage_dividends ?? 0), 0);
}

function totalNonpatronage(items: PATRItems): number {
  return items.reduce((sum, item) => sum + (item.box2_nonpatronage_distributions ?? 0), 0);
}

function totalPerUnitRetain(items: PATRItems): number {
  return items.reduce((sum, item) => sum + (item.box3_per_unit_retain ?? 0), 0);
}

function totalFederalWithheld(items: PATRItems): number {
  return items.reduce((sum, item) => sum + (item.box4_federal_withheld ?? 0), 0);
}

function schedule1Output(items: PATRItems): NodeOutput[] {
  // Non-business patronage dividends + nonpatronage + per-unit retain → other income
  const nonBiz = nonBusinessItems(items);
  const patronage = totalPatronageDividends(nonBiz);
  const nonpatronage = totalNonpatronage(nonBiz);
  const perUnit = totalPerUnitRetain(nonBiz);
  const total = patronage + nonpatronage + perUnit;
  if (total === 0) return [];
  return [output(schedule1, { line8z_other_income: total })];
}

function f1040Output(items: PATRItems): NodeOutput[] {
  const withheld = totalFederalWithheld(items);
  if (withheld === 0) return [];
  return [output(f1040, { line25b_withheld_1099: withheld })];
}

class F1099PATRNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099patr";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { f1099patrs } = parsed;

    const outputs: NodeOutput[] = [
      ...schedule1Output(f1099patrs),
      ...f1040Output(f1099patrs),
    ];

    return { outputs };
  }
}

export const f1099patr = new F1099PATRNode();
