import { assertEquals, assertThrows } from "@std/assert";
import { f5471, FilingCategory } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    foreign_corp_name: "Acme Foreign Corp",
    country_of_incorporation: "Ireland",
    filing_category: FilingCategory.Category5,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f5471.compute({ taxYear: 2025 }, { f5471s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f5471.inputSchema: valid minimal item passes", () => {
  const parsed = f5471.inputSchema.safeParse({ f5471s: [minimalItem()] });
  assertEquals(parsed.success, true);
});

Deno.test("f5471.inputSchema: empty array fails (min 1)", () => {
  const parsed = f5471.inputSchema.safeParse({ f5471s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f5471.inputSchema: missing foreign_corp_name fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).foreign_corp_name;
  const parsed = f5471.inputSchema.safeParse({ f5471s: [item] });
  assertEquals(parsed.success, false);
});

Deno.test("f5471.inputSchema: missing country_of_incorporation fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).country_of_incorporation;
  const parsed = f5471.inputSchema.safeParse({ f5471s: [item] });
  assertEquals(parsed.success, false);
});

Deno.test("f5471.inputSchema: missing filing_category fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).filing_category;
  const parsed = f5471.inputSchema.safeParse({ f5471s: [item] });
  assertEquals(parsed.success, false);
});

Deno.test("f5471.inputSchema: invalid filing_category fails", () => {
  const parsed = f5471.inputSchema.safeParse({
    f5471s: [minimalItem({ filing_category: "9" })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f5471.inputSchema: all valid filing categories pass", () => {
  for (const cat of Object.values(FilingCategory)) {
    const parsed = f5471.inputSchema.safeParse({ f5471s: [minimalItem({ filing_category: cat })] });
    assertEquals(parsed.success, true);
  }
});

Deno.test("f5471.inputSchema: optional fields absent — valid", () => {
  const parsed = f5471.inputSchema.safeParse({ f5471s: [minimalItem()] });
  assertEquals(parsed.success, true);
});

Deno.test("f5471.inputSchema: negative subpart_f_income fails", () => {
  const parsed = f5471.inputSchema.safeParse({
    f5471s: [minimalItem({ subpart_f_income: -100 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f5471.inputSchema: negative gilti_inclusion fails", () => {
  const parsed = f5471.inputSchema.safeParse({
    f5471s: [minimalItem({ gilti_inclusion: -500 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f5471.inputSchema: negative foreign_taxes_paid_subpart_f fails", () => {
  const parsed = f5471.inputSchema.safeParse({
    f5471s: [minimalItem({ foreign_taxes_paid_subpart_f: -50 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f5471.inputSchema: negative foreign_taxes_paid_gilti fails", () => {
  const parsed = f5471.inputSchema.safeParse({
    f5471s: [minimalItem({ foreign_taxes_paid_gilti: -20 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f5471.inputSchema: optional string fields accepted", () => {
  const parsed = f5471.inputSchema.safeParse({
    f5471s: [minimalItem({
      foreign_corp_ein_or_reference_id: "98-1234567",
      functional_currency: "EUR",
    })],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f5471.inputSchema: negative previously_excluded_subpart_f_income fails", () => {
  const parsed = f5471.inputSchema.safeParse({
    f5471s: [minimalItem({ previously_excluded_subpart_f_income: -200 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f5471.inputSchema: negative factoring_income fails", () => {
  const parsed = f5471.inputSchema.safeParse({
    f5471s: [minimalItem({ factoring_income: -10 })],
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Subpart F Income Routing
// =============================================================================

Deno.test("f5471.compute: subpart_f_income > 0 — routes to schedule1 line8z_other", () => {
  const result = compute([minimalItem({ subpart_f_income: 10000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
});

Deno.test("f5471.compute: subpart_f_income = 0 — no schedule1 output", () => {
  const result = compute([minimalItem({ subpart_f_income: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f5471.compute: subpart_f_income absent — no schedule1 output", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f5471.compute: subpart_f_income routes correct amount to schedule1", () => {
  const result = compute([minimalItem({ subpart_f_income: 15000 })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, 15000);
});

Deno.test("f5471.compute: previously_excluded_subpart_f_income > 0 — routes to schedule1", () => {
  const result = compute([minimalItem({ previously_excluded_subpart_f_income: 5000 })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, 5000);
});

Deno.test("f5471.compute: factoring_income > 0 — routes to schedule1", () => {
  const result = compute([minimalItem({ factoring_income: 3000 })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, 3000);
});

Deno.test("f5471.compute: all three subpart_f components summed", () => {
  const result = compute([minimalItem({
    subpart_f_income: 10000,
    previously_excluded_subpart_f_income: 2000,
    factoring_income: 1000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, 13000);
});

// =============================================================================
// 3. GILTI Inclusion Routing
// =============================================================================

Deno.test("f5471.compute: gilti_inclusion > 0 — routes to schedule1 line8z_other", () => {
  const result = compute([minimalItem({ gilti_inclusion: 8000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
});

Deno.test("f5471.compute: gilti_inclusion = 0 — no schedule1 output", () => {
  const result = compute([minimalItem({ gilti_inclusion: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f5471.compute: gilti_inclusion absent — no schedule1 output", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f5471.compute: gilti_inclusion routes correct amount to schedule1", () => {
  const result = compute([minimalItem({ gilti_inclusion: 20000 })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, 20000);
});

// =============================================================================
// 4. Combined Subpart F + GILTI Routing
// =============================================================================

Deno.test("f5471.compute: subpart_f_income + gilti_inclusion summed in single schedule1 output", () => {
  const result = compute([minimalItem({
    subpart_f_income: 10000,
    gilti_inclusion: 5000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, 15000);
  assertEquals(result.outputs.filter((o) => o.nodeType === "schedule1").length, 1);
});

// =============================================================================
// 5. Aggregation — multiple corporations
// =============================================================================

Deno.test("f5471.compute: multiple corps — subpart_f incomes summed into one schedule1 output", () => {
  const result = compute([
    minimalItem({ subpart_f_income: 10000, foreign_corp_name: "Corp A" }),
    minimalItem({ subpart_f_income: 6000, foreign_corp_name: "Corp B" }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, 16000);
  assertEquals(result.outputs.filter((o) => o.nodeType === "schedule1").length, 1);
});

Deno.test("f5471.compute: multiple corps — gilti summed across corps", () => {
  const result = compute([
    minimalItem({ gilti_inclusion: 7000, foreign_corp_name: "Corp A" }),
    minimalItem({ gilti_inclusion: 3000, foreign_corp_name: "Corp B" }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, 10000);
});

Deno.test("f5471.compute: multiple corps, mixed — all income types summed", () => {
  const result = compute([
    minimalItem({
      subpart_f_income: 8000,
      gilti_inclusion: 4000,
      foreign_corp_name: "Corp A",
    }),
    minimalItem({
      subpart_f_income: 2000,
      previously_excluded_subpart_f_income: 1000,
      foreign_corp_name: "Corp B",
    }),
    minimalItem({
      gilti_inclusion: 5000,
      foreign_corp_name: "Corp C",
    }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  // 8000 + 4000 + 2000 + 1000 + 5000 = 20000
  assertEquals(fields.line8z_other, 20000);
});

Deno.test("f5471.compute: multiple corps with no income — no output", () => {
  const result = compute([
    minimalItem({ foreign_corp_name: "Corp A" }),
    minimalItem({ foreign_corp_name: "Corp B" }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 6. Hard Validation — schema throws
// =============================================================================

Deno.test("f5471.compute: throws on negative subpart_f_income", () => {
  assertThrows(
    () => compute([minimalItem({ subpart_f_income: -1000 })]),
    Error,
  );
});

Deno.test("f5471.compute: throws on negative gilti_inclusion", () => {
  assertThrows(
    () => compute([minimalItem({ gilti_inclusion: -500 })]),
    Error,
  );
});

Deno.test("f5471.compute: does not throw when all optional income fields absent", () => {
  const result = compute([minimalItem()]);
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 7. Foreign taxes — informational, no routing
// =============================================================================

Deno.test("f5471.compute: foreign_taxes_paid_subpart_f present — no additional outputs", () => {
  const result = compute([minimalItem({ foreign_taxes_paid_subpart_f: 3000 })]);
  // No income to route — no outputs
  assertEquals(result.outputs.length, 0);
});

Deno.test("f5471.compute: foreign_taxes_paid_gilti with gilti_income routes only schedule1", () => {
  const result = compute([minimalItem({
    gilti_inclusion: 10000,
    foreign_taxes_paid_gilti: 2500,
  })]);
  // Only schedule1 — taxes are informational
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule1");
});

// =============================================================================
// 8. Output count — one output per nodeType
// =============================================================================

Deno.test("f5471.compute: exactly one schedule1 output regardless of item count", () => {
  const result = compute([
    minimalItem({ subpart_f_income: 5000, foreign_corp_name: "A" }),
    minimalItem({ subpart_f_income: 3000, foreign_corp_name: "B" }),
  ]);
  assertEquals(result.outputs.filter((o) => o.nodeType === "schedule1").length, 1);
});

// =============================================================================
// 9. Edge Cases
// =============================================================================

Deno.test("f5471.compute: category 1 filer with no income — no output", () => {
  const result = compute([minimalItem({ filing_category: FilingCategory.Category1 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f5471.compute: category 4 filer with subpart_f_income — routes to schedule1", () => {
  const result = compute([minimalItem({
    filing_category: FilingCategory.Category4,
    subpart_f_income: 25000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, 25000);
});

Deno.test("f5471.compute: E&P fields present do not create extra outputs", () => {
  const result = compute([minimalItem({
    current_ep: 50000,
    accumulated_ep_beginning: 100000,
    accumulated_ep_ending: 150000,
  })]);
  // E&P is informational — no income inclusion
  assertEquals(result.outputs.length, 0);
});

Deno.test("f5471.compute: E&P fields with income — still only one schedule1 output", () => {
  const result = compute([minimalItem({
    subpart_f_income: 10000,
    current_ep: 50000,
    accumulated_ep_beginning: 100000,
    accumulated_ep_ending: 150000,
  })]);
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule1");
});

// =============================================================================
// 10. Smoke Test
// =============================================================================

Deno.test("f5471.compute: smoke test — three CFCs, all income types", () => {
  const result = compute([
    minimalItem({
      foreign_corp_name: "Irish Holding Ltd",
      foreign_corp_ein_or_reference_id: "98-0001234",
      country_of_incorporation: "Ireland",
      functional_currency: "EUR",
      filing_category: FilingCategory.Category5,
      subpart_f_income: 50000,
      previously_excluded_subpart_f_income: 5000,
      factoring_income: 2000,
      gilti_inclusion: 30000,
      foreign_taxes_paid_subpart_f: 12000,
      foreign_taxes_paid_gilti: 7500,
      current_ep: 200000,
      accumulated_ep_beginning: 500000,
      accumulated_ep_ending: 700000,
    }),
    minimalItem({
      foreign_corp_name: "Cayman Tech Corp",
      country_of_incorporation: "Cayman Islands",
      filing_category: FilingCategory.Category5,
      subpart_f_income: 20000,
      gilti_inclusion: 15000,
      foreign_taxes_paid_subpart_f: 4000,
    }),
    minimalItem({
      foreign_corp_name: "Singapore Holdings",
      country_of_incorporation: "Singapore",
      filing_category: FilingCategory.Category4,
      // No income — Category 4 filing only
    }),
  ]);

  // Total = 50000 + 5000 + 2000 + 30000 + 20000 + 15000 = 122000
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, 122000);
  assertEquals(result.outputs.length, 1);
});
