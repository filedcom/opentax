import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { DependentRelationship } from "../../../nodes/inputs/general/index.ts";
import { f1095a } from "../../../nodes/inputs/f1095a/index.ts";
import { form8962Pdf } from "../../pdf/forms/f8962.ts";
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
const taxpayerPolicy = {
  issuer_name: "Texas Marketplace",
  policy_number: "TAXPAYER-PLAN",
  coverage_state: "TX",
  covered_individual_ssns: ["123456789"],
  monthly_premiums: Array<number>(12).fill(500),
  monthly_slcsps: months.map((_, index) => index < 6 ? 1_000 : 600),
  monthly_aptcs: Array<number>(12).fill(100),
};
const dependentPolicy = {
  issuer_name: "Texas Marketplace",
  policy_number: "DEPENDENT-PLAN",
  coverage_state: "TX",
  covered_individual_ssns: ["987654321"],
  monthly_premiums: months.map((_, index) => index < 6 ? 500 : 0),
  monthly_slcsps: months.map((_, index) => index < 6 ? 1_000 : 0),
  monthly_aptcs: months.map((_, index) => index < 6 ? 100 : 0),
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
      source_document_id: "casey-2025-1040",
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
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
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
  monthly_ptc_rows: months.map((month_code, index) => ({
    month_code,
    premium: index < 6 ? 1_000 : 500,
    slcsp: index < 6 ? 1_000 : 600,
    contribution: 732,
    max_assistance: index < 6 ? 268 : 0,
    allowed_credit: index < 6 ? 268 : 0,
    aptc: index < 6 ? 200 : 100,
  })),
  total_premium_tax_credit: 1_608,
  total_advance_ptc: 1_800,
  excess_advance_payment: 192,
  excess_advance_premium: 192,
};
const pending = {
  general: {
    filing_status: "single" as const,
    taxpayer_ssn: "123456789",
    dependents: [dependent],
  },
  f1095a: { f1095as: [taxpayerPolicy, dependentPolicy] },
  schedule2: { line1a_excess_advance_premium: 192 },
  f1040: { line11_agi: 90_000, line17_additional_taxes: 192 },
};

Deno.test("Form 8962 monthly same-state family overlap combines A/C once and B once through MeF and PDF", () => {
  const source = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    pending.f1095a,
  );
  const routed = source.outputs.find((item) => item.nodeType === "form8962");
  assertEquals((routed?.fields.monthly_premiums as number[])[0], 1_000);
  assertEquals((routed?.fields.monthly_slcsps as number[])[0], 1_000);
  assertEquals((routed?.fields.monthly_aptcs as number[])[0], 200);
  assertEquals((routed?.fields.monthly_premiums as number[])[6], 500);
  assertEquals((routed?.fields.monthly_slcsps as number[])[6], 600);

  const xml = form8962.build(fields, { filer, pending });
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 12);
  assertStringIncludes(xml, "<MonthlyPremiumAmt>1000</MonthlyPremiumAmt>");
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>1000</MonthlyPremiumSLCSPAmt>",
  );
  assertStringIncludes(
    xml,
    "<PremiumTaxCreditTaxLiabAmt>192</PremiumTaxCreditTaxLiabAmt>",
  );
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(projected.pdf_month_1_premium, "1000");
  assertEquals(projected.pdf_month_1_slcsp, "1000");
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
});

Deno.test("Form 8962 monthly family overlap rejects missing enrollee ownership, divergent B and final return", () => {
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          general: {
            ...pending.general,
            dependents: [{
              ...dependent,
              ptc_tax_return: {
                ...dependent.ptc_tax_return,
                interest_forms1099: [{
                  ...dependent.ptc_tax_return.interest_forms1099[0],
                  recipient_ssn: "111223333",
                }],
              },
            }],
          },
        },
      }),
    Error,
    "filed return and interest forms naming the covered person",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          f1095a: {
            f1095as: [taxpayerPolicy, {
              ...dependentPolicy,
              covered_individual_ssns: ["123456789"],
            }],
          },
        },
      }),
    Error,
    "distinct taxpayer and claimed-dependent covered people",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          f1095a: {
            f1095as: [taxpayerPolicy, {
              ...dependentPolicy,
              monthly_slcsps: dependentPolicy.monthly_slcsps.map((
                amount,
                index,
              ) => index === 0 ? amount + 1 : amount),
            }],
          },
        },
      }),
    Error,
    "same positive SLCSP",
  );
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertThrows(
    () =>
      form8962Pdf.instances?.(projected, filer, {
        ...pending,
        f1040: { ...pending.f1040, line17_additional_taxes: 193 },
      }),
    Error,
    "differs from finalized Schedule 2/3 and Form 1040",
  );
});

