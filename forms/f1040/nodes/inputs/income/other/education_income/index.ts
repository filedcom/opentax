import { educationCents } from "./money.ts";
import {
  requiredServiceScholarshipAmount,
} from "./required-service-scholarship.ts";
import { z } from "zod";
import {
  type NodeResult,
  TaxNode,
} from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { schedule1 } from "../../../../outputs/general/return-assembly/schedule1/index.ts";
import { agi_aggregator } from "../../../../intermediate/aggregation/general/return-assembly/agi_aggregator/index.ts";
import { inputSchema as w2Schema } from "../../wages/w2/index.ts";

export {
  educationIncomeSources,
  itemSchema,
  scholarshipIncomeTotal,
} from "./sources.ts";
import {
  type EducationIncome,
  educationIncomeSources,
  itemSchema,
  scholarshipIncomeTotal,
} from "./sources.ts";
import { assertDependentScholarshipReturn } from "./dependent-scholarship-review.ts";
export const inputSchema = z.object({ education_incomes: z.array(itemSchema) });
export function assertEducationIncomeSource(
  pending: Readonly<Record<string, unknown>> | undefined,
  owners: readonly string[],
  filedScholarship?: unknown,
): EducationIncome[] {
  const rows = educationIncomeSources(pending?.education_income);
  const ownerSet = new Set(owners.map((ssn) => ssn.replaceAll("-", "")));
  if (rows.some((row) => !ownerSet.has(row.student_ssn.replaceAll("-", "")))) {
    throw new Error(
      "Taxable education income source recipient must match this return's filer or joint spouse",
    );
  }
  const scholarship = scholarshipIncomeTotal(pending?.education_income);
  if (scholarship !== (filedScholarship ?? 0)) {
    throw new Error(
      "Schedule 1 line 8r differs from retained taxable scholarship sources",
    );
  }
  const wages = pending?.w2 === undefined ? [] : w2Schema.parse(pending.w2).w2s;
  const payrollRows = rows.flatMap((row) =>
    row.kind === "w2_education_payment"
      ? [{
        reference: row.source_document_reference,
        student: row.student_ssn,
        ein: row.employer_ein,
        box1: row.w2_box1_wages,
        taxable: row.taxable_amount,
      }]
      : row.kind === "scholarship_for_required_services" &&
          row.reporting.kind === "w2_box1"
      ? [{
        reference: row.reporting.w2_source_document_reference,
        student: row.student_ssn,
        ein: row.payer_ein,
        box1: row.reporting.w2_box1_wages,
        taxable: requiredServiceScholarshipAmount(row),
      }]
      : []
  );
  const allocated = new Map<string, number>();
  for (const row of payrollRows) {
    const copies = wages.filter((wage) =>
      wage.source_document_reference === row.reference
    );
    allocated.set(
      row.reference,
      (allocated.get(row.reference) ?? 0) + educationCents(row.taxable),
    );
    if (
      copies.length !== 1 ||
      copies[0].employee_ssn?.replaceAll("-", "") !==
        row.student.replaceAll("-", "") ||
      copies[0].employer_ein?.replaceAll("-", "") !==
        row.ein.replaceAll("-", "") ||
      copies[0].box1_wages !== row.box1 ||
      allocated.get(row.reference)! > educationCents(row.box1)
    ) {
      throw new Error(
        "Taxable education payroll allocation differs from the student's retained issued W-2 copy",
      );
    }
  }
  const final1040 = pending?.f1040 as Record<string, unknown> | undefined;
  const schedule = pending?.schedule1 as Record<string, unknown> | undefined;
  if (
    rows.length && (!final1040 ||
      (schedule?.line10_total_additional_income ?? 0) !==
        (final1040.line8_additional_income ?? 0))
  ) {
    throw new Error(
      "Taxable education income needs finalized Schedule 1/Form 1040 additional income reconciliation",
    );
  }
  if (rows.length && final1040) {
    const agi = pending?.agi_aggregator as Record<string, unknown> | undefined;
    const totalIncome = [
      "line1z_total_wages",
      "line2b_taxable_interest",
      "line3b_ordinary_dividends",
      "line4b_ira_taxable",
      "line5b_pension_taxable",
      "line6b_ss_taxable",
      "line7_capital_gain",
      "line7a_cap_gain_distrib",
      "line8_additional_income",
    ].reduce((sum, key) => sum + Number(final1040[key] ?? 0), 0);
    if (
      !agi || (agi.line8r_taxable_scholarships ?? 0) !== scholarship ||
      final1040.line9_total_income !== totalIncome ||
      final1040.line11_agi !==
        totalIncome - Number(final1040.line10_adjustments ?? 0)
    ) {
      throw new Error(
        "Taxable education income must reconcile through the income aggregator and finalized total income/AGI",
      );
    }
    if (schedule) {
      const rebuilt = schedule1.compute(
        { taxYear: 2025, formType: "f1040" },
        schedule1.inputSchema.parse(schedule),
      ).outputs[0].fields;
      if (
        (rebuilt.line9_total_other_income ?? 0) !==
          (schedule.line9_total_other_income ?? 0) ||
        rebuilt.line10_total_additional_income !==
          schedule.line10_total_additional_income
      ) {
        throw new Error(
          "Taxable education income needs Schedule 1 lines 9 and 10 to include all retained income lines",
        );
      }
    }
  }
  if (payrollRows.length) {
    const wageTotal = wages.reduce((sum, row) => sum + row.box1_wages, 0);
    if (final1040?.line1a_wages !== wageTotal) {
      throw new Error(
        "Taxable education benefit's issued W-2 wages differ from finalized Form 1040 line 1a",
      );
    }
  }
  assertDependentScholarshipReturn(pending, rows);
  return rows;
}
class EducationIncomeNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "education_income";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, agi_aggregator]);
  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const amount = scholarshipIncomeTotal(input);
    return {
      outputs: amount
        ? [
          this.outputNodes.output(schedule1, {
            line8r_taxable_scholarships: amount,
          }),
          this.outputNodes.output(agi_aggregator, {
            line8r_taxable_scholarships: amount,
          }),
        ]
        : [],
    };
  }
}
export const education_income = new EducationIncomeNode();
