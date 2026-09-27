import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Represented 2025 Part II claims retain the IRS line, qualified gallons,
// and new column (d) actual fuel cost for the eventual Form 4136 document.
export const FORM4136_RATES = {
  "1a": 0.183,
  "1b": 0.183,
  "2b": 0.193,
  "3a": 0.243,
  "3b": 0.243,
  "4a": 0.243,
  "4b": 0.243,
  "5c": 0.243,
  "5d": 0.218,
  "11a": 0.183,
  "11c": 0.183,
} as const;

const fuelLine = z.enum([
  "1a",
  "1b",
  "2b",
  "3a",
  "3b",
  "4a",
  "4b",
  "5c",
  "5d",
  "11a",
  "11c",
]);

const allowedUseCodes: Partial<
  Record<z.infer<typeof fuelLine>, readonly string[]>
> = {
  "2b": ["01", "02", "09", "10", "11", "13", "14", "15"],
  "3a": ["02", "06", "07", "08", "11", "13", "14", "15"],
  "4a": ["02", "06", "07", "08", "11", "13", "14", "15"],
  "5c": ["01", "09", "10", "11", "13", "15", "16"],
  "5d": ["01", "09", "10", "11", "13", "15", "16"],
  "11a": ["01", "02", "04", "06", "07", "11", "13", "14", "15"],
  "11c": ["01", "02", "04", "06", "07", "11", "13", "14", "15"],
};

export const fuelClaimSchema = z.object({
  line: fuelLine,
  type_of_use: z.string().regex(/^\d{2}$/).optional(),
  qualified_gallons: z.number().int().positive().max(999_999_999),
  actual_fuel_cost: z.number().finite().positive(),
});

export const inputSchema = z.object({
  business: z.object({
    qualifying_business_activity: z.literal(true),
    activity_count: z.literal(1),
    business_name: z.string().trim().min(1),
    principal_activity_code: z.string().regex(/^\d{6}$/),
    equipment_make: z.string().trim().min(1),
    equipment_model: z.string().trim().min(1),
    equipment_type: z.string().trim().min(1),
    purchase_records_confirmed: z.literal(true),
    no_duplicate_excise_claim: z.literal(true),
  }),
  claims: z.array(fuelClaimSchema).min(1),
}).superRefine((input, ctx) => {
  const seen = new Set<string>();
  input.claims.forEach((claim, index) => {
    const codes = allowedUseCodes[claim.line];
    if (codes && !claim.type_of_use) {
      ctx.addIssue({
        code: "custom",
        message:
          `Form 4136 line ${claim.line} requires an IRS type-of-use code`,
        path: ["claims", index, "type_of_use"],
      });
    }
    if (!codes && claim.type_of_use) {
      ctx.addIssue({
        code: "custom",
        message: `Form 4136 line ${claim.line} has a fixed use type`,
        path: ["claims", index, "type_of_use"],
      });
    }
    if (codes && claim.type_of_use && !codes.includes(claim.type_of_use)) {
      ctx.addIssue({
        code: "custom",
        message: `Form 4136 line ${claim.line} does not allow this type of use`,
        path: ["claims", index, "type_of_use"],
      });
    }
    const key = `${claim.line}:${claim.type_of_use ?? ""}`;
    if (seen.has(key)) {
      ctx.addIssue({
        code: "custom",
        message: "Form 4136 claim line and type of use appear more than once",
        path: ["claims", index, "line"],
      });
    }
    seen.add(key);
  });
});

export type Form4136Input = z.infer<typeof inputSchema>;

export function calculateForm4136(input: Form4136Input): number {
  const credit = input.claims.reduce(
    (sum, claim) => sum + claim.qualified_gallons * FORM4136_RATES[claim.line],
    0,
  );
  return Math.round(credit * 100) / 100;
}

class F4136Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f4136";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f4136.pdf";

  compute(_ctx: NodeContext, rawInput: Form4136Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const credit = calculateForm4136(input);
    return {
      outputs: credit > 0
        ? [{
          nodeType: schedule3.nodeType,
          fields: { line12_fuel_tax_credit: credit },
        }]
        : [],
    };
  }
}

export const f4136 = new F4136Node();
