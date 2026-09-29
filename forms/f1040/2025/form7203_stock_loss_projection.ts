import { z } from "zod";
import type { FilerIdentity } from "../mef/header.ts";
import { inputSchema as k1SCorpInputSchema } from "../nodes/inputs/k1_s_corp/index.ts";
import { inputSchema as form7203InputSchema } from "../nodes/intermediate/forms/form7203/index.ts";
import { reviewedStockLossLedgerSchema } from "../nodes/intermediate/forms/form7203/stock-ledger.ts";

const pendingRecordSchema = z.record(z.string(), z.unknown());

// Shared by the staged native and PDF projections. It is deliberately strict:
// the historical loose basis number is not a filing-source alternative.
export function projectReviewedStockLoss7203(
  rawFields: Record<string, unknown>,
  allPending: Readonly<Record<string, unknown>>,
  filer: FilerIdentity | undefined,
) {
  if (!filer) {
    throw new Error("Form 7203 stock-loss projection needs the identified filer");
  }
  if (!allPending.k1_s_corp) {
    throw new Error("Form 7203 stock-loss projection needs a reviewed S-corporation K-1");
  }
  const k1Sources = k1SCorpInputSchema.parse(allPending.k1_s_corp).k1_s_corps;
  if (k1Sources.length !== 1) {
    throw new Error(
      "Form 7203 stock-loss projection currently needs exactly one S-corporation K-1",
    );
  }
  const source = k1Sources[0];
  const ledger = reviewedStockLossLedgerSchema.parse(
    source.form7203_stock_loss_ledger,
  );
  if (Object.keys(rawFields).some((key) =>
    key !== "stock_basis_beginning" && key !== "ordinary_loss"
  )) {
    throw new Error(
      "Form 7203 stock-loss projection does not accept unreviewed basis fields",
    );
  }
  const fields = form7203InputSchema.parse(rawFields);
  const currentLoss = -(source.box1_ordinary_business ?? 0);
  const basis = ledger.beginning_stock_basis;
  const normalizedName = (value: string) =>
    value.trim().toUpperCase().replace(/\s+/g, " ");
  const validBusinessName = /^([A-Za-z0-9#\-()&'] ?)*[A-Za-z0-9#\-()&']$/;
  if (
    !Number.isSafeInteger(currentLoss) || currentLoss <= 0 ||
    source.corporation_ein !== ledger.corporation_ein ||
    source.corporation_name.length > 75 ||
    !validBusinessName.test(source.corporation_name) ||
    !source.source_document_reference ||
    source.stock_basis_beginning !== undefined ||
    source.debt_basis_beginning !== undefined ||
    ledger.shareholder_ssn !== filer.primarySSN ||
    normalizedName(ledger.shareholder_name_as_on_k1) !==
      normalizedName(filer.fullName ?? filer.nameLine1) ||
    fields.stock_basis_beginning !== basis ||
    fields.ordinary_loss !== currentLoss ||
    [
      source.box2_rental_re,
      source.box3_other_rental,
      source.box4_interest,
      source.box5a_ordinary_dividends,
      source.box6_royalties,
      source.box7_net_st_cap_gain,
      source.box8a_net_lt_cap_gain,
      source.box9_net_1231,
      source.box10_other_income,
      source.box11_section_179,
      source.box12_other_deductions,
      source.box12_code_h_investment_interest,
      source.box16_tax_exempt_income,
      source.box17_distributions,
      source.pre2018_suspended_losses,
      source.pre2018_at_risk_suspended,
    ].some((amount) => (amount ?? 0) !== 0)
  ) {
    throw new Error(
      "Form 7203 stock-loss projection needs the same single-source stock-only loss and basis as the K-1",
    );
  }

  const allowed = Math.min(currentLoss, basis);
  const carryover = currentLoss - allowed;
  const schedule1 = pendingRecordSchema.parse(allPending.schedule1);
  const form1040 = pendingRecordSchema.parse(allPending.f1040);
  const printedLine5 = schedule1.line5_schedule_e;
  const schedule1Line10 = schedule1.line10_total_additional_income;
  const form1040Line8 = form1040.line8_additional_income;
  if (
    printedLine5 !== -allowed ||
    typeof schedule1Line10 !== "number" ||
    (form1040Line8 ?? 0) !== schedule1Line10
  ) {
    throw new Error(
      "Form 7203 allowed stock loss must match Schedule 1 line 5 and Form 1040 line 8",
    );
  }

  return { source, ledger, basis, currentLoss, allowed, carryover };
}
