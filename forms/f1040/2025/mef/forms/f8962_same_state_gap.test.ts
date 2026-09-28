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
const gap = 3; // No Marketplace coverage in April.
const covered = (month: number) => month !== gap;
const fields = {
  household_size: 1,
  taxpayer_modified_agi: 75_300,
  dependents_modified_agi: 0,
  household_income: 75_300,
  federal_poverty_line: 15_060,
  fpl_region: "contiguous" as const,
  federal_poverty_pct: 401,
  applicable_figure: 0.085,
  annual_applicable_contribution: 6_401,
  monthly_applicable_contribution: 533,
  monthly_ptc_rows: monthCodes.map((month_code, month) => ({
    month_code,
    premium: covered(month) ? 500 : 0,
    slcsp: covered(month) ? 600 : 0,
    contribution: 533,
    max_assistance: covered(month) ? 67 : 0,
    allowed_credit: covered(month) ? 67 : 0,
    aptc: covered(month) ? 200 : 0,
  })),
  total_premium_tax_credit: 737,
  total_advance_ptc: 2_200,
  excess_advance_payment: 1_463,
  excess_advance_premium: 1_463,
};
const policies = [
  { policy_number: "TX-ONE", start: 0, end: 6 },
  { policy_number: "TX-TWO", start: 6, end: 12 },
].map(({ policy_number, start, end }) => {
  const active = monthCodes.map((_, month) =>
    month >= start && month < end && covered(month)
  );
  return {
    issuer_name: "Marketplace",
    policy_number,
    coverage_state: "TX",
    covered_individual_ssns: ["123456789"],
    monthly_premiums: active.map((yes) => yes ? 500 : 0),
    monthly_slcsps: active.map((yes) => yes ? 600 : 0),
    monthly_aptcs: active.map((yes) => yes ? 200 : 0),
    annual_premium: active.filter(Boolean).length * 500,
    annual_slcsp: active.filter(Boolean).length * 600,
    annual_aptc: active.filter(Boolean).length * 200,
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
  general: { filing_status: "single", address_state: "TX" },
  f1095a: { f1095as: policies },
  schedule2: { line1a_excess_advance_premium: 1_463 },
  f1040: { line11_agi: 75_300, line17_additional_taxes: 1_463 },
};

Deno.test("Form 8962 two same-state policies with an uncovered month leave that month blank", () => {
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

Deno.test("Form 8962 two-policy uncovered month rejects reported SLCSP and final-return mismatch", () => {
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
                month === gap ? 600 : amount
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

Deno.test("Form 8962 two-policy gap does not admit overlapping policies", () => {
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          f1095a: {
            f1095as: [policies[0], {
              ...policies[1],
              monthly_premiums: policies[1].monthly_premiums.map((
                amount,
                month,
              ) => month === 5 ? 500 : amount),
              monthly_slcsps: policies[1].monthly_slcsps.map((amount, month) =>
                month === 5 ? 600 : amount
              ),
              monthly_aptcs: policies[1].monthly_aptcs.map((amount, month) =>
                month === 5 ? 200 : amount
              ),
              annual_premium: policies[1].annual_premium + 500,
              annual_slcsp: policies[1].annual_slcsp + 600,
              annual_aptc: policies[1].annual_aptc + 200,
            }],
          },
        },
      }),
    Error,
    "needs exactly one active Marketplace policy",
  );
});
