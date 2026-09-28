import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { form7203StockLossPdf } from "./f7203_stock_loss.ts";

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

function pending(basis = 3_000, printedLoss = -Math.min(4_000, basis)) {
  return {
    k1_s_corp: {
      k1_s_corps: [{
        corporation_name: "Test S Corp",
        corporation_ein: "987654321",
        source_document_reference: "2025 S corporation K-1",
        box1_ordinary_business: -4_000,
        form7203_stock_loss_ledger: {
          ...ledger,
          beginning_stock_basis: basis,
        },
      }],
    },
    schedule1: {
      line5_schedule_e: printedLoss,
      line10_total_additional_income: printedLoss,
    },
    f1040: { line8_additional_income: printedLoss },
  };
}

Deno.test("staged Form 7203 PDF maps the two-page stock-only source", () => {
  const instance = form7203StockLossPdf.instances?.(
    { stock_basis_beginning: 3_000, ordinary_loss: 4_000 },
    filer,
    pending(),
  )?.[0];
  assertEquals(instance?.line1_beginning_basis, 3_000);
  assertEquals(instance?.line11_allowable_stock_loss, 3_000);
  assertEquals(instance?.line15_ending_basis, 0);
  assertEquals(instance?.line35_current_loss, 4_000);
  assertEquals(instance?.line35_allowed_stock, 3_000);
  assertEquals(instance?.line35_carryover, 1_000);
  assertEquals(instance?.line47_carryover, 1_000);
  const field = (key: string) =>
    form7203StockLossPdf.fields.find((entry) => entry.domainKey === key)
      ?.pdfField;
  assertEquals(field("line1_beginning_basis"), "topmostSubform[0].Page1[0].f1_07[0]");
  assertEquals(field("line11_allowable_stock_loss"), "topmostSubform[0].Page1[0].f1_31[0]");
  assertEquals(field("line35_allowed_stock"), "topmostSubform[0].Page2[0].Table_Part3[0].Line35[0].f2_59[0]");
  assertEquals(field("line47_carryover"), "topmostSubform[0].Page2[0].Table_Part3[0].Line47[0].f2_122[0]");
});

Deno.test("staged Form 7203 PDF skips zero-basis stock allowance", () => {
  const instance = form7203StockLossPdf.instances?.(
    { stock_basis_beginning: 0, ordinary_loss: 4_000 },
    filer,
    pending(0),
  )?.[0];
  assertEquals(instance?.line7_basis_after_distributions, 0);
  assertEquals(instance?.line10_basis_before_loss, undefined);
  assertEquals(instance?.line35_allowed_stock, undefined);
  assertEquals(instance?.line35_carryover, 4_000);
});

Deno.test("staged Form 7203 PDF rejects Schedule 1 printed-line mismatch", () => {
  assertThrows(() => form7203StockLossPdf.instances?.(
    { stock_basis_beginning: 3_000, ordinary_loss: 4_000 },
    filer,
    pending(3_000, -4_000),
  ), Error, "must match Schedule 1 line 5");
});
