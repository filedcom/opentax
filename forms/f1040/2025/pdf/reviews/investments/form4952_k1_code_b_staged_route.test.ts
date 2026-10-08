import { normalizeAllPending } from "../../../domains/execution/pending.ts";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../registry.ts";
import { reconcileForm4952K1CodeBRoyaltyPath } from "../../../domains/deductions/form4952/form4952_k1_code_b_reconciliation.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { form4952 as nativeForm4952 } from "../../../mef/forms/investments/f4952/f4952.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { form4952Pdf } from "../../forms/investments/f4952.ts";
import { pdfReviewFixtures } from "../../review-fixtures.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const k1 = {
  partnership_name: "Mineral Partnership",
  partnership_ein: "123456789",
  source_document_reference: "2025-issued-k1",
  recipient_tin: "111223333",
  investment_property_for_form4952: true,
  box7_royalties: 600,
  box7_royalty_reporting: {
    tsj: "T",
    property_description: "Mineral royalty",
    portfolio_nonpassive: true,
    form_1099_payments_made: false,
  },
  box13_code_h_investment_interest: 300,
  box13_code_i_royalty_deduction: {
    reported_amount: 350,
    allowed_amount: 350,
    statement_reference: "2025 code I statement",
    issuer_expense_item_id: "mineral-property-depreciation-1",
    expense_kind: "depreciation",
    basis_workpaper_reference: "2025 basis workpaper",
    at_risk_workpaper_reference: "2025 at-risk workpaper",
  },
  box20_code_b_investment_expenses: {
    reported_amount: 350,
    allowed_deduction_amount: 350,
    allowed_deduction_kind: "depreciation",
    nonpassive_investment_property: true,
    issuer_crosswalk: {
      issuer_supplement_reference: "2025 issuer supplement",
      issuer_expense_item_id: "mineral-property-depreciation-1",
      issuer_reported_amount: 350,
      same_expense_as_box13_code_i_confirmed: true,
      box13_code_i_statement_reference: "2025 code I statement",
      royalty_property_description: "Mineral royalty",
    },
  },
};
const inputs = {
  ...base.inputs,
  f1098: [{
    lender_name: "Home Lender",
    recipient_tin: "111223333",
    source_document_reference: "2025 Form 1098",
    box1_mortgage_interest: 18_000,
    box1_current_year_deductible_interest: 18_000,
    box1_deduction_workpaper_reference: "2025 interest workpaper",
    for_routing: "A",
  }],
  k1_partnership: [k1],
  form4952: {
    investment_interest_expense_excludes_royalty_attributable_interest: true,
    amt_refigure: {
      prior_year_disallowed_interest: 0,
      interest_on_private_activity_bonds: 0,
      other_gross_income_adjustment: 0,
      qualified_dividends_adjustment: 0,
      net_disposition_gain_adjustment: 0,
      net_capital_gain_adjustment: 0,
      investment_expenses_adjustment: 0,
    },
  },
};

Deno.test("K-1 code B royalty expense joins one Schedule E debit and Form 4952 line 5, but export remains closed", async () => {
  const result = execute(buildExecutionPlan(registry), registry, inputs, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  assertEquals(
    (result.pending.schedule_e?.schedule_es as
      | Array<{ royalties_income: number }>
      | undefined)?.[0].royalties_income,
    600,
  );
  assertEquals(result.pending.schedule1?.line5_schedule_e, 250);
  assertEquals(result.pending.f1040?.line8_additional_income, 250);
  assertEquals(result.pending.form4952?.line4a, 600);
  assertEquals(result.pending.form4952?.line5, 350);
  assertEquals(result.pending.form4952?.line8, 250);
  assertEquals(result.pending.schedule_a?.line_9_investment_interest, 250);
  const pending = buildPending(result.pending);
  reconcileForm4952K1CodeBRoyaltyPath(pending.form4952!, pending);
  assertThrows(
    () =>
      nativeForm4952.build(pending.form4952!, {
        pending,
        filer: base.filer,
      }),
    Error,
    "needs verified issued supplement",
  );
  await assertRejects(
    () =>
      buildMefBundle(pending, {
        filer: base.filer,
        attachments: [],
      }),
    Error,
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(
        pending.form4952! as Record<string, unknown>,
        normalizeAllPending(pending),
      ),
    Error,
    "needs verified issued supplement",
  );
  assertThrows(
    () =>
      form4952Pdf.instances?.(
        pending.form4952! as Record<string, unknown>,
        base.filer,
        normalizeAllPending(pending),
      ),
    Error,
    "needs verified issued supplement",
  );

  const changedRow = structuredClone(pending);
  (changedRow.schedule_e as {
    schedule_es: Array<{
      k1_royalty_source: { issuer_expense_item_id: string };
    }>;
  }).schedule_es[0].k1_royalty_source.issuer_expense_item_id = "other-item";
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(
        pending.form4952! as Record<string, unknown>,
        normalizeAllPending(changedRow),
      ),
    Error,
    "same allowed code I expense",
  );
  const changedSource = structuredClone(pending);
  (changedSource.k1_partnership as {
    k1_partnerships: Array<{
      box20_code_b_investment_expenses: {
        issuer_crosswalk: { issuer_expense_item_id: string };
      };
    }>;
  }).k1_partnerships[0].box20_code_b_investment_expenses.issuer_crosswalk
    .issuer_expense_item_id = "other-item";
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(
        pending.form4952! as Record<string, unknown>,
        normalizeAllPending(changedSource),
      ),
    Error,
  );
});

