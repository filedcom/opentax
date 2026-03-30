import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { form8962 } from "../../intermediate/form8962/index.ts";

// Form 1095-A — Health Insurance Marketplace Statement
// IRS Form 1095-A, Parts I–III
// Data source: Health Insurance Marketplace (exchange)
//
// This node is a pure aggregation pass-through: it collects all 1095-A items
// (one per insurance policy), aggregates the premium data, and emits a single
// output to form8962 for Premium Tax Credit reconciliation.
//
// IRS Form 8962 Instructions (2024): https://www.irs.gov/pub/irs-pdf/i8962.pdf

// Per-item schema — one 1095-A from one Marketplace policy
export const itemSchema = z.object({
  // Part I — Issuer / Marketplace information
  issuer_name: z.string().min(1),
  policy_number: z.string().optional(),

  // Part III, Column A — Monthly enrollment premiums (12 elements, 0=Jan…11=Dec)
  monthly_premiums: z.array(z.number().nonnegative()).length(12).optional(),

  // Part III, Column B — Monthly applicable SLCSP premiums
  monthly_slcsps: z.array(z.number().nonnegative()).length(12).optional(),

  // Part III, Column C — Monthly advance payments of PTC (APTC)
  monthly_aptcs: z.array(z.number().nonnegative()).length(12).optional(),

  // Part III, Line 33 — Annual totals (used when monthly detail is absent)
  annual_premium: z.number().nonnegative().optional(),
  annual_slcsp: z.number().nonnegative().optional(),
  annual_aptc: z.number().nonnegative().optional(),
});

// Node inputSchema — all 1095-A forms for this return
export const inputSchema = z.object({
  f1095as: z.array(itemSchema).min(1),
});

type F1095AItem = z.infer<typeof itemSchema>;
type F1095AItems = F1095AItem[];

// Sum a scalar field across all items (used for annual totals aggregation)
function sumField(items: F1095AItems, field: keyof F1095AItem): number {
  return items.reduce((sum, item) => sum + ((item[field] as number) ?? 0), 0);
}

// Merge monthly arrays from all items by adding element-wise.
// Returns null if no item has the field populated.
function mergeMonthlyArrays(
  items: F1095AItems,
  field: "monthly_premiums" | "monthly_slcsps" | "monthly_aptcs",
): number[] | null {
  const arrays = items.map((item) => item[field]).filter((arr): arr is number[] => arr !== undefined);
  if (arrays.length === 0) return null;
  // Element-wise sum across all policies
  const merged = new Array<number>(12).fill(0);
  for (const arr of arrays) {
    for (let i = 0; i < 12; i++) {
      merged[i] += arr[i];
    }
  }
  return merged;
}

// Returns true if the array has at least one non-zero element
function hasNonZero(arr: number[]): boolean {
  return arr.some((v) => v > 0);
}

class F1095ANode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1095a";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form8962]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const { f1095as } = inputSchema.parse(input);

    // Aggregate annual totals across all policies
    const totalAnnualPremium = sumField(f1095as, "annual_premium");
    const totalAnnualSlcsp = sumField(f1095as, "annual_slcsp");
    const totalAnnualAptc = sumField(f1095as, "annual_aptc");

    // Merge monthly arrays across all policies
    const mergedPremiums = mergeMonthlyArrays(f1095as, "monthly_premiums");
    const mergedSlcsps = mergeMonthlyArrays(f1095as, "monthly_slcsps");
    const mergedAptcs = mergeMonthlyArrays(f1095as, "monthly_aptcs");

    // Skip zero monthly arrays (all-zero arrays carry no data)
    const activePremiums = mergedPremiums !== null && hasNonZero(mergedPremiums) ? mergedPremiums : null;
    const activeSlcsps = mergedSlcsps !== null && hasNonZero(mergedSlcsps) ? mergedSlcsps : null;
    const activeAptcs = mergedAptcs !== null && hasNonZero(mergedAptcs) ? mergedAptcs : null;

    // Determine if there is any data to pass to form8962
    const hasMonthlyData = activePremiums !== null || activeSlcsps !== null || activeAptcs !== null;
    const hasAnnualData = totalAnnualPremium > 0 || totalAnnualSlcsp > 0 || totalAnnualAptc > 0;

    if (!hasMonthlyData && !hasAnnualData) {
      return { outputs: [] };
    }

    // Build form8962 fields — pass whatever data is available
    const form8962Fields: Record<string, unknown> = {};

    if (totalAnnualPremium > 0) form8962Fields.annual_premium = totalAnnualPremium;
    if (totalAnnualSlcsp > 0) form8962Fields.annual_slcsp = totalAnnualSlcsp;
    if (totalAnnualAptc > 0) form8962Fields.annual_aptc = totalAnnualAptc;
    if (activePremiums !== null) form8962Fields.monthly_premiums = activePremiums;
    if (activeSlcsps !== null) form8962Fields.monthly_slcsps = activeSlcsps;
    if (activeAptcs !== null) form8962Fields.monthly_aptcs = activeAptcs;

    return {
      outputs: [
        output(form8962, form8962Fields as Parameters<typeof output<typeof form8962>>[1]),
      ],
    };
  }
}

export const f1095a = new F1095ANode();
