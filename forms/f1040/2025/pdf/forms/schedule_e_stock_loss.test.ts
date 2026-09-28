import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { scheduleEStockLossPdf } from "./schedule_e_stock_loss.ts";

const filer = {
  primarySSN: "123456789",
  nameLine1: "Alex Taxpayer",
  nameControl: "TAXP",
  address: { line1: "1 Main St", city: "Wilmington", state: "DE", zip: "19801" },
  filingStatus: FilingStatus.Single,
};
const raw = { stock_basis_beginning: 3_000, ordinary_loss: 4_000 };
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
const pending = {
  k1_s_corp: { k1_s_corps: [{
    corporation_name: "Test S Corp",
    corporation_ein: "987654321",
    source_document_reference: "2025 S-corporation K-1",
    box1_ordinary_business: -4_000,
    form7203_stock_loss_ledger: ledger,
  }] },
  schedule1: { line5_schedule_e: -3_000, line10_total_additional_income: -3_000 },
  f1040: { line8_additional_income: -3_000 },
};

Deno.test("stock-only Schedule E PDF maps official TY2025 page 2 row and totals", () => {
  const instance = scheduleEStockLossPdf.instances?.(raw, filer, pending)?.[0];
  assertEquals(scheduleEStockLossPdf.pageIndices?.(instance ?? {}), [1]);
  assertEquals(instance?.corporation_name, "Test S Corp");
  assertEquals(instance?.taxpayer_name, "Alex Taxpayer");
  assertEquals(instance?.taxpayer_ssn, "123456789");
  assertEquals(instance?.basis_required, true);
  assertEquals(instance?.line28i, 3_000);
  assertEquals(instance?.line29b_i, 3_000);
  assertEquals(instance?.line31, 3_000);
  assertEquals(instance?.line32, -3_000);
  assertEquals(instance?.line41, -3_000);
  const field = (key: string) => scheduleEStockLossPdf.fields.find((entry) => entry.domainKey === key)?.pdfField;
  assertEquals(field("line28i"), "topmostSubform[0].Page2[0].Table_Line28g-k[0].RowA[0].f2_17[0]");
  assertEquals(field("line41"), "topmostSubform[0].Page2[0].f2_78[0]");
});

Deno.test("stock-only Schedule E PDF rejects another Schedule E activity", () => {
  assertThrows(() => scheduleEStockLossPdf.instances?.(raw, filer, {
    ...pending, schedule_e: { schedule_es: [{}] },
  }), Error, "cannot combine");
});

Deno.test("stock-only Schedule E PDF emits no instance without Form 7203", () => {
  assertEquals(scheduleEStockLossPdf.instances?.({}, filer, pending), []);
});
