import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import {
  DependentRelationship,
  general,
} from "../nodes/inputs/general/index.ts";
import { form8962 as form8962Node } from "../nodes/intermediate/forms/form8962/index.ts";
import { form8962 } from "./mef/forms/f8962.ts";
import { form8962Pdf } from "./pdf/forms/f8962.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

const dependent = {
  first_name: "Casey",
  last_name: "Taxpayer",
  ssn: "987654321",
  dob: "2007-06-15",
  relationship: DependentRelationship.Daughter,
  months_in_home: 12,
  provided_over_half_own_support: false,
  ptc_tax_return: {
    filing: "required" as const,
    filed_form1040: {
      source_document_id: "casey-filed-2025-form1040",
      taxpayer_ssn: "987654321",
      tax_year: 2025 as const,
      filing_status: "single" as const,
      blind: false,
      line1z_wages: 14_000,
      line2a_tax_exempt_interest: 100,
      line2b_taxable_interest: 1_000,
      line3b_dividends: 0 as const,
      line4b_ira: 0 as const,
      line5b_pensions: 0 as const,
      line6b_social_security: 0 as const,
      line7a_capital_gain: 0 as const,
      line8_additional_income: 0 as const,
      line10_adjustments: 0 as const,
      line11b_agi: 15_000,
    },
    interest_forms1099: [{
      source_document_id: "casey-issued-2025-1099-int",
      recipient_ssn: "987654321",
      box1_taxable_interest: 1_000,
      box8_tax_exempt_interest: 100,
    }],
    wage_forms_w2: [{
      source_document_id: "casey-issued-2025-w2",
      employer_name: "Summer Employer",
      employer_ein: "112233445",
      employee_ssn: "987654321",
      box1_wages: 14_000,
    }],
  },
};

function mixedDependentPolicy(annualAptc: 600 | 4_800) {
  const generalSource = {
    filing_status: "single" as const,
    taxpayer_ssn: "123456789",
    dependents: [dependent],
  };
  const generalOutput = general.compute(
    { taxYear: 2025, formType: "f1040" },
    general.inputSchema.parse(generalSource),
  ).outputs.find((row) => row.nodeType === "form8962")?.fields;
  assertEquals(generalOutput?.dependents_modified_agi, 15_100);
  const output = form8962Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form8962Node.inputSchema.parse({
      household_size: 2,
      fpl_region: "contiguous",
      filing_status: "single" as const,
      taxpayer_modified_agi: 70_000,
      dependents_modified_agi: generalOutput?.dependents_modified_agi,
      dependent_income_complete: generalOutput?.dependent_income_complete,
      annual_premium: 12_000,
      annual_slcsp: 10_800,
      annual_aptc: annualAptc,
      annual_line11_eligible: true,
    }),
  ).outputs;
  const fields = output.find((row) => row.nodeType === "form8962")!.fields;
  const net = fields.net_premium_tax_credit as number | undefined;
  const repayment = fields.excess_advance_premium as number | undefined;
  assertEquals(
    output.find((row) => row.nodeType === "schedule3")?.fields
      .line9_premium_tax_credit ?? 0,
    net ?? 0,
  );
  assertEquals(
    output.find((row) => row.nodeType === "schedule2")?.fields
      .line1a_excess_advance_premium ?? 0,
    repayment ?? 0,
  );
  const pending = {
    general: generalSource,
    f1095a: {
      f1095as: [{
        issuer_name: "Marketplace",
        policy_number: "CASEY-FAMILY-2025",
        coverage_state: "TX",
        covered_individual_ssns: ["123456789", "987654321"],
        monthly_premiums: Array(12).fill(1_000),
        monthly_slcsps: Array(12).fill(900),
        monthly_aptcs: Array(12).fill(annualAptc / 12),
        annual_premium: 12_000,
        annual_slcsp: 10_800,
        annual_aptc: annualAptc,
      }],
    },
    schedule2: { line1a_excess_advance_premium: repayment ?? 0 },
    schedule3: { line9_premium_tax_credit: net ?? 0 },
    f1040: {
      line11_agi: 70_000,
      line17_additional_taxes: repayment ?? 0,
      line31_additional_payments: net ?? 0,
    },
  };
  return { fields, pending, net, repayment };
}

for (const aptc of [600, 4_800] as const) {
  Deno.test(`Form 8962 mixed W-2 and 1099-INT dependent reaches annual native/PDF and return at APTC ${aptc}`, () => {
    const { fields, pending, net, repayment } = mixedDependentPolicy(aptc);
    assertEquals(fields.dependents_modified_agi, 15_100);
    assertEquals(fields.household_income, 85_100);
    assertEquals((net ?? 0) > 0, aptc === 600);
    assertEquals((repayment ?? 0) > 0, aptc === 4_800);
    const xml = form8962.build(fields, { filer, pending });
    assertStringIncludes(
      xml,
      "<TotalDependentsModifiedAGIAmt>15100</TotalDependentsModifiedAGIAmt>",
    );
    const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
    assertEquals(projected.dependents_modified_agi, 15_100);
    assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
  });
}

Deno.test("Form 8962 mixed dependent rejects source, threshold, MAGI, and return tampering", () => {
  const { fields, pending } = mixedDependentPolicy(600);
  const changed = (overrides: Record<string, unknown>) => ({
    ...pending,
    general: {
      ...pending.general,
      dependents: [{
        ...dependent,
        ptc_tax_return: {
          ...dependent.ptc_tax_return,
          ...overrides,
        },
      }],
    },
  });
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: changed({
          interest_forms1099: [{
            ...dependent.ptc_tax_return.interest_forms1099[0],
            box1_taxable_interest: 999,
          }],
        }),
      }),
    Error,
    "filed Form 1040 wages, interest, and AGI",
  );
  assertThrows(
    () =>
      form8962Pdf.projectFields?.(
        fields,
        changed({
          wage_forms_w2: [{
            ...dependent.ptc_tax_return.wage_forms_w2[0],
            employee_ssn: "111223333",
          }],
        }),
      ),
    Error,
    "naming the covered person",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: changed({
          interest_forms1099: [{
            ...dependent.ptc_tax_return.interest_forms1099[0],
            source_document_id:
              dependent.ptc_tax_return.wage_forms_w2[0].source_document_id,
          }],
        }),
      }),
    Error,
    "distinct filed-return and W-2 source documents",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: changed({
          filed_form1040: {
            ...dependent.ptc_tax_return.filed_form1040,
            line2b_taxable_interest: 450,
            line11b_agi: 14_450,
            line2a_tax_exempt_interest: 100,
          },
          interest_forms1099: [{
            ...dependent.ptc_tax_return.interest_forms1099[0],
            box1_taxable_interest: 450,
          }],
        }),
      }),
    Error,
    "does not establish the 2025 filing requirement",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line11_agi: 71_000 },
        },
      }),
    Error,
    "finalized Form 1040",
  );
  assertThrows(() =>
    form8962.build(fields, {
      filer,
      pending: {
        ...pending,
        schedule3: { line9_premium_tax_credit: 0 },
      },
    }), Error);
});
