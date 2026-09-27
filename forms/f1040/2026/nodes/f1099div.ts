import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import { itemSchema as sharedItemSchema } from "../../nodes/inputs/f1099div/index.ts";
import { agi_aggregator } from "../../nodes/intermediate/aggregation/agi_aggregator/index.ts";
import { form8960 } from "../../nodes/intermediate/forms/form8960/index.ts";
import { income_tax_calculation } from "../../nodes/intermediate/worksheets/income_tax_calculation/index.ts";
import { f1040_2026_node } from "./f1040.ts";
import { schedule_b_2026 } from "./schedule_b.ts";

const amount = z.number().finite().nonnegative();

/** Current 2026 graph route for ordinary and qualified 1099-DIV income. */
export const f1099divItem2026Schema = sharedItemSchema.extend({
  payerName: z.string().trim().min(1),
  box1a: amount,
  box1b: amount.optional(),
  box4: amount.optional(),
}).strict().superRefine((item, ctx) => {
  const reject = (message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  if ((item.box1b ?? 0) > item.box1a) {
    reject("1099-DIV qualified dividends exceed ordinary dividends");
  }
  if (item.isNominee || item.box11) {
    reject("TY2026 1099-DIV nominee or FATCA reporting needs its filed route");
  }
  if (
    [item.box2a, item.box2b, item.box2c, item.box2d, item.box2e, item.box2f]
      .some((value) => (value ?? 0) > 0)
  ) {
    reject("TY2026 1099-DIV capital gains need Schedule D and related routes");
  }
  if (
    [item.box3, item.box9, item.box10].some((value) => (value ?? 0) > 0)
  ) {
    reject("TY2026 1099-DIV distributions need basis accounting");
  }
  if ((item.box5 ?? 0) > 0) {
    reject("TY2026 1099-DIV section 199A dividends need the QBI route");
  }
  if (
    [item.box6, item.box7].some((value) => (value ?? 0) > 0) ||
    item.box8 || item.foreign_source_dividends_usd ||
    item.foreign_source_qualified_dividends_usd ||
    item.foreign_tax_irs_country_code
  ) {
    reject("TY2026 1099-DIV foreign tax needs Form 1116 or direct credit");
  }
  if ((item.box12 ?? 0) > 0 || (item.box13 ?? 0) > 0) {
    reject("TY2026 1099-DIV exempt-interest dividends need the AGI route");
  }
  if (item.box14 || item.box15 || (item.box16 ?? 0) > 0) {
    reject("TY2026 1099-DIV state withholding needs the Schedule A route");
  }
  if (item.investment_property_for_form4952 === true) {
    reject("TY2026 1099-DIV investment property needs Form 4952");
  }
});

export const f1099divInput2026Schema = z.object({
  f1099divs: z.array(f1099divItem2026Schema),
}).strict();

class F1099DivNode2026 extends TaxNode<typeof f1099divInput2026Schema> {
  readonly nodeType = "f1099div";
  readonly inputSchema = f1099divInput2026Schema;
  readonly outputNodes = new OutputNodes([
    schedule_b_2026,
    agi_aggregator,
    f1040_2026_node,
    income_tax_calculation,
    form8960,
  ]);

  compute(ctx: NodeContext, rawInput: z.input<typeof f1099divInput2026Schema>) {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 1099-DIV requires f1040:2026 context");
    }
    const { f1099divs } = this.inputSchema.parse(rawInput);
    const ordinary = f1099divs.reduce((sum, item) => sum + item.box1a, 0);
    const qualified = f1099divs.reduce(
      (sum, item) => sum + (item.box1b ?? 0),
      0,
    );
    const withholding = f1099divs.reduce(
      (sum, item) => sum + (item.box4 ?? 0),
      0,
    );
    const outputs = [];
    if (ordinary > 1_500) {
      for (const item of f1099divs) {
        if (item.box1a === 0) continue;
        outputs.push(this.outputNodes.output(schedule_b_2026, {
          payerName: item.payerName,
          ordinaryDividends: item.box1a,
          isNominee: false,
        }));
      }
    } else if (ordinary > 0) {
      outputs.push(this.outputNodes.output(schedule_b_2026, {
        dividend_info: f1099divs.filter((item) => item.box1a > 0).map(
          (item) => ({ payerName: item.payerName, amount: item.box1a }),
        ),
      }));
      outputs.push(this.outputNodes.output(agi_aggregator, {
        line3b_ordinary_dividends: ordinary,
      }));
      outputs.push(this.outputNodes.output(f1040_2026_node, {
        line3b_ordinary_dividends: ordinary,
      }));
    }
    if (qualified > 0) {
      outputs.push(this.outputNodes.output(f1040_2026_node, {
        line3a_qualified_dividends: qualified,
      }));
      outputs.push(this.outputNodes.output(income_tax_calculation, {
        qualified_dividends: qualified,
      }));
    }
    if (withholding > 0) {
      outputs.push(this.outputNodes.output(f1040_2026_node, {
        line25b_withheld_1099: withholding,
      }));
    }
    if (ordinary > 0) {
      outputs.push(this.outputNodes.output(form8960, {
        line2_ordinary_dividends: ordinary,
      }));
    }
    return { outputs };
  }
}

export const f1099div_2026 = new F1099DivNode2026();
