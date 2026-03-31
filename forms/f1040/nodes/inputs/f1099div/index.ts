import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output, type AtLeastOne } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { form6251 } from "../../intermediate/form6251/index.ts";
import { income_tax_calculation } from "../../intermediate/income_tax_calculation/index.ts";
import { form8995 } from "../../intermediate/form8995/index.ts";
import { form8995a } from "../../intermediate/form8995a/index.ts";
import { form_1116 } from "../../intermediate/form_1116/index.ts";
import { rate_28_gain_worksheet } from "../../intermediate/rate_28_gain_worksheet/index.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";
import { schedule_b } from "../../intermediate/schedule_b/index.ts";
import { schedule_d } from "../../intermediate/schedule_d/index.ts";
import { unrecaptured_1250_worksheet } from "../../intermediate/unrecaptured_1250_worksheet/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

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
  f1099divs: z.array(itemSchema).min(0),
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
  return [output(schedule_b, {
      payerName: item.payerName,
      ordinaryDividends: item.box1a,
      isNominee: item.isNominee,
    })];
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

class F1099divNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099div";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_b,
    f1040,
    schedule_d,
    income_tax_calculation,
    form8995,
    form8995a,
    schedule3,
    form6251,
    form_1116,
    unrecaptured_1250_worksheet,
    rate_28_gain_worksheet,
  ]);

  compute(_ctx: NodeContext, input: DIVInput): NodeResult {
    const parsed = inputSchema.parse(input);
    const { f1099divs: div1099s, taxableIncome, filingStatus } = parsed;

    for (const item of div1099s) {
      validateDivItem(item);
    }

    const totalBox7 = div1099s.reduce((sum, item) => sum + (item.box7 ?? 0), 0);
    const anySubAmounts = div1099s.some(
      (item) => (item.box2b ?? 0) > 0 || (item.box2c ?? 0) > 0 || (item.box2d ?? 0) > 0,
    );

    const outputs: NodeOutput[] = needsScheduleB(div1099s)
      ? div1099s.flatMap(dividendScheduleBOutput)
      : [];

    // Aggregate all f1040 fields into one output
    const f1040Fields: Partial<z.infer<typeof f1040["inputSchema"]>> = {};
    const totalQualDiv = div1099s.reduce((sum, item) => sum + (item.box1b ?? 0), 0);
    if (totalQualDiv > 0) f1040Fields.line3a_qualified_dividends = totalQualDiv;
    const totalWithholding = div1099s.reduce((sum, item) => sum + (item.box4 ?? 0), 0);
    if (totalWithholding > 0) f1040Fields.line25b_withheld_1099 = totalWithholding;
    const totalTaxExempt = div1099s.reduce(
      (sum, item) => sum + (item.box12 ?? 0),
      0,
    );
    if (totalTaxExempt > 0) f1040Fields.line2a_tax_exempt = totalTaxExempt;
    const totalBox2a = div1099s.reduce((sum, item) => sum + (item.box2a ?? 0), 0);
    if (totalBox2a > 0 && !anySubAmounts) f1040Fields.line7a_cap_gain_distrib = totalBox2a;
    if (Object.keys(f1040Fields).length > 0) {
      outputs.push(this.outputNodes.output(f1040, f1040Fields as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>));
    }

    // Qualified dividends → income_tax_calculation for QDCGT worksheet (IRC §1(h))
    if (totalQualDiv > 0) {
      outputs.push(this.outputNodes.output(income_tax_calculation, { qualified_dividends: totalQualDiv }));
    }

    // Cap gain distribution → schedule_d when sub-amounts present
    if (totalBox2a > 0 && anySubAmounts) {
      const totalBox2c = div1099s.reduce((sum, item) => sum + (item.box2c ?? 0), 0);
      outputs.push(this.outputNodes.output(schedule_d, {
          line13_cap_gain_distrib: totalBox2a,
          box2c_qsbs: totalBox2c > 0 ? totalBox2c : undefined,
        }));
    }

    const totalBox2b = div1099s.reduce((sum, item) => sum + (item.box2b ?? 0), 0);
    if (totalBox2b > 0) {
      outputs.push(this.outputNodes.output(unrecaptured_1250_worksheet, { unrecaptured_1250_gain: totalBox2b }));
    }

    const totalBox2d = div1099s.reduce((sum, item) => sum + (item.box2d ?? 0), 0);
    if (totalBox2d > 0) {
      outputs.push(this.outputNodes.output(rate_28_gain_worksheet, { collectibles_gain: totalBox2d }));
    }

    // §199A dividends — only items meeting holding period qualify
    const totalBox5 = div1099s
      .filter((item) =>
        item.holdingPeriodDays === undefined || item.holdingPeriodDays >= HOLDING_PERIOD_199A_DAYS
      )
      .reduce((sum, item) => sum + (item.box5 ?? 0), 0);
    if (totalBox5 > 0) {
      const useForm8995a = isAbove199AThreshold(taxableIncome, filingStatus);
      outputs.push({
        nodeType: useForm8995a ? form8995a.nodeType : form8995.nodeType,
        fields: { line6_sec199a_dividends: totalBox5 },
      });
    }

    // PAB interest from exempt-interest dividends (form6251)
    const totalBox13 = div1099s.reduce((sum, item) => sum + (item.box13 ?? 0), 0);
    if (totalBox13 > 0) {
      outputs.push(this.outputNodes.output(form6251, { private_activity_bond_interest: totalBox13 }));
    }

    // Foreign tax — only items meeting holding period; totalBox7 determines routing
    const eligibleBox7 = div1099s
      .filter((item) =>
        (item.box7 ?? 0) > 0 &&
        (item.holdingPeriodDays === undefined || item.holdingPeriodDays >= HOLDING_PERIOD_FOREIGN_DAYS)
      )
      .reduce((sum, item) => sum + (item.box7 ?? 0), 0);
    if (eligibleBox7 > 0) {
      const threshold = filingStatus === "mfj"
        ? FOREIGN_TAX_MFJ_THRESHOLD
        : FOREIGN_TAX_SINGLE_THRESHOLD;
      if (totalBox7 > threshold) {
        outputs.push(this.outputNodes.output(form_1116, { foreign_tax_paid: eligibleBox7 }));
      } else {
        outputs.push(this.outputNodes.output(schedule3, { line1_foreign_tax_1099: eligibleBox7 }));
      }
    }

    return { outputs };
  }
}

export const f1099div = new F1099divNode();
