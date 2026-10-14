import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { registry } from "../../../../registry.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../builder.ts";
import { form6251Pdf } from "../../../forms/taxes/amt/f6251.ts";
import { pdfReviewFixtures } from "../../../review-fixtures.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const interestPayer = {
  recipient_tin: "111223333",
  payer_name: "Private Bond Stated Interest Issuer",
  payer_tin: "111111111",
  source_document_reference: "2025-INT-MIXED-PAB",
  box8: 100_000,
  box9: 100_000,
  pab_eligible_bonds_reviewed: true,
  pab_allocable_deduction_workpaper: {
    tax_year: 2025,
    reviewed_workpaper_reference: "2025-INT-EXPENSE-REVIEW",
    expense_record_reference: "2025-INT-EXPENSE-RECORD",
    allocable_deduction: 0,
    direct_allocation_to_reported_bond: true,
    deductible_if_interest_taxable: true,
    not_claimed_elsewhere_on_return: true,
  },
  pab_review_reference: "2025-INT-BOND-EXPENSE-REVIEW",
};
const oidPayer = {
  recipient_tin: "111223333",
  payer_name: "Private Bond OID Issuer",
  payer_tin: "222222222",
  source_document_reference: "2025-OID-MIXED-PAB",
  box11_tax_exempt_oid: 110_000,
  box10_bond_premium: 10_000,
  box10_applies_to: "tax_exempt_oid" as const,
  box11_pab_oid: 100_000,
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
  assertEquals(form.line2g_pab_interest, [100_000, 100_000]);
  assertEquals(form.private_activity_bond_interest, 200_000);
  assert(typeof form.line11_amt === "number" && form.line11_amt > 0);
  const amt = form.line11_amt as number;
  assertEquals(result.pending.schedule2.line2_amt, amt);
  assertEquals(result.pending.f1040.line17_additional_taxes, amt);
  const pending = buildPending(result.pending);
  assertEquals(pending.f1040?.line2a_tax_exempt, 200_000);
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
          pab_allocable_deduction_workpaper: undefined,
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

Deno.test("same-issuer INT stated interest and OID with reviewed allocable deductions enter line 2g once", async () => {
  const sameIssuerInt = {
    ...interestPayer,
    payer_name: "Private Bond Combined Issuer",
    payer_tin: "333333333",
    pab_bond_identifier: "2025-PAB-BOND-LOT-7",
    pab_allocable_deduction_workpaper: {
      ...interestPayer.pab_allocable_deduction_workpaper,
      allocable_deduction: 10_000,
    },
  };
  const sameIssuerOid = {
    ...oidPayer,
    payer_name: sameIssuerInt.payer_name,
    payer_tin: sameIssuerInt.payer_tin,
    pab_bond_identifier: sameIssuerInt.pab_bond_identifier,
    pab_allocable_deduction_workpaper: {
      ...oidPayer.pab_allocable_deduction_workpaper,
      allocable_deduction: 5_000,
    },
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...base.inputs,
      f1099int: [sameIssuerInt],
      f1099oid: [sameIssuerOid],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line2a_tax_exempt, 200_000);
  const form = result.pending.form6251;
  assert(form);
  assertEquals(form.line2g_pab_interest, [90_000, 95_000]);
  assertEquals(form.private_activity_bond_interest, 185_000);
  assert(typeof form.line11_amt === "number" && form.line11_amt > 0);
  assertEquals(result.pending.schedule2.line2_amt, form.line11_amt);
  assertEquals(result.pending.f1040.line17_additional_taxes, form.line11_amt);
  const pending = buildPending(result.pending);
  assertEquals(pending.f1040?.line2a_tax_exempt, 200_000);
  assertEquals(
    form6251Pdf.projectFields?.(form, result.pending)
      ?.private_activity_bond_interest,
    185_000,
  );
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<ExemptPrivateActivityBondsAmt>185000</ExemptPrivateActivityBondsAmt>",
  );
  assert(
    (await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle)).length > 0,
  );

  const rawInt = pending.f1099int as unknown as Record<string, unknown>;
  const rawOid = pending.f1099oid as unknown as Record<string, unknown>;
  for (
    const altered of [
      {
        ...pending,
        f1099int: {
          ...rawInt,
          f1099ints: [{
            ...sameIssuerInt,
            pab_allocable_deduction_workpaper: {
              ...sameIssuerInt.pab_allocable_deduction_workpaper,
              allocable_deduction: 9_999,
            },
          }],
        },
      },
      {
        ...pending,
        f1099oid: {
          ...rawOid,
          f1099oids: [{
            ...sameIssuerOid,
            pab_bond_identifier: "different-bond",
          }],
        },
      },
      {
        ...pending,
        f1099oid: {
          ...rawOid,
          f1099oids: [{
            ...sameIssuerOid,
            pab_allocable_deduction_workpaper: {
              ...sameIssuerOid.pab_allocable_deduction_workpaper,
              expense_record_reference: sameIssuerInt
                .pab_allocable_deduction_workpaper.expense_record_reference,
            },
          }],
        },
      },
      { ...pending, f1040: { ...pending.f1040, line2a_tax_exempt: 185_000 } },
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
