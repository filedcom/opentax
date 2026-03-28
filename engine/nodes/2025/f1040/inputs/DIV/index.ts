import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";
import { schedule_d } from "../../intermediate/schedule_d/index.ts";
import { form6251 } from "../../intermediate/form6251/index.ts";
import { form8995 } from "../../intermediate/form8995/index.ts";
import { schedule_b_dividends } from "../../intermediate/schedule_b_dividends/index.ts";

export const itemSchema = z.object({
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

export const inputSchema = z.object({
  div1099s: z.array(itemSchema).min(1),
});

class DIVNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "div";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_b_dividends,
    f1040,
    schedule_d,
    form8995,
    schedule3,
    form6251,
  ]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const out = this.outputNodes.builder();

    for (const item of input.div1099s) {
      const box1a = item.box1a;
      const box1b = item.box1b ?? 0;
      const box2a = item.box2a ?? 0;
      const box2b = item.box2b ?? 0;
      const box2c = item.box2c ?? 0;
      const box2d = item.box2d ?? 0;
      const box12 = item.box12 ?? 0;
      const box13 = item.box13 ?? 0;

      // Validation
      if (box1b > box1a) {
        throw new Error(
          `DIV validation error: box1b (${box1b}) cannot exceed box1a (${box1a}) — qualified dividends cannot exceed total ordinary dividends`,
        );
      }
      if (box2b + box2c + box2d > box2a) {
        throw new Error(
          `DIV validation error: sum of box2b+box2c+box2d (${
            box2b + box2c + box2d
          }) cannot exceed box2a (${box2a})`,
        );
      }
      if (box13 > box12) {
        throw new Error(
          `DIV validation error: box13 (${box13}) cannot exceed box12 (${box12}) — specified PAB cannot exceed exempt-interest dividends`,
        );
      }

      out.add(schedule_b_dividends, {
        payer_name: item.payer_name,
        ordinary_dividends: box1a,
        is_nominee: item.is_nominee,
      });

      if (box1b > 0) {
        out.add(f1040, { line3a_qualified_dividends: box1b });
      }

      if (box2a > 0) {
        out.add(schedule_d, {
          line13_cap_gain_distrib: box2a,
          box2b_unrecap_1250: box2b,
          box2c_qsbs: box2c,
          box2d_collectibles_28: box2d,
        });
      }

      if (item.box4 !== undefined && item.box4 > 0) {
        out.add(f1040, { line25b_withheld_1099: item.box4 });
      }

      if (item.box5 !== undefined && item.box5 > 0) {
        out.add(form8995, { line6_sec199a_dividends: item.box5 });
      }

      if (item.box7 !== undefined && item.box7 > 0) {
        out.add(schedule3, { line1_foreign_tax_1099: item.box7 });
      }

      const netTaxExempt = box12 - box13;
      if (netTaxExempt > 0) {
        out.add(f1040, { line2a_tax_exempt: netTaxExempt });
      }

      if (box13 > 0) {
        out.add(form6251, { line2g_pab_interest: box13 });
      }
    }

    return out.build();
  }
}

export const div = new DIVNode();
