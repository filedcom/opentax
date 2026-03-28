import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule2 } from "../../intermediate/schedule2/index.ts";
import { schedule_c } from "../../intermediate/schedule_c/index.ts";
import { schedule_f } from "../../intermediate/schedule_f/index.ts";
import { form8919 } from "../../intermediate/form8919/index.ts";

export const itemSchema = z.object({
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

export const inputSchema = z.object({
  necs: z.array(itemSchema).min(1),
});

type NECItem = z.infer<typeof itemSchema>;

function necIncomeOutput(item: NECItem): NodeOutput[] {
  const box1 = item.box1_nec ?? 0;
  if (box1 <= 0) return [];
  switch (item.for_routing ?? "schedule_c") {
    case "schedule_c": return [{ nodeType: schedule_c.nodeType, input: { line1_gross_receipts: box1 } }];
    case "schedule_f": return [{ nodeType: schedule_f.nodeType, input: { line8_other_income: box1 } }];
    case "form_8919": return [{ nodeType: form8919.nodeType, input: { wages: box1 } }];
    case "schedule_1_line_8z": return [{ nodeType: schedule1.nodeType, input: { line8z_other: box1 } }];
    default: return [];
  }
}

function necItemOutputs(item: NECItem): NodeOutput[] {
  const box3 = item.box3_golden_parachute ?? 0;
  const box4 = item.box4_federal_withheld ?? 0;
  return [
    ...necIncomeOutput(item),
    ...(box3 > 0 ? [
      { nodeType: schedule1.nodeType, input: { line8z_golden_parachute: box3 } },
      { nodeType: schedule2.nodeType, input: { line17k_golden_parachute_excise: box3 * 0.20 } },
    ] : []),
    ...(box4 > 0 ? [{ nodeType: f1040.nodeType, input: { line25b_withheld_1099: box4 } }] : []),
  ];
}

class NECNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "nec";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_c,
    schedule_f,
    form8919,
    schedule1,
    schedule2,
    f1040,
  ]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    return { outputs: input.necs.flatMap(necItemOutputs) };
  }
}

export const nec = new NECNode();
