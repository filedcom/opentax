import type { PdfReviewFixture } from "../../../review-fixtures.ts";
import { allocateSharedSeDeduction } from "../../../../../nodes/inputs/income/business/schedule_c/qbi-multiple.ts";
import { scheduleSELines } from "../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../../../../../nodes/config/index.ts";

export function multipleScheduleCInputs(
  base: PdfReviewFixture,
  wageBase: PdfReviewFixture,
  profits: number[],
  withWages = false,
) {
  const original = (base.inputs.schedule_c as Record<string, unknown>[])[0];
  const wage = {
    ...(wageBase.inputs.w2 as Record<string, unknown>[])[0],
    employee_ssn: "111-22-3333",
    box1_wages: 50_000,
    box3_ss_wages: 50_000,
    box5_medicare_wages: 50_000,
  };
  const deduction = scheduleSELines({
    net_profit_schedule_c: profits.reduce((sum, value) => sum + value, 0),
    w2_ss_wages: withWages ? 50_000 : 0,
  }, CONFIG_BY_YEAR[2025].ssWageBase)?.line13 ?? 0;
  const allocations = allocateSharedSeDeduction(profits, deduction);
  return {
    ...base.inputs,
    general: {
      ...(base.inputs.general as Record<string, unknown>),
      ...(profits.reduce((sum, value) => sum + value, 0) < 0
        ? {
          form461_scope_review: {
            only_schedule_c_and_f_business_items: true,
            other_part_i_lines_zero: true,
            part_ii_adjustments_zero: true,
            post_at_risk_and_passive_limits_confirmed: true,
            line2_schedule_c_amount: profits.reduce(
              (sum, value) => sum + value,
              0,
            ),
            line6_schedule_f_amount: 0,
            source_document_refs: [
              "Synthetic combined loss and Form 461 scope review",
            ],
          },
        }
        : {}),
    },
    ...(withWages ? { w2: [wage] } : {}),
    schedule_c: profits.map((profit, index) => ({
      ...original,
      business_reference: `SYNTHETIC-BUSINESS-${index}`,
      line_c_business_name: `Example Business ${index + 1}`,
      ...(index === 1
        ? { line_d_ein: undefined }
        : { line_d_ein: String(123456789 + index) }),
      line_1_gross_receipts: Math.max(0, profit),
      line_18_office_expense: Math.max(0, -profit),
      ...(profit < 0 ? { line_32_at_risk: "a" } : {}),
      qbi_specified_service: index === 1,
      qbi_se_tax_allocation_review: {
        deduction_amount: allocations[index],
        allocation_method: "positive_profit_proportion_with_cent_residual",
        reasonable_for_business_facts_confirmed: true,
        consistently_applied_and_books_agree_confirmed: true,
        all_businesses_included_confirmed: true,
        no_aggregation_confirmed: true,
        workpaper_reference: "Synthetic shared SE allocation workpaper",
        reviewed_by: "Synthetic reviewer",
        reviewed_on: "2026-03-01",
      },
    })),
  };
}
export function multipleScheduleCFixture(
  base: PdfReviewFixture,
  wageBase: PdfReviewFixture,
  kind: "overflow" | "net-loss",
): PdfReviewFixture {
  const netLoss = kind === "net-loss";
  return {
    id: `single-multiple-schedule-c-${kind}`,
    inputs: multipleScheduleCInputs(
      base,
      wageBase,
      netLoss
        ? [10_000.49, -20_000.50]
        : [20_000, 18_000, 16_000, 14_000, 12_000, -4_000],
      netLoss,
    ),
    filer: base.filer,
    expectedPdfForms: netLoss
      ? [
        "f1040",
        "schedule_c",
        "schedule_c",
        "schedule1",
        "form8995",
        "form8959",
      ]
      : [
        ...base.expectedPdfForms.filter((key) => key !== "schedule_c"),
        ...Array<string>(6).fill("schedule_c"),
      ],
    reviewFocus: [
      "Every sourced Schedule C copy retains business identity and signed whole-dollar profit or loss",
      "Shared SE deduction allocations and raw Schedule 1/Form 1040 aggregation reconcile separately from filed business rows",
      netLoss
        ? "Form 8995 has zero deduction and 10001 current business-loss carryforward"
        : "All six QBI business rows print including the identified line 2 continuation",
    ],
  };
}
