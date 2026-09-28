import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import { scheduleC as schedule_c } from "../schedule_c/index.ts";
import { schedule_f } from "../../intermediate/forms/schedule_f/index.ts";
import { form8919 } from "../../intermediate/forms/form8919/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

export const itemSchema = z.object({
  payer_name: z.string(),
  payer_tin: z.string(),
  recipient_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).optional(),
  box1_nec: z.number().nonnegative().optional(),
  box2_direct_sales: z.boolean().optional(),
  box3_golden_parachute: z.number().nonnegative().optional(),
  box4_federal_withheld: z.number().nonnegative().optional(),
  for_routing: z
    .enum(["schedule_c", "schedule_f", "form_8919", "schedule_1_line_8z"])
    .optional(),
  farm_id: z.string().min(1).optional(),
});

export const inputSchema = z.object({
  f1099necs: z.array(itemSchema).min(1),
});

type NECItem = z.infer<typeof itemSchema>;

function necIncomeOutput(item: NECItem): NodeOutput[] {
  const box1 = item.box1_nec ?? 0;
  if (box1 <= 0) return [];
  switch (item.for_routing ?? "schedule_c") {
    case "schedule_c":
      // Synthesize a minimal schedule_c item so the schedule_c node can compute SE tax
      // and QBI. Required header fields are defaulted for NEC-sourced entries.
      return [output(schedule_c, {
        schedule_cs: [{
          line_a_principal_business: item.payer_name ??
            "Self-employment income",
          line_b_business_code: "999999",
          line_f_accounting_method: "cash",
          line_g_material_participation: true,
          line_1_gross_receipts: box1,
        }],
      })];
    case "schedule_f": {
      if (!item.farm_id) {
        throw new Error("1099-NEC farm income requires farm_id");
      }
      return [output(schedule_f, {
        farm_sources: [{
          farm_id: item.farm_id,
          kind: "1099nec_farm_income",
          amount: box1,
        }],
      })];
    }
    case "form_8919":
      if (!item.recipient_ssn) {
        throw new Error("1099-NEC routed to Form 8919 needs recipient_ssn");
      }
      return [output(form8919, {
        form1099_sources: [{
          kind: "1099nec",
          recipient_ssn: item.recipient_ssn,
          payer_name: item.payer_name,
          payer_tin: item.payer_tin,
          amount: box1,
        }],
      })];
    case "schedule_1_line_8z":
      return [];
    default:
      return [];
  }
}

function nonbusinessOtherIncome(items: readonly NECItem[]): number {
  return items.filter((item) => item.for_routing === "schedule_1_line_8z")
    .reduce((sum, item) => sum + (item.box1_nec ?? 0), 0);
}

class F1099necNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099nec";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_c,
    schedule_f,
    form8919,
    schedule1,
    agi_aggregator,
    schedule2,
    f1040,
  ]);

  processItem(item: NECItem): NodeOutput[] {
    const box3 = item.box3_golden_parachute ?? 0;
    const box4 = item.box4_federal_withheld ?? 0;
    return [
      ...necIncomeOutput(item),
      ...(box3 > 0
        ? [
          output(schedule1, { line8z_golden_parachute: box3 }),
          output(schedule2, { line17k_golden_parachute_excise: box3 * 0.20 }),
        ]
        : []),
      ...(box4 > 0 ? [output(f1040, { line25b_withheld_1099: box4 })] : []),
    ];
  }

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const nonbusinessIncome = nonbusinessOtherIncome(parsed.f1099necs);
    return {
      outputs: [
        ...parsed.f1099necs.flatMap((item) => this.processItem(item)),
        ...(nonbusinessIncome > 0
          ? [
            output(schedule1, {
              line8z_f1099nec_nonbusiness: nonbusinessIncome,
            }),
            output(agi_aggregator, {
              line8z_f1099nec_nonbusiness: nonbusinessIncome,
            }),
          ]
          : []),
      ],
    };
  }
}

export const f1099nec = new F1099necNode();
