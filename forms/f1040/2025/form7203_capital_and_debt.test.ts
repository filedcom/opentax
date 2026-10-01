import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { FilingStatus as InputFilingStatus } from "../nodes/types.ts";
import { FilingStatus as MefFilingStatus } from "../mef/header.ts";
import { normalizeAllPending } from "./pending.ts";
import { buildReviewedStockLoss7203 } from "./mef/forms/f7203_stock_loss.ts";
import { form7203StockLossPdf } from "./pdf/forms/f7203_stock_loss.ts";

const contribution = {
  amount: 1_000,
  contributed_date: "2025-02-10",
  shareholder_ssn: "123456789",
  corporation_ein: "987654321",
  bank_transfer_reference: "shareholder bank capital transfer 2025-02-10",
  corporate_capital_account_reference: "corporate capital ledger 2025-02-10",
  cash_received_by_corporation_confirmed: true,
  no_shares_issued_confirmed: true,
  not_a_shareholder_loan_confirmed: true,
};

const ledger = {
  shareholder_ssn: "123456789",
  shareholder_name_as_on_k1: "Alex Taxpayer",
  corporation_ein: "987654321",
  beginning_stock_basis: 500,
  beginning_basis_workpaper_reference: "2024 stock basis workpaper",
  cash_capital_contribution: contribution,
  original_shareholder: true,
  all_shares_one_stock_block: true,
  no_current_year_stock_transactions: true,
  no_section_1367_1_g_election: true,
  no_other_2025_stock_basis_changes: true,
  no_other_schedule_e_activity: true,
  materially_participated_in_s_corporation: true,
  material_participation_workpaper_reference: "2025 participation log",
  no_shareholder_debt_or_repayments: false,
  no_prior_year_suspended_losses: true,
  no_at_risk_or_passive_limitation: true,
};

const note = {
  kind: "new_2025_formal_notes",
  shareholder_ssn: "123456789",
  corporation_ein: "987654321",
  k1_source_document_reference: "2025 signed S corporation K-1",
  beginning_stock_basis: 500,
  beginning_stock_basis_workpaper_reference: "2024 stock basis workpaper",
  current_box1_ordinary_loss: 4_000,
  formal_note_id: "formal note 2025-01",
  signed_note_document_reference: "signed formal note 2025-01",
  note_execution_date: "2025-03-10",
  shareholder_lender_ssn: "123456789",
  corporate_borrower_ein: "987654321",
  bank_transfer_reference: "shareholder bank loan transfer 2025-03-10",
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

const source = {
  corporation_name: "Test S Corp",
  corporation_ein: "987654321",
  source_document_reference: "2025 signed S corporation K-1",
  recipient_tin: "123456789",
  box1_ordinary_business: -4_000,
  form7203_stock_loss_ledger: ledger,
  form7203_debt_evidence: note,
};

const filer = {
  primarySSN: "123456789",
  nameLine1: "Alex Taxpayer",
  fullName: "Alex Taxpayer",
  nameControl: "TAXP",
  filingStatus: MefFilingStatus.Single,
  address: {
    line1: "1 Main St",
    city: "Wilmington",
    state: "DE",
    zip: "19801",
  },
};

function filedReturn(k1 = source) {
  const result = f1040_2025.executeReturn({
    general: {
      filing_status: InputFilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Main St",
      address_city: "Wilmington",
      address_state: "DE",
      address_zip: "19801",
    },
    w2: [{ box1_wages: 50_000, box2_fed_withheld: 8_000 }],
    k1_s_corp: { k1_s_corps: [k1] },
  });
  return result;
}

Deno.test("Form 7203 cash capital and separate new note allocate current K-1 loss through return, native and PDF", async () => {
  const result = filedReturn();
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.schedule1.line5_schedule_e, -3_500);
  assertEquals(pending.f1040.line8_additional_income, -3_500);
  assertEquals(pending.f1040.line11_agi, 46_500);
  assertEquals(result.carryforwards.suspended_scorp_loss_7203, 500);
  const xml = buildReviewedStockLoss7203(pending.form7203, {
    filer,
    pending,
  });
  assertStringIncludes(
    xml,
    "<CapitalContributionBasisAmt>1000</CapitalContributionBasisAmt>",
  );
  assertStringIncludes(
    xml,
    "<StockBasisBeforeLossDedAmt>1500</StockBasisBeforeLossDedAmt>",
  );
  assertStringIncludes(xml, "<AdditionalLoansAmt>2000</AdditionalLoansAmt>");
  assertStringIncludes(xml, "<AllowableLossAmt>2000</AllowableLossAmt>");
  const printed = form7203StockLossPdf.instances?.(
    pending.form7203,
    filer,
    pending,
  )?.[0];
  assertEquals(printed?.line2_cash_capital_contribution, 1_000);
  assertEquals(printed?.line11_allowable_stock_loss, 1_500);
  assertEquals(printed?.line30_debt1, 2_000);
  assertEquals(printed?.line47_carryover, 500);
  const prepared = await f1040_2025.prepareReturn(result.pending, filer);
  assertStringIncludes(prepared.bundle.xml, "<IRS7203 ");
  assertStringIncludes(
    prepared.bundle.xml,
    "<CapitalContributionBasisAmt>1000</CapitalContributionBasisAmt>",
  );
  assertStringIncludes(prepared.bundle.xml, "<IRS1040ScheduleE ");
  await prepared.renderPdf();
});

Deno.test("Form 7203 capital-and-debt route rejects overlapping source and altered pending return", () => {
  const overlap = filedReturn({
    ...source,
    form7203_stock_loss_ledger: {
      ...ledger,
      cash_capital_contribution: {
        ...contribution,
        bank_transfer_reference: note.bank_transfer_reference,
      },
    },
  });
  assertEquals(
    overlap.diagnostics.some((item) => item.severity === "error"),
    true,
  );

  const result = filedReturn();
  const pending = normalizeAllPending(result.pending);
  assertThrows(() =>
    buildReviewedStockLoss7203(pending.form7203, {
      filer,
      pending: {
        ...pending,
        schedule1: { ...pending.schedule1, line5_schedule_e: -3_499 },
      },
    })
  );
  assertThrows(() =>
    form7203StockLossPdf.instances?.(
      { ...pending.form7203, additional_contributions: 1_001 },
      filer,
      pending,
    )
  );
});
