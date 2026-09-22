import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { standard_deduction } from "../../worksheets/standard_deduction/index.ts";
import { FilingStatus } from "../../../types.ts";

export const inputSchema = z.object({
  qualified_employee_tips: z.number().nonnegative().optional(),
  magi: z.number().optional(),
  filing_status: z.nativeEnum(FilingStatus).optional(),
  has_valid_ssn: z.boolean().optional(),
});

type Schedule1AInput = z.infer<typeof inputSchema>;

const QUALIFIED_TIPS_CAP = 25_000;
const PHASEOUT_THRESHOLD = 150_000;
const PHASEOUT_THRESHOLD_MFJ = 300_000;

export function qualifiedTipsDeduction(input: Schedule1AInput): number {
  const tips = Math.min(input.qualified_employee_tips ?? 0, QUALIFIED_TIPS_CAP);
  if (
    tips === 0 ||
    input.has_valid_ssn !== true ||
    input.filing_status === undefined ||
    input.filing_status === FilingStatus.MFS ||
    input.magi === undefined
  ) {
    return 0;
  }

  const threshold = input.filing_status === FilingStatus.MFJ
    ? PHASEOUT_THRESHOLD_MFJ
    : PHASEOUT_THRESHOLD;
  const phaseoutThousands = Math.floor(
    Math.max(0, input.magi - threshold) / 1_000,
  );
  return Math.max(0, tips - phaseoutThousands * 100);
}

class Schedule1ANode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule1a";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, standard_deduction]);

  compute(_ctx: NodeContext, rawInput: Schedule1AInput): NodeResult {
    const input = inputSchema.parse(rawInput);
    const deduction = qualifiedTipsDeduction(input);
    if (deduction === 0) return { outputs: [] };
    return {
      outputs: [
        this.outputNodes.output(f1040, {
          line13b_additional_deductions: deduction,
        }),
        this.outputNodes.output(standard_deduction, {
          additional_deductions: deduction,
        }),
      ],
    };
  }
}

export const schedule1a = new Schedule1ANode();
