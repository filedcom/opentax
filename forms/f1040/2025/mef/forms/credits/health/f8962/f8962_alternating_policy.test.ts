import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { z } from "zod";
import { FilingStatus } from "../../../../../../mef/header.ts";
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

// One filer, two identified policies, and no month with two active policies.
const firstPolicyMonths = months.map((_, index) => index < 4 || index >= 8);
const policy = (number: string, active: readonly boolean[]) => ({
  issuer_name: "Texas Marketplace",
  policy_number: number,
  coverage_state: "TX",
  covered_individual_ssns: ["123456789"],
  monthly_premiums: active.map((yes) => yes ? 500 : 0),
  monthly_slcsps: active.map((yes) => yes ? 600 : 0),
  monthly_aptcs: active.map((yes) => yes ? 200 : 0),
  annual_premium: active.filter(Boolean).length * 500,
  annual_slcsp: active.filter(Boolean).length * 600,
  annual_aptc: active.filter(Boolean).length * 200,
});
const policies = [
  policy("TX-A", firstPolicyMonths),
  policy("TX-B", firstPolicyMonths.map((active) => !active)),
];
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
  address: {
    line1: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.Single,
};
const pending = {
  general: { filing_status: "single", address_state: "TX" },
  f1095a: { f1095as: policies },
  schedule2: { line1a_excess_advance_premium: 1_596 },
  f1040: { line11_agi: 75_300, line17_additional_taxes: 1_596 },
};

Deno.test("Form 1095-A calculation combines alternating same-state policy months once", () => {
  const result = f1095a.compute({ taxYear: 2025, formType: "f1040" }, {
    f1095as: policies,
  });
  const output = result.outputs.find((item) => item.nodeType === "form8962");
  assertEquals(output?.fields.monthly_premiums, Array(12).fill(500));
  assertEquals(output?.fields.monthly_slcsps, Array(12).fill(600));
  assertEquals(output?.fields.monthly_aptcs, Array(12).fill(200));
});

Deno.test("Form 8962 native and PDF reconcile a full-year A-B-A policy sequence", () => {
  const xml = form8962.build(fields, { filer, pending });
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 12);
  assertStringIncludes(xml, "<TotalAdvancedPTCAmt>2400</TotalAdvancedPTCAmt>");
  assertStringIncludes(
    xml,
    "<PremiumTaxCreditTaxLiabAmt>1596</PremiumTaxCreditTaxLiabAmt>",
  );
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
});

Deno.test("Form 8962 same-state A-B-A policies reconcile one evidenced Marketplace SLCSP correction", () => {
  const correction = {
    month: 7,
    basis: "marketplace_error" as const,
    corrected_slcsp: 650,
    determination_source: "marketplace_contact" as const,
    determination_reference: "TX-MKT-2025-JUL",
    determination_record_sha256: "b".repeat(64),
    determined_on: "2026-02-01",
  };
  const correctedPolicies = [policies[0], {
    ...policies[1],
    slcsp_corrections: [correction],
  }];
  const correctedPending = {
    ...pending,
    f1095a: { f1095as: correctedPolicies },
    schedule2: { line1a_excess_advance_premium: 1_546 },
    f1040: { line11_agi: 75_300, line17_additional_taxes: 1_546 },
  };
  const sourceFields = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    correctedPending.f1095a,
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals((sourceFields?.monthly_slcsps as number[])[6], 650);
  assertEquals((sourceFields?.monthly_slcsps as number[])[5], 600);
  const calculated = form8962Calculation.compute(
    { taxYear: 2025, formType: "f1040" },
    form8962InputSchema.parse({
      ...sourceFields,
      taxpayer_modified_agi: 75_300,
      dependents_modified_agi: 0,
      household_size: 1,
      fpl_region: "contiguous",
      filing_status: SourceFilingStatus.Single,
      dependent_income_complete: true,
    }),
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals(calculated?.total_premium_tax_credit, 854);
  assertEquals(calculated?.excess_advance_premium, 1_546);
  const correctedFields = {
    ...fields,
    monthly_ptc_rows: fields.monthly_ptc_rows.map((row, index) =>
      index === 6
        ? { ...row, slcsp: 650, max_assistance: 117, allowed_credit: 117 }
        : row
    ),
    total_premium_tax_credit: 854,
    excess_advance_payment: 1_546,
    excess_advance_premium: 1_546,
  };
  const xml = form8962.build(correctedFields, {
    filer,
    pending: correctedPending,
  });
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>650</MonthlyPremiumSLCSPAmt>",
  );
  const pdf = form8962Pdf.projectFields?.(correctedFields, correctedPending) ??
    {};
  assertEquals(
    form8962Pdf.instances?.(pdf, filer, correctedPending)?.length,
    1,
  );
  assertThrows(
    () =>
      form8962.build(correctedFields, {
        filer,
        pending: {
          ...correctedPending,
          f1095a: {
            f1095as: [correctedPolicies[0], {
              ...correctedPolicies[1],
              slcsp_corrections: [{
                ...correction,
                determination_reference: undefined,
              }],
            }],
          },
        },
      }),
    Error,
    "sourced Marketplace-error SLCSP corrections",
  );
  assertThrows(
    () =>
      form8962Pdf.instances?.(pdf, filer, {
        ...correctedPending,
        f1095a: {
          f1095as: [correctedPolicies[0], {
            ...correctedPolicies[1],
            slcsp_corrections: [{ ...correction, month: 8 }],
          }],
        },
      }),
    Error,
    "differs from its Form 1095-A policy or calculated PTC",
  );
});

