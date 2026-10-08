import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../../mef/header.ts";
import {
  DependentRelationship,
  general,
} from "../../../../nodes/inputs/general/index.ts";
import { form8962 as form8962Node } from "../../../../nodes/intermediate/forms/form8962/index.ts";
import { form8962 } from "../../../mef/forms/health/f8962/f8962.ts";
import { form8962Pdf } from "../../../pdf/forms/health/f8962.ts";

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
      line1z_wages: 16_000,
      line2a_tax_exempt_interest: 0,
      line2b_taxable_interest: 0,
      line3b_dividends: 0 as const,
      line4b_ira: 0 as const,
      line5b_pensions: 0 as const,
      line6b_social_security: 0 as const,
      line7a_capital_gain: 0 as const,
      line8_additional_income: 0 as const,
      line10_adjustments: 0 as const,
      line11b_agi: 16_000,
    },
    interest_forms1099: [],
    wage_forms_w2: [{
      source_document_id: "casey-issued-2025-w2",
      employer_name: "Summer Employer",
      employer_ein: "112233445",
      employee_ssn: "987654321",
      box1_wages: 16_000,
    }],
  },
};

function wageDependentPolicy(
  annualAptc: 600 | 4_800,
  wageDependent = dependent,
) {
  const generalSource = {
    filing_status: "single" as const,
    taxpayer_ssn: "123456789",
    dependents: [wageDependent],
  };
  const generalOutput = general.compute(
    { taxYear: 2025, formType: "f1040" },
    general.inputSchema.parse(generalSource),
  ).outputs.find((row) => row.nodeType === "form8962")?.fields;
  assertEquals(generalOutput?.dependents_modified_agi, 16_000);
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
  Deno.test(`Form 8962 wage-only dependent reaches annual native/PDF and return at APTC ${aptc}`, () => {
    const { fields, pending, net, repayment } = wageDependentPolicy(aptc);
    assertEquals(fields.dependents_modified_agi, 16_000);
    assertEquals(fields.household_income, 86_000);
    assertEquals((net ?? 0) > 0, aptc === 600);
    assertEquals((repayment ?? 0) > 0, aptc === 4_800);
    const xml = form8962.build(fields, { filer, pending });
    assertStringIncludes(
      xml,
      "<TotalDependentsModifiedAGIAmt>16000</TotalDependentsModifiedAGIAmt>",
    );
    const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
    assertEquals(projected.dependents_modified_agi, 16_000);
    assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
  });
}

const twoEmployerDependent = {
  ...dependent,
  ptc_tax_return: {
    ...dependent.ptc_tax_return,
    wage_forms_w2: [
      {
        ...dependent.ptc_tax_return.wage_forms_w2[0],
        source_document_id: "casey-issued-2025-w2-summer",
        box1_wages: 9_000,
      },
      {
        ...dependent.ptc_tax_return.wage_forms_w2[0],
        source_document_id: "casey-issued-2025-w2-autumn",
        employer_name: "Autumn Employer",
        employer_ein: "556677889",
        box1_wages: 7_000,
      },
    ],
  },
};

Deno.test("Form 8962 sums two dependent W-2 employers into sourced household MAGI and annual MeF/PDF", () => {
  const { fields, pending } = wageDependentPolicy(600, twoEmployerDependent);
  assertEquals(fields.dependents_modified_agi, 16_000);
  assertEquals(fields.household_income, 86_000);
  const xml = form8962.build(fields, { filer, pending });
  assertStringIncludes(
    xml,
    "<TotalDependentsModifiedAGIAmt>16000</TotalDependentsModifiedAGIAmt>",
  );
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(projected.dependents_modified_agi, 16_000);
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
});

Deno.test("Form 8962 two-W-2 dependent rejects amount, identity, duplicate source, and threshold tampering", () => {
  const { fields, pending } = wageDependentPolicy(600, twoEmployerDependent);
  const wages = twoEmployerDependent.ptc_tax_return.wage_forms_w2;
  const changed = (replacement: typeof wages) => ({
    ...pending,
    general: {
      ...pending.general,
      dependents: [{
        ...twoEmployerDependent,
        ptc_tax_return: {
          ...twoEmployerDependent.ptc_tax_return,
          wage_forms_w2: replacement,
        },
      }],
    },
  });
  assertThrows(() =>
    form8962.build(fields, {
      filer,
      pending: changed([{ ...wages[0], box1_wages: 8_999 }, wages[1]]),
    })
  );
  assertThrows(() =>
    form8962Pdf.projectFields?.(
      fields,
      changed([wages[0], { ...wages[1], employee_ssn: "111223333" }]),
    )
  );
  assertThrows(() =>
    general.compute(
      { taxYear: 2025, formType: "f1040" },
      general.inputSchema.parse(
        changed([
          wages[0],
          { ...wages[1], employer_ein: wages[0].employer_ein },
        ]).general,
      ),
    )
  );
  assertThrows(() =>
    general.compute(
      { taxYear: 2025, formType: "f1040" },
      general.inputSchema.parse(
        changed([
          wages[0],
          { ...wages[1], source_document_id: wages[0].source_document_id },
        ]).general,
      ),
    )
  );
  const thresholdDependent = {
    ...twoEmployerDependent,
    ptc_tax_return: {
      ...twoEmployerDependent.ptc_tax_return,
      filed_form1040: {
        ...twoEmployerDependent.ptc_tax_return.filed_form1040,
        line1z_wages: 15_750,
        line11b_agi: 15_750,
      },
      wage_forms_w2: [
        { ...wages[0], box1_wages: 8_000 },
        { ...wages[1], box1_wages: 7_750 },
      ],
    },
  };
  assertThrows(() =>
    general.compute(
      { taxYear: 2025, formType: "f1040" },
      general.inputSchema.parse({
        ...pending.general,
        dependents: [thresholdDependent],
      }),
    )
  );
});

Deno.test("Form 8962 wage-only dependent rejects changed W-2, refund-only wages, and return credit", () => {
  const { fields, pending } = wageDependentPolicy(600);
  assertThrows(() =>
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
              wage_forms_w2: [{
                ...dependent.ptc_tax_return.wage_forms_w2[0],
                box1_wages: 15_999,
              }],
            },
          }],
        },
      },
    })
  );
  assertThrows(() =>
    form8962Pdf.projectFields?.(fields, {
      ...pending,
      general: {
        ...pending.general,
        dependents: [{
          ...dependent,
          ptc_tax_return: {
            ...dependent.ptc_tax_return,
            filed_form1040: {
              ...dependent.ptc_tax_return.filed_form1040,
              line1z_wages: 15_750,
              line11b_agi: 15_750,
            },
            wage_forms_w2: [{
              ...dependent.ptc_tax_return.wage_forms_w2[0],
              box1_wages: 15_750,
            }],
          },
        }],
      },
    })
  );
  assertThrows(() =>
    form8962.build(fields, {
      filer,
      pending: {
        ...pending,
        schedule3: { line9_premium_tax_credit: 0 },
      },
    })
  );
});
