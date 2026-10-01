import { assertEquals, assertThrows } from "@std/assert";
import { k1SCorpNode } from "../../../inputs/k1_s_corp/index.ts";
import { reconcileOneNoteDebtCandidate } from "./debt-note.ts";
import { buildReviewedStockLoss7203 } from "../../../../2025/mef/forms/f7203_stock_loss.ts";
import { form7203StockLossPdf } from "../../../../2025/pdf/forms/f7203_stock_loss.ts";
import { buildReviewedStockLossScheduleE } from "../../../../2025/mef/forms/schedule_e_stock_loss.ts";
import { scheduleEStockLossPdf } from "../../../../2025/pdf/forms/schedule_e_stock_loss.ts";
import { form7203 as form7203Node } from "./index.ts";
import { FilingStatus } from "../../../../mef/header.ts";

export const oneNote = {
  shareholder_ssn: "123456789",
  corporation_ein: "987654321",
  k1_source_document_reference: "2025 signed K-1 copy",
  beginning_stock_basis: 500,
  beginning_stock_basis_workpaper_reference: "2024 stock-basis rollforward",
  current_box1_ordinary_loss: 4_000,
  formal_note_id: "note-2025-01",
  signed_note_document_reference: "signed note PDF 2025-01",
  note_execution_date: "2025-03-10",
  shareholder_lender_ssn: "123456789",
  corporate_borrower_ein: "987654321",
  bank_transfer_reference: "2025 bank transfer 77",
  cash_advance_amount: 2_000,
  corporation_received_funds_confirmed: true,
  shareholder_funded_directly_confirmed: true,
  not_a_guarantee_or_cosign_confirmed: true,
  beginning_note_face_amount: 0,
  beginning_note_debt_basis: 0,
  no_other_shareholder_debt_confirmed: true,
  no_2025_repayments_confirmed: true,
  no_prior_reduced_debt_basis_confirmed: true,
  no_other_2025_basis_changes_confirmed: true,
  no_prior_suspended_losses_confirmed: true,
};

export const oneNoteK1 = {
  corporation_name: "Test S Corp",
  corporation_ein: "987654321",
  source_document_reference: "2025 signed K-1 copy",
  recipient_tin: "123456789",
  box1_ordinary_business: -4_000,
  form7203_stock_loss_ledger: {
    shareholder_ssn: "123456789",
    shareholder_name_as_on_k1: "Alex Taxpayer",
    corporation_ein: "987654321",
    beginning_stock_basis: 500,
    beginning_basis_workpaper_reference: "2024 stock-basis rollforward",
    original_shareholder: true,
    all_shares_one_stock_block: true,
    no_current_year_stock_transactions: true,
    no_section_1367_1_g_election: true,
    no_other_2025_stock_basis_changes: true,
    no_other_schedule_e_activity: true,
    materially_participated_in_s_corporation: true,
    material_participation_workpaper_reference: "2025 activity log",
    no_shareholder_debt_or_repayments: false,
    no_prior_year_suspended_losses: true,
    no_at_risk_or_passive_limitation: true,
  },
  form7203_one_note_debt_candidate: oneNote,
};

Deno.test("Form 7203 one formal note candidate reconciles source identities and bounded loss", () => {
  const result = reconcileOneNoteDebtCandidate(oneNote, oneNoteK1);
  assertEquals(result.stockSupportedLoss, 500);
  assertEquals(result.debtSupportedLossCandidate, 2_000);
  assertThrows(() =>
    reconcileOneNoteDebtCandidate(
      {
        ...oneNote,
        bank_transfer_reference: oneNote.signed_note_document_reference,
      },
      oneNoteK1,
    )
  );
  assertThrows(() =>
    reconcileOneNoteDebtCandidate(oneNote, {
      ...oneNoteK1,
      source_document_reference: "different K-1",
    })
  );
});

Deno.test("Form 7203 one-note K-1 posts the bounded debt-basis loss allowance", () => {
  const parsed = k1SCorpNode.inputSchema.parse({ k1_s_corps: [oneNoteK1] });
  const result = k1SCorpNode.compute(
    { taxYear: 2025, formType: "f1040" },
    parsed,
  );
  const form7203 = result.outputs.find((item) => item.nodeType === "form7203");
  assertEquals(form7203?.fields.stock_basis_beginning, 500);
  assertEquals(form7203?.fields.new_loans, 2_000);
  assertEquals(form7203?.fields.ordinary_loss, 4_000);
  const basisResult = form7203Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form7203Node.inputSchema.parse(form7203!.fields),
  );
  assertEquals(basisResult.carryforwards?.suspended_scorp_loss_7203, 1_500);
  assertEquals(
    basisResult.outputs.find((item) => item.nodeType === "schedule1")?.fields
      .basis_disallowed_add_back,
    1_500,
  );
});

Deno.test("Form 7203 native and PDF print one formal note and Part III debt allowance", () => {
  const filer = {
    primarySSN: "123456789",
    nameLine1: "Alex Taxpayer",
    nameControl: "TAXP",
    address: {
      line1: "1 Main St",
      city: "Wilmington",
      state: "DE",
      zip: "19801",
    },
    filingStatus: FilingStatus.Single,
  };
  const pending = {
    k1_s_corp: { k1_s_corps: [oneNoteK1] },
    schedule1: {
      line5_schedule_e: -2_500,
      line10_total_additional_income: -2_500,
    },
    f1040: { line8_additional_income: -2_500 },
  };
  const fields = {
    stock_basis_beginning: 500,
    ordinary_loss: 4_000,
    new_loans: 2_000,
    reviewed_one_note_debt: oneNote,
  };
  const xml = buildReviewedStockLoss7203(fields, { filer, pending });
  assertEquals(xml.includes("<FormalNoteInd>X</FormalNoteInd>"), true);
  assertEquals(xml.includes("<AllowableLossAmt>2000</AllowableLossAmt>"), true);
  assertEquals(xml.includes("<ShrAllwblLossFromDebtBasisGrp>"), true);
  const pdf = form7203StockLossPdf.instances?.(fields, filer, pending)?.[0];
  assertEquals(pdf?.line30_debt1, 2_000);
  assertEquals(pdf?.line31_debt1, 0);
  assertEquals(pdf?.line35_allowed_debt, 2_000);
  assertEquals(pdf?.line47_carryover, 1_500);
  assertEquals(
    form7203StockLossPdf.fields.find((entry) =>
      entry.domainKey === "formal_note_debt1"
    )?.pdfField,
    "topmostSubform[0].Page1[0].Table_SectionA[0].Header[0].aDebt1[0].c1_7[0]",
  );
  assertEquals(
    form7203StockLossPdf.fields.find((entry) =>
      entry.domainKey === "line30_debt1"
    )?.pdfField,
    "topmostSubform[0].Page2[0].Table_SectionB[0].Line30[0].f2_37[0]",
  );
  const scheduleEXml = buildReviewedStockLossScheduleE(fields, {
    filer,
    pending,
  });
  assertEquals(
    scheduleEXml.includes("<NonpassiveLossAmt>2500</NonpassiveLossAmt>"),
    true,
  );
  const scheduleEPdf = scheduleEStockLossPdf.instances?.(fields, filer, pending)
    ?.[0];
  assertEquals(scheduleEPdf?.line41, -2_500);
  assertThrows(
    () =>
      buildReviewedStockLoss7203(fields, {
        filer,
        pending: {
          ...pending,
          schedule1: {
            line5_schedule_e: -500,
            line10_total_additional_income: -500,
          },
        },
      }),
    Error,
    "must match Schedule 1 line 5",
  );
});