Deno.test("Form 8962 same-state A-B-A route reconciles two evidenced SLCSP corrections", () => {
  const corrections = [
    {
      month: 7,
      basis: "marketplace_error" as const,
      corrected_slcsp: 650,
      determination_source: "marketplace_contact" as const,
      determination_reference: "TX-MKT-2025-JUL",
      determination_record_sha256: "b".repeat(64),
      determined_on: "2026-02-01",
    },
    {
      month: 8,
      basis: "marketplace_error" as const,
      corrected_slcsp: 700,
      determination_source: "marketplace_tool" as const,
      determination_reference: "TX-MKT-2025-AUG",
      determination_record_sha256: "c".repeat(64),
      determined_on: "2026-02-02",
    },
  ];
  const correctedPolicies = [policies[0], {
    ...policies[1],
    slcsp_corrections: corrections,
  }];
  const correctedPending = {
    ...pending,
    f1095a: { f1095as: correctedPolicies },
    schedule2: { line1a_excess_advance_premium: 1_446 },
    f1040: { line11_agi: 75_300, line17_additional_taxes: 1_446 },
  };
  const sourceFields = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    correctedPending.f1095a,
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals((sourceFields?.monthly_slcsps as number[])[6], 650);
  assertEquals((sourceFields?.monthly_slcsps as number[])[7], 700);
  const calculated = form8962Calculation.compute(
    { taxYear: 2025, formType: "f1040" },
    form8962InputSchema.parse({
      ...sourceFields,
      taxpayer_modified_agi: 75_300,
      dependents_modified_agi: 0,
      household_size: 1,
      fpl_region: "contiguous",
      filing_status: SourceFilingStatus.Single,
      dependent_income_complete: true,
    }),
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals(calculated?.total_premium_tax_credit, 954);
  assertEquals(calculated?.excess_advance_premium, 1_446);
  const correctedFields = {
    ...fields,
    monthly_ptc_rows: fields.monthly_ptc_rows.map((row, index) =>
      index === 6
        ? { ...row, slcsp: 650, max_assistance: 117, allowed_credit: 117 }
        : index === 7
        ? { ...row, slcsp: 700, max_assistance: 167, allowed_credit: 167 }
        : row
    ),
    total_premium_tax_credit: 954,
    excess_advance_payment: 1_446,
    excess_advance_premium: 1_446,
  };
  const xml = form8962.build(correctedFields, {
    filer,
    pending: correctedPending,
  });
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>650</MonthlyPremiumSLCSPAmt>",
  );
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>700</MonthlyPremiumSLCSPAmt>",
  );
  const projected =
    form8962Pdf.projectFields?.(correctedFields, correctedPending) ?? {};
  assertEquals(
    form8962Pdf.instances?.(projected, filer, correctedPending)?.length,
    1,
  );
  assertThrows(
    () =>
      form8962.build(correctedFields, {
        filer,
        pending: {
          ...correctedPending,
          f1095a: {
            f1095as: [correctedPolicies[0], {
              ...correctedPolicies[1],
              slcsp_corrections: [corrections[0]],
            }],
          },
        },
      }),
    Error,
    "differs from its Form 1095-A policy or calculated PTC",
  );
  assertThrows(
    () =>
      form8962Pdf.instances?.(projected, filer, {
        ...correctedPending,
        f1095a: {
          f1095as: [correctedPolicies[0], {
            ...correctedPolicies[1],
            slcsp_corrections: [corrections[0], {
              ...corrections[1],
              determination_record_sha256: undefined,
            }],
          }],
        },
      }),
    Error,
    "sourced Marketplace-error SLCSP corrections",
  );
});

