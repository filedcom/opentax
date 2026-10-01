import { assertEquals, assertThrows } from "@std/assert";
import { k1SCorpNode } from "../../../inputs/k1_s_corp/index.ts";
import { reconcileOneNoteDebtCandidate } from "./debt-note.ts";
import { buildReviewedStockLoss7203 } from "../../../../2025/mef/forms/f7203_stock_loss.ts";
import { form7203StockLossPdf } from "../../../../2025/pdf/forms/f7203_stock_loss.ts";
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

Deno.test("Form 7203 reviewed debt candidate never posts through stock-only K-1 calculation", () => {
  const parsed = k1SCorpNode.inputSchema.parse({ k1_s_corps: [oneNoteK1] });
  assertThrows(
    () => k1SCorpNode.compute({ taxYear: 2025, formType: "f1040" }, parsed),
    Error,
    "Part II and Part III debt columns are not registered",
  );
});

Deno.test("Form 7203 native and PDF stock-only descriptors reject a reviewed debt candidate", () => {
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
    schedule1: { line5_schedule_e: -500, line10_total_additional_income: -500 },
    f1040: { line8_additional_income: -500 },
  };
  const stockOnlyFields = { stock_basis_beginning: 500, ordinary_loss: 4_000 };
  assertThrows(
    () => buildReviewedStockLoss7203(stockOnlyFields, { filer, pending }),
    Error,
    "Part II and Part III debt columns are not registered",
  );
  assertThrows(
    () => form7203StockLossPdf.instances?.(stockOnlyFields, filer, pending),
    Error,
    "Part II and Part III debt columns are not registered",
  );
});
