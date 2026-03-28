import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

export const inputSchema = z.object({
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

type M99Input = z.infer<typeof inputSchema>;

class M99Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "m99";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = [
    "schedule_c",
    "schedule_e",
    "schedule_f",
    "schedule1",
    "schedule2",
    "f1040",
  ] as const;

  compute(input: M99Input): NodeResult {
    const outputs: NodeOutput[] = [];

    // box1_rents → schedule_e rental_income
    const box1 = input.box1_rents ?? 0;
    if (box1 > 0) {
      outputs.push({
        nodeType: "schedule_e",
        input: { rental_income: box1 },
      });
    }

    // box2_royalties → schedule_e or schedule_c based on routing
    const box2 = input.box2_royalties ?? 0;
    if (box2 > 0) {
      if ((input.box2_royalties_routing ?? "schedule_e") === "schedule_c") {
        outputs.push({
          nodeType: "schedule_c",
          input: { line1_gross_receipts: box2 },
        });
      } else {
        outputs.push({
          nodeType: "schedule_e",
          input: { royalty_income: box2 },
        });
      }
    }

    // box3_other_income → schedule1 line8i_prizes_awards
    const box3 = input.box3_other_income ?? 0;
    if (box3 > 0) {
      outputs.push({
        nodeType: "schedule1",
        input: { line8i_prizes_awards: box3 },
      });
    }

    // box4_federal_withheld → f1040 line25b
    const box4 = input.box4_federal_withheld ?? 0;
    if (box4 > 0) {
      outputs.push({
        nodeType: "f1040",
        input: { line25b_withheld_1099: box4 },
      });
    }

    // box5_fishing_boat → schedule_c line1
    const box5 = input.box5_fishing_boat ?? 0;
    if (box5 > 0) {
      outputs.push({
        nodeType: "schedule_c",
        input: { line1_gross_receipts: box5 },
      });
    }

    // box6_medical_payments → schedule_c line1
    const box6 = input.box6_medical_payments ?? 0;
    if (box6 > 0) {
      outputs.push({
        nodeType: "schedule_c",
        input: { line1_gross_receipts: box6 },
      });
    }

    // box8_substitute_payments → schedule1 line8z
    const box8 = input.box8_substitute_payments ?? 0;
    if (box8 > 0) {
      outputs.push({
        nodeType: "schedule1",
        input: { line8z_substitute_payments: box8 },
      });
    }

    // box9_crop_insurance → schedule_f crop_insurance
    const box9 = input.box9_crop_insurance ?? 0;
    if (box9 > 0) {
      outputs.push({
        nodeType: "schedule_f",
        input: { crop_insurance: box9 },
      });
    }

    // box10_attorney_proceeds → schedule1 line8z
    const box10 = input.box10_attorney_proceeds ?? 0;
    if (box10 > 0) {
      outputs.push({
        nodeType: "schedule1",
        input: { line8z_attorney_proceeds: box10 },
      });
    }

    // box11_fish_purchased → schedule_c line1
    const box11 = input.box11_fish_purchased ?? 0;
    if (box11 > 0) {
      outputs.push({
        nodeType: "schedule_c",
        input: { line1_gross_receipts: box11 },
      });
    }

    // box15_nqdc → schedule1 line8z AND schedule2 line17h (20% excise)
    const box15 = input.box15_nqdc ?? 0;
    if (box15 > 0) {
      outputs.push({
        nodeType: "schedule1",
        input: { line8z_nqdc: box15 },
      });
      outputs.push({
        nodeType: "schedule2",
        input: { line17h_nqdc_tax: box15 * 0.20 },
      });
    }

    return { outputs };
  }
}

export const m99 = new M99Node();
