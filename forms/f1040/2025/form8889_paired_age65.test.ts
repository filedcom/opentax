import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import type { MefBuildContext } from "./mef/form-descriptor.ts";
import {
  CoverageType,
  form8889 as form8889Node,
  inputSchema,
} from "../nodes/intermediate/forms/form8889/index.ts";
import { form8889 } from "./mef/forms/f8889.ts";
import { form8889Pdf } from "./pdf/forms/f8889.ts";

type Form8889Owner = Extract<
  Parameters<typeof form8889.build>[0],
  { forms: unknown }
>["forms"][number];

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.MarriedFilingJointly,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  spouse: {
    ssn: "987654321",
    firstName: "Sam",
    lastName: "Taxpayer",
    nameControl: "TAXP",
  },
};

function pairedAge65Case() {
  const source = inputSchema.parse({
    beneficiary_identity: {
      owner: "T",
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
    age_55_or_older: true,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    last_month_rule_elected: false,
    taxpayer_hsa_contributions: 2_000,
    hsa_distributions: 1_000,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "123456789",
      box1_gross_distribution: 1_000,
      box3_distribution_code: "1",
      source_reference: "1099-sa-primary",
    }],
    qualified_medical_expenses: 300,
    qualified_medical_expense_evidence: [{
      amount: 300,
      source_reference: "primary-medical-receipt",
      incurred_after_hsa_established: true,
      not_reimbursed_by_other_coverage: true,
      eligible_person: "owner",
    }],
    exception_qualified_taxable_amount: 400,
    age_65_exception_evidence: {
      date_of_birth: "1960-02-29",
      birth_date_source_reference: "primary-birth-record",
      distributions: [{
        distribution_date: "2025-02-27",
        gross_amount: 400,
        qualified_medical_amount: 100,
        source_reference: "primary-before-65",
        form1099_sa_source_reference: "1099-sa-primary",
      }, {
        distribution_date: "2025-02-28",
        gross_amount: 600,
        qualified_medical_amount: 200,
        source_reference: "primary-after-65",
        form1099_sa_source_reference: "1099-sa-primary",
      }],
    },
    spouse_hsa: {
      beneficiary_identity: {
        owner: "S",
        name: "Sam Taxpayer",
        ssn: "987654321",
      },
      eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
      age_55_or_older: false,
      married_at_year_end: true,
      spouse_has_separate_hsa: true,
      last_month_rule_elected: false,
      taxpayer_hsa_contributions: 2_000,
      hsa_distributions: 500,
      form1099_sa_distributions: [{
        tax_year: 2025,
        recipient_ssn: "987654321",
        box1_gross_distribution: 500,
        box3_distribution_code: "1",
        source_reference: "1099-sa-spouse",
      }],
      qualified_medical_expenses: 100,
      qualified_medical_expense_evidence: [{
        amount: 100,
        source_reference: "spouse-medical-receipt",
        incurred_after_hsa_established: true,
        not_reimbursed_by_other_coverage: true,
        eligible_person: "owner",
      }],
      exception_qualified_taxable_amount: 0,
    },
  });
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  );
  const forms = result.outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Form8889Owner[];
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line13_hsa_deduction: 4_000,
      line8f_hsa_income: 1_100,
      line26_total_adjustments: 4_000,
    },
    schedule2: { line17c_hsa_penalty: 140 },
    f1040: { line10_adjustments: 4_000 },
  };
  const context: MefBuildContext = { filer, pending };
  return { source, forms, pending, context };
}

Deno.test("paired Form 8889 exports the leap-day age-65 exception in MeF and PDF", () => {
  const { forms, pending, context } = pairedAge65Case();
  assertEquals(forms[0]?.print_line16_taxable, 700);
  assertEquals(forms[0]?.print_line17a_exception, true);
  assertEquals(forms[0]?.print_line17b_penalty, 60);
  assertEquals(forms[1]?.print_line16_taxable, 400);
  assertEquals(forms[1]?.print_line17b_penalty, 80);
  const xml = form8889.build({ forms }, context);
  assertEquals(xml.length, 2);
  assertStringIncludes(
    xml[0],
    "<HSADistriAddnlPercentTaxExcInd>X</HSADistriAddnlPercentTaxExcInd>",
  );
  assertStringIncludes(
    xml[0],
    "<HSADistriAddnlPercentTaxAmt>60</HSADistriAddnlPercentTaxAmt>",
  );
  assertEquals(xml[1].includes("HSADistriAddnlPercentTaxExcInd"), false);
  const pdf = form8889Pdf.instances?.({ forms }, filer, pending);
  assertEquals(pdf?.length, 2);
  assertEquals(pdf?.[0]?.print_line17a_exception, true);
  assertEquals(pdf?.[0]?.print_line17b_penalty, 60);
  assertEquals(pdf?.[1]?.print_line17b_penalty, 80);
});

