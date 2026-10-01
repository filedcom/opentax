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
const oid = {
  payer_name: "Specified Private Bond Issuer",
  payer_tin: "111111111",
  source_document_reference: "2025-OID-PAB-ISSUED",
  box11_tax_exempt_oid: 200_000,
  box11_pab_oid: 200_000,
  pab_eligible_bonds_reviewed: true,
  pab_allocable_deduction_workpaper: {
    tax_year: 2025,
    reviewed_workpaper_reference: "2025-OID-EXPENSE-REVIEW",
    expense_record_reference: "2025-OID-EXPENSE-RECORD",
    allocable_deduction: 0,
    direct_allocation_to_reported_bond: true,
    deductible_if_interest_taxable: true,
    not_claimed_elsewhere_on_return: true,
  },
  pab_review_reference: "2025-OID-PAB-REVIEW",
};

Deno.test("issued 1099-OID private-activity-bond source reaches Form 6251 line 2g and the final return", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...base.inputs, f1099oid: [oid] },
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
    200_000,
  );
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
  assert(
    (await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle)).length > 0,
  );

  const source = pending.f1099oid as unknown as Record<string, unknown>;
  for (
    const altered of [
      { ...oid, box11_pab_oid: 199_999 },
      { ...oid, source_document_reference: undefined },
      { ...oid, pab_allocable_deduction_workpaper: undefined },
      { ...oid, payer_tin: "222222222", box11_tax_exempt_oid: 199_999 },
    ]
  ) {
    const changed = {
      ...pending,
      f1099oid: { ...source, f1099oids: [altered] },
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
  await assertRejects(() =>
    buildPdfBytes(changedTax, base.filer, ".pdf-cache")
  );
});
