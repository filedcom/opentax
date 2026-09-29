import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { form8962 as mef8962 } from "../../../2025/mef/forms/f8962.ts";
import { form8962Pdf } from "../../../2025/pdf/forms/f8962.ts";
import { current1095AStatements, f1095a } from "./index.ts";

const months = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];
const original = {
  issuer_name: "Marketplace",
  policy_number: "POLICY-1",
  coverage_state: "TX",
  covered_individual_ssns: ["123456789"],
  monthly_premiums: Array<number>(12).fill(400),
  monthly_slcsps: Array<number>(12).fill(500),
  monthly_aptcs: Array<number>(12).fill(100),
};
const corrected = {
  ...original,
  corrected_box_checked: true as const,
  monthly_premiums: Array<number>(12).fill(500),
  monthly_slcsps: Array<number>(12).fill(600),
  monthly_aptcs: Array<number>(12).fill(200),
};
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
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
};
const pending = {
  f1095a: { f1095as: [original, corrected] },
  schedule2: { line1a_excess_advance_premium: 1_596 },
  f1040: { line11_agi: 75_300, line17_additional_taxes: 1_596 },
};

Deno.test("corrected 1095-A supersedes its retained original in Form 8962 node, MeF, and PDF", () => {
  assertEquals(current1095AStatements([original, corrected]), [corrected]);
  const result = f1095a.compute({ taxYear: 2025, formType: "f1040" }, pending.f1095a);
  const output = result.outputs.find((item) => item.nodeType === "form8962");
  assertEquals(output?.fields.monthly_premiums, corrected.monthly_premiums);
  assertEquals(output?.fields.monthly_slcsps, corrected.monthly_slcsps);
  assertEquals(output?.fields.monthly_aptcs, corrected.monthly_aptcs);
  const xml = mef8962.build(fields, { filer, pending });
  assertEquals(xml.includes("<IRS8962>"), true);
  const pdf = form8962Pdf.projectFields?.(fields, pending);
  assertEquals(pdf?.monthly_ptc_rows, fields.monthly_ptc_rows);
});

Deno.test("corrected 1095-A annual totals replace rather than add to original totals", () => {
  const result = f1095a.compute({ taxYear: 2025, formType: "f1040" }, {
    f1095as: [
      { ...original, annual_premium: 4_800, annual_slcsp: 6_000, annual_aptc: 1_200 },
      { ...corrected, annual_premium: 6_000, annual_slcsp: 7_200, annual_aptc: 2_400 },
    ],
  });
  const output = result.outputs.find((item) => item.nodeType === "form8962");
  assertEquals(output?.fields.annual_premium, 6_000);
  assertEquals(output?.fields.annual_slcsp, 7_200);
  assertEquals(output?.fields.annual_aptc, 2_400);
});

Deno.test("corrected 1095-A rejects ambiguous identity or multiple corrected versions", () => {
  assertThrows(() => f1095a.compute({ taxYear: 2025, formType: "f1040" }, {
    f1095as: [original, { ...corrected, corrected_box_checked: undefined }],
  }), Error, "repeats coverage");
  assertThrows(() => current1095AStatements([original, corrected, {
    ...corrected, monthly_premiums: Array<number>(12).fill(550),
  }]), Error, "ambiguous corrected statement versions");
  assertThrows(() => current1095AStatements([{
    ...original, policy_number: undefined,
  }, corrected]), Error, "ambiguous issuer and policy identity");
  assertThrows(() => current1095AStatements([original, {
    ...corrected, issuer_name: "Other Marketplace",
  }]), Error, "ambiguous issuer and policy identity");
  assertThrows(() => current1095AStatements([{ ...corrected, policy_number: undefined }]),
    Error, "needs a policy number");
});
