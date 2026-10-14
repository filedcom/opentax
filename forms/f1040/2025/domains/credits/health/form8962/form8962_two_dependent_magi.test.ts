import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import {
  DependentRelationship,
  general,
} from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { form8962 as form8962Node } from "../../../../../nodes/intermediate/forms/credits/health/form8962/index.ts";
import { form8962 } from "../../../../mef/forms/credits/health/f8962/f8962.ts";
import { form8962Pdf } from "../../../../pdf/forms/credits/health/f8962.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

const mixed = {
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
      source_document_id: "casey-filed-1040",
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
      source_document_id: "casey-1099-int",
      recipient_ssn: "987654321",
      box1_taxable_interest: 1_000,
      box8_tax_exempt_interest: 100,
    }],
    wage_forms_w2: [{
      source_document_id: "casey-w2",
      employer_name: "Summer Employer",
      employer_ein: "112233445",
      employee_ssn: "987654321",
      box1_wages: 14_000,
    }],
  },
};

const interest = {
  first_name: "Jordan",
  last_name: "Taxpayer",
  ssn: "111223333",
  dob: "2008-04-15",
  relationship: DependentRelationship.Son,
  months_in_home: 12,
  provided_over_half_own_support: false,
  ptc_tax_return: {
    filing: "required" as const,
    filed_form1040: {
      source_document_id: "jordan-filed-1040",
      taxpayer_ssn: "111223333",
      tax_year: 2025 as const,
      filing_status: "single" as const,
      blind: false,
      line1z_wages: 0,
      line2a_tax_exempt_interest: 200,
      line2b_taxable_interest: 2_000,
      line3b_dividends: 0 as const,
      line4b_ira: 0 as const,
      line5b_pensions: 0 as const,
      line6b_social_security: 0 as const,
      line7a_capital_gain: 0 as const,
      line8_additional_income: 0 as const,
      line10_adjustments: 0 as const,
      line11b_agi: 2_000,
    },
    interest_forms1099: [{
      source_document_id: "jordan-1099-int",
      recipient_ssn: "111223333",
      box1_taxable_interest: 2_000,
      box8_tax_exempt_interest: 200,
    }],
  },
};

function household(annualAptc: 600 | 4_800) {
  const generalSource = {
    filing_status: "single" as const,
    taxpayer_ssn: "123456789",
    dependents: [mixed, interest],
  };
  const generalOutput = general.compute(
    { taxYear: 2025, formType: "f1040" },
    general.inputSchema.parse(generalSource),
  ).outputs.find((row) => row.nodeType === "form8962")?.fields;
  assertEquals(generalOutput?.dependents_modified_agi, 17_300);
  const output = form8962Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form8962Node.inputSchema.parse({
      household_size: 3,
      fpl_region: "contiguous",
      filing_status: "single" as const,
      taxpayer_modified_agi: 100_000,
      dependents_modified_agi: generalOutput?.dependents_modified_agi,
      dependent_income_complete: generalOutput?.dependent_income_complete,
      annual_premium: 12_000,
      annual_slcsp: 12_000,
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
        policy_number: "THREE-PERSON-FAMILY-2025",
        coverage_state: "TX",
        covered_individual_ssns: ["123456789", "987654321", "111223333"],
        monthly_premiums: Array(12).fill(1_000),
        monthly_slcsps: Array(12).fill(1_000),
        monthly_aptcs: Array(12).fill(annualAptc / 12),
        annual_premium: 12_000,
        annual_slcsp: 12_000,
        annual_aptc: annualAptc,
      }],
    },
    schedule2: { line1a_excess_advance_premium: repayment ?? 0 },
    schedule3: { line9_premium_tax_credit: net ?? 0 },
    f1040: {
      line11_agi: 100_000,
      line17_additional_taxes: repayment ?? 0,
      line31_additional_payments: net ?? 0,
    },
  };
  return { fields, pending, net, repayment };
}