Deno.test("Form 8962 monthly different-state family overlap adds both Marketplace benchmarks", () => {
  const outOfStatePolicy = {
    ...dependentPolicy,
    issuer_name: "Oklahoma Marketplace",
    coverage_state: "OK",
    monthly_premiums: Array<number>(12).fill(500),
    monthly_slcsps: Array<number>(12).fill(700),
    monthly_aptcs: Array<number>(12).fill(100),
  };
  const differentStatePending = {
    ...Object.fromEntries(
      Object.entries(pending).filter(([key]) => key !== "schedule2"),
    ),
    f1095a: { f1095as: [taxpayerPolicy, outOfStatePolicy] },
    schedule3: { line9_premium_tax_credit: 6_816 },
    f1040: { line11_agi: 90_000, line31_additional_payments: 6_816 },
  };
  const differentStateFields = {
    ...fields,
    monthly_ptc_rows: months.map((month_code, index) => ({
      month_code,
      premium: 1_000,
      slcsp: index < 6 ? 1_700 : 1_300,
      contribution: 732,
      max_assistance: index < 6 ? 968 : 568,
      allowed_credit: index < 6 ? 968 : 568,
      aptc: 200,
    })),
    total_premium_tax_credit: 9_216,
    total_advance_ptc: 2_400,
    net_premium_tax_credit: 6_816,
    excess_advance_payment: 0,
    excess_advance_premium: 0,
  };
  const source = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    differentStatePending.f1095a,
  );
  const routed = source.outputs.find((item) => item.nodeType === "form8962");
  assertEquals((routed?.fields.monthly_slcsps as number[])[0], 1_700);
  assertEquals((routed?.fields.monthly_slcsps as number[])[6], 1_300);

  const xml = form8962.build(differentStateFields, {
    filer,
    pending: differentStatePending,
  });
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 12);
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>1700</MonthlyPremiumSLCSPAmt>",
  );
  assertStringIncludes(
    xml,
    "<ReconciledPremiumTaxCreditAmt>6816</ReconciledPremiumTaxCreditAmt>",
  );
  const projected = form8962Pdf.projectFields?.(
    differentStateFields,
    differentStatePending,
  ) ?? {};
  assertEquals(projected.pdf_month_1_slcsp, "1700");
  assertEquals(
    form8962Pdf.instances?.(projected, filer, differentStatePending)?.length,
    1,
  );

  assertThrows(
    () =>
      form8962.build(differentStateFields, {
        filer,
        pending: {
          ...differentStatePending,
          f1095a: {
            f1095as: [
              { ...taxpayerPolicy, coverage_state: "OK" },
              outOfStatePolicy,
            ],
          },
        },
      }),
    Error,
    "taxpayer policy in the filing state",
  );
  assertThrows(
    () =>
      form8962.build(differentStateFields, {
        filer,
        pending: {
          ...differentStatePending,
          f1095a: {
            f1095as: [
              taxpayerPolicy,
              { ...outOfStatePolicy, coverage_state: "AK" },
            ],
          },
        },
      }),
    Error,
    "contiguous poverty table",
  );
  assertThrows(
    () =>
      form8962.build({
        ...differentStateFields,
        monthly_ptc_rows: differentStateFields.monthly_ptc_rows.map((
          row,
          index,
        ) => index === 0 ? { ...row, slcsp: 1_000 } : row),
      }, { filer, pending: differentStatePending }),
    Error,
    "differs from its Form 1095-A policy",
  );
  assertThrows(
    () =>
      form8962Pdf.instances?.(projected, filer, {
        ...differentStatePending,
        f1040: {
          ...differentStatePending.f1040,
          line31_additional_payments: 6_815,
        },
      }),
    Error,
    "differs from finalized Schedule 2/3 and Form 1040",
  );
});
