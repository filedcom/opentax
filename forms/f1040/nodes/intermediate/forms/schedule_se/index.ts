import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import { form8959 } from "../form8959/index.ts";
import { form8995 } from "../form8995/index.ts";
import { form7206 } from "../form7206/index.ts";
import { eitc } from "../eitc/index.ts";
import { schedule1a } from "../schedule1a/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { scheduleSELines } from "./calculation.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Net profit from Schedule C, line 31 (Sch SE Line 2)
  net_profit_schedule_c: z.number().optional(),
  // Net farm profit from Schedule F, line 34 (Sch SE Line 1a)
  net_profit_schedule_f: z.number().optional(),
  // An affirmative Part II farm optional method election. The farm profit is
  // used for eligibility, but is omitted from Part I line 1a when elected.
  farm_optional_method_elected: z.boolean().optional(),
  // Gross farm income from Schedule F line 9 (and farm K-1 box 14 code B, if
  // applicable), used for the Part II line 15 calculation.
  gross_farm_income: z.number().nonnegative().optional(),
  // Unreported tips from Form 4137, line 10 — offsets SS wage base (Sch SE Line 8b)
  unreported_tips_4137: z.number().nonnegative().optional(),
  // Wages subject to SE from Form 8919, line 10 — offsets SS wage base (Sch SE Line 8c)
  wages_8919: z.number().nonnegative().optional(),
  // W-2 SS wages (box 3 + box 7 tips) — offsets SS wage base (Sch SE Line 8a)
  // IRC §1402(b); Schedule SE Part I Lines 8a–8d
  w2_ss_wages: z.number().nonnegative().optional(),
});

type ScheduleSEInput = z.infer<typeof inputSchema>;

// ─── Node class ───────────────────────────────────────────────────────────────

class ScheduleSENode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_se";
  readonly inputSchema = inputSchema;
  get outputNodes() {
    return new OutputNodes([
      schedule2,
      schedule1,
      agi_aggregator,
      form8959,
      form8995,
      form7206,
      eitc,
      schedule1a,
    ]);
  }

  compute(ctx: NodeContext, rawInput: ScheduleSEInput): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No schedule_se config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);

    const lines = scheduleSELines(input, cfg.ssWageBase);
    const source = (line13Deduction: number) =>
      this.outputNodes.output(form7206, {
        schedule_se_source: {
          net_profit_schedule_c: input.net_profit_schedule_c ?? 0,
          net_profit_schedule_f: input.net_profit_schedule_f ?? 0,
          farm_optional_method_elected:
            input.farm_optional_method_elected === true,
          line13_deduction: line13Deduction,
        },
      });
    if (!lines) {
      return { outputs: [source(0)] };
    }
    const { line6, line12, line13 } = lines;

    const outputs: NodeOutput[] = [
      source(line13),
      this.outputNodes.output(schedule1a, {
        qualified_tips_se_deduction: line13,
        qualified_tips_schedule_f_profit: input.net_profit_schedule_f ?? 0,
        qualified_tips_farm_optional_method:
          input.farm_optional_method_elected === true,
      }),
      this.outputNodes.output(schedule2, { line4_se_tax: line12 }),
      this.outputNodes.output(schedule1, { line15_se_deduction: line13 }),
      this.outputNodes.output(agi_aggregator, { line15_se_deduction: line13 }),
      this.outputNodes.output(eitc, { se_tax_deduction: line13 }),
      // Route net earnings (line 6) to Form 8959 Part II for Additional Medicare Tax.
      // i8959 line 8: "Enter your self-employment income from Schedule SE (Form 1040),
      // Part I, line 6." That is after the 92.35% multiplier. IRC §3101(b)(2).
      this.outputNodes.output(form8959, { se_income: line6 }),
      // Line 13 is a deduction attributable to the trade or business, so it reduces QBI.
      // i8995, Determining Your Qualified Business Income: the items to consider include
      // the "deductible part of self-employment tax".
      this.outputNodes.output(form8995, { se_tax_deduction: line13 }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const schedule_se = new ScheduleSENode();