for (const aptc of [600, 4_800] as const) {
  Deno.test(`Form 8962 two sourced dependents reconcile one annual family policy at APTC ${aptc}`, () => {
    const { fields, pending, net, repayment } = household(aptc);
    assertEquals(fields.dependents_modified_agi, 17_300);
    assertEquals(fields.household_income, 117_300);
    assertEquals((net ?? 0) > 0, aptc === 600);
    assertEquals((repayment ?? 0) > 0, aptc === 4_800);
    const xml = form8962.build(fields, { filer, pending });
    assertStringIncludes(
      xml,
      "<TotalDependentsModifiedAGIAmt>17300</TotalDependentsModifiedAGIAmt>",
    );
    const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
    assertEquals(projected.dependents_modified_agi, 17_300);
    assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
  });
}

Deno.test("Form 8962 two-dependent family rejects changed source, identity, policy, and final return", () => {
  const { fields, pending } = household(600);
  const changedInterest = (source: typeof interest.ptc_tax_return) => ({
    ...pending,
    general: {
      ...pending.general,
      dependents: [mixed, { ...interest, ptc_tax_return: source }],
    },
  });
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: changedInterest({
          ...interest.ptc_tax_return,
          interest_forms1099: [{
            ...interest.ptc_tax_return.interest_forms1099[0],
            box1_taxable_interest: 1_999,
          }],
        }),
      }),
    Error,
    "filed Form 1040 wages, interest, dividends, and AGI",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: changedInterest({
          ...interest.ptc_tax_return,
          filed_form1040: {
            ...interest.ptc_tax_return.filed_form1040,
            line2b_taxable_interest: 1_350,
            line11b_agi: 1_350,
          },
          interest_forms1099: [{
            ...interest.ptc_tax_return.interest_forms1099[0],
            box1_taxable_interest: 1_350,
          }],
        }),
      }),
    Error,
    "does not establish the 2025 single-dependent filing requirement",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: changedInterest({
          ...interest.ptc_tax_return,
          interest_forms1099: [{
            ...interest.ptc_tax_return.interest_forms1099[0],
            source_document_id: "casey-w2",
          }],
        }),
      }),
    Error,
    "distinct filed-return and W-2 source documents",
  );
  assertThrows(() =>
    form8962.build(fields, {
      filer,
      pending: {
        ...pending,
        general: {
          ...pending.general,
          dependents: [mixed, { ...interest, ssn: mixed.ssn }],
        },
      },
    }), Error);
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          f1095a: {
            f1095as: [{
              ...pending.f1095a.f1095as[0],
              covered_individual_ssns: ["123456789", "987654321"],
            }],
          },
        },
      }),
    Error,
    "distinct covered people",
  );
  assertThrows(() =>
    form8962.build(fields, {
      filer,
      pending: {
        ...pending,
        schedule3: { line9_premium_tax_credit: 0 },
      },
    }), Error);
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line11_agi: 99_000 },
        },
      }),
    Error,
    "finalized Form 1040",
  );
});

Deno.test("Form 8962 does not count one claimed SSN twice in dependent MAGI", () => {
  const duplicate = {
    ...interest,
    ssn: mixed.ssn,
    ptc_tax_return: {
      ...interest.ptc_tax_return,
      filed_form1040: {
        ...interest.ptc_tax_return.filed_form1040,
        taxpayer_ssn: mixed.ssn,
      },
      interest_forms1099: [{
        ...interest.ptc_tax_return.interest_forms1099[0],
        recipient_ssn: mixed.ssn,
      }],
    },
  };
  assertThrows(
    () =>
      general.compute(
        { taxYear: 2025, formType: "f1040" },
        general.inputSchema.parse({
          filing_status: "single",
          taxpayer_ssn: filer.primarySSN,
          dependents: [mixed, duplicate],
        }),
      ),
    Error,
    "claimed dependents need distinct SSNs",
  );
});
