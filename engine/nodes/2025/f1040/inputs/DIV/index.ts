import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";
import { schedule_d } from "../../intermediate/schedule_d/index.ts";
import { form6251 } from "../../intermediate/form6251/index.ts";
import { form8995 } from "../../intermediate/form8995/index.ts";
import { schedule_b_dividends } from "../../intermediate/schedule_b_dividends/index.ts";

export const itemSchema = z.object({
  payer_name: z.string(),
  box1a: z.number().nonnegative(),
  box1b: z.number().nonnegative().optional(),
  box2a: z.number().nonnegative().optional(),
  box2b: z.number().nonnegative().optional(),
  box2c: z.number().nonnegative().optional(),
  box2d: z.number().nonnegative().optional(),
  box3: z.number().nonnegative().optional(),
  box4: z.number().nonnegative().optional(),
  box5: z.number().nonnegative().optional(),
  box6: z.number().nonnegative().optional(),
  box7: z.number().nonnegative().optional(),
  box8: z.string().optional(),
  box9: z.number().nonnegative().optional(),
  box10: z.number().nonnegative().optional(),
  box12: z.number().nonnegative().optional(),
  box13: z.number().nonnegative().optional(),
  is_nominee: z.boolean().optional(),
});

export const inputSchema = z.object({
  div1099s: z.array(itemSchema).min(1),
});

type DIVItem = z.infer<typeof itemSchema>;

function validateDivItem(item: DIVItem): void {
  const box1a = item.box1a;
  const box1b = item.box1b ?? 0;
  const box2a = item.box2a ?? 0;
  const box2b = item.box2b ?? 0;
  const box2c = item.box2c ?? 0;
  const box2d = item.box2d ?? 0;
  const box12 = item.box12 ?? 0;
  const box13 = item.box13 ?? 0;

  if (box1b > box1a) {
    throw new Error(
      `DIV validation error: box1b (${box1b}) cannot exceed box1a (${box1a}) — qualified dividends cannot exceed total ordinary dividends`,
    );
  }
  if (box2b + box2c + box2d > box2a) {
    throw new Error(
      `DIV validation error: sum of box2b+box2c+box2d (${
        box2b + box2c + box2d
      }) cannot exceed box2a (${box2a})`,
    );
  }
  if (box13 > box12) {
    throw new Error(
      `DIV validation error: box13 (${box13}) cannot exceed box12 (${box12}) — specified PAB cannot exceed exempt-interest dividends`,
    );
  }
}

function dividendScheduleBOutput(item: DIVItem): NodeOutput[] {
  return [{
    nodeType: schedule_b_dividends.nodeType,
    input: {
      payer_name: item.payer_name,
      ordinary_dividends: item.box1a,
      is_nominee: item.is_nominee,
    },
  }];
}

function qualifiedDividendOutputs(item: DIVItem): NodeOutput[] {
  const box1b = item.box1b ?? 0;
  if (box1b <= 0) return [];
  return [{ nodeType: f1040.nodeType, input: { line3a_qualified_dividends: box1b } }];
}

function capGainDistributionOutputs(item: DIVItem): NodeOutput[] {
  const box2a = item.box2a ?? 0;
  if (box2a <= 0) return [];
  return [{
    nodeType: schedule_d.nodeType,
    input: {
      line13_cap_gain_distrib: box2a,
      box2b_unrecap_1250: item.box2b,
      box2c_qsbs: item.box2c,
      box2d_collectibles_28: item.box2d,
    },
  }];
}

function withholdingOutputs(item: DIVItem): NodeOutput[] {
  if (item.box4 === undefined || item.box4 <= 0) return [];
  return [{ nodeType: f1040.nodeType, input: { line25b_withheld_1099: item.box4 } }];
}

function sec199aDividendOutputs(item: DIVItem): NodeOutput[] {
  if (item.box5 === undefined || item.box5 <= 0) return [];
  return [{ nodeType: form8995.nodeType, input: { line6_sec199a_dividends: item.box5 } }];
}

function foreignTaxOutputs(item: DIVItem): NodeOutput[] {
  if (item.box7 === undefined || item.box7 <= 0) return [];
  return [{ nodeType: schedule3.nodeType, input: { line1_foreign_tax_1099: item.box7 } }];
}

function taxExemptDividendOutputs(item: DIVItem): NodeOutput[] {
  const box12 = item.box12 ?? 0;
  const box13 = item.box13 ?? 0;
  const netTaxExempt = box12 - box13;
  const outputs: NodeOutput[] = [];
  if (netTaxExempt > 0) {
    outputs.push({ nodeType: f1040.nodeType, input: { line2a_tax_exempt: netTaxExempt } });
  }
  if (box13 > 0) {
    outputs.push({ nodeType: form6251.nodeType, input: { line2g_pab_interest: box13 } });
  }
  return outputs;
}

class DIVNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "div";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_b_dividends,
    f1040,
    schedule_d,
    form8995,
    schedule3,
    form6251,
  ]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const outputs: NodeOutput[] = input.div1099s.flatMap((item) => {
      validateDivItem(item);
      return [
        ...dividendScheduleBOutput(item),
        ...qualifiedDividendOutputs(item),
        ...capGainDistributionOutputs(item),
        ...withholdingOutputs(item),
        ...sec199aDividendOutputs(item),
        ...foreignTaxOutputs(item),
        ...taxExemptDividendOutputs(item),
      ];
    });

    return { outputs };
  }
}

export const div = new DIVNode();