Deno.test("Form 8962 corrects every covered month of one alternating policy and rejects duplicate or missing evidence", () => {
  const corrections = [5, 6, 7, 8].map((month) => ({
    month,
    basis: "marketplace_error" as const,
    corrected_slcsp: 600 + (month - 4) * 50,
    determination_source: "marketplace_contact" as const,
    determination_reference: `TX-MKT-2025-${month}`,
    determination_record_sha256: String(month).repeat(64),
    determined_on: "2026-02-01",
  }));
  const correctedPolicies = [policies[0], {
    ...policies[1],
    slcsp_corrections: corrections,
  }];
  const correctedPending = {
    ...pending,
    f1095a: { f1095as: correctedPolicies },
    schedule2: { line1a_excess_advance_premium: 1_096 },
    f1040: { line11_agi: 75_300, line17_additional_taxes: 1_096 },
  };
  const sourceFields = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    correctedPending.f1095a,
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals((sourceFields?.monthly_slcsps as number[]).slice(4, 8), [
    650,
    700,
    750,
    800,
  ]);
  const calculated = form8962Calculation.compute(
    { taxYear: 2025, formType: "f1040" },
    form8962InputSchema.parse({
      ...sourceFields,
      taxpayer_modified_agi: 75_300,
      dependents_modified_agi: 0,
      household_size: 1,
      fpl_region: "contiguous",
      filing_status: SourceFilingStatus.Single,
      dependent_income_complete: true,
    }),
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals(calculated?.total_premium_tax_credit, 1_304);
  assertEquals(calculated?.excess_advance_premium, 1_096);
  const correctedFields = {
    ...fields,
    monthly_ptc_rows: fields.monthly_ptc_rows.map((row, index) =>
      index >= 4 && index < 8
        ? {
          ...row,
          slcsp: corrections[index - 4].corrected_slcsp,
          max_assistance: 67 + (index - 3) * 50,
          allowed_credit: 67 + (index - 3) * 50,
        }
        : row
    ),
    total_premium_tax_credit: 1_304,
    excess_advance_payment: 1_096,
    excess_advance_premium: 1_096,
  };
  const xml = form8962.build(correctedFields, {
    filer,
    pending: correctedPending,
  });
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>800</MonthlyPremiumSLCSPAmt>",
  );
  const projected =
    form8962Pdf.projectFields?.(correctedFields, correctedPending) ?? {};
  assertEquals(
    form8962Pdf.instances?.(projected, filer, correctedPending)?.length,
    1,
  );
  assertThrows(
    () =>
      form8962.build(correctedFields, {
        filer,
        pending: {
          ...correctedPending,
          f1095a: {
            f1095as: [correctedPolicies[0], {
              ...correctedPolicies[1],
              slcsp_corrections: [corrections[0], {
                ...corrections[1],
                month: 5,
              }, ...corrections.slice(2)],
            }],
          },
        },
      }),
    Error,
    "distinct covered APTC months",
  );
  assertThrows(
    () =>
      form8962Pdf.instances?.(projected, filer, {
        ...correctedPending,
        f1095a: {
          f1095as: [correctedPolicies[0], {
            ...correctedPolicies[1],
            slcsp_corrections: corrections.slice(0, 3),
          }],
        },
      }),
    Error,
    "differs from its Form 1095-A policy or calculated PTC",
  );
  assertThrows(
    () =>
      form8962.build(correctedFields, {
        filer,
        pending: {
          ...correctedPending,
          f1095a: {
            f1095as: [correctedPolicies[0], {
              ...correctedPolicies[1],
              slcsp_corrections: corrections.map((item) =>
                item.month === 8
                  ? { ...item, determination_record_sha256: undefined }
                  : item
              ),
            }],
          },
        },
      }),
    Error,
    "sourced Marketplace-error SLCSP corrections",
  );
});