Deno.test("paired owners reconcile age-65 and disability exceptions through both Forms 8889 and Form 1040", () => {
  const { source } = pairedAge65Case();
  const mixed = inputSchema.parse({
    ...source,
    spouse_hsa: {
      ...source.spouse_hsa!,
      form1099_sa_distributions: [{
        tax_year: 2025,
        recipient_ssn: "987654321",
        box1_gross_distribution: 100,
        box3_distribution_code: "1",
        source_reference: "spouse-1099-before-disability",
      }, {
        tax_year: 2025,
        recipient_ssn: "987654321",
        box1_gross_distribution: 400,
        box3_distribution_code: "3",
        source_reference: "spouse-1099-after-disability",
      }],
      exception_qualified_taxable_amount: 300,
      disability_exception_evidence: {
        disability_date: "2025-06-01",
        disability_source_reference: "spouse-disability-determination",
        section_72m7_disability_confirmed: true,
        distributions: [{
          distribution_date: "2025-05-01",
          gross_amount: 100,
          qualified_medical_amount: 0,
          source_reference: "spouse-before-disability",
          form1099_sa_source_reference: "spouse-1099-before-disability",
        }, {
          distribution_date: "2025-07-01",
          gross_amount: 400,
          qualified_medical_amount: 100,
          source_reference: "spouse-after-disability",
          form1099_sa_source_reference: "spouse-1099-after-disability",
        }],
      },
    },
  });
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    mixed,
  );
  const forms = result.outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Form8889Owner[];
  assertEquals(forms[0]?.print_line16_taxable, 700);
  assertEquals(forms[0]?.print_line17b_penalty, 60);
  assertEquals(forms[1]?.print_line16_taxable, 400);
  assertEquals(forms[1]?.print_line17b_penalty, 20);
  const pending = {
    form8889: { ...mixed, forms },
    schedule1: {
      line13_hsa_deduction: 4_000,
      line8f_hsa_income: 1_100,
      line10_total_additional_income: 1_100,
      line26_total_adjustments: 4_000,
    },
    schedule2: { line17c_hsa_penalty: 80 },
    f1040: {
      line8_additional_income: 1_100,
      line10_adjustments: 4_000,
      line23_other_taxes: 80,
    },
  };
  const xml = form8889.build({ forms }, { filer, pending });
  assertEquals(xml.length, 2);
  assertStringIncludes(
    xml[0],
    "<HSADistriAddnlPercentTaxAmt>60</HSADistriAddnlPercentTaxAmt>",
  );
  assertStringIncludes(
    xml[1],
    "<HSADistriAddnlPercentTaxAmt>20</HSADistriAddnlPercentTaxAmt>",
  );
  const pdf = form8889Pdf.instances?.({ forms }, filer, pending);
  assertEquals(pdf?.[0]?.print_line17b_penalty, 60);
  assertEquals(pdf?.[1]?.print_line17b_penalty, 20);
  const changed = {
    ...pending,
    form8889: {
      ...mixed,
      spouse_hsa: {
        ...mixed.spouse_hsa!,
        disability_exception_evidence: {
          ...mixed.spouse_hsa!.disability_exception_evidence!,
          distributions: mixed.spouse_hsa!.disability_exception_evidence!
            .distributions.map((row) => ({
              ...row,
              form1099_sa_source_reference: "spouse-1099-after-disability",
            })),
        },
      },
      forms,
    },
  };
  assertThrows(
    () => form8889.build({ forms }, { filer, pending: changed }),
    Error,
  );
  assertThrows(() => form8889Pdf.instances?.({ forms }, filer, changed), Error);
  assertThrows(
    () =>
      form8889.build({ forms }, {
        filer,
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line23_other_taxes: 79 },
        },
      }),
    Error,
    "age-65 and disability totals differ",
  );
});

