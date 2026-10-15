import type { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { agi_2026 } from "../nodes/agi.ts";
import { f1040_2026_node } from "../nodes/f1040.ts";
import {
  calculateSocialSecuritySources2026,
  socialSecurityClaim2026Schema,
  socialSecuritySource2026Schema,
} from "./social-security-source.ts";
export { socialSecurityClaim2026Schema } from "./social-security-source.ts";
export const inputSchema = socialSecurityClaim2026Schema.partial().extend(
  socialSecuritySource2026Schema.pick({
    filing_status: true,
    taxpayer_ssn: true,
    spouse_ssn: true,
  }).shape,
).strict();
class SocialSecurity2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "ssa1099";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([agi_2026, f1040_2026_node]);
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Social Security sources need f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (input.tax_year === undefined && input.statements === undefined) {
      return { outputs: [] };
    }
    const calculation = calculateSocialSecuritySources2026(
      socialSecuritySource2026Schema.parse(input),
    );
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: calculation } },
        {
          nodeType: "agi_aggregator",
          fields: { line6a_ss_gross: calculation.net_benefits },
        },
        {
          nodeType: "f1040",
          fields: {
            line6a_ss_gross: calculation.net_benefits,
            line25b_withheld_1099: calculation.federal_withholding,
          },
        },
      ],
    };
  }
}
export const social_security_2026 = new SocialSecurity2026Node();
