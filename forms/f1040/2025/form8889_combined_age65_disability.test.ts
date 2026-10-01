import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "./mef/header.ts";
import {
  form8889 as form8889Node,
  inputSchema,
} from "../nodes/intermediate/forms/form8889/index.ts";
import { form8889 } from "./mef/forms/f8889.ts";
import { form8889Pdf } from "./pdf/forms/f8889.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

function combinedCase() {
  const source = inputSchema.parse({
    beneficiary_identity: {
      owner: "T",
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    hsa_distributions: 1200,
    form1099_sa_distributions: [
      {
        tax_year: 2025,
        recipient_ssn: "123456789",
        box1_gross_distribution: 300,
        box3_distribution_code: "1",
        source_reference: "jan-1099-sa",
      },
      {
        tax_year: 2025,
        recipient_ssn: "123456789",
        box1_gross_distribution: 400,
        box3_distribution_code: "1",
        source_reference: "may-1099-sa",
      },
      {
        tax_year: 2025,
        recipient_ssn: "123456789",
        box1_gross_distribution: 500,
        box3_distribution_code: "3",
        source_reference: "aug-1099-sa",
      },
    ],
    qualified_medical_expenses: 200,
    qualified_medical_expense_evidence: [{
      amount: 200,
      source_reference: "may-medical-receipt",
      incurred_after_hsa_established: true,
      not_reimbursed_by_other_coverage: true,
      eligible_person: "owner",
    }],
    exception_qualified_taxable_amount: 700,
    age_65_exception_evidence: {
      date_of_birth: "1960-04-01",
      birth_date_source_reference: "beneficiary-birth-record",
      distributions: [{
        distribution_date: "2025-01-10",
        gross_amount: 300,
        qualified_medical_amount: 0,
        source_reference: "jan-transaction",
        form1099_sa_source_reference: "jan-1099-sa",
      }, {
        distribution_date: "2025-05-10",
        gross_amount: 400,
        qualified_medical_amount: 200,
        source_reference: "may-transaction",
        form1099_sa_source_reference: "may-1099-sa",
      }],
    },
    disability_exception_evidence: {
      disability_date: "2025-07-01",
      disability_source_reference: "disability-determination",
      section_72m7_disability_confirmed: true,
      distributions: [{
        distribution_date: "2025-08-10",
        gross_amount: 500,
        qualified_medical_amount: 0,
        source_reference: "aug-transaction",
        form1099_sa_source_reference: "aug-1099-sa",
      }],
    },
  });
  return filingCase(source);
}

function disabilityFirstCase() {
  const original = combinedCase().source;
  const source = inputSchema.parse({
    ...original,
    form1099_sa_distributions: original.form1099_sa_distributions!.map((row) =>
      row.source_reference === "may-1099-sa"
        ? { ...row, box3_distribution_code: "3" }
        : { ...row, box3_distribution_code: "1" }
    ),
    age_65_exception_evidence: {
      ...original.age_65_exception_evidence!,
      date_of_birth: "1960-07-01",
      distributions: [
        original.age_65_exception_evidence!.distributions[0],
        original.disability_exception_evidence!.distributions[0],
      ],
    },
    disability_exception_evidence: {
      ...original.disability_exception_evidence!,
      disability_date: "2025-03-01",
      distributions: [original.age_65_exception_evidence!.distributions[1]],
    },
  });
  return filingCase(source);
}

function filingCase(source: ReturnType<typeof inputSchema.parse>) {
  const outputs = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const forms = outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Extract<
      Parameters<typeof form8889.build>[0],
      { forms: unknown }
    >["forms"];
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line8f_hsa_income: 1000,
      line10_total_additional_income: 1000,
      line26_total_adjustments: 0,
    },
    schedule2: { line17c_hsa_penalty: 60 },
    f1040: { line8_additional_income: 1000, line10_adjustments: 0 },
  };
  return { source, forms, pending };
}

