import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8965 — Health Coverage Exemptions
// Used for TY2014–2018 to claim exemptions from the ACA individual mandate penalty.
// The Tax Cuts and Jobs Act (TCJA §11081, P.L. 115-97) reduced the individual
// mandate penalty to $0 beginning TY2019. For TY2025 federal returns, this form
// produces no tax computation or output. Some states (MA, NJ, CA, DC, RI, VT)
// retain their own mandates, which are handled at the state level.

export enum CoverageExemptionType {
  None = "none",
  Marketplace = "marketplace",
  Hardship = "hardship",
  Other = "other",
}

export const inputSchema = z.object({
  // Part I — Type of exemption from health coverage mandate (§5000A(e))
  coverage_exemption_type: z.nativeEnum(CoverageExemptionType),
  // Part I, Col C — Marketplace-issued exemption certificate number (marketplace exemptions only)
  exemption_certificate_number: z.string().optional(),
  // Part II — Whether each of the 12 months had no qualifying health coverage (Jan–Dec)
  months_without_coverage: z.array(z.boolean()).length(12).optional(),
  // Part III, Line 7 — Household income below filing threshold (§5000A(e)(2))
  household_income_below_threshold: z.boolean().optional(),
});

class F8965Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8965";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    // Legacy federal form — individual mandate penalty is $0 for TY2019+ (TCJA §11081).
    // No federal tax computation or downstream routing for TY2025.
    return { outputs: [] };
  }
}

export const f8965 = new F8965Node();
