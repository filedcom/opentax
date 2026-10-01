import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes } from "./builder.ts";
import { form8889Pdf } from "./forms/f8889.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const hsa = {
  beneficiary_identity: {
    owner: "T",
    name: "Alex Example",
    ssn: "111223333",
  },
  eligible_hdhp_coverage_by_month: Array(12).fill("self_only"),
  age_55_or_older: false,
  last_month_rule_elected: false,
  married_at_year_end: false,
  taxpayer_hsa_contributions: 2_000,
  hsa_distributions: 1_500,
  form1099_sa_distributions: [{
    tax_year: 2025,
    recipient_ssn: "111223333",
    box1_gross_distribution: 1_000,
    box3_distribution_code: "1",
    source_reference: "issued-1099-sa-one",
    hsa_account_reference: "owner-hsa-account-one",
  }, {
    tax_year: 2025,
    recipient_ssn: "111223333",
    box1_gross_distribution: 500,
    box3_distribution_code: "1",
    source_reference: "issued-1099-sa-two",
    hsa_account_reference: "owner-hsa-account-one",
  }],
  qualified_medical_expenses: 800,
  qualified_medical_expense_evidence: [{
    amount: 600,
    source_reference: "reviewed-medical-receipt-one",
    incurred_after_hsa_established: true,
    not_reimbursed_by_other_coverage: true,
    eligible_person: "owner",
  }, {
    amount: 200,
    source_reference: "reviewed-medical-receipt-two",
    incurred_after_hsa_established: true,
    not_reimbursed_by_other_coverage: true,
    eligible_person: "owner",
  }],
  exception_qualified_taxable_amount: 0,
};

Deno.test("two distinct 1099-SA copies and medical receipts reconcile Form 8889 through Form 1040, native and PDF", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...base.inputs, form8889: hsa },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const form = (result.pending.form8889.forms as Record<string, unknown>[])[0];
  assert(form);
  assertEquals(form.print_line13_deduction, 2_000);
  assertEquals(form.print_line14a_distributions, 1_500);
  assertEquals(form.print_line15_qualified, 800);
  assertEquals(form.print_line16_taxable, 700);
  assertEquals(form.print_line17b_penalty, 140);
  assertEquals(result.pending.schedule1.line13_hsa_deduction, 2_000);
  assertEquals(result.pending.schedule1.line8f_hsa_income, 700);
  assertEquals(result.pending.schedule2.line17c_hsa_penalty, 140);
  assertEquals(result.pending.f1040.line8_additional_income, 700);
  assertEquals(result.pending.f1040.line9_total_income, 75_700);
  assertEquals(result.pending.f1040.line10_adjustments, 2_000);
  assertEquals(result.pending.f1040.line11_agi, 73_700);
  assertEquals(result.pending.f1040.line23_other_taxes, 140);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<TotalHSADeductionAmt>2000</TotalHSADeductionAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<TaxableHSADistributionAmt>700</TaxableHSADistributionAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<HSADistriAddnlPercentTaxAmt>140</HSADistriAddnlPercentTaxAmt>",
  );
  const [projected] = form8889Pdf.instances!(
    result.pending.form8889,
    base.filer,
    result.pending,
  );
  assertEquals(projected?.print_line14a_distributions, 1_500);
  assertEquals(projected?.print_line15_qualified, 800);
  assertEquals(projected?.print_line16_taxable, 700);
  assertEquals(projected?.print_line17b_penalty, 140);
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assert(pdf.length > 0);

  const source = pending.form8889 as unknown as Record<string, unknown>;
  for (
    const altered of [
      {
        ...pending,
        form8889: {
          ...source,
          form1099_sa_distributions: [
            hsa.form1099_sa_distributions[0],
            {
              ...hsa.form1099_sa_distributions[1],
              box1_gross_distribution: 499,
            },
          ],
        },
      },
      {
        ...pending,
        form8889: {
          ...source,
          qualified_medical_expense_evidence: [
            hsa.qualified_medical_expense_evidence[0],
            { ...hsa.qualified_medical_expense_evidence[1], amount: 201 },
          ],
        },
      },
      {
        ...pending,
        form8889: {
          ...source,
          form1099_sa_distributions: [
            hsa.form1099_sa_distributions[0],
            {
              ...hsa.form1099_sa_distributions[1],
              source_reference: "issued-1099-sa-one",
            },
          ],
        },
      },
      {
        ...pending,
        form8889: {
          ...source,
          form1099_sa_distributions: [
            hsa.form1099_sa_distributions[0],
            {
              ...hsa.form1099_sa_distributions[1],
              hsa_account_reference: "different-hsa-account",
            },
          ],
        },
      },
      {
        ...pending,
        schedule2: { ...pending.schedule2, line17c_hsa_penalty: 139 },
      },
    ]
  ) {
    await assertRejects(() =>
      buildMefBundle(altered as typeof pending, {
        filer: base.filer,
        attachments: [],
      })
    );
    await assertRejects(() => buildPdfBytes(altered, base.filer, ".pdf-cache"));
  }
});
