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

function pairedDisabilityCase() {
  const source = inputSchema.parse({
    beneficiary_identity: {
      owner: "T",
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
    age_55_or_older: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    last_month_rule_elected: false,
    taxpayer_hsa_contributions: 2_000,
    hsa_distributions: 1_000,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "123456789",
      box1_gross_distribution: 400,
      box3_distribution_code: "1",
      source_reference: "1099-sa-before-disability",
    }, {
      tax_year: 2025,
      recipient_ssn: "123456789",
      box1_gross_distribution: 600,
      box3_distribution_code: "3",
      source_reference: "1099-sa-after-disability",
    }],
    qualified_medical_expenses: 300,
    qualified_medical_expense_evidence: [{
      amount: 300,
      source_reference: "medical-receipt",
      incurred_after_hsa_established: true,
      not_reimbursed_by_other_coverage: true,
      eligible_person: "owner",
    }],
    exception_qualified_taxable_amount: 400,
    disability_exception_evidence: {
      disability_date: "2025-06-01",
      disability_source_reference: "disability-determination",
      section_72m7_disability_confirmed: true,
      distributions: [{
        distribution_date: "2025-05-01",
        gross_amount: 400,
        qualified_medical_amount: 100,
        source_reference: "hsa-transaction-before",
        form1099_sa_source_reference: "1099-sa-before-disability",
      }, {
        distribution_date: "2025-07-01",
        gross_amount: 600,
        qualified_medical_amount: 200,
        source_reference: "hsa-transaction-after",
        form1099_sa_source_reference: "1099-sa-after-disability",
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
      line8f_hsa_income: 700,
      line26_total_adjustments: 4_000,
    },
    schedule2: { line17c_hsa_penalty: 60 },
    f1040: { line10_adjustments: 4_000 },
  };
  const context: MefBuildContext = { filer, pending };
  return { source, forms, pending, context };
}

Deno.test("paired Form 8889 reconciles disability exception by dated 1099-SA transactions", () => {
  const { forms, pending, context } = pairedDisabilityCase();
  assertEquals(forms[0]?.print_line16_taxable, 700);
  assertEquals(forms[0]?.print_line17a_exception, true);
  assertEquals(forms[0]?.print_line17b_penalty, 60);
  const xml = form8889.build({ forms }, context);
  assertStringIncludes(
    xml[0],
    "<HSADistriAddnlPercentTaxExcInd>X</HSADistriAddnlPercentTaxExcInd>",
  );
  assertStringIncludes(
    xml[0],
    "<HSADistriAddnlPercentTaxAmt>60</HSADistriAddnlPercentTaxAmt>",
  );
  const pdf = form8889Pdf.instances?.({ forms }, filer, pending);
  assertEquals(pdf?.[0]?.print_line17a_exception, true);
  assertEquals(pdf?.[0]?.print_line17b_penalty, 60);
});

Deno.test("disability exception rejects unsourced code 3 and misallocated transactions", () => {
  const { source, forms, context } = pairedDisabilityCase();
  assertThrows(
    () =>
      form8889Node.compute(
        { taxYear: 2025, formType: "f1040" },
        { ...source, disability_exception_evidence: undefined },
      ),
    Error,
    "disability code needs dated disability evidence",
  );
  assertThrows(
    () =>
      form8889.build({ forms }, {
        ...context,
        pending: {
          ...context.pending,
          form8889: {
            ...source,
            disability_exception_evidence: {
              ...source.disability_exception_evidence!,
              distributions: source.disability_exception_evidence!
                .distributions.map((row) => ({
                  ...row,
                  form1099_sa_source_reference: "1099-sa-after-disability",
                })),
            },
            forms,
          },
        },
      }),
    Error,
    "disability exception does not reconcile",
  );
});

Deno.test("paired disability exception allocates a code-1 rollover before disability", () => {
  const { source } = pairedDisabilityCase();
  const allocated = inputSchema.parse({
    ...source,
    exception_qualified_taxable_amount: 400,
    hsa_excluded_distributions: {
      rollover: {
        amount: 200,
        distribution_date: "2025-05-01",
        contribution_date: "2025-05-30",
        distribution_source_reference: "hsa-transaction-before",
        form1099_sa_source_reference: "1099-sa-before-disability",
        contribution_source_reference: "receiving-hsa-deposit",
        same_beneficiary: true,
        receiving_hsa_no_other_rollover_in_preceding_12_months: true,
        not_direct_trustee_transfer: true,
      },
    },
    disability_exception_evidence: {
      ...source.disability_exception_evidence,
      distributions: source.disability_exception_evidence!.distributions.map(
        (row) => ({
          ...row,
          rollover_excluded_amount: row.source_reference ===
              "hsa-transaction-before"
            ? 200
            : 0,
        }),
      ),
    },
  });
  const result = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    allocated,
  );
  const forms = result.outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Form8889Owner[];
  assertEquals(forms[0]?.print_line14b_excluded_distributions, 200);
  assertEquals(forms[0]?.print_line16_taxable, 500);
  assertEquals(forms[0]?.print_line17a_exception, true);
  assertEquals(forms[0]?.print_line17b_penalty, 20);
  const pending = {
    form8889: { ...allocated, forms },
    schedule1: {
      line13_hsa_deduction: 4_000,
      line8f_hsa_income: 500,
      line26_total_adjustments: 4_000,
    },
    schedule2: { line17c_hsa_penalty: 20 },
    f1040: { line10_adjustments: 4_000 },
  };
  const xml = form8889.build({ forms }, { filer, pending });
  assertStringIncludes(xml[0], "<HSADistributionRolloverAmt>200</HSADistributionRolloverAmt>");
  assertStringIncludes(xml[0], "<HSADistriAddnlPercentTaxAmt>20</HSADistriAddnlPercentTaxAmt>");
  const pdf = form8889Pdf.instances?.({ forms }, filer, pending);
  assertEquals(pdf?.[0]?.print_line14b_excluded_distributions, 200);
  assertEquals(pdf?.[0]?.print_line16_taxable, 500);
  assertEquals(pdf?.[0]?.print_line17b_penalty, 20);

  const mismatched = {
    ...allocated,
    disability_exception_evidence: {
      ...allocated.disability_exception_evidence!,
      distributions: allocated.disability_exception_evidence!.distributions.map(
        (row) => ({
          ...row,
          rollover_excluded_amount: row.source_reference ===
              "hsa-transaction-before"
            ? 199
            : 1,
        }),
      ),
    },
  };
  assertThrows(
    () => form8889Node.compute({ taxYear: 2025, formType: "f1040" }, mismatched),
    Error,
    "disability rollover needs one dated transaction",
  );
  assertThrows(
    () => form8889.build({ forms }, {
      filer,
      pending: { ...pending, form8889: { ...mismatched, forms } },
    }),
    Error,
  );
  assertThrows(
    () => form8889Pdf.instances?.({ forms }, filer, {
      ...pending,
      form8889: { ...mismatched, forms },
    }),
    Error,
  );
});
