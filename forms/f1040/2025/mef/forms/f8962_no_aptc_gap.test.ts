import { assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { FilingStatus as SourceFilingStatus } from "../../../nodes/types.ts";
import { form8962 } from "./f8962.ts";

const months = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];
const applicableSlcsps = months.map((_, index) => index < 6 ? 650 : 700);
const rows = months.map((month_code, index) => ({
  month_code,
  premium: 500,
  slcsp: applicableSlcsps[index],
  contribution: 533,
  max_assistance: applicableSlcsps[index] - 533,
  allowed_credit: applicableSlcsps[index] - 533,
  aptc: 0,
}));
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
  monthly_ptc_rows: rows,
  total_premium_tax_credit: 1_704,
  total_advance_ptc: 0,
  net_premium_tax_credit: 1_704,
};
const filer = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.Single,
};
const policy = {
  issuer_name: "Marketplace",
  policy_number: "POLICY-NO-APTC",
  coverage_state: "TX",
  covered_individual_ssns: ["123456789"],
  monthly_premiums: months.map(() => 500),
  monthly_slcsps: months.map(() => 0),
  monthly_aptcs: months.map(() => 0),
  annual_premium: 6_000,
  annual_slcsp: 0,
  annual_aptc: 0,
};
const pending = {
  general: {
    filing_status: SourceFilingStatus.Single,
    taxpayer_ssn: "123456789",
    taxpayer_can_be_claimed_as_dependent: false,
  },
  f1095a: { f1095as: [policy] },
  schedule3: { line9_premium_tax_credit: 1_704 },
  f1040: { line11_agi: 75_300, line31_additional_payments: 1_704 },
};

Deno.test("Form 8962 positive no-APTC claim cannot rely on blank reported SLCSP", () => {
  assertThrows(
    () => form8962.build(fields, { filer, pending }),
    Error,
    "one fully paid, nonshared Marketplace policy",
  );
});

Deno.test("Form 8962 positive no-APTC claim blocks corrections without payment evidence", () => {
  const corrections = applicableSlcsps.map((corrected_slcsp, index) => ({
    month: index + 1,
    basis: "no_aptc" as const,
    corrected_slcsp,
    determination_source: "marketplace_tool" as const,
  }));
  assertThrows(
    () => form8962.build(fields, {
      filer,
      pending: {
        ...pending,
        f1095a: { f1095as: [{ ...policy, slcsp_corrections: corrections }] },
      },
    }),
    Error,
    "one fully paid, nonshared Marketplace policy",
  );
});
