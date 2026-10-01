import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { form6251 } from "../mef/forms/f6251.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { registry } from "../registry.ts";
import { form6251Pdf } from "./forms/f6251.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const bond = {
  payer_name: "Direct Private Bond Issuer",
  payer_tin: "111111111",
  source_document_reference: "2025-direct-PAB-1099-INT",
  pab_review_reference: "direct-bond-eligibility-review",
  pab_eligible_bonds_reviewed: true,
  box8: 150_000,
  box9: 150_000,
  pab_allocable_deduction_workpaper: {
    tax_year: 2025,
    reviewed_workpaper_reference: "direct-bond-expense-review",
    expense_record_reference: "direct-bond-expense-record",
    allocable_deduction: 0,
    direct_allocation_to_reported_bond: true,
    deductible_if_interest_taxable: true,
    not_claimed_elsewhere_on_return: true,
  },
};
const fund = {
  payerName: "Private Bond Fund",
  payerTin: "222222222",
  source_document_reference: "2025-fund-PAB-1099-DIV",
  isNominee: false,
  box11: false,
  box1a: 0,
  box12: 150_000,
  box13: 150_000,
  pab_dividend_review: {
    specified_bond_dividend_confirmed: true,
    box13_net_of_fund_expenses_confirmed: true,
    no_allocable_taxpayer_deduction_confirmed: true,
    not_claimed_elsewhere_on_return_confirmed: true,
    bond_eligibility_review_reference: "fund-bond-eligibility-review",
    taxpayer_expense_review_reference: "fund-expense-review",
    reviewed_on: "2026-02-01",
  },
};

function filed() {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...base.inputs, f1099int: [bond], f1099div: [fund] },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const form = result.pending.form6251;
  assert(form);
  return { form, pending: buildPending(result.pending) };
}

Deno.test("one direct bond and one PAB fund reach Form 6251, Schedule 2, Form 1040, native and PDF", async () => {
  const { form, pending } = filed();
  const f1040 = pending.f1040 as Record<string, number>;
  const schedule2 = pending.schedule2 as Record<string, number>;
  assertEquals(form.line2g_pab_interest, 150_000);
  assertEquals(form.private_activity_bond_interest, 300_000);
  assertEquals(f1040.line2a_tax_exempt, 300_000);
  assert(typeof form.line11_amt === "number" && form.line11_amt > 0);
  assertEquals(schedule2.line2_amt, form.line11_amt);
  assertEquals(f1040.line17_additional_taxes, form.line11_amt);
  assertEquals(
    form6251Pdf.projectFields?.(form, pending)?.private_activity_bond_interest,
    300_000,
  );
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<ExemptPrivateActivityBondsAmt>300000</ExemptPrivateActivityBondsAmt>",
  );
});

Deno.test("mixed PAB sources reject changed payer, review, amount, return and tax", () => {
  const { form, pending } = filed();
  for (
    const changed of [
      {
        ...pending,
        f1099int: {
          f1099ints: [{ ...bond, box9: 149_999 }],
        },
      },
      {
        ...pending,
        f1099div: {
          f1099divs: [{ ...fund, pab_dividend_review: undefined }],
        },
      },
      {
        ...pending,
        f1099div: {
          f1099divs: [{ ...fund, payerTin: bond.payer_tin }],
        },
      },
      {
        ...pending,
        f1099div: {
          f1099divs: [{
            ...fund,
            source_document_reference: bond.source_document_reference,
          }],
        },
      },
      {
        ...pending,
        f1040: {
          ...(pending.f1040 as Record<string, unknown>),
          line2a_tax_exempt: 299_999,
        },
      },
      {
        ...pending,
        schedule2: {
          ...(pending.schedule2 as Record<string, unknown>),
          line2_amt: 0,
        },
      },
    ]
  ) {
    assertThrows(() =>
      form6251.build(form, { filer: base.filer, pending: changed })
    );
    assertThrows(() => form6251Pdf.projectFields?.(form, changed));
  }
  assertThrows(() =>
    form6251Pdf.projectFields?.({
      ...form,
      private_activity_bond_interest: 299_999,
    }, pending)
  );
});
