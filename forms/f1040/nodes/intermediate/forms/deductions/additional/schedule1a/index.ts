import type { NodeResult } from "../../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../../core/types/node-context.ts";
import { form8995 } from "../../business/form8995/index.ts";
import { f1040 } from "../../../../../outputs/general/return-assembly/f1040/index.ts";
import { standard_deduction } from "../../../../worksheets/deductions/standard/standard_deduction/index.ts";

import {
  inputSchema,
  qualifiedBusinessTipQbiSource,
  qualifiedOvertimeDeduction,
  qualifiedTipsDeduction,
  type Schedule1AInput,
  seniorDeduction,
  vehicleLoanInterestDeduction,
} from "./calculation.ts";
export * from "./calculation.ts";

class Schedule1ANode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule1a";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, standard_deduction, form8995]);

  compute(ctx: NodeContext, rawInput: Schedule1AInput): NodeResult {
    const input = inputSchema.parse(rawInput);
    const enhancedSeniorDeduction = seniorDeduction(ctx, input);
    const vehicleInterestDeduction = vehicleLoanInterestDeduction(input);
    const deduction = qualifiedTipsDeduction(input) +
      qualifiedOvertimeDeduction(input) +
      vehicleInterestDeduction +
      enhancedSeniorDeduction;
    const tipSource = qualifiedBusinessTipQbiSource(input);
    if (deduction === 0 && tipSource === undefined) return { outputs: [] };
    return {
      outputs: [
        this.outputNodes.output(form8995, {
          additional_deductions: deduction,
          ...(tipSource ? { qualified_tip_qbi_source: tipSource } : {}),
        }),
        this.outputNodes.output(f1040, {
          line13b_additional_deductions: deduction,
          schedule1a_line37_senior_deduction: enhancedSeniorDeduction,
        }),
        this.outputNodes.output(standard_deduction, {
          additional_deductions: deduction,
          enhanced_senior_deduction: enhancedSeniorDeduction,
          qualified_vehicle_loan_interest_deduction: vehicleInterestDeduction,
        }),
      ],
    };
  }
}

export const schedule1a = new Schedule1ANode();
