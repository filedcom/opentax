import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../../../aggregation/general/return-assembly/agi_aggregator/index.ts";
import { schedule2 } from "../../../../aggregation/taxes/other/schedule2/index.ts";
import { schedule1 } from "../../../../../outputs/general/return-assembly/schedule1/index.ts";
import { form8959 } from "../../employment/form8959/index.ts";
import { form8995 } from "../../../deductions/business/form8995/index.ts";
import { form7206 } from "../../../adjustments/health/form7206/index.ts";
import { eitc } from "../../../credits/earned-income/eitc/index.ts";
import { schedule1a } from "../../../deductions/additional/schedule1a/index.ts";
import type { NodeContext } from "../../../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../../../config/index.ts";
import { scheduleSELines } from "./calculation.ts";
import {
  ownedScheduleSE,
  ownerBusinessSchema,
  ownerIdentitySchema,
  ownerWageSchema,
} from "./owner-calculation.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  owner_identity: ownerIdentitySchema.optional(),
  owner_business_sources: z.array(ownerBusinessSchema).optional(),
  owner_wage_sources: z.array(ownerWageSchema).optional(),
  owner_instances: z.array(z.record(z.string(), z.unknown())).optional(),
  // Schedule SE line 2: Schedule C line 31 plus K-1 (Form 1065) box 14 code
  // A (i1040sse, Line 2). The node retains the combined amount.
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

// Schedule C and partnership K-1s each send their own line 2 total; the
// executor merges them into an array, which compute() adds back together.
const nodeInputSchema = inputSchema.extend({
  net_profit_schedule_c: z.union([z.number(), z.array(z.number())])
    .optional(),
});

type ScheduleSEInput = z.infer<typeof nodeInputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function sumAmounts(value: number | number[] | undefined): number | undefined {
  if (!Array.isArray(value)) return value;
  return value.reduce((sum, item) => sum + item, 0);
}

// ─── Node class ───────────────────────────────────────────────────────────────

class ScheduleSENode extends TaxNode<typeof nodeInputSchema> {
  readonly nodeType = "schedule_se";
  readonly inputSchema = nodeInputSchema;
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
    const parsed = nodeInputSchema.parse(rawInput);
    const input = {
      ...parsed,
      net_profit_schedule_c: sumAmounts(parsed.net_profit_schedule_c),
    };
    // Retain the combined line 2 amount, not one entry per producer.
    const combinedLine2 = Array.isArray(parsed.net_profit_schedule_c)
      ? [output(schedule_se, {
        net_profit_schedule_c: parsed.net_profit_schedule_c.reduce(
          (sum, item) => sum + item,
          0,
        ),
      })]
      : [];

    if (input.owner_identity && input.owner_business_sources?.length) {
      if (
        (input.unreported_tips_4137 ?? 0) !== 0 || (input.wages_8919 ?? 0) !== 0
      ) {
        throw new Error(
          "Owned Schedule SE needs separate owner sources for Forms 4137/8919",
        );
      }
      const ownedLine2 = input.owner_business_sources.reduce(
        (sum, row) => row.kind === "schedule_f" ? sum : sum + row.net_profit,
        0,
      );
      // Every line 2 producer also sends its total; a total the owner
      // sources do not account for is earnings no spouse owns.
      if (
        input.net_profit_schedule_c !== undefined &&
        Math.abs(input.net_profit_schedule_c - ownedLine2) > 0.005
      ) {
        throw new Error(
          "Joint Schedule SE line 2 has earnings without an owning spouse",
        );
      }
      const owned = ownedScheduleSE({
        identity: input.owner_identity,
        businesses: input.owner_business_sources,
        wages: input.owner_wage_sources ?? [],
      }, cfg.ssWageBase, cfg);
      const sole = owned.instances.length === 1
        ? owned.instances[0]
        : undefined;
      return {
        outputs: [
          output(schedule_se, {
            ...(input.net_profit_schedule_c === undefined
              ? {}
              : { net_profit_schedule_c: input.net_profit_schedule_c }),
            owner_instances: owned.instances,
            ...(sole ? { w2_ss_wages: sole.w2_ss_wages || undefined } : {}),
          }),
          this.outputNodes.output(schedule2, { line4_se_tax: owned.tax }),
          this.outputNodes.output(schedule1, {
            line15_se_deduction: owned.deduction,
          }),
          this.outputNodes.output(agi_aggregator, {
            line15_se_deduction: owned.deduction,
          }),
          this.outputNodes.output(eitc, { se_tax_deduction: owned.deduction }),
          this.outputNodes.output(form8959, {
            se_income: owned.medicareEarnings,
          }),
          this.outputNodes.output(form8995, {
            se_tax_deduction: owned.deduction,
            joint_se_source: owned.source,
          }),
          this.outputNodes.output(schedule1a, {
            qualified_tips_se_deduction: owned.deduction,
            qualified_tips_owner_se_source: owned.source,
            qualified_tips_ss_wage_base: cfg.ssWageBase,
            qualified_tips_schedule_f_profit: input.net_profit_schedule_f ?? 0,
            qualified_tips_farm_optional_method:
              input.farm_optional_method_elected === true,
          }),
          this.outputNodes.output(form7206, {
            schedule_se_source: {
              // Preserve loss businesses omitted from legacy positive-only SE inputs.
              net_profit_schedule_c: owned.source.businesses.filter((b) =>
                b.kind === "schedule_c"
              ).reduce((sum, b) => sum + b.net_profit, 0),
              net_profit_schedule_f: owned.source.businesses.filter((b) =>
                b.kind === "schedule_f"
              ).reduce((sum, b) => sum + b.net_profit, 0),
              farm_optional_method_elected:
                input.farm_optional_method_elected === true,
              line13_deduction: owned.deduction,
              owner_source: owned.source,
            },
          }),
        ],
      };
    }
    const lines = scheduleSELines(input, cfg.ssWageBase, cfg);
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
      return { outputs: [...combinedLine2, source(0)] };
    }
    const { line6, line12, line13 } = lines;

    const outputs: NodeOutput[] = [
      ...combinedLine2,
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
      // Each spouse's Schedule SE is filed in whole dollars before they add.
      this.outputNodes.output(form8959, { se_income: Math.round(line6) }),
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
