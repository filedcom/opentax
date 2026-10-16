import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateLandDispositionAmounts2026,
  calculateLandDispositions2026,
} from "./land-disposition-source.ts";
import { landDispositionFixture2026 } from "./land-disposition.fixture.ts";
Deno.test("2026 land loss amounts are available before limits without inventing a deductible loss vintage", () => {
  const f = landDispositionFixture2026();
  f.claim.sales[0].closing.gross_sales_price = 50000;
  const before = structuredClone(f), a = calculateLandDispositionAmounts2026(f);
  assertEquals(a.line8_net_section1231, -5000);
  assertEquals(a.line20b_schedule1_gain_loss, -5000);
  assertEquals(a.history_finalized, false);
  assertEquals("opening_2027_losses" in a, false);
  assertEquals("history" in a, false);
  assertEquals(a.opening_history.opening_nonrecaptured_loss, 5000);
  assertEquals(f, before);
  assertThrows(
    () => calculateLandDispositions2026(f),
    Error,
    "current loss needs",
  );
  const r = calculateLandDispositions2026(f, {
    amount_taken_into_account: 2000,
    finalized_limitation_workpaper_reference: "loss-owner",
  });
  assertEquals(r.history_finalized, true);
  assertEquals(r.line20b_schedule1_gain_loss, a.line20b_schedule1_gain_loss);
  assertEquals(r.opening_2027_losses, [{
    loss_year: 2026,
    remaining_loss: 2000,
  }]);
});
Deno.test("2026 preliminary character uses reviewed prior history and rejects an early allowed-loss override", () => {
  const f = landDispositionFixture2026(),
    a = calculateLandDispositionAmounts2026(f),
    r = calculateLandDispositions2026(f);
  assertEquals([
    a.line8_net_section1231,
    a.line9_nonrecaptured_loss,
    a.line10_long_term_gain,
    a.line13_prior_loss_recapture,
  ], [45000, 5000, 40000, 5000]);
  assertEquals(a.rows, r.rows);
  assertEquals(a.opening_history.prior_years, r.history.prior_years);
  f.claim.prior_history.current_year_loss_taken_into_account = 0;
  assertThrows(
    () => calculateLandDispositionAmounts2026(f),
    Error,
    "finalized limitation owner",
  );
  delete f.claim.prior_history.current_year_loss_taken_into_account;
  f.claim.prior_history.filed_years[4].filed_line12_recaptured_gain = 1;
  assertThrows(() => calculateLandDispositionAmounts2026(f), Error, "conflict");
});
Deno.test("2026 land information-return gross totals aggregate cents before printing", () => {
  const f = landDispositionFixture2026(),
    a = f.claim.sales[0],
    b = structuredClone(a);
  b.sale_reference = "sale-2";
  b.property_reference = "parcel-2";
  b.acquisition_record_reference = "purchase-2";
  b.closing.closing_record_reference = "closing-2";
  b.closing.selling_expenses[0].record_reference = "commission-2";
  f.claim.sales = [a, b];
  for (const [i, s] of f.claim.sales.entries()) {
    s.closing.gross_sales_price = i ? 101.01 : 100.49;
    s.information_return = {
      kind: "1099-S",
      tax_year: 2026,
      source_document_reference: `issued-${i}`,
      filer_tin: "112233445",
      transferor_tin: s.owner_tin,
      box1_date_closing: s.closing.settled_on,
      box2_gross_proceeds: s.closing.gross_sales_price,
      corrected: false,
      superseded_document_references: [],
      no_non_cash_consideration_foreign_transferor_or_special_adjustments: true,
    };
  }
  const r = calculateLandDispositionAmounts2026(f);
  assertEquals(r.line1a_information_return_proceeds, 202);
  assertEquals(r.rows.map((r) => r.printed.gross_sales_price), [100, 101]);
});
