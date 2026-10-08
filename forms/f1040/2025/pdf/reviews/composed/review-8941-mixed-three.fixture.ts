import { form8941MixedCfInputs } from "./review-8941-mixed-cf.fixture.ts";
import { form8941CommonControlInputs } from "./review-8941-common-control.fixture.ts";
import {
  commonControlForm8941Shares,
  inputSchema,
} from "../../../../nodes/inputs/f8941/index.ts";
import {
  computeNetProfit as computeCProfit,
  itemSchema as cItemSchema,
} from "../../../../nodes/inputs/schedule_c/model.ts";
import {
  computeNetProfit as computeFProfit,
  itemSchema as fItemSchema,
} from "../../../../nodes/intermediate/forms/schedule_f/model.ts";
import { scheduleSELines } from "../../../../nodes/intermediate/forms/schedule_se/calculation.ts";
import { allocateSharedSeDeduction } from "../../../../nodes/inputs/schedule_c/qbi-multiple.ts";
import { CONFIG_BY_YEAR } from "../../../../nodes/config/index.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import type { PdfReviewFixture } from "../../review-fixtures.ts";

/** Two retail payrolls and a third, independently sourced cash farm payroll. */
export function form8941MixedThreeInputs(
  agriculture = 170000,
  firstReceipts = 210000,
  secondReceipts = 180000,
) {
  const base: any = form8941CommonControlInputs();
  const mixed: any = form8941MixedCfInputs(agriculture);
  const oldFarm = mixed.f8941.group_members[1];
  const oldEin = oldFarm.employment_ein;
  const newEin = "456789123";
  const shared = base.f8941.group_members[0].employees[0].employee_ssn;
  const ssns = new Map(oldFarm.employees.map((worker: any, index: number) => [
    worker.employee_ssn,
    index === 0 ? shared : String(940000000 + index * 1000000 + 112233),
  ]));
  const rename = (value: unknown, key = ""): any => {
    if (Array.isArray(value)) return value.map((part) => rename(part, key));
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([name, part]) => [name, rename(part, name)]),
      );
    }
    if (typeof value !== "string") return value;
    if (
      ["employment_ein", "payer_employment_ein", "payroll_employment_ein"]
        .includes(key)
    ) return newEin;
    if (key === "employee_ssn") return ssns.get(value) ?? value;
    if (key === "dependent_ssn") return String(Number(value) + 30000000);
    if (
      key.endsWith("_reference") || key.endsWith("_references") ||
      key === "shop_marketplace_identifier" || key === "employee_reference"
    ) return value + "-FARM";
    return value;
  };
  const farm = rename(oldFarm);
  // The shared worker has 2,500 actual hours across three payrolls but one
  // paid group enrollment. Its credited annual hours stop at 2,080.
  [1500, 400].forEach((hours, index) => {
    const c = base.f8941.group_members[index];
    c.employees[0].hours_of_service = hours;
    c.shop_review.employee_premium_reviews[0].payroll_hours_of_service = hours;
  });
  farm.employees[0].hours_of_service = 600;
  farm.shop_review.employee_premium_reviews[0].payroll_hours_of_service = 600;
  const control = {
    ...base.f8941.member_control_records[1],
    business_reference: farm.schedule_f_farm_id,
    ownership_record_reference: "2025 distinct controlled farm ownership deed",
    management_record_reference:
      "2025 distinct controlled farm management ledger",
  };
  const source: any = inputSchema.parse({
    ...base.f8941,
    qualifying_arrangement: "same_proprietor_mixed_c_f_common_control",
    group_review: {
      ...base.f8941.group_review,
      all_businesses_under_common_management_verified: true,
      complete_group_roster_record_reference:
        "2025 complete two-retail one-farm payroll census",
      group_contribution_schedule_record_reference:
        "2025 signed retail and farm SHOP contribution schedule",
    },
    member_control_records: [...base.f8941.member_control_records, control],
    group_members: [...base.f8941.group_members, farm],
  });
  const group = commonControlForm8941Shares(source);
  const businesses = base.schedule_c.map((c: any, index: number) => ({
    ...c,
    line_1_gross_receipts: [firstReceipts, secondReceipts][index],
    line_14_employee_benefits:
      source.group_members[index].other_schedule_c_employee_benefits +
      group.memberPremiums[index],
    line_26_wages: source.group_members[index].employees.reduce(
      (sum: number, worker: any) => sum + worker.social_security_medicare_wages,
      0,
    ) +
      (source.group_members[index].excluded_workers ?? []).reduce(
        (sum: number, worker: any) =>
          sum + worker.actual_social_security_medicare_wages,
        0,
      ),
  }));
  const farmItem: any = {
    ...mixed.schedule_f.schedule_fs[0],
    line_d_ein: newEin,
    line15_employee_benefits: farm.other_schedule_f_employee_benefits +
      group.memberPremiums[2],
    line22_labor_hired: farm.employees.reduce(
      (sum: number, worker: any) => sum + worker.social_security_medicare_wages,
      0,
    ),
    shop_employee_w2_records: farm.employees.map((worker: any) => ({
      employee_reference: worker.employee_reference,
      employee_ssn: worker.employee_ssn,
      employer_ein: newEin,
      payroll_record_reference: worker.enrollment_and_payroll_record_reference,
      social_security_medicare_wages: worker.social_security_medicare_wages,
      hours_of_service: worker.hours_of_service,
    })),
  };
  const profits = [
    ...businesses.map((c: any, index: number) =>
      computeCProfit(cItemSchema.parse({
        ...c,
        line_14_employee_benefits: c.line_14_employee_benefits -
          group.shares[index],
      }))
    ),
    computeFProfit(fItemSchema.parse({
      ...farmItem,
      line15_employee_benefits: farmItem.line15_employee_benefits -
        group.shares[2],
    })),
  ];
  const halfSe = scheduleSELines({
    net_profit_schedule_c: profits[0] + profits[1],
    net_profit_schedule_f: profits[2],
    w2_ss_wages: 0,
  }, CONFIG_BY_YEAR[2025].ssWageBase)?.line13 ?? 0;
  const allocations = allocateSharedSeDeduction(profits, halfSe);
  const review = (index: number) => ({
    deduction_amount: allocations[index],
    allocation_method: "positive_profit_proportion_with_cent_residual" as const,
    reasonable_for_business_facts_confirmed: true as const,
    consistently_applied_and_books_agree_confirmed: true as const,
    all_businesses_included_confirmed: true as const,
    no_aggregation_confirmed: true as const,
    workpaper_reference: `2025 two-retail farm shared SE allocation ${
      index + 1
    }`,
    reviewed_by: "Synthetic reviewer",
    reviewed_on: "2026-10-06",
  });
  businesses.forEach((c: any, index: number) =>
    c.qbi_se_tax_allocation_review = review(index)
  );
  farmItem.qbi_se_tax_allocation_review = review(2);
  return {
    general: base.general,
    f8941: source,
    schedule_c: businesses,
    schedule_f: { schedule_fs: [farmItem] },
    f1099g: [{
      ...mixed.f1099g[0],
      source_document_reference: farm.farm_issued_receipt_references[0],
    }],
    f1099nec: [{
      ...mixed.f1099nec[0],
      source_document_reference: farm.farm_issued_receipt_references[1],
    }],
  };
}

