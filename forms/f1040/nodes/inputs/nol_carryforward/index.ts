import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Net Operating Loss (NOL) carryforward deduction (IRC §172)
// Post-2017 NOLs: indefinite carryforward, limited to 80% of taxable income (TCJA P.L. 115-97)
// Pre-2018 NOLs: 20-year carryforward, up to 100% of taxable income
// Flows to Schedule 1, Part I, Line 8a as a deduction.

// ── Constants ─────────────────────────────────────────────────────────────────

const POST2017_INCOME_LIMIT = 0.80; // IRC §172(a)(2)(B); TCJA P.L. 115-97
const PRE2018_INCOME_LIMIT = 1.00;  // IRC §172(b)(1)(A) pre-TCJA

// ── Enums ─────────────────────────────────────────────────────────────────────

export enum NolType {
  PRE2018 = "PRE2018",
  POST2017 = "POST2017",
}

// ── Schemas ───────────────────────────────────────────────────────────────────

export const itemSchema = z.object({
  year: z.number().int().positive(),
  nol_amount: z.number().nonnegative(),
  nol_type: z.nativeEnum(NolType),
});

export const inputSchema = z.object({
  nol_carryforwards: z.array(itemSchema).min(1),
  current_year_taxable_income: z.number(),
});

type NolItem = z.infer<typeof itemSchema>;
type NolItems = NolItem[];

// ── Pure helpers ──────────────────────────────────────────────────────────────

function sumByType(items: NolItems, type: NolType): number {
  return items
    .filter((item) => item.nol_type === type)
    .reduce((sum, item) => sum + item.nol_amount, 0);
}

function pre2018Deduction(available: number, taxableIncome: number): number {
  const limit = Math.max(0, taxableIncome) * PRE2018_INCOME_LIMIT;
  return Math.min(available, limit);
}

function post2017Deduction(available: number, incomeAfterPre2018: number): number {
  const limit = Math.max(0, incomeAfterPre2018) * POST2017_INCOME_LIMIT;
  return Math.min(available, limit);
}

function computeNolDeduction(items: NolItems, taxableIncome: number): number {
  const pre2018Available = sumByType(items, NolType.PRE2018);
  const pre2018Ded = pre2018Deduction(pre2018Available, taxableIncome);

  const incomeAfterPre2018 = taxableIncome - pre2018Ded;

  const post2017Available = sumByType(items, NolType.POST2017);
  const post2017Ded = post2017Deduction(post2017Available, incomeAfterPre2018);

  return pre2018Ded + post2017Ded;
}

function schedule1Output(items: NolItems, taxableIncome: number): NodeOutput[] {
  const deduction = computeNolDeduction(items, taxableIncome);
  if (deduction === 0) return [];
  return [output(schedule1, { line8a_nol_deduction: deduction })];
}

// ── Node class ────────────────────────────────────────────────────────────────

class NolCarryforwardNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "nol_carryforward";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const outputs: NodeOutput[] = schedule1Output(
      parsed.nol_carryforwards,
      parsed.current_year_taxable_income,
    );
    return { outputs };
  }
}

export const nol_carryforward = new NolCarryforwardNode();
