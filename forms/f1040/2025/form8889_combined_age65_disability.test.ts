import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
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
      row.source_reference === "jan-1099-sa"
        ? { ...row, box3_distribution_code: "1" }
        : { ...row, box3_distribution_code: "3" }
    ),
    age_65_exception_evidence: {
      ...original.age_65_exception_evidence!,
      date_of_birth: "1960-07-01",
      distributions: [original.age_65_exception_evidence!.distributions[0]],
    },
    disability_exception_evidence: {
      ...original.disability_exception_evidence!,
      disability_date: "2025-03-01",
      distributions: [
        original.age_65_exception_evidence!.distributions[1],
        original.disability_exception_evidence!.distributions[0],
      ],
    },
  });
  return filingCase(source);
}

function combinedRolloverCase() {
  const original = combinedCase().source;
  const source = inputSchema.parse({
    ...original,
    exception_qualified_taxable_amount: 550,
    hsa_excluded_distributions: {
      rollover: {
        amount: 150,
        distribution_date: "2025-05-10",
        contribution_date: "2025-06-01",
        distribution_source_reference: "may-transaction",
        form1099_sa_source_reference: "may-1099-sa",
        contribution_source_reference: "receiving-hsa-deposit",
        same_beneficiary: true,
        receiving_hsa_no_other_rollover_in_preceding_12_months: true,
        not_direct_trustee_transfer: true,
      },
    },
    age_65_exception_evidence: {
      ...original.age_65_exception_evidence!,
      distributions: original.age_65_exception_evidence!.distributions.map((
        row,
      ) => ({
        ...row,
        rollover_excluded_amount: row.source_reference === "may-transaction"
          ? 150
          : 0,
      })),
    },
    disability_exception_evidence: {
      ...original.disability_exception_evidence!,
      distributions: original.disability_exception_evidence!.distributions.map(
        (row) => ({ ...row, rollover_excluded_amount: 0 }),
      ),
    },
  });
  return filingCase(source, 850, 60);
}

function disabilityFirstRolloverCase() {
  const original = disabilityFirstCase().source;
  const source = inputSchema.parse({
    ...original,
    hsa_excluded_distributions: {
      rollover: {
        amount: 150,
        distribution_date: "2025-01-10",
        contribution_date: "2025-02-01",
        distribution_source_reference: "jan-transaction",
        form1099_sa_source_reference: "jan-1099-sa",
        contribution_source_reference: "january-redeposit",
        same_beneficiary: true,
        receiving_hsa_no_other_rollover_in_preceding_12_months: true,
        not_direct_trustee_transfer: true,
      },
    },
    age_65_exception_evidence: {
      ...original.age_65_exception_evidence!,
      distributions: original.age_65_exception_evidence!.distributions.map((
        row,
      ) => ({
        ...row,
        rollover_excluded_amount: row.source_reference === "jan-transaction"
          ? 150
          : 0,
      })),
    },
    disability_exception_evidence: {
      ...original.disability_exception_evidence!,
      distributions: original.disability_exception_evidence!.distributions.map(
        (row) => ({ ...row, rollover_excluded_amount: 0 }),
      ),
    },
  });
  return filingCase(source, 850, 30);
}

function filingCase(
  source: ReturnType<typeof inputSchema.parse>,
  income = 1000,
  penalty = 60,
) {
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
      line8f_hsa_income: income,
      line10_total_additional_income: income,
      line26_total_adjustments: 0,
    },
    schedule2: { line17c_hsa_penalty: penalty },
    f1040: {
      line8_additional_income: income,
      line10_adjustments: 0,
      line23_other_taxes: penalty,
    },
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
    "amounts differ from filed return",
  );
});