Deno.test("paired age-65 and disability exceptions include one sourced disability-owner rollover", () => {
  const { source } = pairedAge65Case();
  const mixed = inputSchema.parse({
    ...source,
    spouse_hsa: {
      ...source.spouse_hsa!,
      form1099_sa_distributions: [{
        tax_year: 2025,
        recipient_ssn: "987654321",
        box1_gross_distribution: 100,
        box3_distribution_code: "1",
        source_reference: "spouse-1099-before-disability",
      }, {
        tax_year: 2025,
        recipient_ssn: "987654321",
        box1_gross_distribution: 400,
        box3_distribution_code: "3",
        source_reference: "spouse-1099-after-disability",
      }],
      exception_qualified_taxable_amount: 300,
      hsa_excluded_distributions: {
        rollover: {
          amount: 50,
          distribution_date: "2025-05-01",
          contribution_date: "2025-05-30",
          distribution_source_reference: "spouse-before-disability",
          form1099_sa_source_reference: "spouse-1099-before-disability",
          contribution_source_reference: "spouse-rollover-deposit",
          same_beneficiary: true,
          receiving_hsa_no_other_rollover_in_preceding_12_months: true,
          not_direct_trustee_transfer: true,
        },
      },
      disability_exception_evidence: {
        disability_date: "2025-06-01",
        disability_source_reference: "spouse-disability-determination",
        section_72m7_disability_confirmed: true,
        distributions: [{
          distribution_date: "2025-05-01",
          gross_amount: 100,
          qualified_medical_amount: 0,
          rollover_excluded_amount: 50,
          source_reference: "spouse-before-disability",
          form1099_sa_source_reference: "spouse-1099-before-disability",
        }, {
          distribution_date: "2025-07-01",
          gross_amount: 400,
          qualified_medical_amount: 100,
          rollover_excluded_amount: 0,
          source_reference: "spouse-after-disability",
          form1099_sa_source_reference: "spouse-1099-after-disability",
        }],
      },
    },
  });
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    mixed,
  );
  const forms = result.outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Form8889Owner[];
  assertEquals(forms[0]?.print_line16_taxable, 700);
  assertEquals(forms[0]?.print_line17b_penalty, 60);
  assertEquals(forms[1]?.print_line14b_excluded_distributions, 50);
  assertEquals(forms[1]?.print_line16_taxable, 350);
  assertEquals(forms[1]?.print_line17b_penalty, 10);
  const pending = {
    form8889: { ...mixed, forms },
    schedule1: {
      line13_hsa_deduction: 4_000,
      line8f_hsa_income: 1_050,
      line10_total_additional_income: 1_050,
      line26_total_adjustments: 4_000,
    },
    schedule2: { line17c_hsa_penalty: 70 },
    f1040: {
      line8_additional_income: 1_050,
      line10_adjustments: 4_000,
      line23_other_taxes: 70,
    },
  };
  const xml = form8889.build({ forms }, { filer, pending });
  assertEquals(xml.length, 2);
  assertStringIncludes(
    xml[1],
    "<HSADistributionRolloverAmt>50</HSADistributionRolloverAmt>",
  );
  assertStringIncludes(
    xml[1],
    "<HSADistriAddnlPercentTaxAmt>10</HSADistriAddnlPercentTaxAmt>",
  );
  const pdf = form8889Pdf.instances?.({ forms }, filer, pending);
  assertEquals(pdf?.[1]?.print_line14b_excluded_distributions, 50);
  assertEquals(pdf?.[1]?.print_line17b_penalty, 10);
  const changedSource = {
    ...pending,
    form8889: {
      ...mixed,
      spouse_hsa: {
        ...mixed.spouse_hsa!,
        hsa_excluded_distributions: {
          ...mixed.spouse_hsa!.hsa_excluded_distributions!,
          rollover: {
            ...mixed.spouse_hsa!.hsa_excluded_distributions!.rollover!,
            contribution_date: "2025-07-01",
          },
        },
      },
      forms,
    },
  };
  assertThrows(
    () => form8889.build({ forms }, { filer, pending: changedSource }),
    Error,
  );
  assertThrows(
    () => form8889Pdf.instances?.({ forms }, filer, changedSource),
    Error,
  );
  assertThrows(
    () =>
      form8889.build({ forms }, {
        filer,
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line23_other_taxes: 69 },
        },
      }),
    Error,
    "age-65 and disability totals differ",
  );
});

