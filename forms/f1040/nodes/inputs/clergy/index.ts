import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule_se } from "../../intermediate/forms/schedule_se/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Clergy/ministerial income treatment under IRC §107, §1402(a)(8), §1402(c)(4)
// Ministers are employees for income tax but self-employed for SE tax on ministerial services.
// IRS Pub 517 (2025), "Members of the Clergy" → "Income Items" → "Housing".
//
// Income tax: a church normally leaves the designated housing allowance OUT of W-2 box 1.
// The minister then adds back only the EXCESS of the allowance paid over the smallest of
// (designated amount, amount actually used to provide the home, fair rental value of the
// home furnished plus utilities) — on Form 1040 line 1h, labelled "Excess allowance"
// (Pub 517). A parsonage provided in kind never reaches box 1 and needs no adjustment.
// Only when the church put the allowance in box 1 is an exclusion subtracted.
//
// SE tax (no approved Form 4361): ministerial wages + the full housing allowance paid +
// the fair rental value of a parsonage including utilities, less unreimbursed ministerial
// business expenses in full, are net earnings from self-employment (IRC §1402(a)(8);
// Pub 517 "Figuring Net Earnings"). The Deason allocation of expenses to tax-free income
// applies to income tax only, not SE tax (Pub 517 "Expenses Allocable to Tax-Free Income"). An approved Form 4361 removes ministerial earnings
// from SE tax permanently; other self-employment income (e.g. a non-ministerial
// Schedule C) is unaffected.

export const itemSchema = z.object({
  // Wages received from the church as an employee minister (W-2 Box 1)
  ministerial_wages: z.number().nonnegative().optional(),
  // Amount officially designated by church as housing allowance before year start (IRC §107(2))
  housing_allowance_designated: z.number().nonnegative().optional(),
  // Housing allowance actually paid to the minister this year. Defaults to the designated amount.
  housing_allowance_paid: z.number().nonnegative().optional(),
  // True only if the church INCLUDED the housing allowance in W-2 box 1 (uncommon).
  housing_allowance_included_in_w2_box1: z.boolean().optional(),
  // Actual amounts paid for housing during the year (rent, mortgage, utilities, repairs, furnishings)
  actual_housing_expenses: z.number().nonnegative().optional(),
  // Fair rental value of the home, furnished, plus utilities (IRC §107(2) limit)
  fair_market_rental_value: z.number().nonnegative().optional(),
  // Fair rental value (plus utilities) of church-provided housing (parsonage), IRC §107(1)
  parsonage_value: z.number().nonnegative().optional(),
  // Unreimbursed ministerial business expenses, deducted in full against SE earnings
  // (no Deason allocation for SE tax). Schedule SE requires an attached explanation.
  unreimbursed_ministerial_expenses: z.number().nonnegative().optional(),
  // Form 4361 approved — exempts minister from SE tax on ministerial earnings (IRC §1402(e))
  has_4361_exemption: z.boolean().optional(),
  // Minister must be ordained, licensed, or commissioned to qualify for §107 and dual-status SE
  is_ordained_minister: z.boolean().optional(),
});

export const inputSchema = z.object({
  clergys: z.array(itemSchema).min(1),
});

type ClergyItem = z.infer<typeof itemSchema>;
type ClergyItems = ClergyItem[];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function ordainedItems(items: ClergyItems): ClergyItems {
  return items.filter((item) => item.is_ordained_minister === true);
}

function allowancePaid(item: ClergyItem): number {
  return item.housing_allowance_paid ?? item.housing_allowance_designated ?? 0;
}

// Allowable §107(2) exclusion: min(designated, paid, actual, fair rental value).
// A missing actual-expense or rental-value figure counts as zero, so nothing is excluded
// until the minister substantiates both limits.
export function allowableHousingExclusion(item: ClergyItem): number {
  const designated = item.housing_allowance_designated ?? 0;
  const actual = item.actual_housing_expenses ?? 0;
  const fmrv = item.fair_market_rental_value ?? 0;
  return Math.min(designated, allowancePaid(item), actual, fmrv);
}

// Excess allowance: paid (and left out of box 1) above the allowable amount → line 1h.
export function excessHousingAllowance(item: ClergyItem): number {
  if (item.housing_allowance_included_in_w2_box1 === true) return 0;
  return Math.max(0, allowancePaid(item) - allowableHousingExclusion(item));
}

// Exclusion to subtract only when the church reported the allowance inside box 1.
function boxOneExclusion(item: ClergyItem): number {
  if (item.housing_allowance_included_in_w2_box1 !== true) return 0;
  return allowableHousingExclusion(item);
}

// Net ministerial earnings from self-employment (before the 92.35% factor on Schedule SE).
export function ministerialSeEarnings(item: ClergyItem): number {
  if (item.has_4361_exemption === true) return 0;
  // When the church reported the allowance inside box 1, ministerial_wages already contains it.
  const allowance = item.housing_allowance_included_in_w2_box1 === true ? 0 : allowancePaid(item);
  const gross = (item.ministerial_wages ?? 0) + allowance + (item.parsonage_value ?? 0);
  return gross - (item.unreimbursed_ministerial_expenses ?? 0);
}

function sum(items: ClergyItems, fn: (item: ClergyItem) => number): number {
  return ordainedItems(items).reduce((total, item) => total + fn(item), 0);
}

function scheduleSeOutput(items: ClergyItems): NodeOutput[] {
  const base = sum(items, ministerialSeEarnings);
  if (base === 0) return [];
  // Its own Schedule SE field: Schedule C also deposits net_profit_schedule_c, and two scalar
  // deposits on one key would reach schedule_se as an array and fail its schema.
  return [output(schedule_se, { ministerial_se_earnings: base })];
}

function excessAllowanceOutputs(items: ClergyItems): NodeOutput[] {
  const excess = sum(items, excessHousingAllowance);
  if (excess === 0) return [];
  // Excess allowance is earned income (Pub 517) and must reach AGI as well as line 1h.
  return [
    { nodeType: f1040.nodeType, fields: { line1h_other_earned: excess } },
    { nodeType: agi_aggregator.nodeType, fields: { line1h_other_earned: excess } },
  ];
}

function boxOneExclusionOutput(items: ClergyItems): NodeOutput[] {
  const exclusion = sum(items, boxOneExclusion);
  if (exclusion === 0) return [];
  return [output(schedule1, { line8z_other_income: -exclusion })];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class ClergyNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "clergy";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_se,
    schedule1,
    f1040,
    agi_aggregator,
  ]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { clergys } = parsed;

    const outputs: NodeOutput[] = [
      ...scheduleSeOutput(clergys),
      ...excessAllowanceOutputs(clergys),
      ...boxOneExclusionOutput(clergys),
    ];

    return { outputs };
  }
}

export const clergy = new ClergyNode();
