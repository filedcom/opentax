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
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((item) =>
  item.id === "joint-two-hsa-owners"
)!;
const baseHsa = base.inputs.form8889 as Record<string, unknown>;
const baseSpouse = baseHsa.spouse_hsa as Record<string, unknown>;
const hsa = {
  ...baseHsa,
  hsa_distributions: 1_000,
  form1099_sa_distributions: [{
    tax_year: 2025,
    recipient_ssn: "111223333",
    box1_gross_distribution: 1_000,
    box3_distribution_code: "1",
    source_reference: "primary-2025-1099-sa",
  }],
  qualified_medical_expenses: 300,
  qualified_medical_expense_evidence: [{
    amount: 300,
    source_reference: "reviewed-spouse-medical-receipt",
    incurred_after_hsa_established: true,
    not_reimbursed_by_other_coverage: true,
    eligible_person: "spouse",
    patient_ssn: "444556666",
  }],
  exception_qualified_taxable_amount: 0,
  spouse_hsa: {
    ...baseSpouse,
    hsa_distributions: 500,
    form1099_sa_distributions: [{
      tax_year: 2025,
      recipient_ssn: "444556666",
      box1_gross_distribution: 500,
      box3_distribution_code: "1",
      source_reference: "spouse-2025-1099-sa",
    }],
    qualified_medical_expenses: 500,
    qualified_medical_expense_evidence: [{
      amount: 500,
      source_reference: "reviewed-owner-medical-receipt",
      incurred_after_hsa_established: true,
      not_reimbursed_by_other_coverage: true,
      eligible_person: "owner",
    }],
    exception_qualified_taxable_amount: 0,
  },
};

function filedReturn() {
  return execute(
    buildExecutionPlan(registry),
    registry,
    { ...base.inputs, form8889: hsa },
    { taxYear: 2025, formType: "f1040" },
  );
}

Deno.test("primary HSA pays the other spouse's medical receipt through both owner forms and final return", async () => {
  const result = filedReturn();
  assertEquals(result.diagnostics, []);
  const forms = result.pending.form8889.forms as Record<string, unknown>[];
  assertEquals(forms.length, 2);
  assertEquals(forms[0].print_line15_qualified, 300);
  assertEquals(forms[0].print_line16_taxable, 700);
  assertEquals(forms[0].print_line17b_penalty, 140);
  assertEquals(forms[1].print_line15_qualified, 500);
  assertEquals(forms[1].print_line16_taxable, 0);
  assertEquals(result.pending.schedule1.line13_hsa_deduction, 9_000);
  assertEquals(result.pending.schedule1.line8f_hsa_income, 700);
  assertEquals(result.pending.schedule2.line17c_hsa_penalty, 140);
  assertEquals(result.pending.f1040.line8_additional_income, 700);
  assertEquals(result.pending.f1040.line10_adjustments, 9_000);
  assertEquals(result.pending.f1040.line23_other_taxes, 140);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<TaxableHSADistributionAmt>700</TaxableHSADistributionAmt>",
  );
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assert(pdf.length > 0);
});

Deno.test("paired HSA spouse-patient route rejects wrong or missing patient and final tax drift", async () => {
  const result = filedReturn();
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const source = pending.form8889 as unknown as Record<string, unknown>;
  const changedSource = (patientSsn: string | undefined) => ({
    ...pending,
    form8889: {
      ...source,
      qualified_medical_expense_evidence: [{
        ...hsa.qualified_medical_expense_evidence[0],
        patient_ssn: patientSsn,
      }],
    },
  });
  for (const patientSsn of ["111223333", "999887777", undefined]) {
    const altered = changedSource(patientSsn);
    await assertRejects(() =>
      buildMefBundle(altered as typeof pending, {
        filer: base.filer,
        attachments: [],
      })
    );
    await assertRejects(() => buildPdfBytes(altered, base.filer, ".pdf-cache"));
  }
  await assertRejects(() =>
    buildMefBundle({
      ...pending,
      f1040: { ...pending.f1040, line23_other_taxes: 139 },
    }, { filer: base.filer, attachments: [] })
  );
});
