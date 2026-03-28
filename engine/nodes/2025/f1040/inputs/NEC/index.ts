import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

export const inputSchema = z.object({
  payer_name: z.string(),
  payer_tin: z.string(),
  box1_nec: z.number().nonnegative().optional(),
  box2_direct_sales: z.boolean().optional(),
  box3_golden_parachute: z.number().nonnegative().optional(),
  box4_federal_withheld: z.number().nonnegative().optional(),
  for_routing: z
    .enum(["schedule_c", "schedule_f", "form_8919", "schedule_1_line_8z"])
    .optional(),
});

type NECInput = z.infer<typeof inputSchema>;

class NECNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "nec";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = [
    "schedule_c",
    "schedule_f",
    "form8919",
    "schedule1",
    "schedule2",
    "f1040",
  ] as const;

  compute(input: NECInput): NodeResult {
    const outputs: NodeOutput[] = [];

    const box1 = input.box1_nec ?? 0;
    const box3 = input.box3_golden_parachute ?? 0;
    const box4 = input.box4_federal_withheld ?? 0;
    const routing = input.for_routing ?? "schedule_c";

    // box1_nec routing based on for_routing
    if (box1 > 0) {
      switch (routing) {
        case "schedule_c":
          outputs.push({
            nodeType: "schedule_c",
            input: { line1_gross_receipts: box1 },
          });
          break;
        case "schedule_f":
          outputs.push({
            nodeType: "schedule_f",
            input: { line8_other_income: box1 },
          });
          break;
        case "form_8919":
          outputs.push({
            nodeType: "form8919",
            input: { wages: box1 },
          });
          break;
        case "schedule_1_line_8z":
          outputs.push({
            nodeType: "schedule1",
            input: { line8z_other: box1 },
          });
          break;
      }
    }

    // box3_golden_parachute → schedule1 + schedule2 excise
    if (box3 > 0) {
      outputs.push({
        nodeType: "schedule1",
        input: { line8z_golden_parachute: box3 },
      });
      outputs.push({
        nodeType: "schedule2",
        input: { line17k_golden_parachute_excise: box3 * 0.20 },
      });
    }

    // box4_federal_withheld → f1040 line25b
    if (box4 > 0) {
      outputs.push({
        nodeType: "f1040",
        input: { line25b_withheld_1099: box4 },
      });
    }

    return { outputs };
  }
}

export const nec = new NECNode();
