import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import type { MefBuildContext } from "../form-descriptor.ts";
import {
  CoverageType,
  form8889 as form8889Node,
  inputSchema as form8889InputSchema,
} from "../../../nodes/intermediate/forms/form8889/index.ts";
import { form8889 } from "./f8889.ts";
import { form8889Pdf } from "../../pdf/forms/f8889.ts";

Deno.test("Form 8889 code-2 timely personal excess reconciles box 1, box 2, MeF, PDF, and Schedule 1", () => {
  const source = {
    beneficiary_identity: {
      owner: "T" as const,
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
    age_55_or_older: false,
    last_month_rule_elected: false,
    married_at_year_end: false,
    taxpayer_hsa_contributions: 5_200,
    hsa_distributions: 1_000,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "123456789",
      box1_gross_distribution: 1_000,
      box2_earnings_on_excess: 100,
      box3_distribution_code: "2" as const,
      source_reference: "1099-SA-code-2",
    }],
    hsa_excluded_distributions: {
      timely_excess_withdrawal: {
        source: "current_year_personal" as const,
        amount_including_earnings: 1_000,
        included_earnings: 100,
        form1099_sa_source_reference: "1099-SA-code-2",
        withdrawn_by_return_due_date: true as const,
      },
    },
  };
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form8889InputSchema.parse(source),
  );
  const forms = result.outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Form8889Owner[];
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line13_hsa_deduction: 4_300,
      line8z_hsa_excess_earnings: 100,
      line10_total_additional_income: 100,
      line26_total_adjustments: 4_300,
    },
    schedule2: {},
    f1040: { line8_additional_income: 100, line10_adjustments: 4_300 },
  };
  const buildContext = { ...context, pending };
  const xml = form8889.build({ forms }, buildContext);
  assertStringIncludes(
    xml[0],
    "<HSADistributionRolloverAmt>1000</HSADistributionRolloverAmt>",
  );
  assertEquals(forms[0].print_line14c, 0);
  assertEquals(forms[0].print_line16_taxable, 0);
  const [printed] = form8889Pdf.instances!(
    pending.form8889,
    context.filer,
    pending,
  );
  assertEquals(printed?.print_line14b_excluded_distributions, 1_000);
  assertThrows(
    () =>
      form8889.build({
        forms: [{
          ...forms[0],
          print_line14b_excluded_distributions: 900,
        }],
      }, buildContext),
    Error,
    "printed lines differ",
  );
  assertThrows(
    () =>
      form8889.build({ forms }, {
        ...context,
        pending: {
          ...pending,
          form8889: {
            ...source,
            forms,
            form1099_sa_distributions: [{
              ...source.form1099_sa_distributions[0],
              box2_earnings_on_excess: 99,
            }],
          },
        },
      }),
    Error,
    "matching code-2 Form 1099-SA",
  );
  assertThrows(
    () =>
      form8889Pdf.instances!(pending.form8889, context.filer, {
        ...pending,
        schedule1: { ...pending.schedule1, line8z_hsa_excess_earnings: 99 },
      }),
    Error,
    "amounts differ",
  );
  assertThrows(
    () =>
      form8889.build({ forms }, {
        ...context,
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line8_additional_income: 99 },
        },
      }),
    Error,
    "amounts differ",
  );
});