Deno.test("one HSA owner has disability before age 65 with code-3 sources through age 65", () => {
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

Deno.test("combined age-65 and disability exception allocates one dated HSA rollover", () => {
  const { forms, pending } = combinedRolloverCase();
  assertEquals(forms[0]?.print_line14b_excluded_distributions, 150);
  assertEquals(forms[0]?.print_line16_taxable, 850);
  assertEquals(forms[0]?.print_line17b_penalty, 60);
  const xml = form8889.build({ forms }, { filer, pending }).join("");
  assertStringIncludes(
    xml,
    "<HSADistributionRolloverAmt>150</HSADistributionRolloverAmt>",
  );
  assertStringIncludes(
    xml,
    "<TaxableHSADistributionAmt>850</TaxableHSADistributionAmt>",
  );
  assertStringIncludes(
    xml,
    "<HSADistriAddnlPercentTaxAmt>60</HSADistriAddnlPercentTaxAmt>",
  );
  const [pdf] = form8889Pdf.instances!(pending.form8889, filer, pending);
  assertEquals(pdf?.print_line14b_excluded_distributions, 150);
  assertEquals(pdf?.print_line16_taxable, 850);
  assertEquals(pdf?.print_line17b_penalty, 60);
});

Deno.test("combined exception rollover rejects changed source, allocation and return", () => {
  const { source, forms, pending } = combinedRolloverCase();
  assertThrows(
    () =>
      form8889.build({ forms }, {
        filer,
        pending: {
          ...pending,
          form8889: {
            ...source,
            hsa_excluded_distributions: {
              rollover: {
                ...source.hsa_excluded_distributions!.rollover!,
                distribution_source_reference: "other-transaction",
              },
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
          age_65_exception_evidence: {
            ...source.age_65_exception_evidence!,
            distributions: source.age_65_exception_evidence!.distributions.map((
              row,
            ) =>
              row.source_reference === "may-transaction"
                ? { ...row, rollover_excluded_amount: 149 }
                : row
            ),
          },
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
        pending: {
          ...pending,
          schedule1: {
            ...pending.schedule1,
            line8f_hsa_income: 1000,
          },
        },
      }),
    Error,
    "amounts differ from filed return",
  );
});

Deno.test("disability-before-age-65 owner allocates one pre-disability HSA rollover", () => {
  const { forms, pending } = disabilityFirstRolloverCase();
  assertEquals(forms[0]?.print_line14b_excluded_distributions, 150);
  assertEquals(forms[0]?.print_line16_taxable, 850);
  assertEquals(forms[0]?.print_line17a_exception, true);
  assertEquals(forms[0]?.print_line17b_penalty, 30);
  const xml = form8889.build({ forms }, { filer, pending }).join("");
  assertStringIncludes(
    xml,
    "<HSADistributionRolloverAmt>150</HSADistributionRolloverAmt>",
  );
  assertStringIncludes(
    xml,
    "<TaxableHSADistributionAmt>850</TaxableHSADistributionAmt>",
  );
  assertStringIncludes(
    xml,
    "<HSADistriAddnlPercentTaxAmt>30</HSADistriAddnlPercentTaxAmt>",
  );
  const [pdf] = form8889Pdf.instances!(pending.form8889, filer, pending);
  assertEquals(pdf?.print_line14b_excluded_distributions, 150);
  assertEquals(pdf?.print_line16_taxable, 850);
  assertEquals(pdf?.print_line17b_penalty, 30);
});

Deno.test("disability-first rollover rejects changed date, allocation and Form 1040 tax", () => {
  const { source, forms, pending } = disabilityFirstRolloverCase();
  assertThrows(
    () =>
      form8889.build({ forms }, {
        filer,
        pending: {
          ...pending,
          form8889: {
            ...source,
            hsa_excluded_distributions: {
              rollover: {
                ...source.hsa_excluded_distributions!.rollover!,
                distribution_date: "2025-01-11",
              },
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
          age_65_exception_evidence: {
            ...source.age_65_exception_evidence!,
            distributions: source.age_65_exception_evidence!.distributions.map((
              row,
            ) =>
              row.source_reference === "jan-transaction"
                ? { ...row, rollover_excluded_amount: 149 }
                : row
            ),
          },
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
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line23_other_taxes: 31 },
        },
      }),
    Error,
    "amounts differ from filed return",
  );
});
