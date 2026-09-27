import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// 2025 Form 8854 and instructions. The $206,000 average-tax threshold and
// $890,000 mark-to-market exclusion apply to TY2025, not the 2024 amounts.
export const AVG_ANNUAL_TAX_THRESHOLD_2025 = 206_000;
export const NET_WORTH_THRESHOLD = 2_000_000;
export const MARK_TO_MARKET_EXCLUSION_2025 = 890_000;

export enum ExpatriateType {
  CITIZEN = "CITIZEN",
  LONG_TERM_RESIDENT = "LONG_TERM_RESIDENT",
}

const assetSchema = z.object({
  fmv_at_expatriation: z.number().nonnegative(),
  basis: z.number().nonnegative(),
});

export const inputSchema = z.object({
  expatriation_date: z.string().refine((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value;
  }, "Form 8854 expatriation date must be valid"),
  expatriate_type: z.nativeEnum(ExpatriateType),
  average_annual_tax_prior_5_years: z.number().nonnegative(),
  net_worth_at_expatriation: z.number().nonnegative(),
  certified_tax_compliance: z.boolean(),
  assets: z.array(assetSchema).optional(),
});

export type F8854Input = z.infer<typeof inputSchema>;

export function isCoveredExpatriate(input: F8854Input): boolean {
  return input.average_annual_tax_prior_5_years >
      AVG_ANNUAL_TAX_THRESHOLD_2025 ||
    input.net_worth_at_expatriation >= NET_WORTH_THRESHOLD ||
    !input.certified_tax_compliance;
}

class F8854Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8854";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: F8854Input): NodeResult {
    inputSchema.parse(rawInput);
    // A deemed gain is income reported by asset character on Form 8949,
    // Form 4797, Schedule E, etc. It is not a dollar-for-dollar Schedule 2 tax.
    // Filing also requires an IRS8854 attachment, which is not built yet.
    throw new Error(
      "Form 8854 is not filing-ready: asset-specific deemed gain reporting and the IRS8854 attachment are required",
    );
  }
}

export const f8854 = new F8854Node();
