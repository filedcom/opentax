import { assertEquals, assertThrows } from "@std/assert";
import { buildStartNode } from "../../../../2025/start.ts";
import { inputNodes } from "../../../../2025/inputs.ts";
import { form4562, inputSchema } from "./index.ts";

const asset = {
  business_reference: "CONSULTING",
  activity_description: "Software consulting",
  asset_description: "Computer server",
  source_document_ref: "2025 equipment invoice 24",
  placed_in_service_date: "2025-03-01",
  cost: 100_000,
  elected_cost: 100_000,
  taxpayer_active_business_income: 100_000,
  taxpayer_active_business_income_source_ref:
    "2025 active-business income workpaper",
  prior_year_carryover: 0,
  prior_year_carryover_source_ref: "2024 Form 4562 line 13 review",
  business_use_pct: 100,
  is_listed_property: false,
  bonus_elected_out: true,
  no_other_depreciation_for_activity: true,
  no_other_depreciation_assets_on_return: true,
  return_asset_inventory_source_ref: "2025 fixed asset register",
  filing_status: "single",
} as const;

function compute(input: Record<string, unknown>) {
  return form4562.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
  );
}

Deno.test("Form 4562 one fully expensed Schedule C asset produces filed lines", () => {
  const result = compute({ asset });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "form4562");
  assertEquals(
    result.outputs[0].fields.line1_maximum_dollar_limitation,
    100_000,
  );
  assertEquals(result.outputs[0].fields.line2_total_cost, 100_000);
  assertEquals(result.outputs[0].fields.line3_threshold_cost, 4_000_000);
  assertEquals(result.outputs[0].fields.line9_tentative_deduction, 100_000);
  assertEquals(
    result.outputs[0].fields.line11_business_income_limitation,
    100_000,
  );
  assertEquals(
    result.outputs[0].fields.line12_section179_expense_deduction,
    100_000,
  );
  assertEquals(result.outputs[0].fields.line13_next_year_carryover, 0);
  assertEquals(result.outputs[0].fields.line22_total_depreciation, 100_000);
  // Schedule C line 13 already contains the depreciation. No false Schedule 1 entry.
  assertEquals(
    result.outputs.some((item) => item.nodeType === "schedule1"),
    false,
  );
});

Deno.test("Form 4562 taxpayer business-income limit creates next-year carryover", () => {
  const result = compute({
    asset: { ...asset, taxpayer_active_business_income: 60_000 },
  });
  assertEquals(
    result.outputs[0].fields.line11_business_income_limitation,
    60_000,
  );
  assertEquals(
    result.outputs[0].fields.line12_section179_expense_deduction,
    60_000,
  );
  assertEquals(result.outputs[0].fields.line13_next_year_carryover, 40_000);
  assertEquals(result.carryforwards?.section179_disallowed_next_year, 40_000);
});

Deno.test("Form 4562 refuses missing, residual, or ineligible asset facts", () => {
  assertThrows(() => compute({ asset: { ...asset, source_document_ref: "" } }));
  assertThrows(() => compute({ asset: { ...asset, elected_cost: 90_000 } }));
  assertThrows(() => compute({ asset: { ...asset, elected_cost: 110_000 } }));
  assertThrows(() =>
    compute({ asset: { ...asset, cost: 2_500_001, elected_cost: 2_500_001 } })
  );
  assertThrows(() => compute({ asset: { ...asset, cost: 100_000.25 } }));
  assertThrows(() =>
    compute({ asset: { ...asset, placed_in_service_date: "2025-02-30" } })
  );
  assertThrows(() => compute({ asset: { ...asset, filing_status: "mfs" } }));
  assertThrows(() =>
    compute({ asset: { ...asset, is_listed_property: true } })
  );
  assertThrows(() =>
    compute({ asset: { ...asset, bonus_elected_out: false } })
  );
});

Deno.test("Form 4562 rejects old aggregate-only inputs even beside a valid asset", () => {
  assertThrows(() => compute({ section_179_deduction: 10_000 }));
  assertThrows(() => compute({ asset, macrs_gds_basis: 5_000 }));
});

Deno.test("Form 4562 asset is registered as a public start-node input", () => {
  const start = buildStartNode(inputNodes);
  assertEquals(
    start.inputSchema.safeParse({
      form4562: { section_179_deduction: 100_000 },
    }).success,
    false,
  );
  const input = start.inputSchema.parse({ form4562: { asset } });
  const result = start.compute({ taxYear: 2025, formType: "f1040" }, input);
  assertEquals(
    result.outputs.find((item) => item.nodeType === "form4562")?.fields,
    {
      asset,
    },
  );
});
