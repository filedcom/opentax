import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
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

Deno.test("Form 8962 alternating policies do not infer an unsourced gap month", () => {
  const first = {
    ...policies[0],
    monthly_premiums: policies[0].monthly_premiums.map((value, index) =>
      index === 0 ? 0 : value
    ),
    monthly_slcsps: policies[0].monthly_slcsps.map((value, index) =>
      index === 0 ? 0 : value
    ),
    monthly_aptcs: policies[0].monthly_aptcs.map((value, index) =>
      index === 0 ? 0 : value
    ),
    annual_premium: policies[0].annual_premium - 500,
    annual_slcsp: policies[0].annual_slcsp - 600,
    annual_aptc: policies[0].annual_aptc - 200,
  };
  const gapFields = {
    ...fields,
    monthly_ptc_rows: fields.monthly_ptc_rows.map((row, index) =>
      index === 0
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
  assertThrows(
    () =>
      form8962.build(gapFields, {
        filer,
        pending: {
          ...pending,
          f1095a: { f1095as: [first, policies[1]] },
          schedule2: { line1a_excess_advance_premium: 1_463 },
          f1040: { line11_agi: 75_300, line17_additional_taxes: 1_463 },
        },
      }),
    Error,
    "need twelve covered months",
  );
});
