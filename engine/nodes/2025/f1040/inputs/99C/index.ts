import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

export const inputSchema = z.object({
  creditor_name: z.string(),
  box1_date: z.string().optional(),
  box2_cod_amount: z.number().nonnegative(),
  box3_interest: z.number().nonnegative().optional(),
  box4_debt_description: z.string().optional(),
  box5_personal_use: z.boolean().optional(),
  box6_identifiable_event: z.string().optional(),
  box7_fmv_property: z.number().nonnegative().optional(),
  routing: z.enum(["taxable", "excluded"]).default("taxable"),
});

type C99Input = z.infer<typeof inputSchema>;

class C99Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "c99";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = [
    "schedule1",
    "form982",
    "schedule_d",
  ] as const;

  compute(input: C99Input): NodeResult {
    const outputs: NodeOutput[] = [];

    // Route COD amount based on routing flag
    if (input.routing === "taxable") {
      outputs.push({
        nodeType: "schedule1",
        input: { line8c_cod_income: input.box2_cod_amount },
      });
    } else {
      outputs.push({
        nodeType: "form982",
        input: { line2_excluded_cod: input.box2_cod_amount },
      });
    }

    // Property disposition: box7_fmv_property > 0 → schedule_d
    const fmv = input.box7_fmv_property ?? 0;
    if (fmv > 0) {
      outputs.push({
        nodeType: "schedule_d",
        input: {
          cod_property_fmv: fmv,
          cod_debt_cancelled: input.box2_cod_amount,
        },
      });
    }

    return { outputs };
  }
}

export const c99 = new C99Node();
