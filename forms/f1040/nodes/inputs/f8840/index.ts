import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8840 — Closer Connection Exception Statement for Aliens
// IRC §7701(b)(3)(B); Reg. §301.7701(b)-2; Form 8840 instructions
//
// A foreign person who meets the Substantial Presence Test (SPT) may
// nevertheless be treated as a nonresident alien if they maintain a closer
// connection to a foreign country. Filed as a declaration/election — no
// tax computation. Cannot be claimed if taxpayer applied for green card.

export const inputSchema = z.object({
  // Country where the taxpayer maintained their tax home for the entire year
  // (Form 8840 Part II; IRC §7701(b)(3)(B))
  country_of_tax_home: z.string(),
  // Days present in the US during the current tax year (Form 8840 Part I)
  days_in_us_current_year: z.number().int().nonnegative(),
  // Days present in the US during the first preceding year (optional)
  days_in_us_prior_year_1: z.number().int().nonnegative().optional(),
  // Days present in the US during the second preceding year (optional)
  days_in_us_prior_year_2: z.number().int().nonnegative().optional(),
  // Whether the taxpayer applied for lawful permanent resident status
  // If true, closer connection exception is unavailable (IRC §7701(b)(3)(B)(ii))
  has_applied_for_green_card: z.boolean(),
  // Whether the taxpayer maintained a tax home in the foreign country for the ENTIRE year
  maintained_tax_home_entire_year: z.boolean(),
});

class F8840Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8840";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);

    // Hard validation: closer connection exception is unavailable if taxpayer
    // applied for permanent resident status. IRC §7701(b)(3)(B)(ii).
    if (parsed.has_applied_for_green_card) {
      throw new Error(
        "Form 8840: Closer connection exception is not available for taxpayers who have applied for lawful permanent resident status (IRC §7701(b)(3)(B)(ii)).",
      );
    }

    // Form 8840 is a pure election/statement — no downstream computation.
    return { outputs: [] };
  }
}

export const f8840 = new F8840Node();
