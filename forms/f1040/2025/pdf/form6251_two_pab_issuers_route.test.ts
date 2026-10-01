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
import { form6251Pdf } from "./forms/f6251.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const payers = [{
  payer_name: "Private Bond Issuer One",
  payer_tin: "111111111",
  source_document_reference: "2025-INT-PAB-ONE",
  box8: 100_000,
  box9: 100_000,
  pab_eligible_bonds_reviewed: true,
  pab_allocable_deduction_workpaper: {
    tax_year: 2025,
    reviewed_workpaper_reference: "PAB-EXPENSE-REVIEW-ONE",
    expense_record_reference: "PAB-EXPENSE-RECORD-ONE",
    allocable_deduction: 0,
    direct_allocation_to_reported_bond: true,
    deductible_if_interest_taxable: true,
    not_claimed_elsewhere_on_return: true,
  },
  pab_review_reference: "PAB-ELIGIBILITY-ONE",
}, {
  payer_name: "Private Bond Issuer Two",
  payer_tin: "222222222",
  source_document_reference: "2025-INT-PAB-TWO",
  box8: 100_000,
  box9: 100_000,
  pab_eligible_bonds_reviewed: true,
  pab_allocable_deduction_workpaper: {
    tax_year: 2025,
    reviewed_workpaper_reference: "PAB-EXPENSE-REVIEW-TWO",
    expense_record_reference: "PAB-EXPENSE-RECORD-TWO",
    allocable_deduction: 0,
    direct_allocation_to_reported_bond: true,
    deductible_if_interest_taxable: true,
    not_claimed_elsewhere_on_return: true,
  },
  pab_review_reference: "PAB-ELIGIBILITY-TWO",
}];

Deno.test("two sourced PAB payers reconcile Form 6251 line 2g through Schedule 2, Form 1040, native and PDF", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...base.inputs, f1099int: payers },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line2a_tax_exempt, 200_000);
  const form = result.pending.form6251;
  assert(form);
  assertEquals(form.line2g_pab_interest, 200_000);
  assertEquals(form.private_activity_bond_interest, 200_000);
  assert(typeof form.line11_amt === "number" && form.line11_amt > 0);
  const amt = form.line11_amt as number;
  assertEquals(result.pending.schedule2.line2_amt, form.line11_amt);
  assertEquals(result.pending.f1040.line17_additional_taxes, form.line11_amt);
  assertEquals(
    result.pending.f1040.line18_total_tax_before_credits,
    (result.pending.f1040.line16_income_tax as number) + amt,
  );
  const projected = form6251Pdf.projectFields?.(form, result.pending) ?? {};
  assertEquals(projected.private_activity_bond_interest, 200_000);
  assertEquals(projected.line11_amt, form.line11_amt);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<ExemptPrivateActivityBondsAmt>200000</ExemptPrivateActivityBondsAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    `<AlternativeMinimumTaxAmt>${amt}</AlternativeMinimumTaxAmt>`,
  );
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assert(pdf.length > 0);

  const source = pending.f1099int as unknown as Record<string, unknown>;
  for (
    const altered of [
      {
        ...pending,
        f1099int: {
          ...source,
          f1099ints: [payers[0], { ...payers[1], box9: 99_999 }],
        },
      },
      {
        ...pending,
        f1099int: {
          ...source,
          f1099ints: [payers[0], {
            ...payers[1],
            source_document_reference: payers[0]!.source_document_reference,
          }],
        },
      },
      {
        ...pending,
        f1099int: {
          ...source,
          f1099ints: [payers[0], {
            ...payers[1],
            pab_allocable_deduction_workpaper: undefined,
          }],
        },
      },
      { ...pending, f1040: { ...pending.f1040, line2a_tax_exempt: 199_999 } },
      { ...pending, schedule2: { ...pending.schedule2, line2_amt: 0 } },
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
