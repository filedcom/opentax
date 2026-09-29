import { z } from "zod";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import {
  agi_aggregator,
  inputSchema as agiInputSchema,
} from "../agi_aggregator/index.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { scheduleA } from "../../../inputs/schedule_a/index.ts";
import { standard_deduction } from "../../worksheets/standard_deduction/index.ts";
import { eitc } from "../../forms/eitc/index.ts";
import { f8812 } from "../../../inputs/f8812/index.ts";
import { f2441 } from "../../../inputs/f2441/index.ts";
import { form8995 } from "../../forms/form8995/index.ts";
import { form8960 } from "../../forms/form8960/index.ts";
import { form8962 } from "../../forms/form8962/index.ts";
import { form8880 } from "../../forms/form8880/index.ts";
import { form_1116 } from "../../forms/form_1116/index.ts";
import { schedule1a } from "../../forms/schedule1a/index.ts";
import { schedule_j_calculation } from "../../forms/schedule_j/index.ts";

export const inputSchema = z.object({
  pre_pal_input: z.lazy(() => agiInputSchema),
  capital_finalized: z.literal(true),
  final_capital_gain: z.number().optional(),
  final_cap_gain_distrib: z.number().nonnegative().optional(),
  allowed_part_i: z.number().int().nonnegative(),
  allowed_part_ii: z.number().int().nonnegative(),
  allowed_total: z.number().int().nonnegative(),
  part_i_ordinary_loss: z.number().int().nonpositive(),
});

class AgiFinalNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "agi_final";
  readonly inputSchema = inputSchema;
  get outputNodes() {
    return new OutputNodes([
      f1040,
      standard_deduction,
      scheduleA,
      eitc,
      f8812,
      f2441,
      form8995,
      form8960,
      form8962,
      form8880,
      form_1116,
      schedule1a,
      schedule_j_calculation,
    ]);
  }

  compute(ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    const pre = input.pre_pal_input;
    if (pre.pal_pending_active_4797 !== true) {
      throw new Error(
        "Final AGI requires a pending active-rental Form 4797 sale",
      );
    }
    if (input.allowed_part_i + input.allowed_part_ii > input.allowed_total) {
      throw new Error("Form 4797 PAL exceeds the Form 8582 allowed total");
    }
    const finalInput = agiInputSchema.parse({
      ...pre,
      pal_pending_active_4797: false,
      line7_capital_gain: input.final_capital_gain,
      line7a_cap_gain_distrib: input.final_cap_gain_distrib,
      line4_other_gains: (pre.line4_other_gains ?? 0) -
        input.allowed_part_ii + input.part_i_ordinary_loss,
      pal_4797_preapplied_loss: input.allowed_part_i + input.allowed_part_ii,
      pal_final_allowed_loss: input.allowed_total,
    });
    const result = agi_aggregator.compute(ctx, finalInput);
    return {
      ...result,
      outputs: result.outputs.filter((row) => row.nodeType !== "form8582"),
    };
  }
}

export const agi_final = new AgiFinalNode();
