import { z } from "zod";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { form6251 } from "../../intermediate/form6251/index.ts";
import { form8995 } from "../../intermediate/form8995/index.ts";
import { form8995a } from "../../intermediate/form8995a/index.ts";
import { form_1116 } from "../../intermediate/form_1116/index.ts";
import { rate_28_gain_worksheet } from "../../intermediate/rate_28_gain_worksheet/index.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";
import { schedule_b } from "../../intermediate/schedule_b/index.ts";
import { schedule_d } from "../../intermediate/schedule_d/index.ts";
import { unrecaptured_1250_worksheet } from "../../intermediate/unrecaptured_1250_worksheet/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

export const itemSchema = z.object({
  payerName: z.string(),
  isNominee: z.boolean(),
  box11: z.boolean(),
  box1a: z.number().nonnegative(),
  box1b: z.number().nonnegative().optional(),
  box2a: z.number().nonnegative().optional(),
  box2b: z.number().nonnegative().optional(),
  box2c: z.number().nonnegative().optional(),
  box2d: z.number().nonnegative().optional(),
  box2e: z.number().nonnegative().optional(),
  box2f: z.number().nonnegative().optional(),
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
  box14: z.string().optional(),
  box15: z.string().optional(),
  box16: z.number().nonnegative().optional(),
  holdingPeriodDays: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  div1099s: z.array(itemSchema).min(0),
  taxableIncome: z.number().nonnegative().optional(),
  filingStatus: z.string().optional(),
});

type DIVItem = z.infer<typeof itemSchema>;
type DIVInput = z.infer<typeof inputSchema>;

const SCHEDULE_B_DIVIDEND_THRESHOLD = 1500;
const FOREIGN_TAX_SINGLE_THRESHOLD = 300;
const FOREIGN_TAX_MFJ_THRESHOLD = 600;
const SEC199A_SINGLE_THRESHOLD = 197300;
const SEC199A_MFJ_THRESHOLD = 394600;
const HOLDING_PERIOD_199A_DAYS = 45;
const HOLDING_PERIOD_FOREIGN_DAYS = 16;

function validateDivItem(item: DIVItem): void {
  const box1a = item.box1a;
  const box1b = item.box1b ?? 0;
  const box2a = item.box2a ?? 0;
  const box2b = item.box2b ?? 0;
  const box2c = item.box2c ?? 0;
  const box2d = item.box2d ?? 0;
  const box2e = item.box2e ?? 0;
  const box2f = item.box2f ?? 0;
  const box5 = item.box5 ?? 0;
  const box12 = item.box12 ?? 0;
  const box13 = item.box13 ?? 0;

  if (box1b > box1a) {
    throw new Error(
      `DIV validation error: box1b (${box1b}) cannot exceed box1a (${box1a}) — qualified dividends cannot exceed total ordinary dividends`,
    );
  }
  if (box2b + box2c + box2d + box2f > box2a) {
    throw new Error(
      `DIV validation error: sum of box2b+box2c+box2d+box2f (${
        box2b + box2c + box2d + box2f
      }) cannot exceed box2a (${box2a})`,
    );
  }
  if (box2f > box2a) {
    throw new Error(
      `DIV validation error: box2f (${box2f}) cannot exceed box2a (${box2a})`,
    );
  }
  if (box2e > box1a) {
    throw new Error(
      `DIV validation error: box2e (${box2e}) cannot exceed box1a (${box1a}) — Section 897 ordinary dividends cannot exceed total ordinary dividends`,
    );
  }
  if (box5 > box1a && item.holdingPeriodDays === undefined) {
    throw new Error(
      `DIV validation error: box5 (${box5}) cannot exceed box1a (${box1a}) — §199A dividends cannot exceed total ordinary dividends`,
    );
  }
  if (box13 > box12) {
    throw new Error(
      `DIV validation error: box13 (${box13}) cannot exceed box12 (${box12}) — specified PAB cannot exceed exempt-interest dividends`,
    );
  }
}

function needsScheduleB(items: DIVItem[]): boolean {
  if (items.some((item) => item.isNominee)) return true;
  const totalBox1a = items.reduce((sum, item) => sum + item.box1a, 0);
  return totalBox1a > SCHEDULE_B_DIVIDEND_THRESHOLD;
}

function dividendScheduleBOutput(item: DIVItem): NodeOutput[] {
  return [{
    nodeType: schedule_b.nodeType,
    input: {
      payerName: item.payerName,
      ordinaryDividends: item.box1a,
      isNominee: item.isNominee,
    },
  }];
}

function qualifiedDividendOutputs(item: DIVItem): NodeOutput[] {
  const box1b = item.box1b ?? 0;
  if (box1b <= 0) return [];
  return [{
    nodeType: f1040.nodeType,
    input: { line3a_qualified_dividends: box1b },
  }];
}

function capGainDistributionOutputs(item: DIVItem, anySubAmounts: boolean): NodeOutput[] {
  const box2a = item.box2a ?? 0;
  if (box2a <= 0) return [];

  const box2c = item.box2c ?? 0;

  if (!anySubAmounts) {
    return [{ nodeType: f1040.nodeType, input: { line7a_cap_gain_distrib: box2a } }];
  }

  return [{
    nodeType: schedule_d.nodeType,
    input: {
      line13_cap_gain_distrib: box2a,
      box2c_qsbs: box2c > 0 ? box2c : undefined,
    },
  }];
}

