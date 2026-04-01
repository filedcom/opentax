import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8912 — Credit to Holders of Tax Credit Bonds (IRC §54A–54F, §1397E)
// Holders of specified tax credit bonds claim a credit equal to:
//   face_amount × credit_rate × (holding_period_days / total_days_in_period)
//
// Bond programs were repealed by TCJA (P.L. 115-97) for bonds issued after 12/31/2017.
// Existing bonds (issued before 2018) continue to generate credits.
// The credit is includible in gross income (IRC §54A(f)).

// ─── Enum — Bond Types ────────────────────────────────────────────────────────

export enum BondType {
  // Clean Renewable Energy Bonds (IRC §54C) — original program
  CREB = "CREB",
  // New Clean Renewable Energy Bonds (IRC §54D) — successor program
  NEW_CREB = "NEW_CREB",
  // Qualified Energy Conservation Bonds (IRC §54D / §54E)
  QECB = "QECB",
  // Qualified Zone Academy Bonds (IRC §1397E)
  QZAB = "QZAB",
  // Qualified School Construction Bonds (IRC §54F)
  QSCB = "QSCB",
  // Build America Bonds — Direct Payment type (IRC §54AA)
  BAB_DIRECT = "BAB_DIRECT",
}

// ─── Per-item schema ──────────────────────────────────────────────────────────

// One entry per bond position held during the tax year
export const itemSchema = z.object({
  // Type of qualified tax credit bond (IRC §54A-54F, §1397E)
  bond_type: z.nativeEnum(BondType),
  // Face amount of the bond held (IRC §54A(b)(2))
  face_amount: z.number().nonnegative(),
  // Applicable credit rate as set by IRS at issuance (IRC §54A(b)(3))
  credit_rate: z.number().nonnegative(),
  // Number of days the taxpayer held the bond during the tax year (IRC §54A(b)(4))
  holding_period_days: z.number().nonnegative(),
  // Total days in the tax year — 365 or 366 (leap year) (IRC §54A(b)(4))
  total_days_in_period: z.number().positive(),
});

export const inputSchema = z.object({
  f8912s: z.array(itemSchema).min(1),
});

type F8912Item = z.infer<typeof itemSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function bondCredit(item: F8912Item): number {
  if (item.face_amount === 0 || item.credit_rate === 0 || item.holding_period_days === 0) {
    return 0;
  }
  return item.face_amount * item.credit_rate * (item.holding_period_days / item.total_days_in_period);
}

function totalCredit(items: F8912Item[]): number {
  return items.reduce((sum, item) => sum + bondCredit(item), 0);
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class F8912Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8912";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    // Validate total_days_in_period > 0 (already enforced by schema .positive())
    const credit = totalCredit(input.f8912s);
    return { outputs: buildOutputs(credit) };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const f8912 = new F8912Node();
