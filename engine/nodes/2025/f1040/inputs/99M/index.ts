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
import { schedule_e } from "../../intermediate/schedule_e/index.ts";
import { schedule_f } from "../../intermediate/schedule_f/index.ts";

export const itemSchema = z.object({
  payer_name: z.string(),
  box1_rents: z.number().nonnegative().optional(),
  box2_royalties: z.number().nonnegative().optional(),
  box2_royalties_routing: z.enum(["schedule_e", "schedule_c"]).optional(),
  box3_other_income: z.number().nonnegative().optional(),
  box4_federal_withheld: z.number().nonnegative().optional(),
  box5_fishing_boat: z.number().nonnegative().optional(),
  box6_medical_payments: z.number().nonnegative().optional(),
  box8_substitute_payments: z.number().nonnegative().optional(),
  box9_crop_insurance: z.number().nonnegative().optional(),
  box10_attorney_proceeds: z.number().nonnegative().optional(),
  box11_fish_purchased: z.number().nonnegative().optional(),
  box15_nqdc: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  m99s: z.array(itemSchema).min(1),
});

type M99Item = z.infer<typeof itemSchema>;

function royaltyOutput(item: M99Item): NodeOutput[] {
  const box2 = item.box2_royalties ?? 0;
  if (box2 <= 0) return [];
  return (item.box2_royalties_routing ?? "schedule_e") === "schedule_c"
    ? [{ nodeType: schedule_c.nodeType, input: { line1_gross_receipts: box2 } }]
    : [{ nodeType: schedule_e.nodeType, input: { royalty_income: box2 } }];
}

function m99ItemOutputs(item: M99Item): NodeOutput[] {
  const box15 = item.box15_nqdc ?? 0;
  return [
    ...((item.box1_rents ?? 0) > 0 ? [{ nodeType: schedule_e.nodeType, input: { rental_income: item.box1_rents } }] : []),
    ...royaltyOutput(item),
    ...((item.box3_other_income ?? 0) > 0 ? [{ nodeType: schedule1.nodeType, input: { line8i_prizes_awards: item.box3_other_income } }] : []),
    ...((item.box4_federal_withheld ?? 0) > 0 ? [{ nodeType: f1040.nodeType, input: { line25b_withheld_1099: item.box4_federal_withheld } }] : []),
    ...((item.box5_fishing_boat ?? 0) > 0 ? [{ nodeType: schedule_c.nodeType, input: { line1_gross_receipts: item.box5_fishing_boat } }] : []),
    ...((item.box6_medical_payments ?? 0) > 0 ? [{ nodeType: schedule_c.nodeType, input: { line1_gross_receipts: item.box6_medical_payments } }] : []),
    ...((item.box8_substitute_payments ?? 0) > 0 ? [{ nodeType: schedule1.nodeType, input: { line8z_substitute_payments: item.box8_substitute_payments } }] : []),
    ...((item.box9_crop_insurance ?? 0) > 0 ? [{ nodeType: schedule_f.nodeType, input: { crop_insurance: item.box9_crop_insurance } }] : []),
    ...((item.box10_attorney_proceeds ?? 0) > 0 ? [{ nodeType: schedule1.nodeType, input: { line8z_attorney_proceeds: item.box10_attorney_proceeds } }] : []),
    ...((item.box11_fish_purchased ?? 0) > 0 ? [{ nodeType: schedule_c.nodeType, input: { line1_gross_receipts: item.box11_fish_purchased } }] : []),
    ...(box15 > 0 ? [
      { nodeType: schedule1.nodeType, input: { line8z_nqdc: box15 } },
      { nodeType: schedule2.nodeType, input: { line17h_nqdc_tax: box15 * 0.20 } },
    ] : []),
  ];
}

class M99Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "m99";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_c,
    schedule_e,
    schedule_f,
    schedule1,
    schedule2,
    f1040,
  ]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    return { outputs: input.m99s.flatMap(m99ItemOutputs) };
  }
}

export const m99 = new M99Node();
