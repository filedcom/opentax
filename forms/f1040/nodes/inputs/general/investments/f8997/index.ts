import type { NodeResult } from "../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { configForYear } from "../../../../config/index.ts";
import {
  calculateForm8997Statement,
  inputSchema,
  type Form8997Input,
} from "./ledger.ts";

export {
  calculateForm8997Statement,
  QofEventKind,
  QofInclusionType,
  QofSpecialGainCode,
  inputSchema,
} from "./ledger.ts";
export type { Form8997Input, Form8997Statement } from "./ledger.ts";

class F8997Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8997";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(ctx: NodeContext, rawInput: Form8997Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (input.tax_year !== ctx.taxYear) {
      throw new Error(`Form 8997 ledger must be for tax year ${ctx.taxYear}`);
    }
    if (configForYear(ctx.taxYear).qofDeferralPeriodEnds) {
      throw new Error(
        `Form 8997 end-of-deferral recognition (Part III Section B, Part V) for tax year ${ctx.taxYear} is not computed`,
      );
    }
    const statement = calculateForm8997Statement(input);
    if (statement.part_ii.rows.length > 0 || statement.part_iii.rows.length > 0) {
      throw new Error(
        "Form 8997 current-year deferral/inclusion needs finalized Form 8949 and source reconciliation before calculating the return",
      );
    }
    // Pure opening/closing holdings do not affect tax. Both exporters retain
    // their Form 8997 attachment guard until native/PDF and source joins exist.
    return { outputs: [] };
  }
}

export const f8997 = new F8997Node();