Deno.test("paired age-65 and disability exceptions include one sourced age-owner rollover", () => {
  const { source } = pairedAge65Case();
  const mixed = inputSchema.parse({
    ...source,
    hsa_excluded_distributions: {
      rollover: {
        amount: 100,
        distribution_date: "2025-02-27",
        contribution_date: "2025-03-15",
        distribution_source_reference: "primary-before-65",
        form1099_sa_source_reference: "1099-sa-primary",
        contribution_source_reference: "primary-rollover-deposit",
        same_beneficiary: true,
        receiving_hsa_no_other_rollover_in_preceding_12_months: true,
        not_direct_trustee_transfer: true,
      },
    },
    age_65_exception_evidence: {
      ...source.age_65_exception_evidence!,
      distributions: source.age_65_exception_evidence!.distributions.map(
        (row) => ({
          ...row,
          rollover_excluded_amount: row.source_reference === "primary-before-65"
            ? 100
            : 0,
        }),
      ),
    },
    spouse_hsa: {
      ...source.spouse_hsa!,
      form1099_sa_distributions: [{
        tax_year: 2025,
        recipient_ssn: "987654321",
        box1_gross_distribution: 100,
        box3_distribution_code: "1",
        source_reference: "spouse-1099-before-disability",
      }, {
        tax_year: 2025,
        recipient_ssn: "987654321",
        box1_gross_distribution: 400,
        box3_distribution_code: "3",
        source_reference: "spouse-1099-after-disability",
      }],
      exception_qualified_taxable_amount: 300,
      disability_exception_evidence: {
        disability_date: "2025-06-01",
        disability_source_reference: "spouse-disability-determination",
        section_72m7_disability_confirmed: true,
        distributions: [{
          distribution_date: "2025-05-01",
          gross_amount: 100,
          qualified_medical_amount: 0,
          source_reference: "spouse-before-disability",
          form1099_sa_source_reference: "spouse-1099-before-disability",
        }, {
          distribution_date: "2025-07-01",
          gross_amount: 400,
          qualified_medical_amount: 100,
          source_reference: "spouse-after-disability",
          form1099_sa_source_reference: "spouse-1099-after-disability",
        }],
      },
    },
  });
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    mixed,
  );
  const forms = result.outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Form8889Owner[];
  assertEquals(forms[0]?.print_line14b_excluded_distributions, 100);
  assertEquals(forms[0]?.print_line16_taxable, 600);
  assertEquals(forms[0]?.print_line17b_penalty, 40);
  assertEquals(forms[1]?.print_line16_taxable, 400);
  assertEquals(forms[1]?.print_line17b_penalty, 20);
  const pending = {
    form8889: { ...mixed, forms },
    schedule1: {
      line13_hsa_deduction: 4_000,
      line8f_hsa_income: 1_000,
      line10_total_additional_income: 1_000,
      line26_total_adjustments: 4_000,
    },
    schedule2: { line17c_hsa_penalty: 60 },
    f1040: {
      line8_additional_income: 1_000,
      line10_adjustments: 4_000,
      line23_other_taxes: 60,
    },
  };
  const xml = form8889.build({ forms }, { filer, pending });
  assertEquals(xml.length, 2);
  assertStringIncludes(
    xml[0],
    "<HSADistributionRolloverAmt>100</HSADistributionRolloverAmt>",
  );
  assertStringIncludes(
    xml[0],
    "<HSADistriAddnlPercentTaxAmt>40</HSADistriAddnlPercentTaxAmt>",
  );
  const pdf = form8889Pdf.instances?.({ forms }, filer, pending);
  assertEquals(pdf?.[0]?.print_line14b_excluded_distributions, 100);
  assertEquals(pdf?.[0]?.print_line17b_penalty, 40);
  const changedSource = {
    ...pending,
    form8889: {
      ...mixed,
      hsa_excluded_distributions: {
        ...mixed.hsa_excluded_distributions!,
        rollover: {
          ...mixed.hsa_excluded_distributions!.rollover!,
          contribution_date: "2025-05-01",
        },
      },
      forms,
    },
  };
  assertThrows(
    () => form8889.build({ forms }, { filer, pending: changedSource }),
    Error,
  );
  assertThrows(
    () => form8889Pdf.instances?.({ forms }, filer, changedSource),
    Error,
  );
  assertThrows(
    () =>
      form8889.build({ forms }, {
        filer,
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line23_other_taxes: 59 },
        },
      }),
    Error,
    "age-65 and disability totals differ",
  );
});

