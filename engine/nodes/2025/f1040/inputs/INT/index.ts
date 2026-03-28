import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

export const inputSchema = z.object({
  payer_name: z.string(),
  box1: z.number().nonnegative().optional().default(0),
  box2: z.number().nonnegative().optional(),
  box3: z.number().nonnegative().optional(),
  box4: z.number().nonnegative().optional(),
  box6: z.number().nonnegative().optional(),
  box7: z.string().optional(),
  box8: z.number().nonnegative().optional(),
  box9: z.number().nonnegative().optional(),
  box10: z.number().nonnegative().optional(),
  box11: z.number().nonnegative().optional(),
  box12: z.number().nonnegative().optional(),
  box13: z.number().nonnegative().optional(),
  nominee_interest: z.number().nonnegative().optional(),
  accrued_interest_paid: z.number().nonnegative().optional(),
  non_taxable_oid_adjustment: z.number().nonnegative().optional(),
});

type INTInput = z.infer<typeof inputSchema>;

class INTNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "int";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = [
    "schedule_b_interest",
    "schedule1",
    "f1040",
    "form6251",
    "schedule3",
  ] as const;

  compute(input: INTInput): NodeResult {
    const outputs: NodeOutput[] = [];

    const box8 = input.box8 ?? 0;
    const box9 = input.box9 ?? 0;
    const box13 = input.box13 ?? 0;

    // Validation
    if (box9 > box8) {
      throw new Error(
        `INT validation error: box9 (${box9}) cannot exceed box8 (${box8}) — box9 is a subset of box8`,
      );
    }
    if (box13 > box8) {
      throw new Error(
        `INT validation error: box13 (${box13}) cannot exceed box8 (${box8}) — bond premium on tax-exempt cannot exceed tax-exempt interest`,
      );
    }

    // Compute taxable_interest_net
    const taxableInterestNet =
      (input.box1 ?? 0) +
      (input.box3 ?? 0) +
      (input.box10 ?? 0) -
      (input.box11 ?? 0) -
      (input.box12 ?? 0) -
      (input.nominee_interest ?? 0) -
      (input.accrued_interest_paid ?? 0) -
      (input.non_taxable_oid_adjustment ?? 0);

    // Route to schedule_b_interest
    outputs.push({
      nodeType: "schedule_b_interest",
      input: {
        payer_name: input.payer_name,
        taxable_interest_net: taxableInterestNet,
        box3_us_obligations: input.box3,
        box9_pab: box9 > 0 ? box9 : undefined,
      },
    });

    // box2 → schedule1 line18
    if (input.box2 !== undefined && input.box2 > 0) {
      outputs.push({
        nodeType: "schedule1",
        input: { line18_early_withdrawal: input.box2 },
      });
    }

    // box4 → f1040 line25b
    if (input.box4 !== undefined && input.box4 > 0) {
      outputs.push({
        nodeType: "f1040",
        input: { line25b_withheld_1099: input.box4 },
      });
    }

    // box8 - box13 → f1040 line2a (if > 0)
    const netTaxExempt = box8 - box13;
    if (netTaxExempt > 0) {
      outputs.push({
        nodeType: "f1040",
        input: { line2a_tax_exempt: netTaxExempt },
      });
    }

    // box9 → form6251 line2g
    if (box9 > 0) {
      outputs.push({
        nodeType: "form6251",
        input: { line2g_pab_interest: box9 },
      });
    }

    // box6 → schedule3 line1
    if (input.box6 !== undefined && input.box6 > 0) {
      outputs.push({
        nodeType: "schedule3",
        input: { line1_foreign_tax_1099: input.box6 },
      });
    }

    return { outputs };
  }
}

export const int = new INTNode();
