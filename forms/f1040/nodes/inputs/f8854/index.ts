import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8854 — Initial and Annual Expatriation Statement
// IRC §877A (HEART Act 2008); Rev. Proc. 2024-40, §3.23
//
// Filed by US citizens and long-term residents who expatriate. Covered
// expatriates are subject to a mark-to-market exit tax: all property is
// treated as if sold at FMV on the day before the expatriation date.
// Net taxable gain above the exclusion amount flows to Schedule 2.

// TY2025 constants — Rev. Proc. 2024-40, §3.23
const AVG_ANNUAL_TAX_THRESHOLD = 201_000; // IRC §877A(g)(1)(A)(i)
const NET_WORTH_THRESHOLD = 2_000_000;    // IRC §877A(g)(1)(A)(ii) — not inflation-adjusted
const EXCLUSION_AMOUNT = 866_000;          // IRC §877A(a)(3); Rev. Proc. 2024-40

export enum ExpatriateType {
  CITIZEN = "CITIZEN",
  LONG_TERM_RESIDENT = "LONG_TERM_RESIDENT",
}

const assetSchema = z.object({
  // Fair market value on the day before the expatriation date (IRC §877A(a)(1))
  fmv_at_expatriation: z.number().nonnegative(),
  // Adjusted basis in the asset (IRC §877A(a)(1))
  basis: z.number().nonnegative(),
});

export const inputSchema = z.object({
  // Date citizenship was relinquished or long-term residency terminated
  // (Form 8854 Part I line 1; IRC §877A(g)(4))
  expatriation_date: z.string(),
  // CITIZEN or LONG_TERM_RESIDENT (Form 8854 Part I; IRC §877A(g)(2)-(3))
  expatriate_type: z.nativeEnum(ExpatriateType),
  // Average annual net income tax liability for the 5 preceding tax years
  // (Form 8854 Part II line 1; IRC §877A(g)(1)(A)(i))
  average_annual_tax_prior_5_years: z.number().nonnegative(),
  // Net worth on the date of expatriation
  // (Form 8854 Part II line 2; IRC §877A(g)(1)(A)(ii))
  net_worth_at_expatriation: z.number().nonnegative(),
  // Whether taxpayer certified compliance with all US tax obligations for 5 preceding years
  // (Form 8854 Part II line 4; IRC §877A(g)(1)(B))
  certified_tax_compliance: z.boolean(),
  // Assets subject to mark-to-market — one entry per asset
  // (Form 8854 Part IV; IRC §877A(a))
  assets: z.array(assetSchema).optional(),
});

type F8854Input = z.infer<typeof inputSchema>;
type Asset = z.infer<typeof assetSchema>;

function isCoveredExpatriate(input: F8854Input): boolean {
  // Covered if average annual net tax > threshold (IRC §877A(g)(1)(A)(i))
  if (input.average_annual_tax_prior_5_years > AVG_ANNUAL_TAX_THRESHOLD) return true;
  // Covered if net worth >= threshold (IRC §877A(g)(1)(A)(ii))
  if (input.net_worth_at_expatriation >= NET_WORTH_THRESHOLD) return true;
  // Covered if failed to certify tax compliance (IRC §877A(g)(1)(B))
  if (!input.certified_tax_compliance) return true;
  return false;
}

function assetGain(asset: Asset): number {
  return asset.fmv_at_expatriation - asset.basis;
}

function totalNetGain(assets: Asset[]): number {
  return assets.reduce((sum, asset) => sum + assetGain(asset), 0);
}

function taxableGain(assets: Asset[]): number {
  const net = totalNetGain(assets);
  return Math.max(0, net - EXCLUSION_AMOUNT);
}

function exitTaxOutput(input: F8854Input): NodeOutput[] {
  if (!isCoveredExpatriate(input)) return [];
  const assets = input.assets ?? [];
  if (assets.length === 0) return [];
  const gain = taxableGain(assets);
  if (gain === 0) return [];
  return [{ nodeType: schedule2.nodeType, fields: { line17_exit_tax: gain } }];
}

class F8854Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8854";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    return { outputs: exitTaxOutput(parsed) };
  }
}

export const f8854 = new F8854Node();
