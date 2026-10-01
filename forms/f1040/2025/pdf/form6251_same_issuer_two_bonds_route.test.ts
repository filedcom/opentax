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
const bonds = [1, 2].map((index) => ({
  payer_name: "Texas Private Bond Trust",
  payer_tin: "111111111",
  source_document_reference: `2025-PAB-INT-COPY-${index}`,
  pab_bond_identifier: `PAB-BOND-${index}`,
  box8: 100_000,
  box9: 100_000,
  pab_eligible_bonds_reviewed: true,
  pab_review_reference: `PAB-ELIGIBILITY-${index}`,
  pab_allocable_deduction_workpaper: {
    tax_year: 2025 as const,
    reviewed_workpaper_reference: `PAB-EXPENSE-REVIEW-${index}`,
    expense_record_reference: `PAB-EXPENSE-RECORD-${index}`,
    allocable_deduction: 10_000,
    direct_allocation_to_reported_bond: true as const,
    deductible_if_interest_taxable: true as const,
    not_claimed_elsewhere_on_return: true as const,
  },
}));

Deno.test("two distinct bonds from one PAB issuer reach Form 6251, Schedule 2, Form 1040, native and PDF", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...base.inputs, f1099int: bonds },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line2a_tax_exempt, 200_000);
  const form = result.pending.form6251;
  assert(form);
  assertEquals(form.line2g_pab_interest, 180_000);
  assertEquals(form.private_activity_bond_interest, 180_000);
  assert(typeof form.line11_amt === "number" && form.line11_amt > 0);
  const amt = form.line11_amt as number;
  assertEquals(result.pending.schedule2.line2_amt, amt);
  assertEquals(result.pending.f1040.line17_additional_taxes, amt);
  assertEquals(
    result.pending.f1040.line18_total_tax_before_credits,
    (result.pending.f1040.line16_income_tax as number) + amt,
  );
  const pending = buildPending(result.pending);
  assertEquals(
    form6251Pdf.projectFields?.(form, result.pending)
      ?.private_activity_bond_interest,
    180_000,
  );
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<ExemptPrivateActivityBondsAmt>180000</ExemptPrivateActivityBondsAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    `<AlternativeMinimumTaxAmt>${amt}</AlternativeMinimumTaxAmt>`,
  );
  assert(
    (await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle)).length >
      0,
  );

  const source = pending.f1099int as unknown as Record<string, unknown>;
  for (
    const changedBond of [
      { ...bonds[1], pab_bond_identifier: bonds[0].pab_bond_identifier },
      { ...bonds[1], payer_name: "Different Issuer" },
      {
        ...bonds[1],
        source_document_reference: bonds[0].source_document_reference,
      },
      {
        ...bonds[1],
        pab_allocable_deduction_workpaper: {
          ...bonds[1].pab_allocable_deduction_workpaper,
          allocable_deduction: 9_999,
        },
      },
      {
        ...bonds[1],
        pab_allocable_deduction_workpaper: {
          ...bonds[1].pab_allocable_deduction_workpaper,
          expense_record_reference:
            bonds[0].pab_allocable_deduction_workpaper.expense_record_reference,
        },
      },
    ]
  ) {
    const changed = {
      ...pending,
      f1099int: { ...source, f1099ints: [bonds[0], changedBond] },
    };
    await assertRejects(() =>
      buildMefBundle(changed as typeof pending, {
        filer: base.filer,
        attachments: [],
      })
    );
    await assertRejects(() => buildPdfBytes(changed, base.filer, ".pdf-cache"));
  }
  const changedTax = {
    ...pending,
    schedule2: { ...pending.schedule2, line2_amt: 0 },
  };
  await assertRejects(() =>
    buildMefBundle(changedTax as typeof pending, {
      filer: base.filer,
      attachments: [],
    })
  );
});
