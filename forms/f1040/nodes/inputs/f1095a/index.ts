import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import {
  form8962,
  sharedPolicyAllocationSchema,
} from "../../intermediate/forms/form8962/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 1095-A — Health Insurance Marketplace Statement
// IRS Form 1095-A, Parts I–III
// Data source: Health Insurance Marketplace (exchange)
//
// This node is a pure aggregation pass-through: it collects all 1095-A items
// (one per insurance policy), aggregates the premium data, and emits a single
// output to form8962 for Premium Tax Credit reconciliation.
//
// IRS Form 8962 Instructions (2025): https://www.irs.gov/instructions/i8962

// Per-item schema — one 1095-A from one Marketplace policy
const sharedMfsPolicySchema = z.discriminatedUnion("basis", [
  z.object({
    basis: z.literal("exception"),
    other_taxpayer_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
    start_month: z.number().int().min(1).max(12),
    end_month: z.number().int().min(1).max(12),
    monthly_family_slcsps: z.array(z.number().nonnegative()).length(12),
  }).strict(),
  z.object({
    basis: z.literal("no_exception"),
    other_taxpayer_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
    start_month: z.number().int().min(1).max(12),
    end_month: z.number().int().min(1).max(12),
  }).strict(),
]);

export const itemSchema = z.object({
  // Part I — Issuer / Marketplace information
  issuer_name: z.string().min(1),
  policy_number: z.string().optional(),
  // State of Marketplace coverage, needed to combine SLCSP across policies.
  coverage_state: z.string().regex(/^[A-Z]{2}$/).optional(),

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
  shared_mfs_policy: sharedMfsPolicySchema.optional(),
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
  const arrays = items.map((item) => item[field]).filter((
    arr,
  ): arr is number[] => arr !== undefined);
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

function mergeMonthlySlcsps(items: F1095AItems): number[] | null {
  if (items.length === 1) return items[0].monthly_slcsps ?? null;
  if (!items.some((item) => item.monthly_slcsps !== undefined)) return null;
  const merged = new Array<number>(12).fill(0);
  for (let month = 0; month < 12; month++) {
    const byState = new Map<string, number>();
    for (const item of items) {
      const slcsp = item.monthly_slcsps?.[month] ?? 0;
      if (slcsp <= 0) continue;
      if (!item.coverage_state) {
        throw new Error(
          "Form 1095-A multiple policies need coverage_state to combine SLCSP",
        );
      }
      const existing = byState.get(item.coverage_state);
      if (existing !== undefined && existing !== slcsp) {
        throw new Error(
          "Form 1095-A same-state policies disagree on monthly SLCSP",
        );
      }
      byState.set(item.coverage_state, slcsp);
    }
    merged[month] = [...byState.values()].reduce(
      (sum, value) => sum + value,
      0,
    );
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

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const { f1095as } = inputSchema.parse(input);
    for (const item of f1095as) {
      for (
        const [monthlyKey, annualKey] of [
          ["monthly_premiums", "annual_premium"],
          ["monthly_slcsps", "annual_slcsp"],
          ["monthly_aptcs", "annual_aptc"],
        ] as const
      ) {
        const months = item[monthlyKey];
        const annual = item[annualKey];
        if (
          months !== undefined && annual !== undefined &&
          Math.abs(months.reduce((sum, amount) => sum + amount, 0) - annual) >
            0.01
        ) {
          throw new Error(
            `Form 1095-A ${annualKey} must equal its twelve monthly amounts`,
          );
        }
      }
    }
    const sharedAllocations: Array<
      z.infer<typeof sharedPolicyAllocationSchema>
    > = [];
    const allocatedItems = f1095as.map((item) => {
      const shared = item.shared_mfs_policy;
      if (!shared) return item;
      if (
        !item.policy_number || !item.monthly_premiums ||
        !item.monthly_aptcs
      ) {
        throw new Error(
          "Shared MFS Form 1095-A needs policy number and monthly premiums and APTC",
        );
      }
      if (shared.start_month > shared.end_month) {
        throw new Error("Shared MFS policy allocation months are reversed");
      }
      for (let index = 0; index < 12; index++) {
        const month = index + 1;
        if (
          (month < shared.start_month || month > shared.end_month) &&
          (item.monthly_premiums[index] > 0 || item.monthly_aptcs[index] > 0)
        ) {
          throw new Error(
            "Shared MFS policy has coverage outside its allocation months",
          );
        }
        if (
          shared.basis === "exception" &&
          item.monthly_premiums[index] > 0 &&
          shared.monthly_family_slcsps[index] <= 0
        ) {
          throw new Error(
            "Shared MFS exception needs the coverage-family SLCSP for each covered month",
          );
        }
      }
      sharedAllocations.push(sharedPolicyAllocationSchema.parse({
        basis: shared.basis === "exception"
          ? "mfs_exception"
          : "mfs_no_exception",
        policy_number: item.policy_number.slice(-15),
        other_taxpayer_ssn: shared.other_taxpayer_ssn.replaceAll("-", ""),
        start_month: shared.start_month,
        end_month: shared.end_month,
        ...(shared.basis === "exception" ? { premium_pct: 0.5 } : {}),
        aptc_pct: 0.5,
      }));
      return {
        ...item,
        monthly_premiums: item.monthly_premiums.map((amount) =>
          shared.basis === "exception" ? Math.round(amount / 2) : 0
        ),
        monthly_slcsps: shared.basis === "exception"
          ? shared.monthly_family_slcsps
          : Array<number>(12).fill(0),
        monthly_aptcs: item.monthly_aptcs.map((amount) =>
          Math.round(amount / 2)
        ),
        annual_premium: undefined,
        annual_slcsp: undefined,
        annual_aptc: undefined,
      };
    });
    const hasMonthlyPolicy = allocatedItems.some((item) =>
      item.monthly_premiums !== undefined ||
      item.monthly_slcsps !== undefined || item.monthly_aptcs !== undefined
    );
    const hasAnnualOnlyPolicy = allocatedItems.some((item) =>
      item.monthly_premiums === undefined &&
      item.monthly_slcsps === undefined && item.monthly_aptcs === undefined &&
      ((item.annual_premium ?? 0) > 0 || (item.annual_slcsp ?? 0) > 0 ||
        (item.annual_aptc ?? 0) > 0)
    );
    if (hasMonthlyPolicy && hasAnnualOnlyPolicy) {
      throw new Error(
        "Form 1095-A policies need monthly columns for every policy when calculating Form 8962 monthly credit",
      );
    }
    if (hasMonthlyPolicy && allocatedItems.length > 1) {
      for (const item of allocatedItems) {
        const hasCoverage = item.monthly_premiums?.some((value) => value > 0) ||
          item.monthly_aptcs?.some((value) => value > 0);
        if (hasCoverage && (!item.monthly_slcsps || !item.coverage_state)) {
          throw new Error(
            "Form 1095-A multiple covered policies need monthly SLCSP and coverage_state for each policy",
          );
        }
      }
    }

    // Aggregate annual totals across all policies
    const totalAnnualPremium = sumField(allocatedItems, "annual_premium");
    const totalAnnualSlcsp = sumField(allocatedItems, "annual_slcsp");
    const totalAnnualAptc = sumField(allocatedItems, "annual_aptc");

    // Merge monthly arrays across all policies
    const mergedPremiums = mergeMonthlyArrays(
      allocatedItems,
      "monthly_premiums",
    );
    const mergedSlcsps = mergeMonthlySlcsps(allocatedItems);
    const mergedAptcs = mergeMonthlyArrays(allocatedItems, "monthly_aptcs");

    // Preserve an explicit all-zero column C. It is still a real 1095-A monthly
    // column when the premium and SLCSP columns contain coverage amounts.
    const activePremiums = mergedPremiums;
    const activeSlcsps = mergedSlcsps;
    const activeAptcs = mergedAptcs;

    // Determine if there is any data to pass to form8962
    const hasMonthlyData = [activePremiums, activeSlcsps, activeAptcs]
      .some((column) => column !== null && hasNonZero(column));
    const hasAnnualData = totalAnnualPremium > 0 || totalAnnualSlcsp > 0 ||
      totalAnnualAptc > 0;

    if (!hasMonthlyData && !hasAnnualData) {
      return { outputs: [] };
    }

    // Build form8962 fields — pass whatever data is available
    const form8962Fields: Record<string, unknown> = {};

    if (totalAnnualPremium > 0) {
      form8962Fields.annual_premium = totalAnnualPremium;
    }
    if (totalAnnualSlcsp > 0) form8962Fields.annual_slcsp = totalAnnualSlcsp;
    if (totalAnnualAptc > 0) form8962Fields.annual_aptc = totalAnnualAptc;
    if (activePremiums !== null) {
      form8962Fields.monthly_premiums = activePremiums;
    }
    if (activeSlcsps !== null) form8962Fields.monthly_slcsps = activeSlcsps;
    if (activeAptcs !== null) form8962Fields.monthly_aptcs = activeAptcs;
    if (
      allocatedItems.every((item) =>
        !item.shared_mfs_policy &&
        item.monthly_premiums && item.monthly_slcsps && item.monthly_aptcs &&
        item.monthly_premiums[0] > 0 && item.monthly_slcsps[0] > 0 &&
        item.monthly_premiums.every((amount) =>
          amount === item.monthly_premiums![0]
        ) &&
        item.monthly_slcsps.every((amount) =>
          amount === item.monthly_slcsps![0]
        )
      )
    ) {
      form8962Fields.annual_line11_eligible = true;
    }
    if (sharedAllocations.length > 0) {
      form8962Fields.shared_policy_allocations = sharedAllocations;
    }

    return {
      outputs: [
        output(
          form8962,
          form8962Fields as Parameters<typeof output<typeof form8962>>[1],
        ),
      ],
    };
  }
}

export const f1095a = new F1095ANode();
