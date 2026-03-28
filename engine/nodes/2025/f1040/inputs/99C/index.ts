import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { form982 } from "../../intermediate/form982/index.ts";
import { schedule_d } from "../../intermediate/schedule_d/index.ts";

export const itemSchema = z.object({
  creditor_name: z.string(),
  box1_date: z.string().optional(),
  box2_cod_amount: z.number().nonnegative(),
  box3_interest: z.number().nonnegative().optional(),
  box4_debt_description: z.string().optional(),
  box5_personal_use: z.boolean().optional(),
  box6_identifiable_event: z.string().optional(),
  box7_fmv_property: z.number().nonnegative().optional(),
  routing: z.enum(["taxable", "excluded"]).optional(),
});

export const inputSchema = z.object({
  c99s: z.array(itemSchema).min(1),
});

class C99Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "c99";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, form982, schedule_d]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const out = this.outputNodes.builder();

    for (const item of input.c99s) {
      if ((item.routing ?? "taxable") === "taxable") {
        out.add(schedule1, { line8c_cod_income: item.box2_cod_amount });
      } else {
        out.add(form982, { line2_excluded_cod: item.box2_cod_amount });
      }

      const fmv = item.box7_fmv_property ?? 0;
      if (fmv > 0) {
        out.add(schedule_d, {
          cod_property_fmv: fmv,
          cod_debt_cancelled: item.box2_cod_amount,
        });
      }
    }

    return out.build();
  }
}

export const c99 = new C99Node();
