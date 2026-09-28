import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { form8962Pdf } from "../../pdf/forms/f8962.ts";
import { form8962 } from "./f8962.ts";

const monthCodes = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];
const uncoveredMonth = 3; // April, while still resident in Alaska.
const covered = (month: number) => month !== uncoveredMonth;
const rows = monthCodes.map((month_code, month) => ({
  month_code,
  premium: covered(month) ? 500 : 0,
  slcsp: covered(month) ? 600 : 0,
  contribution: 533,
  max_assistance: covered(month) ? 67 : 0,
  allowed_credit: covered(month) ? 67 : 0,
  aptc: covered(month) ? 200 : 0,
}));
const fields = {
  household_size: 1,
  taxpayer_modified_agi: 75_300,
  dependents_modified_agi: 0,
  household_income: 75_300,
  federal_poverty_line: 18_810,
  fpl_region: "alaska" as const,
  federal_poverty_pct: 401,
  applicable_figure: 0.085,
  annual_applicable_contribution: 6_401,
  monthly_applicable_contribution: 533,
  monthly_ptc_rows: rows,
  total_premium_tax_credit: 737,
  total_advance_ptc: 2_200,
  excess_advance_payment: 1_463,
  excess_advance_premium: 1_463,
};
const policies = [
  { policy_number: "ALASKA-POLICY", coverage_state: "AK", start: 0, end: 6 },
  { policy_number: "TEXAS-POLICY", coverage_state: "TX", start: 6, end: 12 },
].map(({ policy_number, coverage_state, start, end }) => {
  const amounts = monthCodes.map((_, month) =>
    month >= start && month < end && covered(month)
  );
  return {
    issuer_name: "Marketplace",
    policy_number,
    coverage_state,
    covered_individual_ssns: ["123456789"],
    monthly_premiums: amounts.map((active) => active ? 500 : 0),
    monthly_slcsps: amounts.map((active) => active ? 600 : 0),
    monthly_aptcs: amounts.map((active) => active ? 200 : 0),
    annual_premium: amounts.filter(Boolean).length * 500,
    annual_slcsp: amounts.filter(Boolean).length * 600,
    annual_aptc: amounts.filter(Boolean).length * 200,
    ...(coverage_state === "TX"
      ? {
        slcsp_review_periods: [{
          start_month: 7,
          end_month: 12,
          reason: "move" as const,
          reported_to_marketplace: true,
        }],
      }
      : {}),
  };
});
const filer = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: {
    line1: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.Single,
};
const pending = {
  general: {
    filing_status: "single",
    address_state: "TX",
    ptc_residence_states_2025: ["AK", "TX"],
    ptc_residence_months_2025: [
      ...Array<string>(6).fill("AK"),
      ...Array<string>(6).fill("TX"),
    ],
  },
  f1095a: { f1095as: policies },
  schedule2: { line1a_excess_advance_premium: 1_463 },
  f1040: { line11_agi: 75_300, line17_additional_taxes: 1_463 },
};

Deno.test("Form 8962 move with an uncovered month emits eleven XML rows and leaves the PDF month blank", () => {
  const xml = form8962.build(fields, { filer, pending });
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 11);
  assertEquals(xml.includes("<MonthCd>APRIL</MonthCd>"), false);
  assertStringIncludes(
    xml,
    "<PremiumTaxCreditTaxLiabAmt>1463</PremiumTaxCreditTaxLiabAmt>",
  );
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(projected.pdf_month_4_premium, undefined);
  assertEquals(projected.pdf_month_4_contribution, undefined);
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
});

Deno.test("Form 8962 move gap rejects a sourced amount and a mismatched final repayment", () => {
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          f1095a: {
            f1095as: [{
              ...policies[0],
              monthly_slcsps: policies[0].monthly_slcsps.map((amount, month) =>
                month === uncoveredMonth ? 600 : amount
              ),
              annual_slcsp: policies[0].annual_slcsp + 600,
            }, policies[1]],
          },
        },
      }),
    Error,
    "differs from its Form 1095-A policy",
  );
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertThrows(
    () =>
      form8962Pdf.instances?.(projected, filer, {
        ...pending,
        f1040: { ...pending.f1040, line17_additional_taxes: 1_464 },
      }),
    Error,
    "differs from finalized Schedule 2/3 and Form 1040",
  );
});
