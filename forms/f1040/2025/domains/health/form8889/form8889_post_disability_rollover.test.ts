import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  form8889 as form8889Node,
  inputSchema,
} from "../../../../nodes/intermediate/forms/form8889/index.ts";
import { f1040_2025 } from "../../../index.ts";
import { form8889 } from "../../../mef/forms/health/f8889.ts";
import { form8889Pdf } from "../../../pdf/forms/health/f8889.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;

function source() {
  return inputSchema.parse({
    beneficiary_identity: {
      owner: "T",
      name: "Alex Example",
      ssn: "111223333",
    },
    hsa_distributions: 1_000,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "111223333",
      box1_gross_distribution: 400,
      box3_distribution_code: "1",
      source_reference: "pre-disability-1099-sa",
    }, {
      tax_year: 2025,
      recipient_ssn: "111223333",
      box1_gross_distribution: 600,
      box3_distribution_code: "3",
      source_reference: "post-disability-1099-sa",
    }],
    hsa_excluded_distributions: {
      rollover: {
        amount: 200,
        distribution_date: "2025-07-10",
        contribution_date: "2025-07-25",
        distribution_source_reference: "post-disability-transaction",
        form1099_sa_source_reference: "post-disability-1099-sa",
        contribution_source_reference: "receiving-hsa-rollover",
        same_beneficiary: true,
        receiving_hsa_no_other_rollover_in_preceding_12_months: true,
        not_direct_trustee_transfer: true,
      },
    },
    qualified_medical_expenses: 100,
    qualified_medical_expense_evidence: [{
      amount: 100,
      source_reference: "pre-disability-medical-receipt",
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
        distribution_date: "2025-05-10",
        gross_amount: 400,
        qualified_medical_amount: 100,
        rollover_excluded_amount: 0,
        source_reference: "pre-disability-transaction",
        form1099_sa_source_reference: "pre-disability-1099-sa",
      }, {
        distribution_date: "2025-07-10",
        gross_amount: 600,
        qualified_medical_amount: 0,
        rollover_excluded_amount: 200,
        source_reference: "post-disability-transaction",
        form1099_sa_source_reference: "post-disability-1099-sa",
      }],
    },
  });
}

Deno.test("one owner post-disability code-3 rollover reconciles Form 8889 and the final return", async () => {
  const hsa = source();
  const result = f1040_2025.executeReturn({ ...base.inputs, form8889: hsa });
  assertEquals(result.diagnostics, []);
  const forms = result.pending.form8889.forms as Extract<
    Parameters<typeof form8889.build>[0],
    { forms: unknown }
  >["forms"];
  assertEquals(forms.length, 1);
  assertEquals(forms[0].print_line14a_distributions, 1_000);
  assertEquals(forms[0].print_line14b_excluded_distributions, 200);
  assertEquals(forms[0].print_line15_qualified, 100);
  assertEquals(forms[0].print_line16_taxable, 700);
  assertEquals(forms[0].print_line17b_penalty, 60);
  assertEquals(result.pending.schedule1.line8f_hsa_income, 700);
  assertEquals(result.pending.schedule2.line17c_hsa_penalty, 60);
  assertEquals(result.pending.f1040.line8_additional_income, 700);
  assertEquals(result.pending.f1040.line23_other_taxes, 60);
  const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
  assertStringIncludes(
    prepared.bundle.xml,
    "<HSADistributionRolloverAmt>200</HSADistributionRolloverAmt>",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<HSADistriAddnlPercentTaxAmt>60</HSADistriAddnlPercentTaxAmt>",
  );
  const [pdf] = form8889Pdf.instances!(
    result.pending.form8889,
    base.filer,
    result.pending,
  );
  assertEquals(pdf.print_line14b_excluded_distributions, 200);
  assertEquals(pdf.print_line16_taxable, 700);
  assertEquals(pdf.print_line17b_penalty, 60);
  await assertRejects(() =>
    f1040_2025.prepareReturn({
      ...result.pending,
      f1040: { ...result.pending.f1040, line23_other_taxes: 0 },
    }, base.filer)
  );
});

Deno.test("post-disability rollover rejects pre-disability code 3, paired owner, and altered allocation", () => {
  const original = source();
  const calculate = (raw: unknown) =>
    form8889Node.compute(
      { taxYear: 2025, formType: "f1040" },
      inputSchema.parse(raw),
    );
  assertThrows(() =>
    calculate({
      ...original,
      disability_exception_evidence: {
        ...original.disability_exception_evidence!,
        disability_date: "2025-08-01",
      },
    })
  );
  assertThrows(() => calculate({ ...original, spouse_has_separate_hsa: true }));
  assertThrows(() =>
    calculate({
      ...original,
      disability_exception_evidence: {
        ...original.disability_exception_evidence!,
        distributions: original.disability_exception_evidence!.distributions
          .map((row) =>
            row.source_reference === "post-disability-transaction"
              ? { ...row, rollover_excluded_amount: 199 }
              : row
          ),
      },
    })
  );
});
