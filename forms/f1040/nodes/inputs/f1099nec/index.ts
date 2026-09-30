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
    .enum(["schedule_c", "schedule_f", "form_8919", "schedule_1_line_8j"])
    .optional(),
  schedule_c_business_reference: z.string().trim().min(1).optional(),
  nonbusiness_activity_description: z.string().trim().min(1).max(100)
    .optional(),
  farm_id: z.string().min(1).optional(),
}).superRefine((item, ctx) => {
  if ((item.box3_golden_parachute ?? 0) > (item.box1_nec ?? 0)) {
    ctx.addIssue({
      code: "custom",
      path: ["box3_golden_parachute"],
      message: "1099-NEC box 3 excess must be included in box 1 compensation",
    });
  }
  if ((item.box1_nec ?? 0) <= 0) return;
  if (!item.for_routing) {
    ctx.addIssue({
      code: "custom",
      path: ["for_routing"],
      message: "Positive 1099-NEC box 1 needs an explicit income route",
    });
  }
  if (
    item.for_routing === "schedule_c" &&
    (!item.schedule_c_business_reference || !item.recipient_ssn)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["schedule_c_business_reference"],
      message: "1099-NEC Schedule C income needs a business and recipient TIN",
    });
  }
  if (
    item.for_routing === "schedule_f" &&
    (!item.farm_id || !item.recipient_ssn || !item.payer_name.trim() ||
      !/^\d{9}$/.test(item.payer_tin.replaceAll("-", "")))
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["farm_id"],
      message:
        "1099-NEC farm income needs a farm, payer, and recipient identity",
    });
  }
  if (
    item.for_routing === "schedule_1_line_8j" &&
    (!item.recipient_ssn || !item.nonbusiness_activity_description ||
      !item.payer_name.trim() ||
      !/^\d{9}$/.test(item.payer_tin.replaceAll("-", "")))
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["nonbusiness_activity_description"],
      message:
        "1099-NEC nonbusiness activity needs a description, recipient, and payer identity",
    });
  }
  if (
    item.for_routing === "schedule_c" &&
    (!item.payer_name.trim() ||
      !/^\d{9}$/.test(item.payer_tin.replaceAll("-", "")))
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["payer_tin"],
      message:
        "1099-NEC Schedule C income needs a payer name and nine-digit TIN",
    });
  }
});

export const inputSchema = z.object({
  f1099necs: z.array(itemSchema).min(1),
});

type NECItem = z.infer<typeof itemSchema>;

function necIncomeOutput(item: NECItem): NodeOutput[] {
  const box1 = item.box1_nec ?? 0;
  if (box1 <= 0) return [];
  switch (item.for_routing) {
    case "schedule_c":
      return [];
    case "schedule_f": {
      if (!item.farm_id) {
        throw new Error("1099-NEC farm income requires farm_id");
      }
      return [output(schedule_f, {
        farm_sources: [{
          farm_id: item.farm_id,
          kind: "1099nec_farm_income",
          amount: box1,
          payer_name: item.payer_name,
          payer_tin: item.payer_tin.replaceAll("-", ""),
          recipient_tin: item.recipient_ssn!.replaceAll("-", ""),
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
    case "schedule_1_line_8j":
      return [];
    default:
      return [];
  }
}

function nonbusinessOtherIncome(items: readonly NECItem[]): number {
  return items.filter((item) => item.for_routing === "schedule_1_line_8j")
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
          output(schedule2, { line17k_golden_parachute_excise: box3 * 0.20 }),
        ]
        : []),
      ...(box4 > 0 ? [output(f1040, { line25b_withheld_1099: box4 })] : []),
    ];
  }

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const nonbusinessIncome = nonbusinessOtherIncome(parsed.f1099necs);
    const nonbusinessSources = parsed.f1099necs.flatMap((item) =>
      item.for_routing === "schedule_1_line_8j" &&
        (item.box1_nec ?? 0) > 0
        ? [{
          payer_name: item.payer_name,
          payer_tin: item.payer_tin.replaceAll("-", ""),
          recipient_tin: item.recipient_ssn!.replaceAll("-", ""),
          description: item.nonbusiness_activity_description!,
          amount: item.box1_nec!,
        }]
        : []
    );
    const scheduleCSources = parsed.f1099necs.flatMap((item) =>
      item.for_routing === "schedule_c" && (item.box1_nec ?? 0) > 0
        ? [{
          business_reference: item.schedule_c_business_reference!,
          payer_name: item.payer_name,
          payer_tin: item.payer_tin.replaceAll("-", ""),
          recipient_tin: item.recipient_ssn!.replaceAll("-", ""),
          amount: item.box1_nec!,
        }]
        : []
    );
    return {
      outputs: [
        ...parsed.f1099necs.flatMap((item) => this.processItem(item)),
        ...(scheduleCSources.length > 0
          ? [output(schedule_c, { f1099nec_receipt_sources: scheduleCSources })]
          : []),
        ...(nonbusinessIncome > 0
          ? [
            output(schedule1, {
              f1099nec_nonbusiness_sources: nonbusinessSources,
            }),
            output(agi_aggregator, {
              line8j_f1099nec_nonbusiness: nonbusinessIncome,
            }),
          ]
          : []),
      ],
    };
  }
}

export const f1099nec = new F1099necNode();
