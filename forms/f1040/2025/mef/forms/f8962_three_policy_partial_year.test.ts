import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { DependentRelationship } from "../../../nodes/inputs/general/index.ts";
import { f1095a } from "../../../nodes/inputs/f1095a/index.ts";
import { form8962Pdf } from "../../pdf/forms/f8962.ts";
import { form8962 } from "./f8962.ts";

const monthCodes = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];
const covered = (amount: number) => monthCodes.map((_, index) =>
  index < 6 ? amount : 0
);
const policies = ["123456789", "987654321", "987654322"].map((ssn, index) => ({
  issuer_name: "Texas Marketplace",
  policy_number: `HALF-YEAR-${index + 1}`,
  coverage_state: "TX",
  covered_individual_ssns: [ssn],
  monthly_premiums: covered(500),
  monthly_slcsps: covered(1_200),
  monthly_aptcs: covered(100),
  annual_premium: 3_000,
  annual_slcsp: 7_200,
  annual_aptc: 600,
}));

function dependent(ssn: string, name: string, interest: number, exempt: number) {
  return {
    first_name: name,
    last_name: "Test",
    ssn,
    dob: "2010-06-15",
    relationship: DependentRelationship.Daughter,
    months_in_home: 12,
    ptc_tax_return: {
      filing: "required" as const,
      filed_form1040: {
        source_document_id: `${name}-return`,
        taxpayer_ssn: ssn,
        tax_year: 2025 as const,
        filing_status: "single" as const,
        blind: false,
        line1z_wages: 0 as const,
        line2a_tax_exempt_interest: exempt,
        line2b_taxable_interest: interest,
        line3b_dividends: 0 as const,
        line4b_ira: 0 as const,
        line5b_pensions: 0 as const,
        line6b_social_security: 0 as const,
        line7a_capital_gain: 0 as const,
        line8_additional_income: 0 as const,
        line10_adjustments: 0 as const,
        line11b_agi: interest,
      },
      interest_forms1099: [{
        source_document_id: `${name}-interest`,
        recipient_ssn: ssn,
        box1_taxable_interest: interest,
        box8_tax_exempt_interest: exempt,
      }],
    },
  };
}

const filer = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
};
const pending = {
  general: {
    filing_status: "single" as const,
    taxpayer_ssn: "123456789",
    address_state: "TX",
    dependents: [
      dependent("987654321", "Casey", 12_800, 500),
      dependent("987654322", "Robin", 15_000, 200),
    ],
  },
  f1095a: { f1095as: policies },
  schedule2: { line1a_excess_advance_premium: 60 },
  f1040: { line11_agi: 100_000, line17_additional_taxes: 60 },
};
const fields = {
  household_size: 3,
  taxpayer_modified_agi: 100_000,
  dependents_modified_agi: 28_500,
  household_income: 128_500,
  federal_poverty_line: 25_820,
  fpl_region: "contiguous" as const,
  federal_poverty_pct: 401,
  applicable_figure: 0.085,
  annual_applicable_contribution: 10_923,
  monthly_applicable_contribution: 910,
  monthly_ptc_rows: monthCodes.map((month_code, index) => ({
    month_code,
    premium: index < 6 ? 1_500 : 0,
    slcsp: index < 6 ? 1_200 : 0,
    contribution: 910,
    max_assistance: index < 6 ? 290 : 0,
    allowed_credit: index < 6 ? 290 : 0,
    aptc: index < 6 ? 300 : 0,
  })),
  total_premium_tax_credit: 1_740,
  total_advance_ptc: 1_800,
  net_premium_tax_credit: 0,
  excess_advance_payment: 60,
  excess_advance_premium: 60,
};

Deno.test("Form 8962 three-policy partial year leaves uncovered months blank through source, MeF, and PDF", () => {
  const source = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    pending.f1095a,
  );
  const routed = source.outputs.find((item) => item.nodeType === "form8962");
  assertEquals((routed?.fields.monthly_premiums as number[])[0], 1_500);
  assertEquals((routed?.fields.monthly_slcsps as number[])[0], 1_200);
  assertEquals((routed?.fields.monthly_premiums as number[])[6], 0);
  assertEquals((routed?.fields.monthly_slcsps as number[])[6], 0);

  const xml = form8962.build(fields, { filer, pending });
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 6);
  assertStringIncludes(xml, "<MonthlyPremiumAmt>1500</MonthlyPremiumAmt>");
  assertStringIncludes(xml, "<PremiumTaxCreditTaxLiabAmt>60</PremiumTaxCreditTaxLiabAmt>");
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(projected.pdf_month_7_premium, undefined);
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
});

Deno.test("Form 8962 three-policy partial year rejects staggered enrollment and residual SLCSP", () => {
  assertThrows(
    () => form8962.build(fields, { filer, pending: {
      ...pending,
      f1095a: { f1095as: [policies[0], policies[1], {
        ...policies[2],
        monthly_premiums: policies[2].monthly_premiums.map((amount, index) =>
          index === 5 ? 0 : amount
        ),
        monthly_slcsps: policies[2].monthly_slcsps.map((amount, index) =>
          index === 5 ? 0 : amount
        ),
        monthly_aptcs: policies[2].monthly_aptcs.map((amount, index) =>
          index === 5 ? 0 : amount
        ),
        annual_premium: 2_500,
        annual_slcsp: 6_000,
        annual_aptc: 500,
      }] },
    } }),
    Error,
    "three-person policies must cover the same months",
  );
  assertThrows(
    () => form8962.build(fields, { filer, pending: {
      ...pending,
      f1095a: { f1095as: [policies[0], policies[1], {
        ...policies[2],
        monthly_slcsps: policies[2].monthly_slcsps.map((amount, index) =>
          index === 6 ? 1_200 : amount
        ),
        annual_slcsp: 8_400,
      }] },
    } }),
    Error,
    "three-person policies must cover the same months",
  );
});
