import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
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
    const out = this.outputNodes.builder();

    for (const item of input.m99s) {
      const box1 = item.box1_rents ?? 0;
      if (box1 > 0) {
        out.add(schedule_e, { rental_income: box1 });
      }

      const box2 = item.box2_royalties ?? 0;
      if (box2 > 0) {
        if ((item.box2_royalties_routing ?? "schedule_e") === "schedule_c") {
          out.add(schedule_c, { line1_gross_receipts: box2 });
        } else {
          out.add(schedule_e, { royalty_income: box2 });
        }
      }

      const box3 = item.box3_other_income ?? 0;
      if (box3 > 0) {
        out.add(schedule1, { line8i_prizes_awards: box3 });
      }

      const box4 = item.box4_federal_withheld ?? 0;
      if (box4 > 0) {
        out.add(f1040, { line25b_withheld_1099: box4 });
      }

      const box5 = item.box5_fishing_boat ?? 0;
      if (box5 > 0) {
        out.add(schedule_c, { line1_gross_receipts: box5 });
      }

      const box6 = item.box6_medical_payments ?? 0;
      if (box6 > 0) {
        out.add(schedule_c, { line1_gross_receipts: box6 });
      }

      const box8 = item.box8_substitute_payments ?? 0;
      if (box8 > 0) {
        out.add(schedule1, { line8z_substitute_payments: box8 });
      }

      const box9 = item.box9_crop_insurance ?? 0;
      if (box9 > 0) {
        out.add(schedule_f, { crop_insurance: box9 });
      }

      const box10 = item.box10_attorney_proceeds ?? 0;
      if (box10 > 0) {
        out.add(schedule1, { line8z_attorney_proceeds: box10 });
      }

      const box11 = item.box11_fish_purchased ?? 0;
      if (box11 > 0) {
        out.add(schedule_c, { line1_gross_receipts: box11 });
      }

      const box15 = item.box15_nqdc ?? 0;
      if (box15 > 0) {
        out.add(schedule1, { line8z_nqdc: box15 });
        out.add(schedule2, { line17h_nqdc_tax: box15 * 0.20 });
      }
    }

    return out.build();
  }
}

export const m99 = new M99Node();
