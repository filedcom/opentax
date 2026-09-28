import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { general } from "../../../nodes/inputs/general/index.ts";
import { FilingStatus as SourceFilingStatus } from "../../../nodes/types.ts";
import { form8962Pdf } from "../../pdf/forms/f8962.ts";
import { form8962 } from "./f8962.ts";

const residenceMonths = [
  ...Array<string>(6).fill("AK"),
  ...Array<string>(6).fill("TX"),
];
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
  monthly_ptc_rows: monthCodes.map((month_code) => ({
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
const policies = [
  { policy_number: "ALASKA-POLICY", coverage_state: "AK", start: 0, end: 6 },
  { policy_number: "TEXAS-POLICY", coverage_state: "TX", start: 6, end: 12 },
].map(({ policy_number, coverage_state, start, end }) => ({
  issuer_name: "Marketplace",
  policy_number,
  coverage_state,
  covered_individual_ssns: ["123456789"],
  monthly_premiums: monthCodes.map((_, index) =>
    index >= start && index < end ? 500 : 0
  ),
  monthly_slcsps: monthCodes.map((_, index) =>
    index >= start && index < end ? 600 : 0
  ),
  monthly_aptcs: monthCodes.map((_, index) =>
    index >= start && index < end ? 200 : 0
  ),
  annual_premium: 3_000,
  annual_slcsp: 3_600,
  annual_aptc: 1_200,
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
}));
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
    ptc_residence_states_2025: ["AK", "TX"],
    ptc_residence_months_2025: residenceMonths,
  },
  f1095a: { f1095as: policies },
  schedule2: { line1a_excess_advance_premium: 1_596 },
  f1040: { line11_agi: 75_300, line17_additional_taxes: 1_596 },
};

Deno.test("Form 8962 interstate move uses Alaska table and reconciles policy months in XML and PDF", () => {
  const source = general.compute(
    { taxYear: 2025, formType: "f1040" },
    general.inputSchema.parse(pending.general),
  );
  assertEquals(
    source.outputs.find((output) => output.nodeType === "form8962")?.fields
      .fpl_region,
    "alaska",
  );
  const xml = form8962.build(fields, { filer, pending });
  assertStringIncludes(xml, "<PovertyLevelAmt>18810</PovertyLevelAmt>");
  assertStringIncludes(
    xml,
    "<FederalPovertyTableLocCd>A</FederalPovertyTableLocCd>",
  );
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 12);
  const pdf = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(pdf.pdf_fpl_alaska, true);
  assertEquals(form8962Pdf.instances?.(pdf, filer, pending)?.length, 1);
});

Deno.test("Form 8962 interstate move rejects a lower table, missing residence detail, and policy mismatch", () => {
  assertThrows(
    () =>
      form8962.build({ ...fields, fpl_region: "contiguous" }, {
        filer,
        pending,
      }),
    Error,
    "poverty table must match",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          general: { ...pending.general, ptc_residence_months_2025: undefined },
        },
      }),
    Error,
    "needs twelve residence months",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          general: {
            ...pending.general,
            ptc_residence_states_2025: ["AK", "HI", "TX"],
          },
        },
      }),
    Error,
    "needs twelve residence months with one state switch",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          general: {
            ...pending.general,
            ptc_residence_months_2025: [
              ...Array<string>(7).fill("AK"),
              ...Array<string>(5).fill("TX"),
            ],
          },
        },
      }),
    Error,
    "reported Marketplace move review",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          f1095a: {
            f1095as: [policies[0], { ...policies[1], coverage_state: "AK" }],
          },
        },
      }),
    Error,
    "reported Marketplace move review",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          f1095a: {
            f1095as: [policies[0], {
              ...policies[1],
              slcsp_review_periods: undefined,
            }],
          },
        },
      }),
    Error,
    "reported Marketplace move review",
  );
  assertThrows(
    () =>
      form8962Pdf.instances?.(
        form8962Pdf.projectFields?.(fields, pending) ?? {},
        filer,
        {
          ...pending,
          general: { ...pending.general, ptc_residence_states_2025: ["TX"] },
        },
      ),
    Error,
    "residence months disagree",
  );
});
