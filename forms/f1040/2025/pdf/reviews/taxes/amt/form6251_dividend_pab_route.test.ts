import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { assertForm6251PrivateActivityBondSource } from "../../../../domains/taxes/amt/form6251/form6251_pab_source.ts";
import { form6251 } from "../../../../mef/forms/taxes/amt/f6251.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { registry } from "../../../../registry.ts";
import { form6251Pdf } from "../../../forms/taxes/amt/f6251.ts";
import { pdfReviewFixtures } from "../../../review-fixtures.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const payer = {
  recipient_tin: "111223333",
  payerName: "Tax Exempt Bond Fund",
  payerTin: "123456789",
  source_document_reference: "2025 issued bond-fund 1099-DIV",
  isNominee: false,
  box11: false,
  box1a: 0,
  box12: 300_000,
  box13: 300_000,
  pab_dividend_review: {
    specified_bond_dividend_confirmed: true,
    box13_net_of_fund_expenses_confirmed: true,
    no_allocable_taxpayer_deduction_confirmed: true,
    not_claimed_elsewhere_on_return_confirmed: true,
    bond_eligibility_review_reference: "2025 fund bond eligibility review",
    taxpayer_expense_review_reference: "2025 taxpayer expense review",
    reviewed_on: "2026-02-01",
  },
};

function filed() {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...base.inputs, f1099div: [payer] },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const form = result.pending.form6251;
  assert(form);
  return { form, pending: result.pending };
}

Deno.test("one reviewed 1099-DIV box 13 payer reaches Form 6251 line 2g, native XML, and PDF", async () => {
  const { form, pending } = filed();
  assertEquals(form.private_activity_bond_interest, 300_000);
  assertEquals(pending.f1040.line2a_tax_exempt, 300_000);
  assert(typeof form.line11_amt === "number" && form.line11_amt > 0);
  assertEquals(pending.schedule2.line2_amt, form.line11_amt);
  assertEquals(pending.f1040.line17_additional_taxes, form.line11_amt);
  assertForm6251PrivateActivityBondSource(form, pending);
  assertEquals(
    form6251Pdf.projectFields?.(form, pending)
      ?.private_activity_bond_interest,
    300_000,
  );
  assertEquals(
    form6251Pdf.fields.find((field) =>
      field.domainKey === "private_activity_bond_interest"
    )?.pdfField,
    "topmostSubform[0].Page1[0].f1_11[0]",
  );
  const bundle = await buildMefBundle(buildPending(pending), {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<ExemptPrivateActivityBondsAmt>300000</ExemptPrivateActivityBondsAmt>",
  );
});

Deno.test("Form 6251 rejects changed dividend copy, review, line 2a, and AMT totals", () => {
  const { form, pending } = filed();
  const tampered = [
    { ...pending, f1099div: { f1099divs: [{ ...payer, box13: 299_999 }] } },
    {
      ...pending,
      f1099div: {
        f1099divs: [{ ...payer, pab_dividend_review: undefined }],
      },
    },
    {
      ...pending,
      f1099div: {
        f1099divs: [{ ...payer, payerTin: "98765432" }],
      },
    },
    {
      ...pending,
      f1099div: {
        f1099divs: [{ ...payer, box12: 299_999 }],
      },
    },
    {
      ...pending,
      f1040: { ...pending.f1040, line2a_tax_exempt: 299_999 },
    },
    {
      ...pending,
      schedule2: { ...pending.schedule2, line2_amt: 0 },
    },
  ];
  for (const changed of tampered) {
    assertThrows(
      () => form6251.build(form, { filer: base.filer, pending: changed }),
      Error,
      "retained 1099-INT/OID/DIV",
    );
    assertThrows(
      () => form6251Pdf.projectFields?.(form, changed),
      Error,
      "retained 1099-INT/OID/DIV",
    );
  }
  assertThrows(
    () =>
      form6251Pdf.projectFields?.({
        ...form,
        private_activity_bond_interest: 0,
      }, pending),
    Error,
    "retained 1099-INT/OID/DIV",
  );
});
