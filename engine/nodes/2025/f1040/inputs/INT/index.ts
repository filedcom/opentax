import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { form6251 } from "../../intermediate/form6251/index.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";
import { schedule_b_interest } from "../../intermediate/schedule_b_interest/index.ts";

export const itemSchema = z.object({
  payer_name: z.string(),
  box1: z.number().nonnegative().optional(),
  box2: z.number().nonnegative().optional(),
  box3: z.number().nonnegative().optional(),
  box4: z.number().nonnegative().optional(),
  box6: z.number().nonnegative().optional(),
  box7: z.string().optional(),
  box8: z.number().nonnegative().optional(),
  box9: z.number().nonnegative().optional(),
  box10: z.number().nonnegative().optional(),
  box11: z.number().nonnegative().optional(),
  box12: z.number().nonnegative().optional(),
  box13: z.number().nonnegative().optional(),
  nominee_interest: z.number().nonnegative().optional(),
  accrued_interest_paid: z.number().nonnegative().optional(),
  non_taxable_oid_adjustment: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  int1099s: z.array(itemSchema).min(1),
});

type INTItem = z.infer<typeof itemSchema>;

function validateIntItem(item: INTItem): void {
  const box8 = item.box8 ?? 0;
  const box9 = item.box9 ?? 0;
  const box13 = item.box13 ?? 0;
  if (box9 > box8) {
    throw new Error(
      `INT validation error: box9 (${box9}) cannot exceed box8 (${box8}) — box9 is a subset of box8`,
    );
  }
  if (box13 > box8) {
    throw new Error(
      `INT validation error: box13 (${box13}) cannot exceed box8 (${box8}) — bond premium on tax-exempt cannot exceed tax-exempt interest`,
    );
  }
}

function computeTaxableInterestNet(item: INTItem): number {
  return (item.box1 ?? 0) +
    (item.box3 ?? 0) +
    (item.box10 ?? 0) -
    (item.box11 ?? 0) -
    (item.box12 ?? 0) -
    (item.nominee_interest ?? 0) -
    (item.accrued_interest_paid ?? 0) -
    (item.non_taxable_oid_adjustment ?? 0);
}

function interestScheduleBOutput(item: INTItem): z.infer<typeof schedule_b_interest.inputSchema> {
  const box9 = item.box9 ?? 0;
  return {
    payer_name: item.payer_name,
    taxable_interest_net: computeTaxableInterestNet(item),
    box3_us_obligations: item.box3,
    box9_pab: box9 > 0 ? box9 : undefined,
  };
}

class INTNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "int";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_b_interest,
    schedule1,
    f1040,
    form6251,
    schedule3,
  ]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const out = this.outputNodes.builder();

    for (const item of input.int1099s) {
      validateIntItem(item);

      const box8 = item.box8 ?? 0;
      const box9 = item.box9 ?? 0;
      const box13 = item.box13 ?? 0;

      out.add(schedule_b_interest, interestScheduleBOutput(item));

      if (item.box2 !== undefined && item.box2 > 0) {
        out.add(schedule1, { line18_early_withdrawal: item.box2 });
      }

      if (item.box4 !== undefined && item.box4 > 0) {
        out.add(f1040, { line25b_withheld_1099: item.box4 });
      }

      const netTaxExempt = box8 - box13;
      if (netTaxExempt > 0) {
        out.add(f1040, { line2a_tax_exempt: netTaxExempt });
      }

      if (box9 > 0) {
        out.add(form6251, { line2g_pab_interest: box9 });
      }

      if (item.box6 !== undefined && item.box6 > 0) {
        out.add(schedule3, { line1_foreign_tax_1099: item.box6 });
      }
    }

    return out.build();
  }
}

export const int = new INTNode();
