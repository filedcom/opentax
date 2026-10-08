import {
  independentSpouseForm8941,
  inputSchema,
} from "../../../../nodes/inputs/f8941/index.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { form8941WorkerInputs } from "./review-8941-workers.fixture.ts";
import type { PdfReviewFixture } from "../../review-fixtures.ts";

/** Two separately owned SHOP payrolls qualifying under the spouse attribution exception. */
export function form8941IndependentSpouseInputs(receipts = 210000) {
  const firstReturn = form8941WorkerInputs(120, receipts);
  const secondReturn = form8941WorkerInputs(121, receipts - 30000);
  const first = firstReturn.f8941;
  const original = secondReturn.f8941;
  if (
    !("monthly_plan_arrangements" in first) ||
    !("monthly_plan_arrangements" in original) ||
    !("schedule_c_business_reference" in first) ||
    !("schedule_c_business_reference" in original)
  ) throw new Error("Expected owned SHOP sources");
  const spouseSsn = "222334444";
  const secondEin = "987654321";
  const people = new Map<string, string>([
    [original.owner_ssn, spouseSsn],
    ...original.employees.map((worker, index) =>
      [
        worker.employee_ssn,
        String(710000000 + index * 1000000 + 112233),
      ] as const
    ),
    ...original.excluded_workers!.filter((worker) =>
      worker.exclusion !== "proprietor"
    )
      .map((worker) => [worker.employee_ssn, "777889999"] as const),
  ]);
  const dependent = new Map<string, string>();
  const rename = (value: unknown, key = ""): unknown => {
    if (Array.isArray(value)) return value.map((item) => rename(item, key));
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map((
          [name, child],
        ) => [name, rename(child, name)]),
      );
    }
    if (typeof value !== "string") return value;
    if (key === "owner_name") return "Sam Soleproprietor";
    if (
      key === "owner_ssn" || key === "related_owner_ssn" ||
      key === "employee_ssn"
    ) {
      return people.get(value) ?? value;
    }
    if (key === "dependent_ssn") {
      if (!dependent.has(value)) {
        dependent.set(
          value,
          String(810000000 + dependent.size * 1000000 + 997777),
        );
      }
      return dependent.get(value);
    }
    if (
      key === "employment_ein" || key === "payer_employment_ein" ||
      key === "payroll_employment_ein"
    ) return secondEin;
    if (
      key.endsWith("_reference") || key.endsWith("_references") ||
      key === "shop_marketplace_identifier" || key === "employee_reference"
    ) return value + "-SPOUSE";
    return value;
  };
  const second = {
    ...rename(original) as typeof original,
    proprietor_recipient: "S" as const,
    no_other_trades_or_common_control_verified: false as const,
  };
  const source = inputSchema.parse({
    qualifying_arrangement: "independent_mfj_spouse_proprietors",
    owner_name: first.owner_name,
    owner_ssn: first.owner_ssn,
    proprietor_recipient: "T",
    schedule_c_business_reference: first.schedule_c_business_reference,
    shop_plan_reference: first.shop_plan_reference,
    all_filer_controlled_businesses_identified_confirmed: true,
    complete_business_census_record_reference:
      "2025 complete spouse trade and payroll census",
    independent_members: [
      { ...first, no_other_trades_or_common_control_verified: false },
      second,
    ],
    spouse_exception_records: [first, second].map((member, index) => ({
      business_reference: member.schedule_c_business_reference,
      proprietor_ssn: member.owner_ssn,
      other_spouse_ssn: index === 0 ? spouseSsn : first.owner_ssn,
      proprietor_ownership_percentage: 100,
      other_spouse_direct_ownership_percentage: 0,
      ownership_from_date: "2025-01-01",
      ownership_through_date: "2025-12-31",
      ownership_record_reference: `Spouse ownership record ${index}`,
      other_spouse_never_director_fiduciary_employee_or_manager_verified: true,
      other_spouse_role_and_payroll_record_reference:
        `Spouse role and payroll census ${index}`,
      gross_income_record_reference: `Business gross income ledger ${index}`,
      ordinary_business_gross_income: index === 0 ? receipts : receipts - 30000,
      royalties: index === 0 ? 10000 : 15000,
      rents: 0,
      dividends: 0,
      interest: 0,
      annuities: 0,
      passive_income_record_reference:
        `Business passive income ledger ${index}`,
      no_disposal_restriction_favoring_spouse_or_under21_children_verified:
        true,
      interest_disposal_record_reference:
        `Business interest disposal record ${index}`,
    })),
  });
  if (!("independent_members" in source)) {
    throw new Error("Expected independent spouse source");
  }
  const joint = independentSpouseForm8941(source);
  const secondBusiness = {
    ...secondReturn.schedule_c[0],
    business_reference: second.schedule_c_business_reference,
    proprietor_recipient: "S" as const,
    line_c_business_name: "Sam Retail Shop",
    line_d_ein: secondEin,
    line_6_other_income: 15000,
  };
  return {
    ...firstReturn,
    general: {
      ...firstReturn.general,
      filing_status: "mfj",
      spouse_first_name: "Sam",
      spouse_last_name: "Soleproprietor",
      spouse_ssn: spouseSsn,
      spouse_dob: "1986-06-15",
    },
    f8941: source,
    schedule_c: [
      { ...firstReturn.schedule_c[0], line_6_other_income: 10000 },
      secondBusiness,
    ],
    expected: joint,
  };
}

export function form8941IndependentSpouseReviewFixture(): PdfReviewFixture {
  const { expected: _expected, ...inputs } = form8941IndependentSpouseInputs();
  return {
    id: "independent-mf-joint-spouse-shop-two-form8941",
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
      "schedule_se",
      "f3800",
      "form6251",
      "form8995",
      "f8941",
      "f8941",
    ],
    reviewFocus: [
      "Distinct spouses own and operate separate businesses with independent payroll and SHOP premiums",
      "Each full determined Form 8941 credit reduces its own Schedule C deduction before owner SE and QBI",
      "Two filed Form 8941 documents reconcile to one Form 3800 line 4h and separate Part V source details",
    ],
  };
}