const context: MefBuildContext = {
  filer: {
    primarySSN: "123-45-6789",
    fullName: "Alex Taxpayer",
    nameLine1: "TAXPAYER ALEX",
    nameControl: "TAXP",
    filingStatus: FilingStatus.Single,
    address: {
      line1: "1 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
  },
};

type Form8889Owner = Extract<
  Parameters<typeof form8889.build>[0],
  { forms: unknown }
>["forms"][number];

function buildPrimary(
  fields: Partial<
    Omit<Form8889Owner, "owner" | "beneficiary_name" | "beneficiary_ssn">
  >,
  buildContext: MefBuildContext = context,
): string {
  return form8889.build({
    forms: [{
      owner: "primary",
      beneficiary_name: "Alex Taxpayer",
      beneficiary_ssn: "123456789",
      ...fields,
    }],
  }, buildContext).join("");
}

function buildInvalid(raw: unknown, buildContext: MefBuildContext = context) {
  return form8889.build(
    raw as Parameters<typeof form8889.build>[0],
    buildContext,
  );
}

Deno.test("Form 8889 rollover plus age-65 exception serializes distinct 14b, 16, and 17b amounts", () => {
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form8889InputSchema.parse({
      beneficiary_identity: {
        owner: "T",
        name: "Alex Taxpayer",
        ssn: "123456789",
      },
      hsa_distributions: 2000,
      form1099_sa_distributions: [{
        tax_year: 2025,
        recipient_ssn: "123456789",
        box1_gross_distribution: 2000,
        box3_distribution_code: "1",
        source_reference: "2025 Form 1099-SA",
      }],
      hsa_excluded_distributions: {
        rollover: {
          amount: 1000,
          distribution_date: "2025-05-01",
          contribution_date: "2025-05-30",
          distribution_source_reference: "May trustee transaction",
          contribution_source_reference: "Receiving HSA deposit",
          same_beneficiary: true,
          receiving_hsa_no_other_rollover_in_preceding_12_months: true,
          not_direct_trustee_transfer: true,
        },
      },
      qualified_medical_expenses: 100,
      exception_qualified_taxable_amount: 500,
      age_65_exception_evidence: {
        date_of_birth: "1960-04-01",
        birth_date_source_reference: "Beneficiary birth record",
        distributions: [{
          distribution_date: "2025-01-10",
          gross_amount: 400,
          qualified_medical_amount: 0,
          rollover_excluded_amount: 0,
          source_reference: "January trustee transaction",
          form1099_sa_source_reference: "2025 Form 1099-SA",
        }, {
          distribution_date: "2025-05-01",
          gross_amount: 1600,
          qualified_medical_amount: 100,
          rollover_excluded_amount: 1000,
          source_reference: "May trustee transaction",
          form1099_sa_source_reference: "2025 Form 1099-SA",
        }],
      },
    }),
  );
  const printed = result.outputs.find((entry) => entry.nodeType === "form8889");
  const xml = form8889.build(
    (printed?.fields ?? {}) as Parameters<typeof form8889.build>[0],
    context,
  ).join("");
  assertStringIncludes(
    xml,
    "<HSADistributionRolloverAmt>1000</HSADistributionRolloverAmt>",
  );
  assertStringIncludes(
    xml,
    "<TaxableHSADistributionAmt>900</TaxableHSADistributionAmt>",
  );
  assertStringIncludes(
    xml,
    "<HSADistriAddnlPercentTaxExcInd>X</HSADistriAddnlPercentTaxExcInd>",
  );
  assertStringIncludes(
    xml,
    "<HSADistriAddnlPercentTaxAmt>80</HSADistriAddnlPercentTaxAmt>",
  );
});

Deno.test("Form 8889 emits two owner documents and reconciles the combined deduction", () => {
  const source = {
    beneficiary_identity: {
      owner: "T" as const,
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.Family),
    allocated_family_limit: 4_275,
    family_allocation_source_reference: "2025 HSA allocation agreement",
    age_55_or_older: false,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    taxpayer_hsa_contributions: 4_000,
    spouse_hsa: {
      beneficiary_identity: {
        owner: "S" as const,
        name: "Sam Taxpayer",
        ssn: "987654321",
      },
      eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.Family),
      allocated_family_limit: 4_275,
      family_allocation_source_reference: "2025 HSA allocation agreement",
      age_55_or_older: false,
      last_month_rule_elected: false,
      married_at_year_end: true,
      spouse_has_separate_hsa: true,
      taxpayer_hsa_contributions: 2_000,
    },
  };
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form8889InputSchema.parse(source),
  );
  const forms = result.outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Form8889Owner[];
  const pairedContext: MefBuildContext = {
    filer: {
      ...context.filer!,
      filingStatus: FilingStatus.MarriedFilingJointly,
      spouse: {
        ssn: "987654321",
        firstName: "Sam",
        lastName: "Taxpayer",
        nameControl: "TAXP",
      },
    },
    pending: {
      form8889: { ...source, forms },
      schedule1: {
        line13_hsa_deduction: 6_000,
        line26_total_adjustments: 6_000,
      },
      schedule2: {},
      f1040: { line10_adjustments: 6_000 },
    },
  };
  const xml = form8889.build({ forms }, pairedContext);
  assertEquals(xml.length, 2);
  assertStringIncludes(xml[0], "<RecipientSSN>123456789</RecipientSSN>");
  assertStringIncludes(xml[1], "<RecipientSSN>987654321</RecipientSSN>");
  assertThrows(
    () =>
      form8889.build({ forms }, {
        ...pairedContext,
        pending: {
          ...pairedContext.pending,
          schedule1: {
            line13_hsa_deduction: 5_999,
            line26_total_adjustments: 6_000,
          },
        },
      }),
    Error,
    "paired owner totals differ from the filed return",
  );
});