function unrecaptured1250Outputs(item: DIVItem): NodeOutput[] {
  const box2b = item.box2b ?? 0;
  if (box2b <= 0) return [];
  return [{
    nodeType: unrecaptured_1250_worksheet.nodeType,
    input: { unrecaptured_1250_gain: box2b },
  }];
}

function collectiblesGainOutputs(item: DIVItem): NodeOutput[] {
  const box2d = item.box2d ?? 0;
  if (box2d <= 0) return [];
  return [{
    nodeType: rate_28_gain_worksheet.nodeType,
    input: { collectibles_gain: box2d },
  }];
}

function withholdingOutputs(item: DIVItem): NodeOutput[] {
  if (item.box4 === undefined || item.box4 <= 0) return [];
  return [{
    nodeType: f1040.nodeType,
    input: { line25b_withheld_1099: item.box4 },
  }];
}

function sec199aDividendOutputs(
  item: DIVItem,
  taxableIncome: number | undefined,
  filingStatus: string | undefined,
): NodeOutput[] {
  const box5 = item.box5 ?? 0;
  if (box5 <= 0) return [];

  const holdingMet = item.holdingPeriodDays === undefined ||
    item.holdingPeriodDays >= HOLDING_PERIOD_199A_DAYS;
  if (!holdingMet) return [];

  const useForm8995a = isAbove199AThreshold(taxableIncome, filingStatus);
  return [{
    nodeType: useForm8995a ? form8995a.nodeType : form8995.nodeType,
    input: { line6_sec199a_dividends: box5 },
  }];
}

function isAbove199AThreshold(
  taxableIncome: number | undefined,
  filingStatus: string | undefined,
): boolean {
  if (taxableIncome === undefined) return false;
  const threshold = filingStatus === "mfj"
    ? SEC199A_MFJ_THRESHOLD
    : SEC199A_SINGLE_THRESHOLD;
  return taxableIncome > threshold;
}

function foreignTaxOutputs(
  item: DIVItem,
  totalBox7: number,
  filingStatus: string | undefined,
): NodeOutput[] {
  if (item.box7 === undefined || item.box7 <= 0) return [];

  const holdingMet = item.holdingPeriodDays === undefined ||
    item.holdingPeriodDays >= HOLDING_PERIOD_FOREIGN_DAYS;
  if (!holdingMet) return [];

  const threshold = filingStatus === "mfj"
    ? FOREIGN_TAX_MFJ_THRESHOLD
    : FOREIGN_TAX_SINGLE_THRESHOLD;

  if (totalBox7 > threshold) {
    return [{
      nodeType: form_1116.nodeType,
      input: { foreign_tax_paid: item.box7 },
    }];
  }
  return [{
    nodeType: schedule3.nodeType,
    input: { line1_foreign_tax_1099: item.box7 },
  }];
}

function taxExemptDividendOutputs(item: DIVItem): NodeOutput[] {
  const box12 = item.box12 ?? 0;
  const box13 = item.box13 ?? 0;
  const netTaxExempt = box12 - box13;
  const outputs: NodeOutput[] = [];
  if (netTaxExempt > 0) {
    outputs.push({
      nodeType: f1040.nodeType,
      input: { line2a_tax_exempt: netTaxExempt },
    });
  }
  if (box13 > 0) {
    outputs.push({
      nodeType: form6251.nodeType,
      input: { line2g_pab_interest: box13 },
    });
  }
  return outputs;
}

class DIVNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "div";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_b,
    f1040,
    schedule_d,
    form8995,
    form8995a,
    schedule3,
    form6251,
    form_1116,
    unrecaptured_1250_worksheet,
    rate_28_gain_worksheet,
  ]);

  processItem(
    item: DIVItem,
    totalBox7: number,
    taxableIncome: number | undefined,
    filingStatus: string | undefined,
    scheduleB: boolean,
    anySubAmounts: boolean,
  ): NodeOutput[] {
    validateDivItem(item);
    return [
      ...(scheduleB ? dividendScheduleBOutput(item) : []),
      ...qualifiedDividendOutputs(item),
      ...capGainDistributionOutputs(item, anySubAmounts),
      ...unrecaptured1250Outputs(item),
      ...collectiblesGainOutputs(item),
      ...withholdingOutputs(item),
      ...sec199aDividendOutputs(item, taxableIncome, filingStatus),
      ...foreignTaxOutputs(item, totalBox7, filingStatus),
      ...taxExemptDividendOutputs(item),
    ];
  }

  compute(input: DIVInput): NodeResult {
    const parsed = inputSchema.parse(input);
    const { div1099s, taxableIncome, filingStatus } = parsed;

    const scheduleB = needsScheduleB(div1099s);
    const totalBox7 = div1099s.reduce((sum, item) => sum + (item.box7 ?? 0), 0);
    const anySubAmounts = div1099s.some(
      (item) => (item.box2b ?? 0) > 0 || (item.box2c ?? 0) > 0 || (item.box2d ?? 0) > 0,
    );

    const outputs: NodeOutput[] = div1099s.flatMap((item) =>
      this.processItem(item, totalBox7, taxableIncome, filingStatus, scheduleB, anySubAmounts)
    );
    return { outputs };
  }
}

export const div = new DIVNode();
