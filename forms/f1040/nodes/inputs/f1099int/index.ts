import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output, type AtLeastOne } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { form6251 } from "../../intermediate/form6251/index.ts";
import { form_1116 } from "../../intermediate/form_1116/index.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";
import { schedule_b } from "../../intermediate/schedule_b/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

export const itemSchema = z.object({
  payer_name: z.string().min(1),
  payer_tin: z.string().optional(),
  seller_financed: z.boolean().optional(),
  payer_ssn: z.string().optional(),
  payer_address: z.string().optional(),
  payer_city_state_zip: z.string().optional(),
  box1: z.number().nonnegative().optional(),
  box2: z.number().nonnegative().optional(),
  box3: z.number().nonnegative().optional(),
  box4: z.number().nonnegative().optional(),
  box5: z.number().nonnegative().optional(),
  box6: z.number().nonnegative().optional(),
  box7: z.string().optional(),
  box8: z.number().nonnegative().optional(),
  box9: z.number().nonnegative().optional(),
  box10: z.number().nonnegative().optional(),
  box11: z.number().nonnegative().optional(),
  box12: z.number().nonnegative().optional(),
  box13: z.number().nonnegative().optional(),
  box14: z.string().optional(),
  box15: z.string().optional(),
  box16: z.string().optional(),
  box17: z.number().nonnegative().optional(),
  nominee_interest: z.number().nonnegative().optional(),
  accrued_interest_paid: z.number().nonnegative().optional(),
  non_taxable_oid_adjustment: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f1099ints: z.array(itemSchema).min(1),
  filing_status: z.string().optional(),
});

type INTItem = z.infer<typeof itemSchema>;
type INTInput = z.infer<typeof inputSchema>;

const FOREIGN_TAX_SINGLE_THRESHOLD = 300;
const FOREIGN_TAX_MFJ_THRESHOLD = 600;

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
  if (item.seller_financed) {
    if (!item.payer_ssn || item.payer_ssn.length !== 9) {
      throw new Error(
        "INT validation error: payer SSN must be exactly 9 digits for seller-financed mortgages",
      );
    }
    if (!item.payer_address || item.payer_address.length === 0) {
      throw new Error(
        "INT validation error: payer address is required for seller-financed mortgages",
      );
    }
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

function scheduleBOutput(item: INTItem): NodeOutput {
  return output(schedule_b, {
      payer_name: item.payer_name,
      taxable_interest_net: computeTaxableInterestNet(item),
      box3_us_obligations: item.box3,
    });
}


class F1099intNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099int";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_b,
    schedule1,
    f1040,
    form6251,
    form_1116,
    schedule3,
  ]);

  compute(_ctx: NodeContext, input: INTInput): NodeResult {
    const parsed = inputSchema.parse(input);
    const { f1099ints: int1099s, filing_status } = parsed;

    for (const item of int1099s) {
      validateIntItem(item);
    }

    const totalBox2 = int1099s.reduce((sum, item) => sum + (item.box2 ?? 0), 0);
    const totalBox4 = int1099s.reduce((sum, item) => sum + (item.box4 ?? 0), 0);
    const totalBox6 = int1099s.reduce((sum, item) => sum + (item.box6 ?? 0), 0);
    const totalBox9 = int1099s.reduce((sum, item) => sum + (item.box9 ?? 0), 0);
    const totalTaxExempt = int1099s.reduce(
      (sum, item) => sum + (item.box8 ?? 0) - (item.box13 ?? 0),
      0,
    );

    const outputs: NodeOutput[] = int1099s.map(scheduleBOutput);

    if (totalBox2 > 0) {
      outputs.push(this.outputNodes.output(schedule1, { line18_early_withdrawal: totalBox2 }));
    }

    const f1040Fields: Partial<z.infer<typeof f1040["inputSchema"]>> = {};
    if (totalBox4 > 0) f1040Fields.line25b_withheld_1099 = totalBox4;
    if (totalTaxExempt > 0) f1040Fields.line2a_tax_exempt = totalTaxExempt;
    if (Object.keys(f1040Fields).length > 0) {
      outputs.push(this.outputNodes.output(f1040, f1040Fields as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>));
    }

    if (totalBox9 > 0) {
      outputs.push(this.outputNodes.output(form6251, { line2g_pab_interest: totalBox9 }));
    }

    if (totalBox6 > 0) {
      const threshold = filing_status === "mfj"
        ? FOREIGN_TAX_MFJ_THRESHOLD
        : FOREIGN_TAX_SINGLE_THRESHOLD;
      if (totalBox6 > threshold) {
        outputs.push(this.outputNodes.output(form_1116, { foreign_tax_paid: totalBox6 }));
      } else {
        outputs.push(this.outputNodes.output(schedule3, { line1_foreign_tax_1099: totalBox6 }));
      }
    }

    return { outputs };
  }
}

export const f1099int = new F1099intNode();
