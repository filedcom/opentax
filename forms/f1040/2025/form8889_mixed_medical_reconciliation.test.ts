import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "./mef/header.ts";
import {
  form8889 as calculator,
  inputSchema,
} from "../nodes/intermediate/forms/form8889/index.ts";
import { form8889 as native } from "./mef/forms/f8889.ts";
import { form8889Pdf } from "./pdf/forms/f8889.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

function mixedCase() {
  const source = inputSchema.parse({
    beneficiary_identity: {
      owner: "T",
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill("self_only"),
    taxpayer_hsa_contributions: 2_000,
    hsa_distributions: 1_000,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "123456789",
      box1_gross_distribution: 1_000,
      box3_distribution_code: "1",
      source_reference: "issued-1099-sa-owner",
    }],
    qualified_medical_expenses: 600,
    qualified_medical_expense_evidence: [{
      amount: 600,
      source_reference: "reviewed-medical-receipt",
      incurred_after_hsa_established: true,
      not_reimbursed_by_other_coverage: true,
      eligible_person: "owner",
    }],
    exception_qualified_taxable_amount: 0,
  });
  const outputs = calculator.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const forms = outputs.find((row) => row.nodeType === "form8889")
    ?.fields.forms as Extract<
      Parameters<typeof native.build>[0],
      { forms: unknown }
    >["forms"];
  const pending = {
    form8889: { ...source, forms },
    schedule1: {
      line13_hsa_deduction: 2_000,
      line8f_hsa_income: 400,
      line10_total_additional_income: 400,
      line26_total_adjustments: 2_000,
    },
    schedule2: { line17c_hsa_penalty: 80 },
    f1040: {
      line8_additional_income: 400,
      line10_adjustments: 2_000,
      line23_other_taxes: 80,
    },
  };
  return { source, forms, pending };
}

Deno.test("single primary HSA contribution and partly medical distribution replays to native and PDF", () => {
  const { forms, pending } = mixedCase();
  assertEquals(forms[0]?.print_line13_deduction, 2_000);
  assertEquals(forms[0]?.print_line15_qualified, 600);
  assertEquals(forms[0]?.print_line16_taxable, 400);
  assertEquals(forms[0]?.print_line17b_penalty, 80);
  const xml = native.build({ forms }, { filer, pending }).join("");
  assertStringIncludes(
    xml,
    "<TotalHSADeductionAmt>2000</TotalHSADeductionAmt>",
  );
  assertStringIncludes(
    xml,
    "<TaxableHSADistributionAmt>400</TaxableHSADistributionAmt>",
  );
  assertStringIncludes(
    xml,
    "<HSADistriAddnlPercentTaxAmt>80</HSADistriAddnlPercentTaxAmt>",
  );
  const [printed] = form8889Pdf.instances!(pending.form8889, filer, pending);
  assertEquals(printed?.print_line15_qualified, 600);
  assertEquals(printed?.print_line16_taxable, 400);
});

Deno.test("single primary mixed HSA source, printed lines, and return tamper reject", () => {
  const { forms, pending } = mixedCase();
  const altered = [
    {
      ...pending,
      form8889: {
        ...pending.form8889,
        qualified_medical_expense_evidence: [{
          ...pending.form8889.qualified_medical_expense_evidence![0],
          amount: 650,
        }],
      },
    },
    {
      ...pending,
      form8889: {
        ...pending.form8889,
        form1099_sa_distributions: [{
          ...pending.form8889.form1099_sa_distributions![0],
          box1_gross_distribution: 900,
        }],
      },
    },
    { ...pending, schedule1: { ...pending.schedule1, line8f_hsa_income: 300 } },
    { ...pending, schedule2: { line17c_hsa_penalty: 70 } },
    { ...pending, f1040: { ...pending.f1040, line23_other_taxes: 70 } },
  ];
  for (const changed of altered) {
    assertThrows(
      () => native.build({ forms }, { filer, pending: changed }),
      Error,
    );
    assertThrows(
      () => form8889Pdf.instances!(changed.form8889, filer, changed),
      Error,
    );
  }
  const wrongOwner = {
    ...pending,
    form8889: {
      ...pending.form8889,
      forms: [{ ...forms[0], owner: "spouse" as const }],
    },
  };
  assertThrows(
    () =>
      native.build({ forms: wrongOwner.form8889.forms }, {
        filer,
        pending: wrongOwner,
      }),
    Error,
  );
  assertThrows(
    () => form8889Pdf.instances!(wrongOwner.form8889, filer, wrongOwner),
    Error,
  );
  assertThrows(
    () => native.build({ forms }, { filer }),
    Error,
    "mixed medical distribution needs owner source",
  );
});
