import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Form 3800: General Business Credit
// Aggregates component business credits and carryovers; routes to Schedule 3
// line 6z → Form 1040 line 20.
// IRC §38 (credit allowed), §39 (carryback 1 yr / carryforward 20 yrs).
// Carryback is 3 years for §6417(b) credits (clean energy elective payments).
// Limitation against net income tax is applied at the Schedule 3 / f1040 level.

// Per-entry schema — each item represents one Form 3800 entry (3800 or GBC screen)
export const itemSchema = z.object({
  // Pre-computed total GBC (overrides component sum when provided)
  // IRC §38; Form 3800 Part II line 38
  total_gbc: z.number().nonnegative().optional(),

  // ── Component credits (Part III current-year credits) ─────────────────────
  // Work Opportunity Credit — IRC §51; Form 5884
  work_opportunity_credit: z.number().nonnegative().optional(),
  // Research Activities Credit — IRC §41; Form 6765
  research_credit: z.number().nonnegative().optional(),
  // Disabled Access Credit — IRC §44; Form 8826
  disabled_access_credit: z.number().nonnegative().optional(),
  // Employer pension plan startup costs credit — IRC §45E/§45T; Form 8881
  employer_pension_startup_credit: z.number().nonnegative().optional(),
  // Employer-provided childcare credit — IRC §45F; Form 8882
  employer_childcare_credit: z.number().nonnegative().optional(),
  // Small employer health insurance premiums — IRC §45R; Form 8941
  small_employer_health_credit: z.number().nonnegative().optional(),
  // New Markets Tax Credit — IRC §45D; Form 8874
  new_markets_credit: z.number().nonnegative().optional(),
  // Energy Efficient Home Credit — IRC §45L; Form 8908
  energy_efficient_home_credit: z.number().nonnegative().optional(),
  // Advanced Manufacturing Production Credit — IRC §45X; Form 7207
  advanced_manufacturing_credit: z.number().nonnegative().optional(),

  // ── Carryover credits (Part IV prior-year / Part II line 5) ──────────────
  // GBC carried forward from prior years (up to 20 years) — IRC §39(a)(1)(B)
  carryforward_credit: z.number().nonnegative().optional(),
  // GBC carried back from a subsequent year (1 yr standard; 3 yrs §6417(b)) — IRC §39(a)(1)(A)
  carryback_credit: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f3800s: z.array(itemSchema).min(1),
});

type F3800Item = z.infer<typeof itemSchema>;
type F3800Items = F3800Item[];

// Compute the total current-year GBC for one item.
// Uses total_gbc override if provided; otherwise sums named component credits.
function currentYearGbc(item: F3800Item): number {
  if (item.total_gbc !== undefined) {
    return item.total_gbc;
  }
  return (
    (item.work_opportunity_credit ?? 0) +
    (item.research_credit ?? 0) +
    (item.disabled_access_credit ?? 0) +
    (item.employer_pension_startup_credit ?? 0) +
    (item.employer_childcare_credit ?? 0) +
    (item.small_employer_health_credit ?? 0) +
    (item.new_markets_credit ?? 0) +
    (item.energy_efficient_home_credit ?? 0) +
    (item.advanced_manufacturing_credit ?? 0)
  );
}

// Compute the carryover amount for one item.
function carryoverGbc(item: F3800Item): number {
  return (item.carryforward_credit ?? 0) + (item.carryback_credit ?? 0);
}

// Total GBC for one item including carryovers.
function itemTotal(item: F3800Item): number {
  return currentYearGbc(item) + carryoverGbc(item);
}

// Sum total GBC across all items.
function totalGbc(items: F3800Items): number {
  return items.reduce((sum, item) => sum + itemTotal(item), 0);
}

function schedule3Output(items: F3800Items): NodeOutput[] {
  const total = totalGbc(items);
  if (total === 0) return [];
  return [output(schedule3, { line6z_general_business_credit: total })];
}

class F3800Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f3800";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    return { outputs: schedule3Output(parsed.f3800s) };
  }
}

export const f3800 = new F3800Node();
