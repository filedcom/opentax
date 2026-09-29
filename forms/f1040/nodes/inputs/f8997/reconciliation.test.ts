import { assertEquals, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../../2025/registry.ts";
import { reconcileForm8997Pending } from "./reconciliation.ts";

const source = {
  tax_year: 2025,
  complete_annual_ledger_confirmed: true,
  reviewed_annual_workpaper_reference: "reviewed-qof-2025",
  prior_year: { kind: "first_year" },
  investment_lots: [{
    lot_id: "lot-1",
    qof_ein: "123456789",
    acquired_date: "2025-03-20",
    description: "QOF interest",
    qof_source_document_reference: "fund-subscription",
    reviewed_workpaper_reference: "lot-1-rollforward",
    opening_deferred_gain: { short_term: 0, long_term: 0 },
    new_deferral: {
      kind: "new_election",
      deferred_gain: { short_term: 20_000, long_term: 0 },
      gain_realized_date: "2025-01-20",
      source_gain_references: ["stock-sale-1"],
      form8949_code_z_rows: { short_term_row_reference: "qof-z-1" },
    },
    events: [],
    closing_deferred_gain: { short_term: 20_000, long_term: 0 },
  }],
  uninvested_deferred_gain_at_year_end: { short_term: 0, long_term: 0 },
  foreign_eligible_taxpayer: false,
  treaty_benefits_waived: false,
  no_form1099b_for_disposition: false,
};

const form8949Inputs = [{
  part: "A",
  description: "Stock sale",
  source_transaction_id: "stock-sale-1",
  date_acquired: "2024-06-01",
  date_sold: "2025-01-20",
  proceeds: 30_000,
  cost_basis: 10_000,
}, {
  part: "C",
  description: "123456789",
  source_transaction_id: "qof-z-1",
  date_acquired: "2025-03-20",
  date_sold: "",
  proceeds: 0,
  cost_basis: 0,
  adjustment_codes: "Z",
  adjustment_amount: -20_000,
}];

Deno.test("Form 8997 reconciles code Z to actual executor Form 8949 and Schedule D rows", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { f8997: source, f8949: form8949Inputs },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(
    result.diagnostics.some((entry) =>
      entry.nodeType === "f8997" &&
      entry.message.includes("needs finalized Form 8949")
    ),
    true,
  );
  assertEquals(
    reconcileForm8997Pending(result.pending).part_ii.totals.short_term,
    20_000,
  );
  const changed = structuredClone(result.pending) as Record<
    string,
    Record<string, unknown>
  >;
  const rows = changed.schedule_d.transaction as Array<Record<string, unknown>>;
  rows[1].part = "F";
  assertThrows(
    () => reconcileForm8997Pending(changed),
    Error,
    "differs between Form 8949 and Schedule D",
  );
});
