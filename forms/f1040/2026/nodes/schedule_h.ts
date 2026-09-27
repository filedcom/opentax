import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import { schedule2_2026 } from "./schedule2.ts";

const money = z.number().finite().nonnegative();

export const scheduleHInput2026Schema = z.object({
  employer_ein: z.string().regex(/^\d{9}$/),
  line_a_any_employee_3000: z.boolean(),
  line_b_withheld_income_tax: z.boolean().optional(),
  line_c_futa_quarter: z.boolean().optional(),
  line1_ss_wages: money.default(0),
  line3_medicare_wages: money.default(0),
  line5_additional_medicare_wages: money.default(0),
  line7_income_tax_withheld: money.default(0),
  line9_futa_quarter: z.boolean().optional(),
  futa: z.object({
    line10_one_state: z.boolean(),
    line11_contributions_timely: z.boolean(),
    line12_all_wages_state_taxable: z.boolean(),
    line13_state: z.string().regex(/^[A-Z]{2}$/).optional(),
    line14_contributions: money.optional(),
    futa_wages_by_employee: z.array(money.max(7_000)).min(1).optional(),
  }).strict().optional(),
}).strict();

type Input = z.infer<typeof scheduleHInput2026Schema>;

export function calculateScheduleH2026(
  rawInput: z.input<typeof scheduleHInput2026Schema>,
) {
  const input = scheduleHInput2026Schema.parse(rawInput);
  const {
    line_a_any_employee_3000: lineA,
    line_b_withheld_income_tax: lineB,
    line_c_futa_quarter: lineC,
    line9_futa_quarter: line9,
  } = input;
  if (
    (lineA && (lineB !== undefined || lineC !== undefined ||
      input.line1_ss_wages === 0 || input.line3_medicare_wages === 0)) ||
    (!lineA && (lineB === undefined || (lineB && lineC !== undefined) ||
      (!lineB && lineC === undefined) ||
      input.line1_ss_wages > 0 || input.line3_medicare_wages > 0)) ||
    input.line5_additional_medicare_wages > input.line3_medicare_wages ||
    (lineB === false && input.line7_income_tax_withheld > 0) ||
    (lineB === true && input.line7_income_tax_withheld === 0)
  ) {
    throw new Error(
      "TY2026 Schedule H A/B/C answers disagree with payroll lines",
    );
  }
  const cOnly = !lineA && lineB === false && lineC === true;
  if (!lineA && lineB === false && lineC === false) {
    throw new Error("TY2026 Schedule H has no filing trigger");
  }
  if (
    (cOnly && line9 !== undefined) ||
    (!cOnly && line9 === undefined) ||
    (line9 === false && input.futa !== undefined) ||
    ((cOnly || line9 === true) && input.futa === undefined)
  ) {
    throw new Error("TY2026 Schedule H line 9 and FUTA answers disagree");
  }
  const line2 = Math.round(input.line1_ss_wages * 0.124);
  const line4 = Math.round(input.line3_medicare_wages * 0.029);
  const line6 = Math.round(input.line5_additional_medicare_wages * 0.009);
  const line8 = line2 + line4 + line6 + input.line7_income_tax_withheld;
  const futa = input.futa;
  if (
    futa && (
      !futa.line10_one_state || !futa.line11_contributions_timely ||
      !futa.line12_all_wages_state_taxable
    )
  ) {
    throw new Error(
      "TY2026 Schedule H Section B needs current-year credit-reduction route",
    );
  }
  if (
    futa && (
      !futa.line13_state || futa.line14_contributions === undefined ||
      futa.futa_wages_by_employee === undefined
    )
  ) {
    throw new Error(
      "TY2026 Schedule H Section A needs state contributions and employee FUTA wages",
    );
  }
  const line15 = futa?.futa_wages_by_employee?.reduce(
    (sum, wages) => sum + wages,
    0,
  );
  const line16 = line15 === undefined ? undefined : Math.round(line15 * 0.006);
  const line25 = futa ? (cOnly ? 0 : line8) : undefined;
  const line26 = futa ? line25! + line16! : undefined;
  const totalTax = line26 ?? line8;
  if (totalTax <= 0) {
    throw new Error("TY2026 Schedule H has no employment tax to file");
  }
  return {
    ...input,
    line2_ss_tax: line2,
    line4_medicare_tax: line4,
    line6_additional_medicare_tax: line6,
    line8_fica_and_withholding: line8,
    line15_futa_wages: line15,
    line16_futa_tax: line16,
    line25_fica_to_total: line25,
    line26_total_household_tax: line26,
    line27_files_1040: true,
    total_tax: totalTax,
  };
}

class ScheduleHNode2026 extends TaxNode<typeof scheduleHInput2026Schema> {
  readonly nodeType = "schedule_h";
  readonly inputSchema = scheduleHInput2026Schema;
  readonly outputNodes = new OutputNodes([schedule2_2026]);

  compute(
    ctx: NodeContext,
    rawInput: z.input<typeof scheduleHInput2026Schema>,
  ) {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 Schedule H requires f1040:2026 context");
    }
    const lines = calculateScheduleH2026(rawInput);
    return {
      outputs: [
        this.outputNodes.output(schedule2_2026, {
          line17a_household_employment_tax: lines.total_tax,
        }),
        { nodeType: this.nodeType, fields: lines },
      ],
    };
  }
}

export const schedule_h_2026 = new ScheduleHNode2026();
