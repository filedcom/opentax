import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form8880 } from "./f8880.ts";
import type { Fields } from "./f8880.ts";
import { calculateForm8880 } from "../../../nodes/intermediate/forms/form8880/calculation.ts";
import { FilingStatus, TS } from "../../../nodes/types.ts";
import { buildMefXml } from "../builder.ts";
import {
  type FilerIdentity,
  FilingStatus as MefFilingStatus,
} from "../types.ts";

function testFiler(
  filingStatus = MefFilingStatus.Single,
): FilerIdentity {
  return {
    primarySSN: "123456789",
    fullName: "Alex Taxpayer",
    nameLine1: "TAXPAYER ALEX",
    nameControl: "TAXP",
    address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
    filingStatus,
    softwareId: "12345678",
    originator: { efin: "123456", originatorType: "ERO" },
  };
}

const calculated: Fields & {
  ira_contributions_taxpayer: number;
  elective_deferrals_taxpayer: number;
  agi: number;
  filing_status: FilingStatus;
} = {
  ira_contributions_taxpayer: 1_000,
  elective_deferrals_taxpayer: 1_000,
  agi: 20_000,
  filing_status: FilingStatus.Single,
  print_line1a_ira: 1_000,
  print_line2a_deferrals: 1_000,
  print_line3a_total: 2_000,
  print_line4a_distributions: 0,
  print_line5a: 2_000,
  print_line6a_eligible: 2_000,
  print_line7_total_eligible: 2_000,
  print_line8_agi: 20_000,
  print_line9_rate: "0.5",
  print_line10_raw_credit: 1_000,
  print_line11_tax_liability: 800,
  print_line12_credit: 800,
};

Deno.test("Form 8880 absent source emits no document", () => {
  assertEquals(form8880.build({}), "");
});

Deno.test("Form 8880 positive serializer requires finalized return context", () => {
  assertThrows(
    () => form8880.build(calculated),
    Error,
    "needs finalized return context",
  );
});

Deno.test("Form 8880 positive serializer needs matching contribution sources", () => {
  assertThrows(
    () =>
      form8880.build({
        ...calculated,
        ira_contributions_taxpayer: undefined,
        elective_deferrals_taxpayer: undefined,
      }),
    Error,
    "needs contribution source facts",
  );
});

Deno.test("Form 8880 canonical calculated lines map to TY2025 MeF line tags", () => {
  const xml = form8880.build({
    ...calculated,
    taxpayer_dob: "1980-01-01",
    taxpayer_student_five_months: false,
    taxpayer_claimed_as_dependent: false,
  }, {
    pending: {
      f1040: {
        filing_status: FilingStatus.Single,
        line11_agi: 20_000,
        line18_total_tax_before_credits: 800,
      },
      schedule3: { line4_retirement_savings_credit: 800 },
    },
  });
  assertStringIncludes(
    xml,
    "<PrimaryRothIRAForCurrentYrAmt>1000</PrimaryRothIRAForCurrentYrAmt>",
  );
  assertStringIncludes(
    xml,
    "<PrimaryContributionsAmt>1000</PrimaryContributionsAmt>",
  );
  assertStringIncludes(
    xml,
    "<QlfyRetirementSavDecimalAmt>0.5</QlfyRetirementSavDecimalAmt>",
  );
  assertStringIncludes(
    xml,
    "<CalculatedCreditsFromTaxAmt>800</CalculatedCreditsFromTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<CrQualifiedRetirementSavAmt>800</CrQualifiedRetirementSavAmt>",
  );
});

Deno.test("Form 8880 native filing rejects inflated eligible contribution lines", () => {
  assertThrows(
    () =>
      form8880.build({
        ...calculated,
        taxpayer_dob: "1980-01-01",
        taxpayer_student_five_months: false,
        taxpayer_claimed_as_dependent: false,
        print_line6a_eligible: 3_000,
        print_line7_total_eligible: 3_000,
      }, {
        pending: {
          f1040: {
            filing_status: FilingStatus.Single,
            line11_agi: 20_000,
            line18_total_tax_before_credits: 800,
          },
          schedule3: { line4_retirement_savings_credit: 800 },
        },
      }),
    Error,
    "filed lines differ from its source calculation",
  );
});

