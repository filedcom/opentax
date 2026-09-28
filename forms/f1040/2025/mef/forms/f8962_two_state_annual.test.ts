import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { DependentRelationship } from "../../../nodes/inputs/general/index.ts";
import { f1095a } from "../../../nodes/inputs/f1095a/index.ts";
import { form8962Pdf } from "../../pdf/forms/f8962.ts";
import { form8962 } from "./f8962.ts";

const dependent = {
  first_name: "Casey",
  last_name: "Test",
  ssn: "987654321",
  dob: "2010-06-15",
  relationship: DependentRelationship.Daughter,
  months_in_home: 12,
  ptc_tax_return: {
    filing: "required" as const,
    filed_form1040: {
      source_document_id: "casey-filed-1040",
      taxpayer_ssn: "987654321",
      tax_year: 2025 as const,
      filing_status: "single" as const,
      blind: false,
      line1z_wages: 0 as const,
      line2a_tax_exempt_interest: 500,
      line2b_taxable_interest: 12_800,
      line3b_dividends: 0 as const,
      line4b_ira: 0 as const,
      line5b_pensions: 0 as const,
      line6b_social_security: 0 as const,
      line7a_capital_gain: 0 as const,
      line8_additional_income: 0 as const,
      line10_adjustments: 0 as const,
      line11b_agi: 12_800,
    },
    interest_forms1099: [{
      source_document_id: "casey-1099-int",
      recipient_ssn: "987654321",
      box1_taxable_interest: 12_800,
      box8_tax_exempt_interest: 500,
    }],
  },
};

const policy = (number: string, ssn: string, state: string, slcsp: number) => ({
  issuer_name: "Marketplace",
  policy_number: number,
  coverage_state: state,
  covered_individual_ssns: [ssn],
  monthly_premiums: Array<number>(12).fill(500),
  monthly_slcsps: Array<number>(12).fill(slcsp),
  monthly_aptcs: Array<number>(12).fill(100),
  annual_premium: 6_000,
  annual_slcsp: 12 * slcsp,
  annual_aptc: 1_200,
});
const policies = [
  policy("TAXPAYER-TX", "123456789", "TX", 1_000),
  policy("DEPENDENT-OK", "987654321", "OK", 700),
];
const filer = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
};
const fields = {
  household_size: 2,
  taxpayer_modified_agi: 90_000,
  dependents_modified_agi: 13_300,
  household_income: 103_300,
  federal_poverty_line: 20_440,
  fpl_region: "contiguous" as const,
  federal_poverty_pct: 401,
  applicable_figure: 0.085,
  annual_applicable_contribution: 8_781,
  monthly_applicable_contribution: 732,
  annual_premium: 12_000,
  annual_slcsp: 20_400,
  annual_max_ptc: 11_619,
  annual_ptc_allowed: 11_619,
  annual_aptc: 2_400,
  total_premium_tax_credit: 11_619,
  total_advance_ptc: 2_400,
  net_premium_tax_credit: 9_219,
};
const pending = {
  general: {
    filing_status: "single" as const,
    taxpayer_ssn: "123456789",
    address_state: "TX",
    dependents: [dependent],
  },
  f1095a: { f1095as: policies },
  schedule3: { line9_premium_tax_credit: 9_219 },
  f1040: { line11_agi: 90_000, line31_additional_payments: 9_219 },
};

Deno.test("Form 8962 annual line 11 adds two different-state family benchmarks", () => {
  const source = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    pending.f1095a,
  );
  const routed = source.outputs.find((item) => item.nodeType === "form8962");
  assertEquals(routed?.fields.annual_slcsp, 20_400);
  assertEquals((routed?.fields.monthly_slcsps as number[])[0], 1_700);
  assertEquals(routed?.fields.annual_line11_eligible, true);

  const xml = form8962.build(fields, { filer, pending });
  assertStringIncludes(xml, "<AnnualPremiumSLCSPAmt>20400</AnnualPremiumSLCSPAmt>");
  assertStringIncludes(xml, "<ReconciledPremiumTaxCreditAmt>9219</ReconciledPremiumTaxCreditAmt>");
  assertEquals(xml.includes("<MonthlyPTCCalculationGrp>"), false);
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
});

Deno.test("Form 8962 annual two-state route rejects false state, source, and return", () => {
  assertThrows(
    () => form8962.build(fields, { filer, pending: {
      ...pending,
      f1095a: { f1095as: [{ ...policies[0], coverage_state: "NM" }, policies[1]] },
    } }),
    Error,
    "taxpayer policy in the filing state",
  );
  assertThrows(
    () => form8962.build(fields, { filer, pending: {
      ...pending,
      f1095a: { f1095as: [policies[0], {
        ...policies[1],
        monthly_slcsps: Array<number>(12).fill(800),
        annual_slcsp: 9_600,
      }] },
    } }),
    Error,
    "annual line 11 and lines 24 through 29 differ",
  );
  assertThrows(
    () => form8962.build(fields, { filer, pending: {
      ...pending,
      f1040: { ...pending.f1040, line31_additional_payments: 9_218 },
    } }),
    Error,
    "differs from finalized Schedule 2/3 and Form 1040",
  );
  assertThrows(
    () => form8962.build(fields, { filer, pending: {
      ...pending,
      f1095a: { f1095as: [policies[0], {
        ...policies[1], coverage_state: "AK",
      }] },
    } }),
    Error,
    "both states on the contiguous poverty table",
  );
});