Deno.test("Form 8962 reconciles independent SLCSP determinations on both alternating policies", () => {
  const firstCorrection = {
    month: 1,
    basis: "marketplace_error" as const,
    corrected_slcsp: 650,
    determination_source: "marketplace_contact" as const,
    determination_reference: "TX-A-JAN",
    determination_record_sha256: "a".repeat(64),
    determined_on: "2026-02-01",
  };
  const middleCorrections = [5, 6, 7, 8].map((month) => ({
    month,
    basis: "marketplace_error" as const,
    corrected_slcsp: 600 + (month - 4) * 50,
    determination_source: "marketplace_tool" as const,
    determination_reference: `TX-B-${month}`,
    determination_record_sha256: String(month).repeat(64),
    determined_on: "2026-02-02",
  }));
  const correctedPolicies = [{
    ...policies[0],
    slcsp_corrections: [firstCorrection],
  }, {
    ...policies[1],
    slcsp_corrections: middleCorrections,
  }];
  const correctedPending = {
    ...pending,
    f1095a: { f1095as: correctedPolicies },
    schedule2: { line1a_excess_advance_premium: 1_046 },
    f1040: { line11_agi: 75_300, line17_additional_taxes: 1_046 },
  };
  const sourceFields = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    correctedPending.f1095a,
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals((sourceFields?.monthly_slcsps as number[]).slice(0, 8), [
    650,
    600,
    600,
    600,
    650,
    700,
    750,
    800,
  ]);
  const calculated = form8962Calculation.compute(
    { taxYear: 2025, formType: "f1040" },
    form8962InputSchema.parse({
      ...sourceFields,
      taxpayer_modified_agi: 75_300,
      dependents_modified_agi: 0,
      household_size: 1,
      fpl_region: "contiguous",
      filing_status: SourceFilingStatus.Single,
      dependent_income_complete: true,
    }),
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals(calculated?.total_premium_tax_credit, 1_354);
  assertEquals(calculated?.excess_advance_premium, 1_046);
  const correctedFields = {
    ...fields,
    monthly_ptc_rows: fields.monthly_ptc_rows.map((row, index) => {
      const slcsp = index === 0
        ? 650
        : index >= 4 && index < 8
        ? middleCorrections[index - 4].corrected_slcsp
        : row.slcsp;
      return slcsp === row.slcsp ? row : {
        ...row,
        slcsp,
        max_assistance: slcsp - 533,
        allowed_credit: slcsp - 533,
      };
    }),
    total_premium_tax_credit: 1_354,
    excess_advance_payment: 1_046,
    excess_advance_premium: 1_046,
  };
  const xml = form8962.build(correctedFields, {
    filer,
    pending: correctedPending,
  });
  assertEquals(
    (xml.match(/<MonthlyPremiumSLCSPAmt>650<\/MonthlyPremiumSLCSPAmt>/g) ?? [])
      .length,
    2,
  );
  const projected =
    form8962Pdf.projectFields?.(correctedFields, correctedPending) ?? {};
  assertEquals(
    form8962Pdf.instances?.(projected, filer, correctedPending)?.length,
    1,
  );
  assertThrows(
    () =>
      form8962.build(correctedFields, {
        filer,
        pending: {
          ...correctedPending,
          f1095a: {
            f1095as: [{
              ...correctedPolicies[0],
              slcsp_corrections: [{
                ...firstCorrection,
                determination_record_sha256: undefined,
              }],
            }, correctedPolicies[1]],
          },
        },
      }),
    Error,
    "sourced Marketplace-error SLCSP corrections",
  );
  assertThrows(
    () =>
      form8962Pdf.instances?.(projected, filer, {
        ...correctedPending,
        f1095a: {
          f1095as: [{
            ...correctedPolicies[0],
            slcsp_corrections: [{ ...firstCorrection, month: 5 }],
          }, correctedPolicies[1]],
        },
      }),
    Error,
    "distinct covered APTC months",
  );
});

Deno.test("Form 8962 one monthly policy reconciles one evidenced Marketplace SLCSP correction", () => {
  const correction = {
    month: 7,
    basis: "marketplace_error" as const,
    corrected_slcsp: 650,
    determination_source: "marketplace_contact" as const,
    determination_reference: "TX-MKT-2025-JUL-ONE",
    determination_record_sha256: "c".repeat(64),
    determined_on: "2026-02-01",
  };
  const correctedPolicy = {
    ...policy("TX-ONE", months.map(() => true)),
    slcsp_corrections: [correction],
  };
  const source = { f1095as: [correctedPolicy] };
  const sourceFields = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals((sourceFields?.monthly_slcsps as number[])[6], 650);
  const calculated = form8962Calculation.compute(
    { taxYear: 2025, formType: "f1040" },
    form8962InputSchema.parse({
      ...sourceFields,
      taxpayer_modified_agi: 75_300,
      dependents_modified_agi: 0,
      household_size: 1,
      fpl_region: "contiguous",
      filing_status: SourceFilingStatus.Single,
      dependent_income_complete: true,
    }),
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals(calculated?.total_premium_tax_credit, 854);
  const correctedFields = {
    ...fields,
    monthly_ptc_rows: fields.monthly_ptc_rows.map((row, index) =>
      index === 6
        ? { ...row, slcsp: 650, max_assistance: 117, allowed_credit: 117 }
        : row
    ),
    total_premium_tax_credit: 854,
    excess_advance_payment: 1_546,
    excess_advance_premium: 1_546,
  };
  const correctedPending = {
    ...pending,
    f1095a: source,
    schedule2: { line1a_excess_advance_premium: 1_546 },
    f1040: { line11_agi: 75_300, line17_additional_taxes: 1_546 },
  };
  const xml = form8962.build(correctedFields, {
    filer,
    pending: correctedPending,
  });
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>650</MonthlyPremiumSLCSPAmt>",
  );
  const pdf = form8962Pdf.projectFields?.(correctedFields, correctedPending) ??
    {};
  assertEquals(
    form8962Pdf.instances?.(pdf, filer, correctedPending)?.length,
    1,
  );
  const alteredSource = {
    ...correctedPending,
    f1095a: {
      f1095as: [{
        ...correctedPolicy,
        slcsp_corrections: [{ ...correction, corrected_slcsp: 675 }],
      }],
    },
  };
  assertThrows(
    () => form8962.build(correctedFields, { filer, pending: alteredSource }),
    Error,
    "differs from its Form 1095-A policy or calculated PTC",
  );
  assertThrows(
    () => form8962Pdf.instances?.(pdf, filer, alteredSource),
    Error,
    "differs from its Form 1095-A policy or calculated PTC",
  );
  assertThrows(
    () =>
      form8962.build(correctedFields, {
        filer,
        pending: {
          ...correctedPending,
          f1095a: {
            f1095as: [{
              ...correctedPolicy,
              slcsp_corrections: [{
                ...correction,
                determination_record_sha256: undefined,
              }],
            }],
          },
        },
      }),
    Error,
    "sourced Marketplace-error SLCSP corrections",
  );
});

Deno.test("Form 8962 reconciles four sequential same-state policies for one filer", () => {
  const sequential = [0, 1, 2, 3].map((owner) =>
    policy(
      `TX-${owner + 1}`,
      months.map((_, index) => Math.floor(index / 3) === owner),
    )
  );
  const source = { f1095as: sequential };
  const sourceFields = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals(sourceFields?.monthly_premiums, Array(12).fill(500));
  assertEquals(sourceFields?.monthly_slcsps, Array(12).fill(600));
  assertEquals(sourceFields?.monthly_aptcs, Array(12).fill(200));
  const calculated = form8962Calculation.compute(
    { taxYear: 2025, formType: "f1040" },
    form8962InputSchema.parse({
      ...sourceFields,
      taxpayer_modified_agi: 75_300,
      dependents_modified_agi: 0,
      household_size: 1,
      fpl_region: "contiguous",
      filing_status: SourceFilingStatus.Single,
      dependent_income_complete: true,
    }),
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals(calculated?.total_premium_tax_credit, 804);
  assertEquals(calculated?.excess_advance_premium, 1_596);
  const fourPending = { ...pending, f1095a: source };
  const xml = form8962.build(fields, { filer, pending: fourPending });
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 12);
  const projected = form8962Pdf.projectFields?.(fields, fourPending) ?? {};
  assertEquals(
    form8962Pdf.instances?.(projected, filer, fourPending)?.length,
    1,
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...fourPending,
          f1095a: {
            f1095as: [sequential[0], sequential[1], sequential[2], {
              ...sequential[3],
              policy_number: "TX-1",
            }],
          },
        },
      }),
    Error,
  );
});

