import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Self-employed retirement plan deduction (IRC §404(a)(8), §408(k), §408(p), §401(k))
// Flows to Schedule 1, Part II, Line 16.
// Limits from Rev Proc 2024-40.

// ── Constants ─────────────────────────────────────────────────────────────────

const SEP_ANNUAL_LIMIT = 69_000;        // Rev Proc 2024-40, §3.20
const SEP_RATE = 0.25;                  // IRC §404(a)(8); 25% of net SE compensation
const SIMPLE_EMPLOYEE_LIMIT = 16_500;   // Rev Proc 2024-40, §3.24
const SIMPLE_CATCHUP_LIMIT = 19_500;    // Rev Proc 2024-40, §3.24 (age 50+)
const SOLO401K_EMPLOYEE_LIMIT = 23_500; // Rev Proc 2024-40, §3.19
const SOLO401K_COMBINED_LIMIT = 69_000; // IRC §415(c); Rev Proc 2024-40, §3.20

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
  const employeeLimit = (item.age_50_or_over === true) ? SIMPLE_CATCHUP_LIMIT : SIMPLE_EMPLOYEE_LIMIT;
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

// ── Node class ────────────────────────────────────────────────────────────────

class SepRetirementNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "sep_retirement";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const outputs: NodeOutput[] = schedule1Output(parsed.sep_retirements);
    return { outputs };
  }
}

export const sep_retirement = new SepRetirementNode();
