import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";

// Community property states: AZ, CA, ID, LA, NM, NV, TX, WA, WI
export enum CommunityPropertyState {
  AZ = "AZ",
  CA = "CA",
  ID = "ID",
  LA = "LA",
  NM = "NM",
  NV = "NV",
  TX = "TX",
  WA = "WA",
  WI = "WI",
}

// A single allocation line — one per income/deduction item being split
const allocationItemSchema = z.object({
  description: z.string().optional(),
  // Total amount on the joint return
  total_amount: z.number().optional(),
  // Taxpayer's allocated share
  taxpayer_share: z.number().optional(),
  // Spouse's allocated share
  spouse_share: z.number().optional(),
});

// Form 8958 — Allocation of Tax Amounts Between Certain Individuals
// in Community Property States.
//
// Used on MFS returns in community property states to show how income,
// deductions, and credits are split between spouses.
// This is a disclosure/informational form — the engine records the allocation
// but does not reroute amounts (the splitting happens at data entry time).

export const inputSchema = z.object({
  // State of domicile — must be a community property state
  state: z.nativeEnum(CommunityPropertyState).optional(),

  // Income allocation items
  allocation_items: z.array(allocationItemSchema).optional(),

  // Total taxpayer's allocated income (summary line)
  taxpayer_total_income: z.number().optional(),
  // Total spouse's allocated income (summary line)
  spouse_total_income: z.number().optional(),

  // Withholding allocated to taxpayer
  taxpayer_withholding: z.number().nonnegative().optional(),
  // Withholding allocated to spouse
  spouse_withholding: z.number().nonnegative().optional(),
});

type F8958Input = z.infer<typeof inputSchema>;

class F8958Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8958";
  readonly inputSchema = inputSchema;
  // Form 8958 is disclosure-only — no downstream tax computation nodes.
  readonly outputNodes = new OutputNodes([]);

  compute(rawInput: F8958Input): NodeResult {
    inputSchema.parse(rawInput);
    // No tax computations produced — this form is informational only.
    return { outputs: [] };
  }
}

export const f8958 = new F8958Node();