Deno.test("code B royalty K-1 and separate box 5/code H K-1 reconcile their retained sources without opening export", () => {
  const secondK1 = {
    partnership_name: "Bond Partnership",
    partnership_ein: "987654321",
    source_document_reference: "2025-issued-bond-k1",
    recipient_tin: "111223333",
    investment_property_for_form4952: true,
    box5_interest: 500,
    box13_code_h_investment_interest: 100,
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...inputs, k1_partnership: [k1, secondK1] },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952?.line1, 400);
  assertEquals(result.pending.form4952?.line4a, 1_100);
  assertEquals(result.pending.form4952?.line5, 350);
  assertEquals(result.pending.form4952?.line8, 400);
  assertEquals(result.pending.schedule_a?.line_9_investment_interest, 400);
  assertEquals(result.pending.schedule1?.line5_schedule_e, 250);
  assertEquals(result.pending.f1040?.line2b_taxable_interest, 500);
  const pending = buildPending(result.pending);
  reconcileForm4952K1CodeBRoyaltyPath(pending.form4952!, pending);
  assertThrows(
    () =>
      nativeForm4952.build(pending.form4952!, {
        pending,
        filer: base.filer,
      }),
    Error,
    "needs verified issued supplement",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(
        pending.form4952! as Record<string, unknown>,
        normalizeAllPending(pending),
      ),
    Error,
    "needs verified issued supplement",
  );
  assertThrows(
    () =>
      form4952Pdf.instances?.(
        pending.form4952! as Record<string, unknown>,
        base.filer,
        normalizeAllPending(pending),
      ),
    Error,
    "needs verified issued supplement",
  );

  const changedSecondK1 = structuredClone(pending);
  (changedSecondK1.k1_partnership as {
    k1_partnerships: Array<{ box5_interest?: number }>;
  }).k1_partnerships[1].box5_interest = 501;
  assertThrows(
    () =>
      reconcileForm4952K1CodeBRoyaltyPath(
        pending.form4952!,
        changedSecondK1,
      ),
    Error,
  );
  const changedRecipient = structuredClone(pending);
  (changedRecipient.k1_partnership as {
    k1_partnerships: Array<{ recipient_tin?: string }>;
  }).k1_partnerships[1].recipient_tin = "999887777";
  assertThrows(
    () =>
      form4952Pdf.projectFields?.(
        pending.form4952! as Record<string, unknown>,
        normalizeAllPending(changedRecipient),
      ),
    Error,
  );
  const reusedIssuer = structuredClone(pending);
  (reusedIssuer.k1_partnership as {
    k1_partnerships: Array<{ partnership_ein?: string }>;
  }).k1_partnerships[1].partnership_ein = k1.partnership_ein;
  assertThrows(
    () => reconcileForm4952K1CodeBRoyaltyPath(pending.form4952!, reusedIssuer),
    Error,
  );
  const extraCodeB = structuredClone(pending);
  (extraCodeB.k1_partnership as {
    k1_partnerships: Array<{
      box20_code_b_investment_expenses?: unknown;
    }>;
  }).k1_partnerships[1].box20_code_b_investment_expenses =
    k1.box20_code_b_investment_expenses;
  assertThrows(
    () => reconcileForm4952K1CodeBRoyaltyPath(pending.form4952!, extraCodeB),
    Error,
  );
  const changedInterestLine = structuredClone(pending);
  (changedInterestLine.f1040 as {
    line2b_taxable_interest?: number;
  }).line2b_taxable_interest = 499;
  assertThrows(
    () =>
      reconcileForm4952K1CodeBRoyaltyPath(
        pending.form4952!,
        changedInterestLine,
      ),
    Error,
  );
});
