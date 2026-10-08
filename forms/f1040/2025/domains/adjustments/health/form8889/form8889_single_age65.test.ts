import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import {
  form8889 as form8889Node,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/adjustments/health/form8889/index.ts";
import { form8889 } from "../../../../mef/forms/adjustments/health/f8889.ts";
import { form8889Pdf } from "../../../../pdf/forms/adjustments/health/f8889.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

function age65Case() {
  const source = inputSchema.parse({
    beneficiary_identity: {
      owner: "T",
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    hsa_distributions: 900,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "123456789",
      box1_gross_distribution: 400,
      box3_distribution_code: "1",
      source_reference: "january-1099-sa",
    }, {
      tax_year: 2025,
      recipient_ssn: "123456789",
      box1_gross_distribution: 500,
      box3_distribution_code: "1",
      source_reference: "may-1099-sa",
    }],
    exception_qualified_taxable_amount: 500,
    age_65_exception_evidence: {
      date_of_birth: "1960-04-01",
      birth_date_source_reference: "beneficiary-birth-record",
      distributions: [{
        distribution_date: "2025-01-10",
        gross_amount: 400,
        qualified_medical_amount: 0,
        source_reference: "january-trustee-transaction",
        form1099_sa_source_reference: "january-1099-sa",
      }, {
        distribution_date: "2025-05-10",
        gross_amount: 500,
        qualified_medical_amount: 0,
        source_reference: "may-trustee-transaction",
        form1099_sa_source_reference: "may-1099-sa",
      }],
    },
  });
  const outputs = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const forms = outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Extract<
      Parameters<typeof form8889.build>[0], { forms: unknown }
    >["forms"];
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line8f_hsa_income: 900,
      line10_total_additional_income: 900,
      line26_total_adjustments: 0,
    },
    schedule2: { line17c_hsa_penalty: 80 },
    f1040: { line8_additional_income: 900, line10_adjustments: 0 },
  };
  return { source, forms, pending };
}

Deno.test("single-owner age-65 exception reconciles two 1099-SA sources in MeF and PDF", () => {
  const { forms, pending } = age65Case();
  const xml = form8889.build({ forms }, { filer, pending }).join("");
  assertStringIncludes(xml, "<TaxableHSADistributionAmt>900</TaxableHSADistributionAmt>");
  assertStringIncludes(xml, "<HSADistriAddnlPercentTaxExcInd>X</HSADistriAddnlPercentTaxExcInd>");
  assertStringIncludes(xml, "<HSADistriAddnlPercentTaxAmt>80</HSADistriAddnlPercentTaxAmt>");
  const [pdf] = form8889Pdf.instances!(pending.form8889, filer, pending);
  assertEquals(pdf?.print_line17a_exception, true);
  assertEquals(pdf?.print_line17b_penalty, 80);
});

Deno.test("single-owner age-65 exception rejects unsourced and altered owner or 1099-SA evidence", () => {
  const { source, forms, pending } = age65Case();
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
    () => form8889.build({ forms }, {
      filer,
      pending: {
        ...pending,
        form8889: {
          ...source,
          form1099_sa_distributions: [{
            ...source.form1099_sa_distributions![0],
            box1_gross_distribution: 500,
          }, source.form1099_sa_distributions![1]],
          forms,
        },
      },
    }),
    Error,
    "Form 1099-SA",
  );
  assertThrows(
    () => form8889Pdf.instances!(pending.form8889, {
      ...filer,
      primarySSN: "987654321",
    }, pending),
    Error,
    "source differs from filer owner",
  );
  assertThrows(
    () => form8889.build({ forms }, {
      filer,
      pending: {
        ...pending,
        schedule2: { line17c_hsa_penalty: 0 },
      },
    }),
    Error,
    "amounts differ from filed return",
  );
});
