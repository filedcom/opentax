import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { DependentRelationship } from "../../../nodes/inputs/general/index.ts";
import { f1095a } from "../../../nodes/inputs/f1095a/index.ts";
import { form8962Pdf } from "../../pdf/forms/f8962.ts";
import { form8962 } from "./f8962.ts";

const months = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];
const slcsps = months.map((_, month) => month < 6 ? 1_200 : 1_300);
const policies = ["123456789", "987654321", "987654322"].map((ssn, index) => ({
  issuer_name: "Texas Marketplace",
  policy_number: `FAMILY-${index + 1}`,
  coverage_state: "TX",
  covered_individual_ssns: [ssn],
  monthly_premiums: Array<number>(12).fill(500),
  monthly_slcsps: slcsps,
  monthly_aptcs: Array<number>(12).fill(100),
  annual_premium: 6_000,
  annual_slcsp: 15_000,
  annual_aptc: 1_200,
}));

function dependent(
  ssn: string,
  name: string,
  taxableInterest: number,
  exemptInterest: number,
) {
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
        source_document_id: `${name}-2025-1040`,
        taxpayer_ssn: ssn,
        tax_year: 2025 as const,
        filing_status: "single" as const,
        blind: false,
        line1z_wages: 0 as const,
        line2a_tax_exempt_interest: exemptInterest,
        line2b_taxable_interest: taxableInterest,
        line3b_dividends: 0 as const,
        line4b_ira: 0 as const,
        line5b_pensions: 0 as const,
        line6b_social_security: 0 as const,
        line7a_capital_gain: 0 as const,
        line8_additional_income: 0 as const,
        line10_adjustments: 0 as const,
        line11b_agi: taxableInterest,
      },
      interest_forms1099: [{
        source_document_id: `${name}-2025-1099-int`,
        recipient_ssn: ssn,
        box1_taxable_interest: taxableInterest,
        box8_tax_exempt_interest: exemptInterest,
      }],
    },
  };
}

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
  monthly_ptc_rows: months.map((month_code, month) => ({
    month_code,
    premium: 1_500,
    slcsp: slcsps[month],
    contribution: 910,
    max_assistance: month < 6 ? 290 : 390,
    allowed_credit: month < 6 ? 290 : 390,
    aptc: 300,
  })),
  total_premium_tax_credit: 4_080,
  total_advance_ptc: 3_600,
  net_premium_tax_credit: 480,
  excess_advance_payment: 0,
  excess_advance_premium: 0,
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
  schedule3: { line9_premium_tax_credit: 480 },
  f1040: { line11_agi: 100_000, line31_additional_payments: 480 },
};

Deno.test("Form 8962 three identified same-state policies combine A/C and one B through MeF/PDF", () => {
  const source = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    pending.f1095a,
  );
  const routed = source.outputs.find((item) => item.nodeType === "form8962");
  assertEquals((routed?.fields.monthly_premiums as number[])[0], 1_500);
  assertEquals((routed?.fields.monthly_slcsps as number[])[0], 1_200);
  assertEquals((routed?.fields.monthly_aptcs as number[])[0], 300);

  const xml = form8962.build(fields, { filer, pending });
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 12);
  assertStringIncludes(xml, "<TotalDependentsModifiedAGIAmt>28500</TotalDependentsModifiedAGIAmt>");
  assertStringIncludes(xml, "<MonthlyPremiumAmt>1500</MonthlyPremiumAmt>");
  assertStringIncludes(xml, "<MonthlyPremiumSLCSPAmt>1200</MonthlyPremiumSLCSPAmt>");
  assertStringIncludes(xml, "<ReconciledPremiumTaxCreditAmt>480</ReconciledPremiumTaxCreditAmt>");
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(projected.pdf_month_1_premium, "1500");
  assertEquals(projected.pdf_month_1_slcsp, "1200");
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
});

