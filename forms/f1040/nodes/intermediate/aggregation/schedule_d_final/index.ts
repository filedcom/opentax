import { z } from "zod";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import {
  inputSchema as scheduleDInputSchema,
  schedule_d,
} from "../schedule_d/index.ts";
import { agi_final } from "../agi_final/index.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { income_tax_calculation } from "../../worksheets/income_tax_calculation/index.ts";
import { rate_28_gain_worksheet } from "../../worksheets/rate_28_gain_worksheet/index.ts";
import { form8960 } from "../../forms/form8960/index.ts";
import { form8995 } from "../../forms/form8995/index.ts";

export const inputSchema = z.object({
  provisional_input: z.lazy(() => scheduleDInputSchema),
  capital_reduction: z.number().int().nonnegative(),
});

class ScheduleDFinalNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_d_final";
  readonly inputSchema = inputSchema;
  get outputNodes() {
    return new OutputNodes([
      f1040,
      agi_final,
      income_tax_calculation,
      rate_28_gain_worksheet,
      form8960,
      form8995,
    ]);
  }

  compute(ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    const provisional = input.provisional_input;
    if (provisional.pending_active_4797 !== true) {
      throw new Error(
        "Final Schedule D requires a pending active-rental Form 4797 sale",
      );
    }
    const source = provisional.line_11_form2439;
    const entries = source === undefined
      ? []
      : Array.isArray(source)
      ? source
      : [source];
    const finalInput = scheduleDInputSchema.parse({
      ...provisional,
      pending_active_4797: false,
      line_11_form2439: [...entries, -input.capital_reduction],
    });
    const result = schedule_d.compute(ctx, finalInput);
    const outputs: NodeOutput[] = [];
    const finalizations: NodeOutput[] = [];
    let sentCapital = false;
    for (const row of result.outputs) {
      if (row.nodeType === "agi_aggregator") {
        const capital = row.fields.line7_capital_gain;
        const distribution = row.fields.line7a_cap_gain_distrib;
        if (typeof capital !== "number" && typeof distribution !== "number") {
          throw new Error(
            "Final Schedule D did not provide Form 1040 capital gain",
          );
        }
        outputs.push(this.outputNodes.output(agi_final, {
          capital_finalized: true,
          ...(typeof capital === "number"
            ? { final_capital_gain: capital }
            : {}),
          ...(typeof distribution === "number"
            ? { final_cap_gain_distrib: distribution }
            : {}),
        }));
        sentCapital = true;
      } else if (row.nodeType === "schedule_d") {
        finalizations.push(row);
      } else {
        outputs.push(row);
      }
    }
    if (!sentCapital) {
      outputs.push(this.outputNodes.output(agi_final, {
        capital_finalized: true,
        final_capital_gain: 0,
      }));
    }
    if (finalizations.length > 1) {
      throw new Error("Final Schedule D print totals did not reconcile");
    }
    if (finalizations.length === 0) {
      finalizations.push({
        nodeType: "schedule_d",
        fields: {
          line_11_form2439: entries.reduce((sum, entry) => sum + entry, 0) -
            input.capital_reduction,
          active_4797_final_no_schedule_d: true,
        },
      });
    }
    return { outputs, finalizations };
  }
}

export const schedule_d_final = new ScheduleDFinalNode();
