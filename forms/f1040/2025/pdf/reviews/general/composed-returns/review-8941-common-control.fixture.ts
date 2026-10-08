import {
  calculateForm8941,
  commonControlForm8941Shares,
  inputSchema,
} from "../../../../../nodes/inputs/credits/health/f8941/index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import {
  computeNetProfit,
  itemSchema,
} from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import { allocateSharedSeDeduction } from "../../../../../nodes/inputs/income/business/schedule_c/qbi-multiple.ts";
import { scheduleSELines } from "../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../../../../../nodes/config/index.ts";
import { form8941WorkerInputs } from "./review-8941-workers.fixture.ts";
import type { PdfReviewFixture } from "../../../review-fixtures.ts";

/** Two actual 2025 Schedule C payrolls, insurance ledgers and SHOP offerings. */
export function form8941CommonControlInputs() {
  const firstReturn = form8941WorkerInputs(120, 210000);
  const secondReturn = form8941WorkerInputs(121, 180000);
  const first = firstReturn.f8941;
  const secondOriginal = secondReturn.f8941;
  if (
    !("monthly_plan_arrangements" in first) ||
    !("monthly_plan_arrangements" in secondOriginal) ||
    !("schedule_c_business_reference" in first) ||
    !("schedule_c_business_reference" in secondOriginal)
  ) throw new Error("Expected two owned multiple-QHP payroll sources");
  const secondEin = "987654321";
  const secondSsn = new Map(
    secondOriginal.employees.map((employee, index) => [
      employee.employee_ssn,
      index === 0
        ? first.employees[0].employee_ssn
        : String(700000000 + index * 1000000 + 112233),
    ]),
  );
  for (const worker of secondOriginal.excluded_workers ?? []) {
    if (worker.exclusion !== "proprietor") {
      secondSsn.set(worker.employee_ssn, "777889999");
    }
  }
  const dependentSsn = new Map<string, string>();
  const rename = (value: unknown, key = ""): unknown => {
    if (Array.isArray(value)) {
      return value.map((item) =>
        rename(item, key.endsWith("_references") ? key.slice(0, -1) : "")
      );
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([name, child]) => [
          name,
          rename(child, name),
        ]),
      );
    }
    if (typeof value !== "string") return value;
    if (
      key === "employment_ein" || key === "payer_employment_ein" ||
      key === "payroll_employment_ein"
    ) return secondEin;
    if (key === "employee_ssn") return secondSsn.get(value) ?? value;
    if (key === "dependent_ssn") {
      if (!dependentSsn.has(value)) {
        dependentSsn.set(
          value,
          String(
            800000000 +
              dependentSsn.size * 1000000 + 997777,
          ),
        );
      }
      return dependentSsn.get(value);
    }
    if (
      key.endsWith("_reference") || key === "shop_marketplace_identifier" ||
      key === "employee_reference"
    ) return value + "-SECOND";
    return value;
  };
  const second = rename(secondOriginal) as typeof secondOriginal;
  // The shared worker has separately retained payroll at each business, but
  // one group-wide SHOP enrollment and one annual premium cap.
  second.employees[0].enrollment_selections = [];
  second.employees[0].employer_premium_paid = 0;
  second.employees[0].tax_year_shop_premium = 0;
  second.shop_review.employee_premium_reviews[0].enrollment_selections = [];
  second.shop_review.employee_premium_reviews[0].monthly_premiums = [];
  const source = inputSchema.parse({
    qualifying_arrangement: "same_proprietor_common_control",
    owner_name: first.owner_name,
    owner_ssn: first.owner_ssn,
    proprietor_recipient: first.proprietor_recipient,
    schedule_c_business_reference: first.schedule_c_business_reference,
    employment_ein: first.employment_ein,
    shop_marketplace_identifier: first.shop_marketplace_identifier,
    shop_plan_reference: first.shop_plan_reference,
    group_review: {
      tax_year: 2025,
      common_owner_100_percent_verified: true,
      both_businesses_under_common_management_verified: true,
      all_controlled_trades_and_workers_identified_verified: true,
      all_group_members_follow_same_shop_contribution_schedule_verified: true,
      ownership_record_reference:
        "2025 both sole proprietorship ownership records",
      management_record_reference:
        "2025 both businesses owner management records",
      complete_group_roster_record_reference:
        "2025 combined payroll and business census certification",
      group_contribution_schedule_record_reference:
        "2025 common-owner SHOP contribution schedule signed by both businesses",
    },
    member_control_records: [
      first,
      second,
    ].map((member, index) => ({
      business_reference: member.schedule_c_business_reference,
      proprietor_ssn: first.owner_ssn,
      ownership_percentage: 100,
      ownership_from_date: "2025-01-01",
      ownership_through_date: "2025-12-31",
      management_role: "sole_proprietor_manager",
      ownership_record_reference: `2025 sole proprietor ownership deed ${
        index + 1
      }`,
      management_record_reference: `2025 sole manager operations record ${
        index + 1
      }`,
    })),
    group_members: [
      { ...first, no_other_trades_or_common_control_verified: false },
      { ...second, no_other_trades_or_common_control_verified: false },
    ],
  });
  if (
    !("group_members" in source) ||
    !("schedule_c_business_reference" in source.group_members[1])
  ) {
    throw new Error("Expected common-control Form 8941 source");
  }
  const lines = calculateForm8941(source);
  const group = commonControlForm8941Shares(source);
  const secondBusiness = {
    ...firstReturn.schedule_c[0],
    business_reference: source.group_members[1].schedule_c_business_reference,
    line_c_business_name: "Jane Second Retail Shop",
    line_d_ein: secondEin,
    line_1_gross_receipts: 180000,
    line_26_wages: source.group_members[1].employees.reduce(
      (sum, employee) => sum + employee.social_security_medicare_wages,
      0,
    ) + (source.group_members[1].excluded_workers ?? []).reduce(
      (sum, worker) => sum + worker.actual_social_security_medicare_wages,
      0,
    ),
    line_14_employee_benefits: group.memberPremiums[1],
  };
  const sourceBusinesses = [firstReturn.schedule_c[0], secondBusiness];
  const profits = sourceBusinesses.map((business, index) =>
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
    ...firstReturn,
    f8941: source,
    schedule_c: sourceBusinesses.map((business, index) => ({
      ...business,
      qbi_se_tax_allocation_review: {
        deduction_amount: allocations[index],
        allocation_method: "positive_profit_proportion_with_cent_residual",
        reasonable_for_business_facts_confirmed: true,
        consistently_applied_and_books_agree_confirmed: true,
        all_businesses_included_confirmed: true,
        no_aggregation_confirmed: true,
        workpaper_reference: `Group Schedule SE/QBI allocation ${index + 1}`,
        reviewed_by: "Synthetic reviewer",
        reviewed_on: "2026-10-06",
      },
    })),
    expected: {
      lines,
      shares: group.shares,
      memberPremiums: group.memberPremiums,
    },
  };
}

export function form8941CommonControlReviewFixture(): PdfReviewFixture {
  const { expected: _expected, ...inputs } = form8941CommonControlInputs();
  return {
    id: "same-proprietor-two-business-shop-common-control",
    inputs,
    filer: extractFilerIdentity(inputs.general)!,
    expectedPdfForms: [
      "f1040",
      "schedule1",
      "schedule2",
      "schedule3",
      "schedule_c",
      "schedule_c",
      "schedule_se",
      "f3800",
      "form6251",
      "form8995",
      "f8941",
    ],
    reviewFocus: [
      "One Form 8941 aggregates two same-proprietor businesses, actual workers, hours, wages and separate SHOP premiums",
      "One repeated real worker is counted once in group headcount and has distinct employer payroll and paid invoice records",
      "Full determined credit is distributed to each Schedule C benefit deduction by its source premium share before SE and QBI",
    ],
  };
}
