import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8379 — Injured Spouse Allocation
//
// Filed when one spouse's portion of a joint refund would be offset for the
// other spouse's past-due debts (child support, federal/state taxes, student
// loans, unemployment compensation, etc.).
//
// This is an allocation/disclosure form. It does not alter tax computation —
// it directs the IRS on how to split the refund between spouses.
// No downstream tax-computation outputs are produced.

export const inputSchema = z.object({
  // Injured spouse identification
  injured_spouse_ssn: z.string().optional(),
  injured_spouse_name: z.string().optional(),

  // Income — injured spouse's share
  injured_spouse_wages: z.number().nonnegative().optional(),
  injured_spouse_se_income: z.number().optional(),          // can be negative (loss)
  injured_spouse_other_income: z.number().optional(),

  // Withholding / payments — injured spouse's share
  injured_spouse_withholding: z.number().nonnegative().optional(),
  injured_spouse_estimated_tax: z.number().nonnegative().optional(),
  injured_spouse_eic: z.number().nonnegative().optional(),

  // Deductions
  injured_spouse_itemized_deductions: z.number().nonnegative().optional(),
  // Whether the injured spouse itemizes (false = standard deduction)
  itemizes: z.boolean().optional(),

  // Credits
  injured_spouse_credits: z.number().nonnegative().optional(),

  // Debt information — the other spouse's past-due obligations
  debt_type: z.enum([
    "child_support",
    "federal_tax",
    "state_tax",
    "student_loan",
    "unemployment",
    "other",
  ]).optional(),
  debt_amount: z.number().nonnegative().optional(),
});

type F8379Input = z.infer<typeof inputSchema>;

class F8379Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8379";
  readonly inputSchema = inputSchema;
  // Form 8379 is allocation/disclosure only — no tax-computation outputs.
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: F8379Input): NodeResult {
    inputSchema.parse(rawInput);
    return { outputs: [] };
  }
}

export const f8379 = new F8379Node();