function spouseOnlyCase() {
  const source = {
    beneficiary_identity: {
      owner: "S" as const,
      name: "Sam Taxpayer",
      ssn: "987654321",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
    last_month_rule_elected: false,
    age_55_or_older: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: false,
    taxpayer_hsa_contributions: 2_000,
  };
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form8889InputSchema.parse(source),
  );
  const forms = result.outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Form8889Owner[];
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line13_hsa_deduction: 2_000,
      line26_total_adjustments: 2_000,
    },
    schedule2: {},
    f1040: { line10_adjustments: 2_000 },
  };
  const buildContext: MefBuildContext = {
    filer: {
      ...context.filer!,
      filingStatus: FilingStatus.MarriedFilingJointly,
      spouse: {
        ssn: "987654321",
        firstName: "Sam",
        lastName: "Taxpayer",
        nameControl: "TAXP",
      },
    },
    pending,
  };
  return { forms, pending, buildContext };
}

Deno.test("Form 8889 spouse-only MeF uses spouse identity and reconciled deduction", () => {
  const { forms, buildContext } = spouseOnlyCase();
  const xml = form8889.build({ forms }, buildContext);
  assertEquals(xml.length, 1);
  assertStringIncludes(xml[0], "<PersonNm>Sam Taxpayer</PersonNm>");
  assertStringIncludes(xml[0], "<RecipientSSN>987654321</RecipientSSN>");
  assertThrows(
    () =>
      form8889.build({
        forms: [{ ...forms[0], print_line13_deduction: 1_999 }],
      }, buildContext),
    Error,
    "printed lines differ",
  );
});

Deno.test("Form 8889 spouse-only excess retains a matching spouse Form 5329 source", () => {
  const { buildContext } = spouseOnlyCase();
  const source = {
    beneficiary_identity: {
      owner: "S" as const,
      name: "Sam Taxpayer",
      ssn: "987654321",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
    last_month_rule_elected: false,
    age_55_or_older: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: false,
    taxpayer_hsa_contributions: 5_000,
    hsa_december_31_value: 500,
  };
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form8889InputSchema.parse(source),
  );
  const forms = result.outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Form8889Owner[];
  const entries = result.outputs.find((row) => row.nodeType === "form5329")
    ?.fields.owner_entries;
  const pending = {
    form8889: { ...source, forms },
    form5329: { owner_entries: entries },
    schedule1: {
      line13_hsa_deduction: 4_300,
      line26_total_adjustments: 4_300,
    },
    schedule2: {},
    f1040: { line10_adjustments: 4_300 },
  };
  assertEquals(
    form8889.build({ forms }, { ...buildContext, pending }).length,
    1,
  );
  assertThrows(
    () =>
      form8889.build({ forms }, {
        ...buildContext,
        pending: { ...pending, form5329: { owner_entries: [] } },
      }),
    Error,
    "excess differs from owner Form 5329",
  );
});

Deno.test("Form 8889 omits an empty pending slot", () => {
  assertEquals(
    form8889.build({} as Parameters<typeof form8889.build>[0], context),
    [],
  );
  assertThrows(() => buildInvalid({ unrelated: 10 }));
});

Deno.test("Form 8889 rejects raw HSA values without computed form lines", () => {
  assertThrows(
    () => buildInvalid({ taxpayer_hsa_contributions: 3_000 }),
    Error,
  );
  assertThrows(
    () =>
      buildInvalid(
        {
          qualified_hsa_funding_distributions: {
            transfers: [{ amount: 1000 }],
          },
        },
      ),
    Error,
  );
  assertThrows(
    () =>
      buildInvalid(
        { hsa_excluded_distributions: { rollover_amount: 500 } },
      ),
    Error,
  );
  assertThrows(
    () => buildInvalid({ qualified_hsa_funding_distribution: {} }),
    Error,
  );
});