Deno.test("Form 8962 reconciles twelve one-month policies with separate Marketplace SLCSP determinations", () => {
  const sequential = months.map((_, owner) => ({
    ...policy(
      `TX-CORRECTED-${owner + 1}`,
      months.map((_, index) => index === owner),
    ),
    slcsp_corrections: [{
      month: owner + 1,
      basis: "marketplace_error" as const,
      corrected_slcsp: 650,
      determination_source: "marketplace_contact" as const,
      determination_reference: `TX-MKT-2025-${owner + 1}`,
      determination_record_sha256: "a".repeat(64),
      determined_on: "2026-02-01",
    }],
  }));
  const source = { f1095as: sequential };
  const sourceFields = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals(sourceFields?.monthly_slcsps, Array(12).fill(650));
  const calculated = form8962Calculation.compute(
    { taxYear: 2025, formType: "f1040" },
    form8962InputSchema.parse({
      ...sourceFields,
      taxpayer_modified_agi: 75_300,
      dependents_modified_agi: 0,
      household_size: 1,
      fpl_region: "contiguous",
      filing_status: SourceFilingStatus.Single,
      dependent_income_complete: true,
    }),
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals(calculated?.total_premium_tax_credit, 1_404);
  assertEquals(calculated?.excess_advance_premium, 996);
  const correctedFields = {
    ...fields,
    monthly_ptc_rows: fields.monthly_ptc_rows.map((row) => ({
      ...row,
      slcsp: 650,
      max_assistance: 117,
      allowed_credit: 117,
    })),
    total_premium_tax_credit: 1_404,
    excess_advance_payment: 996,
    excess_advance_premium: 996,
  };
  const correctedPending = {
    ...pending,
    f1095a: source,
    schedule2: { line1a_excess_advance_premium: 996 },
    f1040: { line11_agi: 75_300, line17_additional_taxes: 996 },
  };
  const xml = form8962.build(correctedFields, {
    filer,
    pending: correctedPending,
  });
  assertEquals(
    (xml.match(/<MonthlyPremiumSLCSPAmt>650<\/MonthlyPremiumSLCSPAmt>/g) ?? [])
      .length,
    12,
  );
  const projected = form8962Pdf.projectFields?.(
    correctedFields,
    correctedPending,
  ) ?? {};
  assertEquals(
    form8962Pdf.instances?.(projected, filer, correctedPending)?.length,
    1,
  );
  assertThrows(
    () =>
      form8962.build(correctedFields, {
        filer,
        pending: {
          ...correctedPending,
          f1095a: {
            f1095as: [...sequential.slice(0, 11), {
              ...sequential[11],
              slcsp_corrections: [{
                ...sequential[11].slcsp_corrections[0],
                determination_reference: undefined,
              }],
            }],
          },
        },
      }),
    Error,
    "sourced Marketplace-error SLCSP corrections",
  );
});

Deno.test("Form 8962 two sequential policies at 200% FPL apply the single-filer repayment cap", () => {
  const lowerIncomePolicies = [0, 1].map((owner) => {
    const active = months.map((_, index) => Math.floor(index / 6) === owner);
    return {
      ...policy(`TX-LOW-${owner + 1}`, active),
      monthly_premiums: active.map((yes) => yes ? 800 : 0),
      monthly_slcsps: active.map((yes) => yes ? 700 : 0),
      monthly_aptcs: active.map((yes) => yes ? 750 : 0),
      annual_premium: 4_800,
      annual_slcsp: 4_200,
      annual_aptc: 4_500,
    };
  });
  const source = { f1095as: lowerIncomePolicies };
  const sourceFields = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  const calculated = form8962Calculation.compute(
    { taxYear: 2025, formType: "f1040" },
    form8962InputSchema.parse({
      ...sourceFields,
      taxpayer_modified_agi: 30_120,
      dependents_modified_agi: 0,
      household_size: 1,
      fpl_region: "contiguous",
      filing_status: SourceFilingStatus.Single,
      dependent_income_complete: true,
    }),
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals(calculated?.applicable_figure, 0.02);
  assertEquals(calculated?.total_premium_tax_credit, 7_800);
  assertEquals(calculated?.excess_advance_payment, 1_200);
  assertEquals(calculated?.excess_advance_premium, 975);
  const lowIncomeFields = {
    ...fields,
    taxpayer_modified_agi: 30_120,
    household_income: 30_120,
    federal_poverty_pct: 200,
    applicable_figure: 0.02,
    annual_applicable_contribution: 602,
    monthly_applicable_contribution: 50,
    monthly_ptc_rows: months.map((month_code) => ({
      month_code,
      premium: 800,
      slcsp: 700,
      contribution: 50,
      max_assistance: 650,
      allowed_credit: 650,
      aptc: 750,
    })),
    total_premium_tax_credit: 7_800,
    total_advance_ptc: 9_000,
    excess_advance_payment: 1_200,
    repayment_limitation: 975,
    excess_advance_premium: 975,
  };
  const lowIncomePending = {
    ...pending,
    general: {
      filing_status: "single",
      address_state: "TX",
      taxpayer_ssn: "123456789",
      taxpayer_can_be_claimed_as_dependent: false,
    },
    f1095a: source,
    f1040: { line11_agi: 30_120, line17_additional_taxes: 975 },
    schedule2: { line1a_excess_advance_premium: 975 },
  };
  const xml = form8962.build(lowIncomeFields, {
    filer,
    pending: lowIncomePending,
  });
  assertStringIncludes(
    xml,
    "<AdditionalTaxLimitationAmt>975</AdditionalTaxLimitationAmt>",
  );
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 12);
  const projected =
    form8962Pdf.projectFields?.(lowIncomeFields, lowIncomePending) ?? {};
  assertEquals(
    form8962Pdf.instances?.(projected, filer, lowIncomePending)?.length,
    1,
  );
  assertThrows(
    () =>
      form8962.build({ ...lowIncomeFields, repayment_limitation: 1_625 }, {
        filer,
        pending: lowIncomePending,
      }),
    Error,
    "lines 24 through 29 differ",
  );
  assertThrows(
    () =>
      form8962.build(lowIncomeFields, {
        filer,
        pending: {
          ...lowIncomePending,
          general: {
            ...lowIncomePending.general,
            taxpayer_can_be_claimed_as_dependent: true,
          },
        },
      }),
    Error,
    "sourced single-filer eligibility",
  );
});

Deno.test("Form 8962 alternating policies reject month, identity, state, and final-return drift", () => {
  const overlap = {
    ...policies[1],
    monthly_premiums: policies[1].monthly_premiums.map((value, index) =>
      index === 0 ? 500 : value
    ),
    monthly_slcsps: policies[1].monthly_slcsps.map((value, index) =>
      index === 0 ? 600 : value
    ),
    monthly_aptcs: policies[1].monthly_aptcs.map((value, index) =>
      index === 0 ? 200 : value
    ),
    annual_premium: policies[1].annual_premium + 500,
    annual_slcsp: policies[1].annual_slcsp + 600,
    annual_aptc: policies[1].annual_aptc + 200,
  };
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          f1095a: { f1095as: [policies[0], overlap] },
        },
      }),
    Error,
    "needs exactly one active Marketplace policy",
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
              covered_individual_ssns: ["999999999"],
            }],
          },
        },
      }),
    Error,
    "filer as its sole covered individual",
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
              coverage_state: "OK",
            }],
          },
        },
      }),
    Error,
    "identified family policies",
  );
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertThrows(
    () =>
      form8962Pdf.instances?.(
        {
          ...projected,
          monthly_ptc_rows: fields.monthly_ptc_rows.map((row, index) =>
            index === 8 ? { ...row, premium: 501 } : row
          ),
        },
        filer,
        pending,
      ),
    Error,
    "differs from its Form 1095-A policy or calculated PTC",
  );
  assertThrows(
    () =>
      form8962Pdf.instances?.(projected, filer, {
        ...pending,
        f1040: { ...pending.f1040, line17_additional_taxes: 1_597 },
      }),
    Error,
    "differs from finalized Schedule 2/3 and Form 1040",
  );
});