Deno.test("Form 8880 rejects old manual keys and incomplete calculated lines", () => {
  assertThrows(
    () => form8880.build({ contributions_taxpayer: 2_000 } as Partial<Fields>),
    Error,
    "unsupported field",
  );
  assertThrows(
    () => form8880.build({ print_line12_credit: 500 }),
    Error,
    "missing print_line1a_ira",
  );
  assertThrows(
    () => form8880.build({ ...calculated, print_line11_tax_liability: 100 }),
    Error,
    "exceeds its calculated limit",
  );
  assertThrows(
    () => form8880.build({ ira_contributions_taxpayer: 2_000 }),
    Error,
    "contribution has no calculated native lines",
  );
});

Deno.test("Form 8880 source-only contribution cannot disappear in MeF assembly", () => {
  assertThrows(
    () =>
      buildMefXml({
        form8880: {
          ira_contributions_taxpayer: 2_000,
          agi: 20_000,
          filing_status: FilingStatus.Single,
        },
      }, testFiler()),
    Error,
    "contribution has no calculated native lines",
  );
});

for (
  const scenario of [
    {
      name: "AGI above the credit table",
      agi: 50_000,
      capacity: 800,
    },
    { name: "zero tax capacity", agi: 20_000, capacity: 0 },
  ]
) {
  Deno.test(`Form 8880 reviewed ${scenario.name} emits no native claim`, () => {
    const source = {
      ira_contributions_taxpayer: 2_000,
      filing_status: FilingStatus.Single,
      agi: scenario.agi,
    };
    const result = calculateForm8880(
      { taxYear: 2025, formType: "f1040" },
      source,
      scenario.capacity,
    );
    assertEquals(result.calculatedZero, true);
    const xml = buildMefXml({
      form8880: { ...source, calculated_zero_credit: true },
    }, testFiler());
    assertEquals(xml.includes("<IRS8880"), false);
  });
}

Deno.test("Form 8880 rejects an unsourced or conflicting zero-credit marker", () => {
  assertThrows(
    () => form8880.build({ calculated_zero_credit: true }),
    Error,
    "zero-credit outcome conflicts",
  );
  assertThrows(
    () =>
      form8880.build({
        ...calculated,
        ira_contributions_taxpayer: 2_000,
        calculated_zero_credit: true,
      }),
    Error,
    "zero-credit outcome conflicts",
  );
});

Deno.test("Form 8880 rejects a rounded or absent rate", () => {
  assertThrows(
    () => form8880.build({ ...calculated, print_line9_rate: "1" }),
    Error,
    "not a TY2025 XSD value",
  );
  assertThrows(
    () => form8880.build({ ...calculated, print_line9_rate: undefined }),
    Error,
    "missing print_line9_rate",
  );
});

Deno.test("Form 8880 spouse source requires complete spouse native lines", () => {
  assertThrows(
    () =>
      form8880.build({
        ...calculated,
        ira_contributions_spouse: 500,
        print_line1b_ira: undefined,
      }),
    Error,
    "missing print_line1b_ira",
  );
});

Deno.test("Form 8880 calculated node output survives the full MeF assembly", () => {
  const source = {
    ira_contributions_taxpayer: 1_000,
    elective_deferrals_taxpayer: 1_000,
    agi: 20_000,
    filing_status: FilingStatus.Single,
    taxpayer_dob: "1980-01-01",
    taxpayer_student_five_months: false,
    taxpayer_claimed_as_dependent: false,
  };
  const result = calculateForm8880(
    { taxYear: 2025, formType: "f1040" },
    source,
    800,
  );
  if (result.calculatedZero) {
    throw new Error("Form 8880 calculator did not emit its native lines");
  }
  const xml = buildMefXml({
    form8880: { ...source, ...result.printFields } as Partial<Fields>,
    f1040: {
      filing_status: FilingStatus.Single,
      line11_agi: 20_000,
      line18_total_tax_before_credits: 800,
    },
    schedule3: { line4_retirement_savings_credit: 800 },
  }, testFiler());
  assertStringIncludes(xml, "<IRS8880 ");
  assertStringIncludes(
    xml,
    "<CrQualifiedRetirementSavAmt>800</CrQualifiedRetirementSavAmt>",
  );
});

