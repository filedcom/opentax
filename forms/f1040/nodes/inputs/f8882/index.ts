import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── TY2025 Constants (IRC §45F — Employer-Provided Child Care Credit) ────────

// Credit rates
const CHILD_CARE_FACILITY_RATE = 0.25; // 25% of qualified child care expenses
const RESOURCE_REFERRAL_RATE = 0.10; // 10% of resource/referral expenditures

// Annual cap: $150,000
const ANNUAL_CAP = 150_000;

export const inputSchema = z.object({
  // Qualified expenses for employer-operated or contracted child care facility
  // (Lines 1–3 of Form 8882)
  qualified_childcare_expenses: z.number().nonnegative().optional(),
  // Amounts paid to a qualified child care resource and referral organization
  // (Line 4 of Form 8882)
  resource_referral_expenses: z.number().nonnegative().optional(),
});

type F8882Input = z.infer<typeof inputSchema>;

function computeCredit(input: F8882Input): number {
  const facilityCredit = (input.qualified_childcare_expenses ?? 0) * CHILD_CARE_FACILITY_RATE;
  const referralCredit = (input.resource_referral_expenses ?? 0) * RESOURCE_REFERRAL_RATE;
  return Math.min(facilityCredit + referralCredit, ANNUAL_CAP);
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

class F8882Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8882";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: F8882Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const credit = computeCredit(input);
    return { outputs: buildOutputs(credit) };
  }
}

export const f8882 = new F8882Node();