/** Three complete, previously reviewed C/C/F group credit packets. */
export function form8941MixedThreeReviewFixtures(): readonly PdfReviewFixture[] {
  return ([
    ["full", 180000, 210000, 180000],
    ["partial", 170000, 210000, 180000],
    ["zero", 85000, 145000, 140000],
  ] as const).map(([use, agriculture, first, second]) => {
    const inputs = form8941MixedThreeInputs(agriculture, first, second);
    return {
      id: `same-proprietor-two-c-one-f-shop-${use}`,
      inputs,
      filer: extractFilerIdentity(inputs.general)!,
      expectedPdfForms: [
        "f1040",
        "schedule1",
        "schedule2",
        ...(use === "zero" ? [] : ["schedule3"]),
        "schedule_c",
        "schedule_c",
        "schedule_f",
        "schedule_se",
        "f3800",
        "form6251",
        "form8995",
        "f8941",
      ],
      reviewFocus: [
        "Two actual Schedule C payrolls and one separately sourced cash farm payroll aggregate into one controlled Form 8941",
        "One shared worker is capped at 2080 annual credited hours with one paid group SHOP enrollment",
        `Full determined credit reduces both C14 expenses and F15 expense before owner SE/QBI; ${use} current Form 3800 use agrees with the filled packet`,
      ],
    };
  });
}