Deno.test("Form 8889 calculated IRA-to-HSA transfer reaches native line 10", () => {
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form8889InputSchema.parse({
      beneficiary_identity: {
        owner: "T",
        name: "Alex Taxpayer",
        ssn: "123456789",
      },
      eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
      age_55_or_older: false,
      last_month_rule_elected: false,
      qualified_hsa_funding_distributions: {
        no_prior_qualified_funding_distribution: true,
        transfers: [{
          amount: 1000,
          transfer_month: 3,
          ira_type: "traditional",
          direct_trustee_transfer: true,
          source_reference: "IRA trustee transfer confirmation",
        }],
      },
    }),
  );
  const printed = result.outputs.find((entry) => entry.nodeType === "form8889");
  const xml = form8889.build(
    (printed?.fields ?? {}) as Parameters<typeof form8889.build>[0],
    context,
  ).join("");
  assertStringIncludes(
    xml,
    "<HSAQualifiedFundingDistriAmt>1000</HSAQualifiedFundingDistriAmt>",
  );
  assertStringIncludes(
    xml,
    "<HSALimitedContributionAmt>3300</HSALimitedContributionAmt>",
  );
});

Deno.test("Form 8889 sums two permitted IRA-to-HSA transfers on native line 10", () => {
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form8889InputSchema.parse({
      beneficiary_identity: {
        owner: "T",
        name: "Alex Taxpayer",
        ssn: "123456789",
      },
      eligible_hdhp_coverage_by_month: [
        ...Array(6).fill(CoverageType.SelfOnly),
        ...Array(6).fill(CoverageType.Family),
      ],
      age_55_or_older: false,
      last_month_rule_elected: false,
      married_at_year_end: false,
      qualified_hsa_funding_distributions: {
        no_prior_qualified_funding_distribution: true,
        transfers: [
          {
            amount: 3000,
            transfer_month: 3,
            ira_type: "traditional",
            direct_trustee_transfer: true,
            source_reference: "March trustee transfer",
          },
          {
            amount: 5000,
            transfer_month: 8,
            ira_type: "roth",
            direct_trustee_transfer: true,
            source_reference: "August trustee transfer",
          },
        ],
      },
    }),
  );
  const printed = result.outputs.find((entry) => entry.nodeType === "form8889");
  const xml = form8889.build(
    (printed?.fields ?? {}) as Parameters<typeof form8889.build>[0],
    context,
  ).join("");
  assertStringIncludes(
    xml,
    "<HSAQualifiedFundingDistriAmt>8000</HSAQualifiedFundingDistriAmt>",
  );
});

Deno.test("Form 8889 source rejects the obsolete spouse allocation field", () => {
  assertThrows(
    () =>
      form8889Node.compute(
        { taxYear: 2025, formType: "f1040" },
        form8889InputSchema.parse({
          beneficiary_identity: {
            owner: "T",
            name: "Alex Taxpayer",
            ssn: "123456789",
          },
          eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.Family),
          age_55_or_older: false,
          last_month_rule_elected: false,
          married_at_year_end: true,
          spouse_has_separate_hsa: true,
          spouse_allocated_family_limit: 4275,
          taxpayer_hsa_contributions: 4000,
        }),
      ),
    Error,
  );
});

Deno.test("Form 8889 requires the beneficiary SSN for every filed form", () => {
  assertThrows(
    () => buildPrimary({ print_line14a_distributions: 500 }, {}),
    Error,
    "beneficiary SSN",
  );
});

Deno.test("Form 8889 distribution-only filing has no invented HDHP coverage", () => {
  const xml = buildPrimary({
    print_line14a_distributions: 800,
    print_line14c: 800,
    print_line15_qualified: 300,
    print_line16_taxable: 500,
    print_line17b_penalty: 100,
  });
  assertStringIncludes(xml, "<RecipientSSN>123456789</RecipientSSN>");
  assertStringIncludes(
    xml,
    "<TotalHSADistributionAmt>800</TotalHSADistributionAmt>",
  );
  assertStringIncludes(
    xml,
    "<TaxableHSADistributionAmt>500</TaxableHSADistributionAmt>",
  );
  assertStringIncludes(
    xml,
    "<HSADistriAddnlPercentTaxAmt>100</HSADistriAddnlPercentTaxAmt>",
  );
  assertEquals(xml.includes("HDHPSelfOnlyCoverageInd"), false);
  assertEquals(xml.includes("HDHPFamilyCoverageInd"), false);
});