Deno.test("Form 8962 partial-year A-B-A policies leave a sourced gap month blank", () => {
  const second = {
    ...policies[1],
    monthly_premiums: policies[1].monthly_premiums.map((value, index) =>
      index === 5 ? 0 : value
    ),
    monthly_slcsps: policies[1].monthly_slcsps.map((value, index) =>
      index === 5 ? 0 : value
    ),
    monthly_aptcs: policies[1].monthly_aptcs.map((value, index) =>
      index === 5 ? 0 : value
    ),
    annual_premium: policies[1].annual_premium - 500,
    annual_slcsp: policies[1].annual_slcsp - 600,
    annual_aptc: policies[1].annual_aptc - 200,
  };
  const gapFields = {
    ...fields,
    monthly_ptc_rows: fields.monthly_ptc_rows.map((row, index) =>
      index === 5
        ? {
          ...row,
          premium: 0,
          slcsp: 0,
          max_assistance: 0,
          allowed_credit: 0,
          aptc: 0,
        }
        : row
    ),
    total_premium_tax_credit: 737,
    total_advance_ptc: 2_200,
    excess_advance_payment: 1_463,
    excess_advance_premium: 1_463,
  };
  const gapPending = {
    ...pending,
    f1095a: { f1095as: [policies[0], second] },
    schedule2: { line1a_excess_advance_premium: 1_463 },
    f1040: { line11_agi: 75_300, line17_additional_taxes: 1_463 },
  };
  const output = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    gapPending.f1095a,
  )
    .outputs.find((item) => item.nodeType === "form8962");
  assertEquals(
    z.array(z.number()).parse(output?.fields.monthly_premiums)[5],
    0,
  );
  assertEquals(z.array(z.number()).parse(output?.fields.monthly_slcsps)[5], 0);
  assertEquals(z.array(z.number()).parse(output?.fields.monthly_aptcs)[5], 0);
  const calculated = form8962Calculation.compute(
    { taxYear: 2025, formType: "f1040" },
    form8962InputSchema.parse({
      ...output?.fields,
      taxpayer_modified_agi: 75_300,
      dependents_modified_agi: 0,
      household_size: 1,
      fpl_region: "contiguous",
      filing_status: SourceFilingStatus.Single,
      dependent_income_complete: true,
    }),
  ).outputs.find((item) => item.nodeType === "form8962")?.fields;
  assertEquals(
    z.array(z.object({ allowed_credit: z.number() })).parse(
      calculated?.monthly_ptc_rows,
    )[5].allowed_credit,
    0,
  );
  assertEquals(calculated?.total_premium_tax_credit, 737);
  assertEquals(calculated?.excess_advance_premium, 1_463);
  const xml = form8962.build(gapFields, { filer, pending: gapPending });
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 11);
  assertEquals(xml.includes("<MonthCd>JUNE</MonthCd>"), false);
  const projected = form8962Pdf.projectFields?.(gapFields, gapPending) ?? {};
  assertEquals(projected.pdf_month_6_premium, undefined);
  assertEquals(projected.pdf_month_6_slcsp, undefined);
  assertEquals(
    form8962Pdf.instances?.(projected, filer, gapPending)?.length,
    1,
  );
  assertThrows(
    () =>
      form8962.build({
        ...gapFields,
        monthly_ptc_rows: gapFields.monthly_ptc_rows.map((row, index) =>
          index === 5 ? { ...row, allowed_credit: 1 } : row
        ),
      }, { filer, pending: gapPending }),
    Error,
    "must have zero policy and credit amounts",
  );
});