Deno.test("Form 8880 reviewed joint 2025 distribution prints in both columns", () => {
  const source = {
    ira_contributions_taxpayer: 2_000,
    agi: 40_000,
    filing_status: FilingStatus.MFJ,
    taxpayer_dob: "1980-01-01",
    taxpayer_student_five_months: false,
    taxpayer_claimed_as_dependent: false,
    joint_distribution_review: {
      filing_due_date: "2026-04-15" as const,
      reviewed_distribution_sources_ref: "2023-2026 IRA and plan review",
      entries: [{
        recipient: TS.S,
        received_date: "2025-07-01",
        qualifying_amount: 1_000,
        source_document_ref: "2025-1099-R-spouse-1",
      }],
      no_other_qualifying_distributions_in_lookback: true as const,
    },
  };
  const result = calculateForm8880(
    { taxYear: 2025, formType: "f1040" },
    source,
    1_000,
  );
  if (result.calculatedZero) {
    throw new Error("Form 8880 calculation did not emit its lines");
  }
  const print = result.printFields;
  const xml = buildMefXml({
    form8880: { ...source, ...print },
    f1040: {
      filing_status: FilingStatus.MFJ,
      line11_agi: 40_000,
      line18_total_tax_before_credits: 1_000,
    },
    schedule3: { line4_retirement_savings_credit: 500 },
  }, testFiler(MefFilingStatus.MarriedFilingJointly));
  assertStringIncludes(
    xml,
    "<PrimTaxableDistributionsAmt>1000</PrimTaxableDistributionsAmt>",
  );
  assertStringIncludes(
    xml,
    "<SpsTaxableDistributionsAmt>1000</SpsTaxableDistributionsAmt>",
  );
});

Deno.test("Form 8880 MeF assembly rejects an invented credit-limit line", () => {
  assertThrows(
    () =>
      buildMefXml({
        form8880: {
          ...calculated,
          taxpayer_dob: "1980-01-01",
          taxpayer_student_five_months: false,
          taxpayer_claimed_as_dependent: false,
        },
        f1040: { line18_total_tax_before_credits: 700 },
        schedule3: { line4_retirement_savings_credit: 800 },
      }, testFiler()),
    Error,
    "differs from the finalized credit-limit worksheet",
  );
});

Deno.test("Form 8880 MeF rejects an unfiled foreign AGI addback", () => {
  assertThrows(
    () =>
      buildMefXml({
        form8880: {
          ...calculated,
          taxpayer_dob: "1980-01-01",
          taxpayer_student_five_months: false,
          taxpayer_claimed_as_dependent: false,
          foreign_agi_addback: 100,
        },
        f1040: {
          filing_status: FilingStatus.Single,
          line11_agi: 20_000,
          line18_total_tax_before_credits: 800,
        },
        schedule3: { line4_retirement_savings_credit: 800 },
      }, testFiler()),
    Error,
    "foreign AGI addback differs from filed Form 2555 and Schedule 1",
  );
});

Deno.test("Form 8880 MeF reconciles a nonjoint 2023 spouse distribution", () => {
  const source = {
    ira_contributions_taxpayer: 2_000,
    ira_contributions_spouse: 2_000,
    agi: 40_000,
    filing_status: FilingStatus.MFJ,
    taxpayer_dob: "1980-01-01",
    spouse_dob: "1981-01-01",
    taxpayer_student_five_months: false,
    spouse_student_five_months: false,
    taxpayer_claimed_as_dependent: false,
    spouse_claimed_as_dependent: false,
    joint_distribution_review: {
      filing_due_date: "2026-04-15" as const,
      reviewed_distribution_sources_ref: "2023-2026 IRA and plan review",
      entries: [{
        recipient: TS.S,
        received_date: "2023-07-01",
        qualifying_amount: 1_000,
        source_document_ref: "2023-1099-R-spouse-1",
        filed_jointly_in_distribution_year: false,
        distribution_year_return_ref: "2023-spouse-filed-return",
      }],
      no_other_qualifying_distributions_in_lookback: true as const,
    },
  };
  const result = calculateForm8880(
    { taxYear: 2025, formType: "f1040" },
    source,
    1_500,
  );
  if (result.calculatedZero) {
    throw new Error("Form 8880 calculation did not emit its lines");
  }
  const print = result.printFields;
  const xml = form8880.build({ ...source, ...print }, {
    pending: {
      f1040: {
        filing_status: FilingStatus.MFJ,
        line11_agi: 40_000,
        line18_total_tax_before_credits: 1_500,
      },
      schedule3: { line4_retirement_savings_credit: 1_500 },
    },
  });
  assertStringIncludes(
    xml,
    "<PrimTaxableDistributionsAmt>0</PrimTaxableDistributionsAmt>",
  );
  assertStringIncludes(
    xml,
    "<SpsTaxableDistributionsAmt>1000</SpsTaxableDistributionsAmt>",
  );
});