Deno.test("Form 8889 serializes all calculated 2025 lines in XSD order", () => {
  const xml = buildPrimary({
    print_line1_coverage: "family",
    print_line2_taxpayer_contributions: 2_000,
    print_line3_limit: 8_550,
    print_line4_archer: 100,
    print_line5: 8_450,
    print_line6: 8_000,
    print_line7_catchup: 1_000,
    print_line8: 9_000,
    print_line9_employer: 3_000,
    print_line10: 200,
    print_line11: 3_200,
    print_line12: 5_800,
    print_line13_deduction: 2_000,
    print_line14a_distributions: 4_000,
    print_line14b_excluded_distributions: 500,
    print_line14c: 3_500,
    print_line15_qualified: 2_500,
    print_line16_taxable: 1_000,
    print_line17a_exception: true,
    print_line17b_penalty: 0,
    print_line18: 300,
    print_line19: 200,
    print_line20: 500,
    print_line21: 50,
  });

  const tags = [
    "PersonNm",
    "RecipientSSN",
    "HDHPFamilyCoverageInd",
    "HSAContributionAmt",
    "HSALimitedAnnualDeductibleAmt",
    "TotalArcherMSAContributionAmt",
    "HSALimitedDeductibleAllwdAmt",
    "HSAFamilyDeductibleAmt",
    "HSAAddnlContributionAmt",
    "HSALimitedGrossContributionAmt",
    "HSAEmployerContributionAmt",
    "HSAQualifiedFundingDistriAmt",
    "TotalHSAContributionAmt",
    "HSALimitedContributionAmt",
    "TotalHSADeductionAmt",
    "TotalHSADistributionAmt",
    "HSADistributionRolloverAmt",
    "HSANetDistributionAmt",
    "UnreimbQualMedAndDentalExpAmt",
    "TaxableHSADistributionAmt",
    "HSADistriAddnlPercentTaxExcInd",
    "HSADistriAddnlPercentTaxAmt",
    "HDHPCoverageFailPartialYrAmt",
    "HDHPCoverageFailFundDistriAmt",
    "HDHPCoverageIncomeAmt",
    "HDHPCoverageAddnlTaxAmt",
  ];
  const positions = tags.map((tag) => xml.indexOf(`<${tag}>`));
  assertEquals(positions.every((position) => position >= 0), true);
  assertEquals(positions, [...positions].sort((a, b) => a - b));
  assertStringIncludes(xml, "<PersonNm>Alex Taxpayer</PersonNm>");
  assertStringIncludes(
    xml,
    "<TotalHSADeductionAmt>2000</TotalHSADeductionAmt>",
  );
  assertStringIncludes(
    xml,
    "<HSADistriAddnlPercentTaxExcInd>X</HSADistriAddnlPercentTaxExcInd>",
  );
  assertStringIncludes(
    xml,
    "<HDHPCoverageAddnlTaxAmt>50</HDHPCoverageAddnlTaxAmt>",
  );
  assertEquals(xml.includes("HDHPSelfOnlyCoverageInd"), false);
});

Deno.test("Form 8889 self-only line 1 and explicit zero deduction", () => {
  const xml = buildPrimary({
    print_line1_coverage: "self_only",
    print_line2_taxpayer_contributions: 0,
    print_line9_employer: 1_000,
    print_line13_deduction: 0,
  });
  assertStringIncludes(
    xml,
    "<HDHPSelfOnlyCoverageInd>X</HDHPSelfOnlyCoverageInd>",
  );
  assertStringIncludes(xml, "<HSAContributionAmt>0</HSAContributionAmt>");
  assertStringIncludes(xml, "<TotalHSADeductionAmt>0</TotalHSADeductionAmt>");
});

Deno.test("Form 8889 rejects invalid coverage, exception, and amounts", () => {
  assertThrows(
    () => buildPrimary({ print_line1_coverage: "both" }),
    Error,
    "line 1",
  );
  assertThrows(
    () => buildPrimary({ print_line17a_exception: "yes" }),
    Error,
    "line 17a",
  );
  assertThrows(
    () => buildPrimary({ print_line16_taxable: -1 }),
    Error,
    "nonnegative amount",
  );
  assertThrows(
    () => buildPrimary({ print_line16_taxable: Number.NaN }),
    Error,
    "nonnegative amount",
  );
});
