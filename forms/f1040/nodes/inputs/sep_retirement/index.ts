import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import {
  SEP_MAX_CONTRIBUTION_2025,
  SEP_CONTRIBUTION_RATE_2025,
} from "../../config/2025.ts";

// TY2025 — Self-employed retirement plan deduction (IRC §404(a)(8), §408(k), §408(p), §401(k))
// Flows to Schedule 1, Part II, Line 16.
// Limits from Rev Proc 2024-40.

// ── Constants ─────────────────────────────────────────────────────────────────

const SEP_ANNUAL_LIMIT = SEP_MAX_CONTRIBUTION_2025; // Rev Proc 2024-40, §3.20 — 70_000
const SEP_RATE = SEP_CONTRIBUTION_RATE_2025;        // IRC §404(a)(8); 25% of net SE compensation
const SIMPLE_EMPLOYEE_LIMIT = 16_500;   // Rev Proc 2024-40, §3.24
const SIMPLE_CATCHUP_LIMIT = 20_000;    // Rev Proc 2024-40, §3.24 (age 50+/64+: $16,500 + $3,500 catch-up)
const SIMPLE_SECURE20_CATCHUP_LIMIT = 21_750; // SECURE 2.0 §109: age 60-63 super catch-up ($16,500 + $5,250)
const SOLO401K_EMPLOYEE_LIMIT = 23_500; // Rev Proc 2024-40, §3.19
const SOLO401K_COMBINED_LIMIT = SEP_MAX_CONTRIBUTION_2025; // IRC §415(c); Rev Proc 2024-40, §3.20 — 70_000

// ── Enums ─────────────────────────────────────────────────────────────────────

export enum PlanType {
  SEP = "SEP",
  SIMPLE = "SIMPLE",
  SOLO_401K = "SOLO_401K",
}

// ── Schemas ───────────────────────────────────────────────────────────────────

export const itemSchema = z.object({
  plan_type: z.nativeEnum(PlanType),
  // SEP-IRA fields
  net_self_employment_compensation: z.number().nonnegative().optional(),
  sep_contribution: z.number().nonnegative().optional(),
  // SIMPLE IRA fields
  simple_employee_contribution: z.number().nonnegative().optional(),
  simple_employer_contribution: z.number().nonnegative().optional(),
  age_50_or_over: z.boolean().optional(),
  // SECURE 2.0 §109: age 60-63 super catch-up (higher limit than standard age 50+ catch-up)
  age_60_to_63: z.boolean().optional(),
  // Solo 401(k) fields
  solo401k_employee_deferral: z.number().nonnegative().optional(),
  solo401k_employer_contribution: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  sep_retirements: z.array(itemSchema).min(1),
});

type SepRetirementItem = z.infer<typeof itemSchema>;
type SepRetirementItems = SepRetirementItem[];

// ── Pure helpers ──────────────────────────────────────────────────────────────

function sepDeduction(item: SepRetirementItem): number {
  const contribution = item.sep_contribution ?? 0;
  if (contribution === 0) return 0;
  const absoluteCap = SEP_ANNUAL_LIMIT;
  if (item.net_self_employment_compensation == null) {
    return Math.min(contribution, absoluteCap);
  }
  const seLimit = item.net_self_employment_compensation * SEP_RATE;
  return Math.min(contribution, seLimit, absoluteCap);
}

function simpleDeduction(item: SepRetirementItem): number {
  // SECURE 2.0 §109: age 60-63 receives the super catch-up limit
  // Standard age 50+ (and 64+) receives the regular catch-up limit
  const employeeLimit = item.age_60_to_63 === true
    ? SIMPLE_SECURE20_CATCHUP_LIMIT
    : item.age_50_or_over === true
    ? SIMPLE_CATCHUP_LIMIT
    : SIMPLE_EMPLOYEE_LIMIT;
  const employee = Math.min(item.simple_employee_contribution ?? 0, employeeLimit);
  const employer = item.simple_employer_contribution ?? 0;
  return employee + employer;
}

function solo401kDeduction(item: SepRetirementItem): number {
  const employee = Math.min(item.solo401k_employee_deferral ?? 0, SOLO401K_EMPLOYEE_LIMIT);
  const employer = item.solo401k_employer_contribution ?? 0;
  return Math.min(employee + employer, SOLO401K_COMBINED_LIMIT);
}

function planDeduction(item: SepRetirementItem): number {
  if (item.plan_type === PlanType.SEP) return sepDeduction(item);
  if (item.plan_type === PlanType.SIMPLE) return simpleDeduction(item);
  return solo401kDeduction(item);
}

function totalDeduction(items: SepRetirementItems): number {
  return items.reduce((sum, item) => sum + planDeduction(item), 0);
}

function schedule1Output(items: SepRetirementItems): NodeOutput[] {
  const deduction = totalDeduction(items);
  if (deduction === 0) return [];
  return [output(schedule1, { line16_sep_simple: deduction })];
}

function agiOutput(items: SepRetirementItems): NodeOutput[] {
  const deduction = totalDeduction(items);
  if (deduction === 0) return [];
  return [output(agi_aggregator, { line16_sep_simple: deduction })];
}

// ── Node class ────────────────────────────────────────────────────────────────

class SepRetirementNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "sep_retirement";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, agi_aggregator]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const outputs: NodeOutput[] = [
      ...schedule1Output(parsed.sep_retirements),
      ...agiOutput(parsed.sep_retirements),
    ];
    return { outputs };
  }
}

export const sep_retirement = new SepRetirementNode();