Deno.test("Form 8880 MeF assembly rejects positive credit without contributor eligibility", () => {
  assertThrows(
    () =>
      buildMefXml({
        form8880: calculated,
        f1040: { line18_total_tax_before_credits: 800 },
        schedule3: { line4_retirement_savings_credit: 800 },
      }, testFiler()),
    Error,
    "needs birth date, five-month student answer, and dependent-claim answer",
  );
});

Deno.test("Form 8880 native spouse deferral line agrees with W-2 SSN ownership", () => {
  const source = {
    taxpayer_ssn: "123456789",
    spouse_ssn: "987-65-4321",
    w2_deferral_entries: [
      { employee_ssn: "123456789", code: "D" as const, amount: 500 },
      { employee_ssn: "987654321", code: "E" as const, amount: 800 },
    ],
    agi: 30_000,
    filing_status: FilingStatus.MFJ,
    joint_distribution_review: {
      filing_due_date: "2026-04-15" as const,
      reviewed_distribution_sources_ref: "2023-2026 IRA and plan review",
      entries: [],
      no_other_qualifying_distributions_in_lookback: true as const,
    },
    taxpayer_dob: "1980-01-01",
    spouse_dob: "1981-01-01",
    taxpayer_student_five_months: false,
    spouse_student_five_months: false,
    taxpayer_claimed_as_dependent: false,
    spouse_claimed_as_dependent: false,
  };
  const result = calculateForm8880(
    { taxYear: 2025, formType: "f1040" },
    source,
    1_000,
  );
  if (result.calculatedZero) {
    throw new Error("Form 8880 calculator did not emit native lines");
  }
  const fields = { ...source, ...result.printFields };
  const xml = form8880.build(fields, {
    pending: {
      f1040: {
        filing_status: FilingStatus.MFJ,
        line11_agi: 30_000,
        line18_total_tax_before_credits: 1_000,
      },
      schedule3: { line4_retirement_savings_credit: 650 },
    },
  });
  assertStringIncludes(
    xml,
    "<PrimaryContributionsAmt>500</PrimaryContributionsAmt>",
  );
  assertStringIncludes(
    xml,
    "<SpouseContributionsAmt>800</SpouseContributionsAmt>",
  );
  assertThrows(
    () =>
      form8880.build({
        ...fields,
        print_line2a_deferrals: 1_300,
        print_line2b_deferrals: 0,
      }),
    Error,
    "differ from owner source facts",
  );
});

Deno.test("Form 8880 native line 2 excludes the employer portion of reviewed code G", () => {
  const source = {
    taxpayer_ssn: "123456789",
    w2_deferral_entries: [{
      employee_ssn: "123456789",
      code: "G" as const,
      amount: 1_800,
      governmental_457b: true as const,
      employee_elective_amount: 600,
      employee_split_review_ref: "2025 payroll 457b allocation",
    }],
    agi: 20_000,
    filing_status: FilingStatus.Single,
    taxpayer_dob: "1980-01-01",
    taxpayer_student_five_months: false,
    taxpayer_claimed_as_dependent: false,
  };
  const result = calculateForm8880(
    { taxYear: 2025, formType: "f1040" },
    source,
    1_000,
  );
  if (result.calculatedZero) {
    throw new Error("Form 8880 calculator did not emit native lines");
  }
  const fields = { ...source, ...result.printFields };
  const context = {
    pending: {
      f1040: {
        filing_status: FilingStatus.Single,
        line11_agi: 20_000,
        line18_total_tax_before_credits: 1_000,
      },
      schedule3: { line4_retirement_savings_credit: 300 },
    },
  };
  const xml = form8880.build(fields, context);
  assertStringIncludes(
    xml,
    "<PrimaryContributionsAmt>600</PrimaryContributionsAmt>",
  );
  assertThrows(
    () => form8880.build({ ...fields, print_line2a_deferrals: 1_800 }, context),
    Error,
    "differ from owner source facts",
  );
});
