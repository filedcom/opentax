import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../../../mef/header.ts";
import { DependentRelationship } from "../../../../../nodes/inputs/general/index.ts";
import { f1095a } from "../../../../../nodes/inputs/f1095a/index.ts";
import { form8962Pdf } from "../../../../pdf/forms/health/f8962.ts";
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
const alaska = {
  issuer_name: "Alaska Marketplace",
  policy_number: "ALASKA-TAXPAYER",
  coverage_state: "AK",
  covered_individual_ssns: ["123456789"],
  monthly_premiums: Array<number>(12).fill(500),
  monthly_slcsps: months.map((_, index) => index < 6 ? 1_200 : 1_300),
  monthly_aptcs: Array<number>(12).fill(100),
  annual_premium: 6_000,
  annual_slcsp: 15_000,
  annual_aptc: 1_200,
};
const texas = {
  issuer_name: "Texas Marketplace",
  policy_number: "TEXAS-DEPENDENT",
  coverage_state: "TX",
  covered_individual_ssns: ["987654321"],
  monthly_premiums: Array<number>(12).fill(500),
  monthly_slcsps: Array<number>(12).fill(700),
  monthly_aptcs: Array<number>(12).fill(100),
  annual_premium: 6_000,
  annual_slcsp: 8_400,
  annual_aptc: 1_200,
};
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
      source_document_id: "casey-filed-2025-1040",
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
      source_document_id: "casey-2025-1099-int",
      recipient_ssn: "987654321",
      box1_taxable_interest: 12_800,
      box8_tax_exempt_interest: 500,
    }],
  },
};
const filer = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: {
    line1: "1 Test Way",
    city: "Anchorage",
    state: "AK",
    zip: "99501",
  },
  filingStatus: FilingStatus.Single,
};
const fields = {
  household_size: 2,
  taxpayer_modified_agi: 136_700,
  dependents_modified_agi: 13_300,
  household_income: 150_000,
  federal_poverty_line: 25_540,
  fpl_region: "alaska" as const,
  federal_poverty_pct: 401,
  applicable_figure: 0.085,
  annual_applicable_contribution: 12_750,
  monthly_applicable_contribution: 1_063,
  monthly_ptc_rows: months.map((month_code, index) => ({
    month_code,
    premium: 1_000,
    slcsp: index < 6 ? 1_900 : 2_000,
    contribution: 1_063,
    max_assistance: index < 6 ? 837 : 937,
    allowed_credit: index < 6 ? 837 : 937,
    aptc: 200,
  })),
  total_premium_tax_credit: 10_644,
  total_advance_ptc: 2_400,
  net_premium_tax_credit: 8_244,
  excess_advance_payment: 0,
  excess_advance_premium: 0,
};
const pending = {
  general: {
    filing_status: "single" as const,
    taxpayer_ssn: "123456789",
    address_state: "AK",
    ptc_residence_states_2025: ["AK"],
    ptc_residence_months_2025: Array<string>(12).fill("AK"),
    dependents: [dependent],
  },
  f1095a: { f1095as: [alaska, texas] },
  schedule3: { line9_premium_tax_credit: 8_244 },
  f1040: { line11_agi: 136_700, line31_additional_payments: 8_244 },
};

Deno.test("Form 8962 Alaska taxpayer and Texas dependent monthly policies join source, return, native and PDF", () => {
  const source = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    pending.f1095a,
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals((source?.monthly_premiums as number[])[0], 1_000);
  assertEquals((source?.monthly_slcsps as number[])[0], 1_900);
  assertEquals((source?.monthly_slcsps as number[])[6], 2_000);
  assertEquals((source?.monthly_aptcs as number[])[0], 200);

  const xml = form8962.build(fields, { filer, pending });
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 12);
  assertStringIncludes(xml, "<PovertyLevelAmt>25540</PovertyLevelAmt>");
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>1900</MonthlyPremiumSLCSPAmt>",
  );
  assertStringIncludes(
    xml,
    "<ReconciledPremiumTaxCreditAmt>8244</ReconciledPremiumTaxCreditAmt>",
  );
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(projected.pdf_month_1_slcsp, "1900");
  assertEquals(projected.pdf_month_7_slcsp, "2000");
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
});

Deno.test("Form 8962 Alaska family overlap rejects residence, owner, benchmark and final return tampering", () => {
  for (
    const general of [
      { ...pending.general, ptc_residence_states_2025: undefined },
      {
        ...pending.general,
        ptc_residence_months_2025: [...Array<string>(11).fill("AK"), "TX"],
      },
    ]
  ) {
    assertThrows(() =>
      form8962.build(fields, { filer, pending: { ...pending, general } })
    );
  }
  assertThrows(() =>
    form8962.build(fields, {
      filer,
      pending: {
        ...pending,
        f1095a: {
          f1095as: [alaska, {
            ...texas,
            covered_individual_ssns: ["123456789"],
          }],
        },
      },
    })
  );
  assertThrows(() =>
    form8962.build(fields, {
      filer,
      pending: {
        ...pending,
        f1095a: {
          f1095as: [alaska, {
            ...texas,
            monthly_slcsps: Array<number>(12).fill(701),
            annual_slcsp: 8_412,
          }],
        },
      },
    })
  );
  assertThrows(() =>
    form8962.build(fields, {
      filer,
      pending: {
        ...pending,
        f1040: { ...pending.f1040, line31_additional_payments: 8_243 },
      },
    })
  );
});