Deno.test("paired age-65 and disability owners each reconcile a sourced rollover", () => {
  const { source } = pairedAge65Case();
  const primaryRollover = {
    amount: 100,
    distribution_date: "2025-02-27",
    contribution_date: "2025-03-15",
    distribution_source_reference: "primary-before-65",
    form1099_sa_source_reference: "1099-sa-primary",
    contribution_source_reference: "primary-rollover-deposit",
    same_beneficiary: true,
    receiving_hsa_no_other_rollover_in_preceding_12_months: true,
    not_direct_trustee_transfer: true,
  } as const;
  const spouseRollover = {
    amount: 50,
    distribution_date: "2025-05-01",
    contribution_date: "2025-05-30",
    distribution_source_reference: "spouse-before-disability",
    form1099_sa_source_reference: "spouse-1099-before-disability",
    contribution_source_reference: "spouse-rollover-deposit",
    same_beneficiary: true,
    receiving_hsa_no_other_rollover_in_preceding_12_months: true,
    not_direct_trustee_transfer: true,
  } as const;
  const mixed = inputSchema.parse({
    ...source,
    hsa_excluded_distributions: { rollover: primaryRollover },
    age_65_exception_evidence: {
      ...source.age_65_exception_evidence!,
      distributions: source.age_65_exception_evidence!.distributions.map(
        (row) => ({
          ...row,
          rollover_excluded_amount: row.source_reference ===
              "primary-before-65"
            ? 100
            : 0,
        }),
      ),
    },
    spouse_hsa: {
      ...source.spouse_hsa!,
      form1099_sa_distributions: [{
        tax_year: 2025,
        recipient_ssn: "987654321",
        box1_gross_distribution: 100,
        box3_distribution_code: "1",
        source_reference: "spouse-1099-before-disability",
      }, {
        tax_year: 2025,
        recipient_ssn: "987654321",
        box1_gross_distribution: 400,
        box3_distribution_code: "3",
        source_reference: "spouse-1099-after-disability",
      }],
      exception_qualified_taxable_amount: 300,
      hsa_excluded_distributions: { rollover: spouseRollover },
      disability_exception_evidence: {
        disability_date: "2025-06-01",
        disability_source_reference: "spouse-disability-determination",
        section_72m7_disability_confirmed: true,
        distributions: [{
          distribution_date: "2025-05-01",
          gross_amount: 100,
          qualified_medical_amount: 0,
          rollover_excluded_amount: 50,
          source_reference: "spouse-before-disability",
          form1099_sa_source_reference: "spouse-1099-before-disability",
        }, {
          distribution_date: "2025-07-01",
          gross_amount: 400,
          qualified_medical_amount: 100,
          rollover_excluded_amount: 0,
          source_reference: "spouse-after-disability",
          form1099_sa_source_reference: "spouse-1099-after-disability",
        }],
      },
    },
  });
  const outputs = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    mixed,
  ).outputs;
  const forms = outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Form8889Owner[];
  assertEquals(forms.map((form) => form.print_line14b_excluded_distributions), [
    100,
    50,
  ]);
  assertEquals(forms.map((form) => form.print_line16_taxable), [600, 350]);
  assertEquals(forms.map((form) => form.print_line17b_penalty), [40, 10]);
  const pending = {
    form8889: { ...mixed, forms },
    schedule1: {
      line13_hsa_deduction: 4_000,
      line8f_hsa_income: 950,
      line10_total_additional_income: 950,
      line26_total_adjustments: 4_000,
    },
    schedule2: { line17c_hsa_penalty: 50 },
    f1040: {
      line8_additional_income: 950,
      line10_adjustments: 4_000,
      line23_other_taxes: 50,
    },
  };
  const xml = form8889.build({ forms }, { filer, pending });
  assertEquals(xml.length, 2);
  assertStringIncludes(
    xml[0],
    "<HSADistributionRolloverAmt>100</HSADistributionRolloverAmt>",
  );
  assertStringIncludes(
    xml[1],
    "<HSADistributionRolloverAmt>50</HSADistributionRolloverAmt>",
  );
  const pdf = form8889Pdf.instances?.({ forms }, filer, pending);
  assertEquals(pdf?.map((form) => form.print_line14b_excluded_distributions), [
    100,
    50,
  ]);
  const changedOwner = {
    ...pending,
    form8889: {
      ...mixed,
      spouse_hsa: {
        ...mixed.spouse_hsa!,
        hsa_excluded_distributions: {
          rollover: {
            ...spouseRollover,
            contribution_source_reference: "primary-rollover-deposit",
          },
        },
      },
      forms,
    },
  };
  assertThrows(
    () => form8889.build({ forms }, { filer, pending: changedOwner }),
    Error,
  );
  assertThrows(
    () => form8889Pdf.instances?.({ forms }, filer, changedOwner),
    Error,
  );
  const changedTax = {
    ...pending,
    f1040: { ...pending.f1040, line23_other_taxes: 49 },
  };
  assertThrows(
    () => form8889.build({ forms }, { filer, pending: changedTax }),
    Error,
  );
  assertThrows(
    () => form8889Pdf.instances?.({ forms }, filer, changedTax),
    Error,
  );
});

