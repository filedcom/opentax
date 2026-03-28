import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

export const inputSchema = z.object({
  payer_name: z.string(),
  box1a: z.number().nonnegative(),
  box1b: z.number().nonnegative().optional(),
  box2a: z.number().nonnegative().optional(),
  box2b: z.number().nonnegative().optional(),
  box2c: z.number().nonnegative().optional(),
  box2d: z.number().nonnegative().optional(),
  box3: z.number().nonnegative().optional(),
  box4: z.number().nonnegative().optional(),
  box5: z.number().nonnegative().optional(),
  box6: z.number().nonnegative().optional(),
  box7: z.number().nonnegative().optional(),
  box8: z.string().optional(),
  box9: z.number().nonnegative().optional(),
  box10: z.number().nonnegative().optional(),
  box12: z.number().nonnegative().optional(),
  box13: z.number().nonnegative().optional(),
  is_nominee: z.boolean().optional(),
});

type DIVInput = z.infer<typeof inputSchema>;

class DIVNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "div";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = [
    "schedule_b_dividends",
    "f1040",
    "schedule_d",
    "form8995",
    "schedule3",
    "form6251",
  ] as const;

  compute(input: DIVInput): NodeResult {
    const outputs: NodeOutput[] = [];

    const box1a = input.box1a;
    const box1b = input.box1b ?? 0;
    const box2a = input.box2a ?? 0;
    const box2b = input.box2b ?? 0;
    const box2c = input.box2c ?? 0;
    const box2d = input.box2d ?? 0;
    const box12 = input.box12 ?? 0;
    const box13 = input.box13 ?? 0;

    // Validation
    if (box1b > box1a) {
      throw new Error(
        `DIV validation error: box1b (${box1b}) cannot exceed box1a (${box1a}) — qualified dividends cannot exceed total ordinary dividends`,
      );
    }
    if (box2b + box2c + box2d > box2a) {
      throw new Error(
        `DIV validation error: sum of box2b+box2c+box2d (${box2b + box2c + box2d}) cannot exceed box2a (${box2a})`,
      );
    }
    if (box13 > box12) {
      throw new Error(
        `DIV validation error: box13 (${box13}) cannot exceed box12 (${box12}) — specified PAB cannot exceed exempt-interest dividends`,
      );
    }

    // Route box1a → schedule_b_dividends
    outputs.push({
      nodeType: "schedule_b_dividends",
      input: {
        payer_name: input.payer_name,
        ordinary_dividends: box1a,
        is_nominee: input.is_nominee,
      },
    });

    // box1b → f1040 line3a
    if (box1b > 0) {
      outputs.push({
        nodeType: "f1040",
        input: { line3a_qualified_dividends: box1b },
      });
    }

    // box2a → schedule_d
    if (box2a > 0) {
      outputs.push({
        nodeType: "schedule_d",
        input: {
          line13_cap_gain_distrib: box2a,
          box2b_unrecap_1250: box2b,
          box2c_qsbs: box2c,
          box2d_collectibles_28: box2d,
        },
      });
    }

    // box4 → f1040 line25b
    if (input.box4 !== undefined && input.box4 > 0) {
      outputs.push({
        nodeType: "f1040",
        input: { line25b_withheld_1099: input.box4 },
      });
    }

    // box5 → form8995
    if (input.box5 !== undefined && input.box5 > 0) {
      outputs.push({
        nodeType: "form8995",
        input: { line6_sec199a_dividends: input.box5 },
      });
    }

    // box7 → schedule3 line1
    if (input.box7 !== undefined && input.box7 > 0) {
      outputs.push({
        nodeType: "schedule3",
        input: { line1_foreign_tax_1099: input.box7 },
      });
    }

    // box12 - box13 → f1040 line2a
    const netTaxExempt = box12 - box13;
    if (netTaxExempt > 0) {
      outputs.push({
        nodeType: "f1040",
        input: { line2a_tax_exempt: netTaxExempt },
      });
    }

    // box13 → form6251 line2g
    if (box13 > 0) {
      outputs.push({
        nodeType: "form6251",
        input: { line2g_pab_interest: box13 },
      });
    }

    return { outputs };
  }
}

export const div = new DIVNode();
