import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { buildReviewedStockLossScheduleE, scheduleEStockLoss } from "./schedule_e_stock_loss.ts";

const filer = {
  primarySSN: "123456789",
  nameLine1: "Alex Taxpayer",
  nameControl: "TAXP",
  address: { line1: "1 Main St", city: "Wilmington", state: "DE", zip: "19801" },
  filingStatus: FilingStatus.Single,
};
const ledger = {
  shareholder_ssn: "123456789",
  shareholder_name_as_on_k1: "Alex Taxpayer",
  corporation_ein: "987654321",
  beginning_stock_basis: 3_000,
  beginning_basis_workpaper_reference: "2024 stock basis workpaper",
  original_shareholder: true,
  all_shares_one_stock_block: true,
  no_current_year_stock_transactions: true,
  no_section_1367_1_g_election: true,
  no_other_2025_stock_basis_changes: true,
  no_other_schedule_e_activity: true,
  materially_participated_in_s_corporation: true,
  material_participation_workpaper_reference: "2025 participation log",
  no_shareholder_debt_or_repayments: true,
  no_prior_year_suspended_losses: true,
  no_at_risk_or_passive_limitation: true,
};
const raw = { stock_basis_beginning: 3_000, ordinary_loss: 4_000 };
function context(item = ledger) {
  return {
    filer,
    pending: {
      k1_s_corp: { k1_s_corps: [{
        corporation_name: "Test S Corp",
        corporation_ein: "987654321",
        source_document_reference: "2025 S-corporation K-1",
        box1_ordinary_business: -4_000,
        form7203_stock_loss_ledger: item,
      }] },
      schedule1: { line5_schedule_e: -3_000, line10_total_additional_income: -3_000 },
      f1040: { line8_additional_income: -3_000 },
    },
  };
}

Deno.test("stock-only Schedule E native Part II row and lines 29b/31/32/41 reconcile", () => {
  const xml = buildReviewedStockLossScheduleE(raw, context());
  assertStringIncludes(xml, "<PartnershipOrSCorporationNm>Test S Corp</PartnershipOrSCorporationNm>");
  assertStringIncludes(xml, "<PartnershipSCorpCd>S</PartnershipSCorpCd>");
  assertStringIncludes(xml, "<BasisComputationRequiredInd>X</BasisComputationRequiredInd>");
  assertStringIncludes(xml, "<NonpassiveLossAmt>3000</NonpassiveLossAmt>");
  assertStringIncludes(xml, "<TotalNonpassiveLossAmt>3000</TotalNonpassiveLossAmt>");
  assertStringIncludes(xml, "<TotalPrtshpSCorpLossAmt>3000</TotalPrtshpSCorpLossAmt>");
  assertStringIncludes(xml, "<NetPrtshpSCorpIncomeOrLossAmt>-3000</NetPrtshpSCorpIncomeOrLossAmt>");
  assertStringIncludes(xml, "<TotalSuppIncomeOrLossAmt>-3000</TotalSuppIncomeOrLossAmt>");
  assertEquals(xml.indexOf("<TotalNonpassiveLossAmt>") < xml.indexOf("<TotalPrtshpSCorpLossAmt>"), true);
});

Deno.test("stock-only Schedule E rejects missing material participation and another activity", () => {
  assertThrows(() => buildReviewedStockLossScheduleE(raw, context({
    ...ledger,
    materially_participated_in_s_corporation: false,
  })), Error);
  assertThrows(() => buildReviewedStockLossScheduleE(raw, {
    ...context(), pending: { ...context().pending, schedule_e: { schedule_es: [{}] } },
  }), Error, "cannot combine");
});

Deno.test("stock-only Schedule E descriptor emits nothing without a Form 7203 source", () => {
  assertEquals(scheduleEStockLoss.build({}, context()), "");
});