Deno.test("paired age-65 evidence and return totals fail closed when altered", () => {
  const { source, forms, pending, context } = pairedAge65Case();
  const wrongFormReference = {
    ...source,
    age_65_exception_evidence: {
      ...source.age_65_exception_evidence!,
      distributions: source.age_65_exception_evidence!.distributions.map(
        (row) => ({
          ...row,
          form1099_sa_source_reference: "1099-sa-spouse",
        }),
      ),
    },
    forms,
  };
  assertThrows(
    () =>
      form8889.build({ forms }, {
        ...context,
        pending: { ...pending, form8889: wrongFormReference },
      }),
    Error,
    "age-65 exception does not reconcile",
  );
  assertThrows(
    () =>
      form8889Pdf.instances?.(
        { forms },
        filer,
        { ...pending, form8889: wrongFormReference },
      ),
    Error,
    "age-65 exception does not reconcile",
  );
  assertThrows(
    () =>
      form8889.build({ forms }, {
        ...context,
        pending: {
          ...pending,
          form8889: {
            ...source,
            age_65_exception_evidence: {
              ...source.age_65_exception_evidence!,
              distributions: source.age_65_exception_evidence!.distributions
                .map(
                  (row) => ({ ...row, distribution_date: "2025-02-27" }),
                ),
            },
            forms,
          },
        },
      }),
    Error,
    "age-65 exception does not reconcile",
  );
  assertThrows(
    () =>
      form8889.build({ forms }, {
        ...context,
        pending: {
          ...pending,
          form8889: {
            ...source,
            spouse_hsa: {
              ...source.spouse_hsa!,
              age_65_exception_evidence: {
                date_of_birth: "1960-01-01",
                birth_date_source_reference: "spouse-birth-record",
                distributions: [{
                  distribution_date: "2025-09-01",
                  gross_amount: 500,
                  qualified_medical_amount: 100,
                  source_reference: "primary-after-65",
                  form1099_sa_source_reference: "1099-sa-spouse",
                }],
              },
              exception_qualified_taxable_amount: 400,
            },
            forms,
          },
        },
      }),
    Error,
    "cannot reuse",
  );
  assertThrows(
    () =>
      form8889.build({ forms }, {
        ...context,
        pending: {
          ...pending,
          schedule2: { line17c_hsa_penalty: 139 },
        },
      }),
    Error,
    "owner totals differ",
  );
  assertThrows(
    () =>
      form8889Pdf.instances?.(
        { forms: [{ ...forms[0], print_line17b_penalty: 0 }, forms[1]!] },
        filer,
        pending,
      ),
    Error,
    "printed lines differ",
  );
});
