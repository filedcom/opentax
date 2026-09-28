import { assertEquals, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import { form8962Pdf } from "./f8962.ts";

const rows = [
  {
    month_code: "JANUARY",
    premium: 0,
    slcsp: 0,
    contribution: 533,
    max_assistance: 0,
    allowed_credit: 0,
    aptc: 0,
  },
  {
    month_code: "FEBRUARY",
    premium: 500,
    slcsp: 600,
    contribution: 533,
    max_assistance: 67,
    allowed_credit: 67,
    aptc: 200,
  },
];

Deno.test("Form 8962 PDF leaves an uncovered month blank, including contribution", () => {
  const projected =
    form8962Pdf.projectFields?.({ monthly_ptc_rows: rows }, {}) ?? {};
  assertEquals(projected.pdf_month_1_premium, undefined);
  assertEquals(projected.pdf_month_1_contribution, undefined);
  assertEquals(projected.pdf_month_2_premium, "500");
  assertEquals(projected.pdf_month_2_contribution, "533");
  assertEquals(projected.pdf_line10_no, true);
  assertThrows(
    () =>
      form8962Pdf.projectFields?.({
        monthly_ptc_rows: [{ ...rows[0], allowed_credit: 1 }],
      }, {}),
    Error,
    "uncovered month cannot claim premium assistance or credit",
  );
});

Deno.test("Form 8962 PDF keeps credit months outside the specified SEHI period", () => {
  const projected = form8962Pdf.projectFields?.({
    monthly_ptc_rows: [
      { ...rows[1], month_code: "JANUARY", allowed_credit: 67 },
      { ...rows[1], month_code: "FEBRUARY", allowed_credit: 67 },
      { ...rows[1], month_code: "MARCH", allowed_credit: 67 },
      { ...rows[1], month_code: "APRIL", allowed_credit: 67 },
      { ...rows[1], month_code: "MAY", allowed_credit: 67 },
      { ...rows[1], month_code: "JUNE", allowed_credit: 67 },
      { ...rows[1], month_code: "JULY", allowed_credit: 167 },
      { ...rows[1], month_code: "AUGUST", allowed_credit: 167 },
      { ...rows[1], month_code: "SEPTEMBER", allowed_credit: 167 },
      { ...rows[1], month_code: "OCTOBER", allowed_credit: 167 },
      { ...rows[1], month_code: "NOVEMBER", allowed_credit: 167 },
      { ...rows[1], month_code: "DECEMBER", allowed_credit: 167 },
    ],
  }, {}) ?? {};
  assertEquals(projected.pdf_month_7_premium, "500");
  assertEquals(projected.pdf_month_7_allowed_credit, "167");
  assertEquals(projected.pdf_month_12_allowed_credit, "167");
});

Deno.test("Form 8962 PDF separated coverage months reconcile with MeF and leave gap blank", () => {
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
  const sourceRows = monthCodes.map((month_code, index) => ({
    month_code,
    premium: index >= 6 && index !== 9 ? 500 : 0,
    slcsp: index >= 6 && index !== 9 ? 600 : 0,
    contribution: 533,
    max_assistance: index >= 6 && index !== 9 ? 67 : 0,
    allowed_credit: index >= 6 && index !== 9 ? 67 : 0,
    aptc: index >= 6 && index !== 9 ? 200 : 0,
  }));
  const fields = {
    household_size: 1,
    taxpayer_modified_agi: 75_300,
    dependents_modified_agi: 0,
    household_income: 75_300,
    federal_poverty_line: 15_060,
    fpl_region: "contiguous",
    federal_poverty_pct: 401,
    applicable_figure: 0.085,
    annual_applicable_contribution: 6_401,
    monthly_applicable_contribution: 533,
    monthly_ptc_rows: sourceRows,
    total_premium_tax_credit: 335,
    total_advance_ptc: 1_000,
    excess_advance_payment: 665,
    excess_advance_premium: 665,
  };
  const filer: FilerIdentity = {
    primarySSN: "123456789",
    fullName: "Alex Taxpayer",
    nameLine1: "TAXPAYER ALEX",
    nameControl: "TAXP",
    filingStatus: FilingStatus.Single,
    address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  };
  const allPending = {
    f1095a: {
      f1095as: [{
        issuer_name: "Marketplace",
        policy_number: "POLICY-1",
        coverage_state: "TX",
        covered_individual_ssns: ["123456789"],
        monthly_premiums: sourceRows.map((row) => row.premium),
        monthly_slcsps: sourceRows.map((row) => row.slcsp),
        monthly_aptcs: sourceRows.map((row) => row.aptc),
        annual_premium: 2_500,
        annual_slcsp: 3_000,
        annual_aptc: 1_000,
      }],
    },
    schedule2: { line1a_excess_advance_premium: 665 },
    f1040: { line11_agi: 75_300, line17_additional_taxes: 665 },
  };
  const projected = form8962Pdf.projectFields?.(fields, allPending) ?? {};
  assertEquals(projected.pdf_month_10_premium, undefined);
  assertEquals(projected.pdf_month_10_contribution, undefined);
  assertEquals(
    form8962Pdf.instances?.(projected, filer, allPending)?.length,
    1,
  );
  assertThrows(
    () =>
      form8962Pdf.instances?.(projected, filer, {
        ...allPending,
        f1040: { line11_agi: 75_300, line17_additional_taxes: 666 },
      }),
    Error,
    "differs from finalized Schedule 2/3 and Form 1040",
  );
});