Deno.test("one HSA owner combines age-65 and disability dated exceptions in MeF and PDF", () => {
  const { forms, pending } = combinedCase();
  assertEquals(forms[0]?.print_line16_taxable, 1000);
  assertEquals(forms[0]?.print_line17b_penalty, 60);
  const xml = form8889.build({ forms }, { filer, pending }).join("");
  assertStringIncludes(
    xml,
    "<TaxableHSADistributionAmt>1000</TaxableHSADistributionAmt>",
  );
  assertStringIncludes(
    xml,
    "<HSADistriAddnlPercentTaxExcInd>X</HSADistriAddnlPercentTaxExcInd>",
  );
  assertStringIncludes(
    xml,
    "<HSADistriAddnlPercentTaxAmt>60</HSADistriAddnlPercentTaxAmt>",
  );
  const [pdf] = form8889Pdf.instances!(pending.form8889, filer, pending);
  assertEquals(pdf?.print_line16_taxable, 1000);
  assertEquals(pdf?.print_line17a_exception, true);
  assertEquals(pdf?.print_line17b_penalty, 60);
});

Deno.test("combined HSA exception rejects changed owner source, dates, 1099-SA and return totals", () => {
  const { source, forms, pending } = combinedCase();
  assertThrows(
    () => form8889.build({ forms }, { filer }),
    Error,
    "needs dated owner source",
  );
  assertThrows(
    () => form8889Pdf.instances!({ forms }, filer),
    Error,
    "needs dated owner source",
  );
  assertThrows(
    () =>
      form8889.build({ forms }, {
        filer,
        pending: {
          ...pending,
          form8889: {
            ...source,
            disability_exception_evidence: {
              ...source.disability_exception_evidence!,
              disability_date: "2025-09-01",
            },
            forms,
          },
        },
      }),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () =>
      form8889Pdf.instances!(pending.form8889, filer, {
        ...pending,
        form8889: {
          ...source,
          form1099_sa_distributions: source.form1099_sa_distributions!.map((
            row,
          ) =>
            row.source_reference === "aug-1099-sa"
              ? { ...row, box3_distribution_code: "1" as const }
              : row
          ),
          forms,
        },
      }),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () =>
      form8889.build({ forms }, {
        filer,
        pending: { ...pending, schedule2: { line17c_hsa_penalty: 0 } },
      }),
    Error,
    "amounts differ from filed return",
  );
});

Deno.test("one HSA owner has disability before age 65 with separate code-3 and later code-1 sources", () => {
  const { forms, pending } = disabilityFirstCase();
  assertEquals(forms[0]?.print_line16_taxable, 1000);
  assertEquals(forms[0]?.print_line17b_penalty, 60);
  const xml = form8889.build({ forms }, { filer, pending }).join("");
  assertStringIncludes(
    xml,
    "<HSADistriAddnlPercentTaxExcInd>X</HSADistriAddnlPercentTaxExcInd>",
  );
  assertStringIncludes(
    xml,
    "<HSADistriAddnlPercentTaxAmt>60</HSADistriAddnlPercentTaxAmt>",
  );
  const [pdf] = form8889Pdf.instances!(pending.form8889, filer, pending);
  assertEquals(pdf?.print_line16_taxable, 1000);
  assertEquals(pdf?.print_line17b_penalty, 60);
});

Deno.test("disability-before-age-65 allocation rejects interval and return tampering", () => {
  const { source, forms, pending } = disabilityFirstCase();
  assertThrows(
    () =>
      form8889.build({ forms }, {
        filer,
        pending: {
          ...pending,
          form8889: {
            ...source,
            disability_exception_evidence: {
              ...source.disability_exception_evidence!,
              disability_date: "2025-06-01",
            },
            forms,
          },
        },
      }),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () =>
      form8889Pdf.instances!(pending.form8889, filer, {
        ...pending,
        form8889: {
          ...source,
          form1099_sa_distributions: source.form1099_sa_distributions!.map((
            row,
          ) =>
            row.source_reference === "may-1099-sa"
              ? { ...row, box3_distribution_code: "1" as const }
              : row
          ),
          forms,
        },
      }),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () =>
      form8889.build({ forms }, {
        filer,
        pending: { ...pending, schedule2: { line17c_hsa_penalty: 0 } },
      }),
    Error,
    "amounts differ from filed return",
  );
});
