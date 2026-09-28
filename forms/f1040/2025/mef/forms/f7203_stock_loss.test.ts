import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { buildReviewedStockLoss7203, form7203StockLoss } from "./f7203_stock_loss.ts";

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

const ledger = {
  shareholder_ssn: "123456789",
  shareholder_name_as_on_k1: "Alex Taxpayer",
  corporation_ein: "987654321",
  beginning_stock_basis: 3_000,
  beginning_basis_workpaper_reference: "2024 shareholder stock ledger",
  original_shareholder: true,
  all_shares_one_stock_block: true,
  no_current_year_stock_transactions: true,
  no_section_1367_1_g_election: true,
  no_other_2025_stock_basis_changes: true,
  no_other_schedule_e_activity: true,
  materially_participated_in_s_corporation: true,
  material_participation_workpaper_reference: "2025 shareholder participation log",
  no_shareholder_debt_or_repayments: true,
  no_prior_year_suspended_losses: true,
  no_at_risk_or_passive_limitation: true,
};

const source = {
  corporation_name: "Test S Corp",
  corporation_ein: "987654321",
  source_document_reference: "2025 S corporation K-1",
  box1_ordinary_business: -4_000,
  form7203_stock_loss_ledger: ledger,
};

Deno.test("Form 7203 descriptor emits nothing without its pending source", () => {
  assertEquals(form7203StockLoss.build({}, context()), "");
});

function context(item: Record<string, unknown> = source, allowed = 3_000) {
  return {
    filer,
    pending: {
      k1_s_corp: { k1_s_corps: [item] },
      schedule1: {
        line5_schedule_e: -allowed,
        line10_total_additional_income: -allowed,
      },
      f1040: { line8_additional_income: -allowed },
    },
  };
}

Deno.test("staged Form 7203 stock-only XML follows TY2025 line and group order", () => {
  const xml = buildReviewedStockLoss7203(
    { stock_basis_beginning: 3_000, ordinary_loss: 4_000 },
    context(),
  );
  assertStringIncludes(xml, "<ShareholderSSN>123456789</ShareholderSSN>");
  assertStringIncludes(xml, "<SCorporationName><BusinessNameLine1Txt>Test S Corp</BusinessNameLine1Txt></SCorporationName>");
  assertStringIncludes(xml, "<SCorporationEIN>987654321</SCorporationEIN>");
  assertStringIncludes(xml, "<StockBasisBeginTaxYearAmt>3000</StockBasisBeginTaxYearAmt>");
  assertStringIncludes(xml, "<TotalDecreaseStockBasisAmt>3000</TotalDecreaseStockBasisAmt>");
  assertStringIncludes(xml, "<StockBasisEndTaxYearAmt>0</StockBasisEndTaxYearAmt>");
  assertStringIncludes(xml, "<ShrCarryoverAmountsGrp><OrdinaryBusinessLossAmt>1000</OrdinaryBusinessLossAmt><TotalAllowableLossAmt>1000</TotalAllowableLossAmt></ShrCarryoverAmountsGrp>");
  assertEquals(xml.indexOf("<ShrCurrentYrLossDeductionsGrp>") <
    xml.indexOf("<ShrAllwblLossFromStockBasisGrp>"), true);
  assertEquals(xml.indexOf("<ShrAllwblLossFromStockBasisGrp>") <
    xml.indexOf("<ShrCarryoverAmountsGrp>"), true);
});

Deno.test("staged Form 7203 rejects a pending amount or shareholder mismatch", () => {
  assertThrows(
    () => buildReviewedStockLoss7203(
      { stock_basis_beginning: 2_000, ordinary_loss: 4_000 },
      context(),
    ),
    Error,
    "same single-source stock-only loss",
  );
  assertThrows(
    () => buildReviewedStockLoss7203(
      { stock_basis_beginning: 3_000, ordinary_loss: 4_000 },
      context({ ...source, form7203_stock_loss_ledger: {
        ...ledger,
        shareholder_ssn: "999999999",
      } }),
    ),
    Error,
    "same single-source stock-only loss",
  );
});

Deno.test("staged Form 7203 rejects mixed K-1 basis items", () => {
  assertThrows(
    () => buildReviewedStockLoss7203(
      { stock_basis_beginning: 3_000, ordinary_loss: 4_000 },
      context({ ...source, box4_interest: 200 }),
    ),
    Error,
    "same single-source stock-only loss",
  );
  assertThrows(
    () => buildReviewedStockLoss7203(
      { stock_basis_beginning: 3_000, ordinary_loss: 4_000, new_loans: 1 },
      context(),
    ),
    Error,
    "does not accept unreviewed basis fields",
  );
});

Deno.test("staged Form 7203 zero basis skips line 10 and column c", () => {
  const xml = buildReviewedStockLoss7203(
    { stock_basis_beginning: 0, ordinary_loss: 4_000 },
    context({
      ...source,
      form7203_stock_loss_ledger: { ...ledger, beginning_stock_basis: 0 },
    }, 0),
  );
  assertEquals(xml.includes("<StockBasisBeforeLossDedAmt>"), false);
  assertEquals(xml.includes("<ShrAllwblLossFromStockBasisGrp>"), false);
  assertStringIncludes(xml, "<StockBasisEndTaxYearAmt>0</StockBasisEndTaxYearAmt>");
  assertStringIncludes(xml, "<ShrCarryoverAmountsGrp><OrdinaryBusinessLossAmt>4000</OrdinaryBusinessLossAmt>");
});

Deno.test("staged Form 7203 rejects a filed Schedule 1/1040 loss mismatch", () => {
  const mismatched = context();
  assertThrows(() => buildReviewedStockLoss7203(
    { stock_basis_beginning: 3_000, ordinary_loss: 4_000 },
    {
      ...mismatched,
      pending: {
        ...mismatched.pending,
        schedule1: {
          line5_schedule_e: -4_000,
          line10_total_additional_income: -4_000,
        },
        f1040: { line8_additional_income: -4_000 },
      },
    },
  ), Error, "must match Schedule 1 line 5");
});
