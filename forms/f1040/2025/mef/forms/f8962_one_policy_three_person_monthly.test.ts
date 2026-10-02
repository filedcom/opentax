import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import {
  DependentRelationship,
  general,
} from "../../../nodes/inputs/general/index.ts";
import { f1095a } from "../../../nodes/inputs/f1095a/index.ts";
import {
  form8962 as calculate8962,
  inputSchema as calculationSchema,
} from "../../../nodes/intermediate/forms/form8962/index.ts";
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
const nodeContext = { taxYear: 2025, formType: "f1040" } as const;
const filer = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
};

function dependent(
  ssn: string,
  name: string,
  interest: number,
  exempt: number,
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
        source_document_id: `${name}-filed-1040`,
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
        source_document_id: `${name}-1099-int`,
        recipient_ssn: ssn,
        box1_taxable_interest: interest,
        box8_tax_exempt_interest: exempt,
      }],
    },
  };
}

function monthlyFamily() {
  const generalSource = {
    filing_status: "single" as const,
    taxpayer_ssn: "123456789",
    taxpayer_can_be_claimed_as_dependent: false,
    dependents: [
      dependent("987654321", "Casey", 12_800, 500),
      dependent("987654322", "Robin", 15_000, 200),
    ],
  };
  const policy = {
    issuer_name: "Texas Marketplace",
    policy_number: "FAMILY-JAN-JUN-2025",
    coverage_state: "TX",
    covered_individual_ssns: ["123456789", "987654321", "987654322"],
    monthly_premiums: months.map((_, index) => index < 6 ? 500 : 0),
    monthly_slcsps: months.map((_, index) => index < 6 ? 1_200 : 0),
    monthly_aptcs: months.map((_, index) => index < 6 ? 100 : 0),
    annual_premium: 3_000,
    annual_slcsp: 7_200,
    annual_aptc: 600,
  };
  const dependentFields = general.compute(
    nodeContext,
    general.inputSchema.parse(generalSource),
  ).outputs.find((row) => row.nodeType === "form8962")?.fields;
  const policyFields = f1095a.compute(
    nodeContext,
    { f1095as: [policy] },
  ).outputs.find((row) => row.nodeType === "form8962")?.fields;
  assertEquals(dependentFields?.dependents_modified_agi, 28_500);
  assertEquals((policyFields?.monthly_premiums as number[])[0], 500);
  assertEquals((policyFields?.monthly_premiums as number[])[6], 0);
  const calculated = calculate8962.compute(
    nodeContext,
    calculationSchema.parse({
      ...policyFields,
      household_size: 3,
      taxpayer_modified_agi: 23_140,
      dependents_modified_agi: dependentFields?.dependents_modified_agi,
      dependent_income_complete: dependentFields?.dependent_income_complete,
      fpl_region: "contiguous",
      filing_status: "single" as const,
    }),
  ).outputs;
  const fields = calculated.find((row) => row.nodeType === "form8962")!.fields;
  const net = fields.net_premium_tax_credit as number;
  const pending = {
    general: generalSource,
    f1095a: { f1095as: [policy] },
    schedule3: { line9_premium_tax_credit: net },
    f1040: { line11_agi: 23_140, line31_additional_payments: net },
  };
  return { fields, pending, policy, net };
}

Deno.test("Form 8962 one-policy three-person partial year reaches monthly MeF, Schedule 3, Form 1040, and PDF", () => {
  const { fields, pending, net } = monthlyFamily();
  assertEquals(fields.household_income, 51_640);
  assertEquals(fields.federal_poverty_pct, 200);
  assertEquals(fields.total_premium_tax_credit, 3_000);
  assertEquals(fields.total_advance_ptc, 600);
  assertEquals(net, 2_400);
  const xml = form8962.build(fields, { filer, pending });
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 6);
  assertStringIncludes(
    xml,
    "<TotalDependentsModifiedAGIAmt>28500</TotalDependentsModifiedAGIAmt>",
  );
  assertStringIncludes(
    xml,
    "<ReconciledPremiumTaxCreditAmt>2400</ReconciledPremiumTaxCreditAmt>",
  );
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(projected.pdf_month_1_premium, "500");
  assertEquals(projected.pdf_month_7_premium, undefined);
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
});

Deno.test("Form 8962 one-policy three-person monthly route rejects altered dependent, policy, or return facts", () => {
  const { fields, pending, policy } = monthlyFamily();
  const otherFamily = {
    ...pending,
    f1095a: {
      f1095as: [{
        ...policy,
        covered_individual_ssns: ["123456789", "987654321", "999999999"],
      }],
    },
  };
  assertThrows(
    () => form8962.build(fields, { filer, pending: otherFamily }),
    Error,
    "distinct covered people",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          f1095a: { f1095as: [{ ...policy, annual_aptc: 601 }] },
        },
      }),
    Error,
    "annual_aptc differs from its monthly column",
  );
  const casey = pending.general.dependents[0];
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          general: {
            ...pending.general,
            dependents: [{
              ...casey,
              ptc_tax_return: {
                ...casey.ptc_tax_return,
                interest_forms1099: [{
                  ...casey.ptc_tax_return.interest_forms1099[0],
                  box1_taxable_interest: 12_799,
                }],
              },
            }, pending.general.dependents[1]],
          },
        },
      }),
    Error,
    "filed Form 1040 wages, interest, dividends, and AGI",
  );
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertThrows(
    () =>
      form8962Pdf.instances?.(projected, filer, {
        ...pending,
        schedule3: { line9_premium_tax_credit: 2_399 },
      }),
    Error,
    "finalized Schedule 2/3 and Form 1040",
  );
});
