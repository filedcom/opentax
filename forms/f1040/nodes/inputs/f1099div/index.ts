import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output, type AtLeastOne } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { income_tax_calculation } from "../../intermediate/worksheets/income_tax_calculation/index.ts";
import { form8995 } from "../../intermediate/forms/form8995/index.ts";
import { form8995a } from "../../intermediate/forms/form8995a/index.ts";
import { form_1116 } from "../../intermediate/forms/form_1116/index.ts";
import { rate_28_gain_worksheet } from "../../intermediate/worksheets/rate_28_gain_worksheet/index.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { schedule_d } from "../../intermediate/aggregation/schedule_d/index.ts";
import { unrecaptured_1250_worksheet } from "../../intermediate/worksheets/unrecaptured_1250_worksheet/index.ts";
import { form8960 } from "../../intermediate/forms/form8960/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../config/index.ts";
import {
  FOREIGN_TAX_SINGLE_THRESHOLD,
  FOREIGN_TAX_MFJ_THRESHOLD,
} from "../../config/2025.ts";

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

const HOLDING_PERIOD_199A_DAYS = 45;
const HOLDING_PERIOD_FOREIGN_DAYS = 16;

// Normalize a DIV item: clamp sub-box values that may exceed their parent due
// to payer data entry errors.
//
// box1b (qualified dividends) is passed through as reported, even when it
// exceeds box1a (ordinary dividends). The qualified dividend amount from box1b
// flows to the QDCG worksheet regardless of its relationship to box1a.
// Ordinary dividends (box1a) are never inflated.
// All other sub-boxes (box2b–box2f, box5, box13) are clamped to their parents.
function normalizeDivItem(item: DIVItem): DIVItem {
  const box1a = item.box1a;
  const box2a = item.box2a ?? 0;
  const box12 = item.box12 ?? 0;
  return {
    ...item,
    // box1a is authoritative for ordinary dividends — never inflate it
    box1a,
    // box1b is used as reported (qualified dividends may exceed ordinary when
    // payer data has the boxes swapped — passed through without clamping)
    box1b: item.box1b,
    // box5 (§199A dividends) cannot exceed box1a
    box5: item.box5 !== undefined ? Math.min(item.box5, box1a) : undefined,
    // box2e (Section 897 ordinary dividends) cannot exceed box1a
    box2e: item.box2e !== undefined ? Math.min(item.box2e, box1a) : undefined,
    // box2b/box2c/box2d/box2f are sub-components of box2a — clamp each individually
    box2b: item.box2b !== undefined ? Math.min(item.box2b, box2a) : undefined,
    box2c: item.box2c !== undefined ? Math.min(item.box2c, box2a) : undefined,
    box2d: item.box2d !== undefined ? Math.min(item.box2d, box2a) : undefined,
    box2f: item.box2f !== undefined ? Math.min(item.box2f, box2a) : undefined,
    // box13 (specified private activity bond interest) cannot exceed box12 (exempt-interest dividends)
    box13: item.box13 !== undefined ? Math.min(item.box13, box12) : undefined,
  };
}

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

function needsScheduleB(items: DIVItem[], scheduleBDividendThreshold: number): boolean {
  if (items.some((item) => item.isNominee)) return true;
  const totalBox1a = items.reduce((sum, item) => sum + item.box1a, 0);
  return totalBox1a > scheduleBDividendThreshold;
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
  sec199aSingleThreshold: number,
  sec199aMfjThreshold: number,
): boolean {
  if (taxableIncome === undefined) return false;
  const threshold = filingStatus === "mfj"
    ? sec199aMfjThreshold
    : sec199aSingleThreshold;
  return taxableIncome > threshold;
}

class F1099divNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099div";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    agi_aggregator,
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
    form8960,
  ]);

  compute(ctx: NodeContext, input: DIVInput): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const parsed = inputSchema.parse(input);
    const { taxableIncome, filingStatus } = parsed;
    // Normalize items first (clamp sub-box values that payers occasionally report
    // over their parent box due to data entry errors), then validate the rest.
    const div1099s = parsed.f1099divs.map(normalizeDivItem);

    for (const item of div1099s) {
      validateDivItem(item);
    }

    const totalBox7 = div1099s.reduce((sum, item) => sum + (item.box7 ?? 0), 0);
    const anySubAmounts = div1099s.some(
      (item) => (item.box2b ?? 0) > 0 || (item.box2c ?? 0) > 0 || (item.box2d ?? 0) > 0,
    );

    const shouldRouteScheduleB = needsScheduleB(div1099s, cfg.scheduleBDividendThreshold);
    const outputs: NodeOutput[] = shouldRouteScheduleB
      ? div1099s.flatMap(dividendScheduleBOutput)
      : [];

    // Aggregate all f1040 fields into one output
    const f1040Fields: Partial<z.infer<typeof f1040["inputSchema"]>> = {};

    // When below the Schedule B threshold, ordinary dividends don't route through
    // schedule_b — emit them directly to f1040 line 3b and agi_aggregator so they land in AGI.
    if (!shouldRouteScheduleB) {
      const totalOrdinary = div1099s.reduce((sum, item) => sum + item.box1a, 0);
      if (totalOrdinary > 0) {
        f1040Fields.line3b_ordinary_dividends = totalOrdinary;
        outputs.push(this.outputNodes.output(agi_aggregator, { line3b_ordinary_dividends: totalOrdinary }));
      }
    }
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
    if (Object.keys(f1040Fields).length > 0) {
      outputs.push(this.outputNodes.output(f1040, f1040Fields as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>));
    }

    // Qualified dividends → income_tax_calculation for QDCGT worksheet (IRC §1(h))
    if (totalQualDiv > 0) {
      outputs.push(this.outputNodes.output(income_tax_calculation, { qualified_dividends: totalQualDiv }));
    }

    // NII: ordinary dividends subject to NIIT (IRC §1411(c)(1)(A)) → form8960 line 2
    const totalOrdinaryForNiit = div1099s.reduce((sum, item) => sum + item.box1a, 0);
    if (totalOrdinaryForNiit > 0) {
      outputs.push(this.outputNodes.output(form8960, { line2_ordinary_dividends: totalOrdinaryForNiit }));
    }

    // Cap gain distributions always route through Schedule D (IRC §1(h), Sch D line 13).
    // Schedule D computes the combined net_capital_gain and emits it to income_tax_calculation.
    // This prevents double-routing when f1099b transactions also produce net_capital_gain via
    // schedule_d — both sources are consolidated in schedule_d before reaching income_tax_calculation.
    if (totalBox2a > 0) {
      const totalBox2c = div1099s.reduce((sum, item) => sum + (item.box2c ?? 0), 0);
      outputs.push(this.outputNodes.output(schedule_d, {
          line13_cap_gain_distrib: totalBox2a,
          ...(totalBox2c > 0 ? { box2c_qsbs: totalBox2c } : {}),
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
      const useForm8995a = isAbove199AThreshold(taxableIncome, filingStatus, cfg.sec199aSingleThreshold, cfg.sec199aMfjThreshold);
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
