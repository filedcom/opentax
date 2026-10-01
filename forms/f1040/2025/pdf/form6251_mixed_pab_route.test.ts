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
const interestPayer = {
  payer_name: "Private Bond Stated Interest Issuer",
  payer_tin: "111111111",
  source_document_reference: "2025-INT-MIXED-PAB",
  box8: 100_000,
  box9: 100_000,
  pab_eligible_bonds_reviewed: true,
  pab_no_allocable_deduction_reviewed: true,
  pab_review_reference: "2025-INT-BOND-EXPENSE-REVIEW",
};
const oidPayer = {
  payer_name: "Private Bond OID Issuer",
  payer_tin: "222222222",
  source_document_reference: "2025-OID-MIXED-PAB",
  box11_tax_exempt_oid: 110_000,
  box10_bond_premium: 10_000,
  box10_applies_to: "tax_exempt_oid" as const,
  box11_pab_oid: 100_000,
  pab_eligible_bonds_reviewed: true,
  pab_no_allocable_deduction_reviewed: true,
  pab_review_reference: "2025-OID-BOND-EXPENSE-REVIEW",
};

Deno.test("distinct issued INT and OID private-activity-bond sources reconcile Form 6251 and the final return", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...base.inputs,
      f1099int: [interestPayer],
      f1099oid: [oidPayer],
    },
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
  const pending = buildPending(result.pending);
  assertEquals(
    form6251Pdf.projectFields?.(form, pending)?.private_activity_bond_interest,
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
  assert(
    (await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle)).length > 0,
  );

  const rawInt = pending.f1099int as unknown as Record<string, unknown>;
  const rawOid = pending.f1099oid as unknown as Record<string, unknown>;
  const changed = [
    {
      ...pending,
      f1099int: { ...rawInt, f1099ints: [{ ...interestPayer, box9: 99_999 }] },
    },
    {
      ...pending,
      f1099oid: {
        ...rawOid,
        f1099oids: [{ ...oidPayer, box11_pab_oid: 99_999 }],
      },
    },
    {
      ...pending,
      f1099oid: {
        ...rawOid,
        f1099oids: [{
          ...oidPayer,
          pab_no_allocable_deduction_reviewed: undefined,
        }],
      },
    },
    {
      ...pending,
      f1099oid: {
        ...rawOid,
        f1099oids: [{ ...oidPayer, payer_tin: interestPayer.payer_tin }],
      },
    },
    {
      ...pending,
      f1099int: {
        ...rawInt,
        f1099ints: [{
          ...interestPayer,
          source_document_reference: oidPayer.source_document_reference,
        }],
      },
    },
    { ...pending, f1040: { ...pending.f1040, line2a_tax_exempt: 199_999 } },
    { ...pending, schedule2: { ...pending.schedule2, line2_amt: 0 } },
  ];
  for (const altered of changed) {
    await assertRejects(() =>
      buildMefBundle(altered as typeof pending, {
        filer: base.filer,
        attachments: [],
      })
    );
    await assertRejects(() => buildPdfBytes(altered, base.filer, ".pdf-cache"));
  }
});
