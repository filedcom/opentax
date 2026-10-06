import {
  calculateForm8941,
  commonControlForm8941Shares,
  inputSchema,
} from "../../nodes/inputs/f8941/index.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import {
  computeNetProfit,
  itemSchema,
} from "../../nodes/inputs/schedule_c/model.ts";
import { allocateSharedSeDeduction } from "../../nodes/inputs/schedule_c/qbi-multiple.ts";
import { scheduleSELines } from "../../nodes/intermediate/forms/schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../../nodes/config/index.ts";
import { form8941CommonControlInputs } from "./review-8941-common-control.fixture.ts";
import { form8941WorkerInputs } from "./review-8941-workers.fixture.ts";
import type { PdfReviewFixture } from "./review-fixtures.ts";

/** Three actual same-owner Schedule C/SHOP sources, including one shared worker. */
export function form8941ThreeBusinessInputs(thirdReceipts = 150000) {
  const two = form8941CommonControlInputs();
  const thirdReturn = form8941WorkerInputs(121, thirdReceipts);
  // The same worker's retained employer payroll totals 2,700 service hours
  // across the year. Each employer records only its own hours and wages.
  [1500, 600].forEach((hours, index) => {
    two.f8941.group_members[index].employees[0].hours_of_service = hours;
    two.f8941.group_members[index].shop_review.employee_premium_reviews[0]
      .payroll_hours_of_service = hours;
  });
  const original = thirdReturn.f8941;
  const first = two.f8941.group_members[0];
  if (
    !("monthly_plan_arrangements" in original) ||
    !("schedule_c_business_reference" in original)
  ) {
    throw new Error("Expected owned SHOP source");
  }
  const thirdEin = "456789123";
  const ssns = new Map(
    original.employees.map((worker, index) => [
      worker.employee_ssn,
      index === 0
        ? first.employees[0].employee_ssn
        : String(910000000 + index * 1000000 + 112233),
    ]),
  );
  for (const worker of original.excluded_workers ?? []) {
    if (worker.exclusion !== "proprietor") {
      ssns.set(worker.employee_ssn, "888779999");
    }
  }
  const dependents = new Map<string, string>();
  const rename = (value: unknown, key = ""): unknown => {
    if (Array.isArray(value)) {
      return value.map((item) =>
        rename(item, key.endsWith("_references") ? key.slice(0, -1) : key)
      );
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map((
          [name, child],
        ) => [name, rename(child, name)]),
      );
    }
    if (typeof value !== "string") return value;
    if (
      key === "employment_ein" || key === "payer_employment_ein" ||
      key === "payroll_employment_ein"
    ) return thirdEin;
    if (key === "employee_ssn") return ssns.get(value) ?? value;
    if (key === "dependent_ssn") {
      if (!dependents.has(value)) {
        dependents.set(
          value,
          String(930000000 + dependents.size * 1000000 + 997777),
        );
      }
      return dependents.get(value);
    }
    if (
      key.endsWith("_reference") || key === "shop_marketplace_identifier" ||
      key === "employee_reference"
    ) return value + "-THIRD";
    return value;
  };
  const third = rename(original) as typeof original;
  third.employees[0].hours_of_service = 600;
  third.shop_review.employee_premium_reviews[0].payroll_hours_of_service = 600;
  const paidThird = structuredClone(third);
  // One person works in all three businesses; only the first pays group SHOP
  // coverage for that worker. The other payrolls remain in annual wages/hours.
  third.employees[0].enrollment_selections = [];
  third.employees[0].employer_premium_paid = 0;
  third.employees[0].tax_year_shop_premium = 0;
  third.shop_review.employee_premium_reviews[0].enrollment_selections = [];
  third.shop_review.employee_premium_reviews[0].monthly_premiums = [];
  const source = inputSchema.parse({
    ...two.f8941,
    group_review: {
      ...two.f8941.group_review,
      all_businesses_under_common_management_verified: true,
      complete_group_roster_record_reference:
        "2025 complete three-business payroll and trade census",
      group_contribution_schedule_record_reference:
        "2025 common-owner three-business SHOP schedule",
    },
    member_control_records: [...two.f8941.member_control_records, {
      business_reference: third.schedule_c_business_reference,
      proprietor_ssn: first.owner_ssn,
      ownership_percentage: 100,
      ownership_from_date: "2025-01-01",
      ownership_through_date: "2025-12-31",
      management_role: "sole_proprietor_manager",
      ownership_record_reference: "2025 sole proprietor ownership deed 3",
      management_record_reference: "2025 sole manager operations record 3",
    }],
    group_members: [...two.f8941.group_members, {
      ...third,
      no_other_trades_or_common_control_verified: false,
    }],
  });
  if (!("group_members" in source)) {
    throw new Error("Expected common-control source");
  }
  const group = commonControlForm8941Shares(source);
  const thirdBusiness = {
    ...thirdReturn.schedule_c[0],
    business_reference: third.schedule_c_business_reference,
    line_c_business_name: "Jane Third Retail Shop",
    line_d_ein: thirdEin,
    line_1_gross_receipts: thirdReceipts,
    line_26_wages: third.employees.reduce(
      (sum, worker) => sum + worker.social_security_medicare_wages,
      0,
    ) +
      (third.excluded_workers ?? []).reduce(
        (sum, worker) => sum + worker.actual_social_security_medicare_wages,
        0,
      ),
    line_14_employee_benefits: group.memberPremiums[2],
  };
  const businesses = [
    ...two.schedule_c.map((item) => ({ ...item })),
    thirdBusiness,
  ];
  const profits = businesses.map((business, index) =>
    computeNetProfit(itemSchema.parse({
      ...business,
      line_14_employee_benefits: business.line_14_employee_benefits -
        group.shares[index],
    }))
  );
  const seDeduction = scheduleSELines({
    net_profit_schedule_c: profits.reduce((sum, profit) => sum + profit, 0),
    w2_ss_wages: 0,
  }, CONFIG_BY_YEAR[2025].ssWageBase)?.line13 ?? 0;
  const allocations = allocateSharedSeDeduction(profits, seDeduction);
  return {
    ...two,
    f8941: source,
    schedule_c: businesses.map((business, index) => ({
      ...business,
      qbi_se_tax_allocation_review: {
        deduction_amount: allocations[index],
        allocation_method: "positive_profit_proportion_with_cent_residual",
        reasonable_for_business_facts_confirmed: true,
        consistently_applied_and_books_agree_confirmed: true,
        all_businesses_included_confirmed: true,
        no_aggregation_confirmed: true,
        workpaper_reference: `Three-business Schedule SE/QBI allocation ${
          index + 1
        }`,
        reviewed_by: "Synthetic reviewer",
        reviewed_on: "2026-10-06",
      },
    })),
    expected: {
      lines: calculateForm8941(source),
      shares: group.shares,
      memberPremiums: group.memberPremiums,
    },
    paidThird,
  };
}

export function form8941ThreeBusinessReviewFixture(): PdfReviewFixture {
  const { expected: _expected, paidThird: _paidThird, ...inputs } =
    form8941ThreeBusinessInputs();
  return {
    id: "same-proprietor-three-business-shop-common-control",
    inputs,
    filer: extractFilerIdentity(inputs.general)!,
    expectedPdfForms: [
      "f1040",
      "schedule1",
      "schedule2",
      "schedule3",
      "schedule_c",
      "schedule_c",
      "schedule_c",
      "schedule_se",
      "f3800",
      "form6251",
      "form8995",
      "f8941",
    ],
    reviewFocus: [
      "One actual owner and three complete ownership, payroll and SHOP inventories produce one Form 8941",
      "A repeated worker's three payrolls contribute wages but no more than 2080 annual hours and one paid group enrollment",
      "Each full determined credit share reduces its own Schedule C premium deduction before SE, QBI and current Form 3800 use",
    ],
  };
}