Deno.test("Form 8962 three-policy route rejects duplicate people, divergent SLCSP, reused evidence and final-return mismatch", () => {
  assertThrows(
    () => form8962.build(fields, { filer, pending: {
      ...pending,
      f1095a: { f1095as: [policies[0], policies[1], {
        ...policies[2], covered_individual_ssns: ["987654321"],
      }] },
    } }),
    Error,
    "distinct taxpayer and two claimed-dependent covered people",
  );
  assertThrows(
    () => form8962.build(fields, { filer, pending: {
      ...pending,
      f1095a: { f1095as: [policies[0], policies[1], {
        ...policies[2],
        monthly_slcsps: slcsps.map((value, month) => month === 0 ? value + 1 : value),
        annual_slcsp: 15_001,
      }] },
    } }),
    Error,
    "same positive SLCSP",
  );
  const reused = {
    ...pending,
    general: {
      ...pending.general,
      dependents: [pending.general.dependents[0], {
        ...pending.general.dependents[1],
        ptc_tax_return: {
          ...pending.general.dependents[1].ptc_tax_return,
          filed_form1040: {
            ...pending.general.dependents[1].ptc_tax_return.filed_form1040,
            source_document_id: "Casey-2025-1040",
          },
        },
      }],
    },
  };
  assertThrows(
    () => form8962.build(fields, { filer, pending: reused }),
    Error,
    "distinct filed-return and interest source documents",
  );
  assertThrows(
    () => form8962.build(fields, { filer, pending: {
      ...pending,
      general: {
        ...pending.general,
        dependents: [pending.general.dependents[0], {
          ...pending.general.dependents[1],
          ptc_tax_return: {
            ...pending.general.dependents[1].ptc_tax_return,
            interest_forms1099: [{
              ...pending.general.dependents[1].ptc_tax_return.interest_forms1099[0],
              recipient_ssn: "987654321",
            }],
          },
        }],
      },
    } }),
    Error,
    "filed returns and interest forms naming each covered person",
  );
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertThrows(
    () => form8962Pdf.instances?.(projected, filer, {
      ...pending,
      f1040: { ...pending.f1040, line31_additional_payments: 481 },
    }),
    Error,
    "differs from finalized Schedule 2/3 and Form 1040",
  );
});

Deno.test("Form 8962 annual line 11 combines three unchanged family policies and one same-state SLCSP", () => {
  const annualPolicies = policies.map((policy) => ({
    ...policy,
    monthly_slcsps: Array<number>(12).fill(1_200),
    annual_slcsp: 14_400,
  }));
  const annualFields = {
    ...fields,
    monthly_ptc_rows: undefined,
    annual_premium: 18_000,
    annual_slcsp: 14_400,
    annual_max_ptc: 3_477,
    annual_ptc_allowed: 3_477,
    annual_aptc: 3_600,
    total_premium_tax_credit: 3_477,
    net_premium_tax_credit: 0,
    excess_advance_payment: 123,
    excess_advance_premium: 123,
  };
  const annualPending = {
    ...pending,
    f1095a: { f1095as: annualPolicies },
    schedule2: { line1a_excess_advance_premium: 123 },
    schedule3: {},
    f1040: { line11_agi: 100_000, line17_additional_taxes: 123 },
  };
  const source = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    annualPending.f1095a,
  );
  const routed = source.outputs.find((item) => item.nodeType === "form8962");
  assertEquals(routed?.fields.annual_line11_eligible, true);
  assertEquals(routed?.fields.annual_premium, 18_000);
  assertEquals(routed?.fields.annual_slcsp, 14_400);
  assertEquals(routed?.fields.annual_aptc, 3_600);

  const xml = form8962.build(annualFields, { filer, pending: annualPending });
  assertStringIncludes(xml, "<AnnualPremiumAmt>18000</AnnualPremiumAmt>");
  assertStringIncludes(xml, "<AnnualPremiumSLCSPAmt>14400</AnnualPremiumSLCSPAmt>");
  assertStringIncludes(xml, "<PremiumTaxCreditTaxLiabAmt>123</PremiumTaxCreditTaxLiabAmt>");
  assertEquals(xml.includes("<MonthlyPTCCalculationGrp>"), false);
  const projected = form8962Pdf.projectFields?.(annualFields, annualPending) ?? {};
  assertEquals(form8962Pdf.instances?.(projected, filer, annualPending)?.length, 1);

  assertThrows(
    () => form8962.build(annualFields, { filer, pending: {
      ...annualPending,
      f1095a: { f1095as: [annualPolicies[0], annualPolicies[1], {
        ...annualPolicies[2], covered_individual_ssns: ["987654321"],
      }] },
    } }),
    Error,
    "distinct taxpayer and two claimed-dependent covered people",
  );
  assertThrows(
    () => form8962.build(annualFields, { filer, pending: {
      ...annualPending,
      f1095a: { f1095as: [annualPolicies[0], annualPolicies[1], {
        ...annualPolicies[2],
        monthly_slcsps: Array<number>(12).fill(1_201),
        annual_slcsp: 14_412,
      }] },
    } }),
    Error,
    "one same-state SLCSP",
  );
  assertThrows(
    () => form8962.build({ ...annualFields, annual_premium: 12_000 }, {
      filer, pending: annualPending,
    }),
    Error,
    "annual line 11 and lines 24 through 29 differ",
  );
  assertThrows(
    () => form8962Pdf.instances?.(projected, filer, {
      ...annualPending,
      f1040: { ...annualPending.f1040, line17_additional_taxes: 124 },
    }),
    Error,
    "differs from finalized Schedule 2/3 and Form 1040",
  );
});
