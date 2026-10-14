import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../../../../mef/header.ts";
import { general } from "../../../../../../nodes/inputs/general/filing/general/index.ts";
import { f1095a } from "../../../../../../nodes/inputs/credits/health/f1095a/index.ts";
import {
  form8962 as form8962Calculation,
  inputSchema as form8962InputSchema,
} from "../../../../../../nodes/intermediate/forms/credits/health/form8962/index.ts";
import { FilingStatus as SourceFilingStatus } from "../../../../../../nodes/types.ts";
import { form8962Pdf } from "../../../../../pdf/forms/credits/health/f8962.ts";
import { form8962 } from "./f8962.ts";

const months = [
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
const residenceMonths = [
  ...Array<string>(3).fill("AK"),
  ...Array<string>(3).fill("HI"),
  ...Array<string>(3).fill("CA"),
  ...Array<string>(3).fill("TX"),
];
const policies = [
  { policy_number: "ALASKA-2025", state: "AK", start: 0, end: 3 },
  { policy_number: "HAWAII-2025", state: "HI", start: 3, end: 6 },
  { policy_number: "CALIFORNIA-2025", state: "CA", start: 6, end: 9 },
  { policy_number: "TEXAS-2025", state: "TX", start: 9, end: 12 },
].map(({ policy_number, state, start, end }) => ({
  issuer_name: "Marketplace",
  policy_number,
  coverage_state: state,
  covered_individual_ssns: ["123456789"],
  monthly_premiums: months.map((_, index) =>
    index >= start && index < end ? 500 : 0
  ),
  monthly_slcsps: months.map((_, index) =>
    index >= start && index < end ? 600 : 0
  ),
  monthly_aptcs: months.map((_, index) =>
    index >= start && index < end ? 200 : 0
  ),
  annual_premium: 1_500,
  annual_slcsp: 1_800,
  annual_aptc: 600,
  ...(start > 0
    ? {
      slcsp_review_periods: [{
        start_month: start + 1,
        end_month: end,
        reason: "move" as const,
        reported_to_marketplace: true,
      }],
    }
    : {}),
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
  monthly_ptc_rows: months.map((month_code) => ({
    month_code,
    premium: 500,
    slcsp: 600,
    contribution: 533,
    max_assistance: 67,
    allowed_credit: 67,
    aptc: 200,
  })),
  total_premium_tax_credit: 804,
  total_advance_ptc: 2_400,
  excess_advance_payment: 1_596,
  excess_advance_premium: 1_596,
};
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
    filing_status: SourceFilingStatus.Single,
    address_state: "TX",
    ptc_residence_states_2025: ["AK", "HI", "CA", "TX"],
    ptc_residence_months_2025: residenceMonths,
  },
  f1095a: { f1095as: policies },
  schedule2: { line1a_excess_advance_premium: 1_596 },
  f1040: { line11_agi: 75_300, line17_additional_taxes: 1_596 },
};

Deno.test("Form 8962 four-state interstate move uses Alaska FPL and four sourced policies through return, MeF, and PDF", () => {
  const residence = general.compute(
    { taxYear: 2025, formType: "f1040" },
    general.inputSchema.parse(pending.general),
  );
  assertEquals(
    residence.outputs.find((item) => item.nodeType === "form8962")?.fields
      .fpl_region,
    "alaska",
  );
  const source = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    pending.f1095a,
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals(source?.monthly_premiums, Array<number>(12).fill(500));
  assertEquals(source?.monthly_slcsps, Array<number>(12).fill(600));
  const calculated = form8962Calculation.compute(
    { taxYear: 2025, formType: "f1040" },
    form8962InputSchema.parse({
      ...source,
      taxpayer_modified_agi: 75_300,
      dependents_modified_agi: 0,
      household_size: 1,
      fpl_region: "alaska",
      filing_status: SourceFilingStatus.Single,
      dependent_income_complete: true,
    }),
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals(calculated?.total_premium_tax_credit, 804);
  assertEquals(calculated?.excess_advance_premium, 1_596);
  const xml = form8962.build(fields, { filer, pending });
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 12);
  assertStringIncludes(
    xml,
    "<FederalPovertyTableLocCd>A</FederalPovertyTableLocCd>",
  );
  assertStringIncludes(
    xml,
    "<PremiumTaxCreditTaxLiabAmt>1596</PremiumTaxCreditTaxLiabAmt>",
  );
  const pdf = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(pdf.pdf_fpl_alaska, true);
  assertEquals(form8962Pdf.instances?.(pdf, filer, pending)?.length, 1);
});

Deno.test("Form 8962 four-state move rejects unreviewed arrival, policy-state conflict, and return drift", () => {
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          f1095a: {
            f1095as: [policies[0], policies[1], {
              ...policies[2],
              slcsp_review_periods: undefined,
            }, policies[3]],
          },
        },
      }),
    Error,
    "one reported Marketplace review on each distinct arrival policy",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          f1095a: {
            f1095as: [policies[0], policies[1], {
              ...policies[2],
              coverage_state: "TX",
            }, policies[3]],
          },
        },
      }),
    Error,
    "one reported Marketplace review on each distinct arrival policy",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          f1095a: {
            f1095as: [policies[0], policies[1], policies[2], {
              ...policies[3],
              slcsp_review_periods: [{
                start_month: 10,
                end_month: 12,
                reason: "move" as const,
                reported_to_marketplace: false,
              }],
            }],
          },
        },
      }),
    Error,
    "one reported Marketplace review on each distinct arrival policy",
  );
  assertThrows(
    () =>
      form8962Pdf.instances?.(
        form8962Pdf.projectFields?.(fields, pending) ?? {},
        filer,
        {
          ...pending,
          f1040: { ...pending.f1040, line17_additional_taxes: 1_597 },
        },
      ),
    Error,
    "differs from finalized Schedule 2/3 and Form 1040",
  );
});
