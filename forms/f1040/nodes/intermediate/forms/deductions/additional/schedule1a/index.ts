import type { NodeResult } from "../../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../../core/types/node-context.ts";
import { form8995 } from "../../business/form8995/index.ts";
import { f1040 } from "../../../../../outputs/general/return-assembly/f1040/index.ts";
import { standard_deduction } from "../../../../worksheets/deductions/standard/standard_deduction/index.ts";

import {
  assertVehicleLoanDatesInYear,
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
    assertVehicleLoanDatesInYear(ctx, input);
    // Forms 4070 and employer statements were the 2025 transition sources
    // while W-2s had no separate tip accounting (2025 Form 1040 instructions,
    // Schedule 1-A line 4). From 2026, line 4 takes W-2 box 12 code TP or
    // Form 4137 line 1 column (c) per employer (draft 2026 Schedule 1-A).
    const codeTPYear = ctx.taxYear >= 2026;
    if (
      codeTPYear &&
      (input.form4070_reports !== undefined ||
        input.employer_tip_statements !== undefined)
    ) {
      throw new Error(
        `TY${ctx.taxYear} Schedule 1-A tips come from W-2 box 12 code TP or Form 4137, not Form 4070 reports or employer statements`,
      );
    }
    if (
      !codeTPYear &&
      (input.qualified_employee_tips ?? []).some((tip) =>
        tip.source_type === "w2_code_tp"
      )
    ) {
      throw new Error("Schedule 1-A W-2 code TP tips need tax year 2026 or later");
    }
    const enhancedSeniorDeduction = seniorDeduction(ctx, input);
    const vehicleInterestDeduction = vehicleLoanInterestDeduction(ctx, input);
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
