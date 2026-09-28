import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 4970 — Tax on Accumulation Distribution of Trusts
// IRC §665-668: Beneficiary reports tax on accumulation distributions from
// certain domestic trusts. The "throwback rule" treats the distribution as
// if it had been distributed in the year the income was accumulated.
// Form 4970 line 28 belongs on Schedule 2 line 17l, not directly on Form 1040
// line 17. The complete throwback computation and native attachment are not
// yet implemented, so a positive source cannot be filed safely.

// Per-throwback-year schema — each prior year when income was accumulated
export const throwbackYearSchema = z.object({
  // The year in which the trust income was accumulated
  tax_year: z.number().int(),
  // The amount of income accumulated in that year (distributed now)
  accumulated_income: z.number().nonnegative(),
  // The taxes paid by the trust on this income in that year
  taxes_paid_by_trust: z.number().nonnegative().optional(),
});

// Per-item schema — one Form 4970 per trust distribution
export const itemSchema = z.object({
  // Name of the trust making the accumulation distribution
  trust_name: z.string().min(1),
  // Trust EIN
  trust_ein: z.string().min(1),
  // Total accumulation distribution amount received
  distribution_amount: z.number().nonnegative(),
  // Prior accumulation years with income details
  throwback_years: z.array(throwbackYearSchema).optional(),
  // Total deemed distributed taxes (pre-computed, from Part III of form)
  tax_deemed_distributed: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f4970s: z.array(itemSchema).min(1),
});

class F4970Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f4970";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (
      input.f4970s.some((item) =>
        item.distribution_amount > 0 ||
        (item.tax_deemed_distributed ?? 0) > 0 ||
        item.throwback_years?.some((year) => year.accumulated_income > 0)
      )
    ) {
      throw new Error(
        "Form 4970 accumulation distribution needs its 2025 throwback calculation, Schedule 2 line 17l, and native attachment before filing",
      );
    }
    return { outputs: [] };
  }
}

export const f4970 = new F4970Node();
