import { assertEquals, assertThrows } from "@std/assert";
import { f965, TransferAgreementType } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    tax_year_of_inclusion: "2017",
    net_965_tax_liability: 0,
    installment_election: false,
    current_year_installment: 0,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f965.compute({ taxYear: 2025 }, { f965s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f965.inputSchema: valid minimal item passes", () => {
  const parsed = f965.inputSchema.safeParse({ f965s: [minimalItem()] });
  assertEquals(parsed.success, true);
});

Deno.test("f965.inputSchema: empty array fails (min 1)", () => {
  const parsed = f965.inputSchema.safeParse({ f965s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f965.inputSchema: missing tax_year_of_inclusion fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).tax_year_of_inclusion;
  const parsed = f965.inputSchema.safeParse({ f965s: [item] });
  assertEquals(parsed.success, false);
});

Deno.test("f965.inputSchema: missing net_965_tax_liability fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).net_965_tax_liability;
  const parsed = f965.inputSchema.safeParse({ f965s: [item] });
  assertEquals(parsed.success, false);
});

Deno.test("f965.inputSchema: missing installment_election fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).installment_election;
  const parsed = f965.inputSchema.safeParse({ f965s: [item] });
  assertEquals(parsed.success, false);
});

Deno.test("f965.inputSchema: missing current_year_installment fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).current_year_installment;
  const parsed = f965.inputSchema.safeParse({ f965s: [item] });
  assertEquals(parsed.success, false);
});

Deno.test("f965.inputSchema: negative net_965_tax_liability fails", () => {
  const parsed = f965.inputSchema.safeParse({
    f965s: [minimalItem({ net_965_tax_liability: -1 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f965.inputSchema: negative current_year_installment fails", () => {
  const parsed = f965.inputSchema.safeParse({
    f965s: [minimalItem({ current_year_installment: -500 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f965.inputSchema: negative s_corp_deferred_amount fails", () => {
  const parsed = f965.inputSchema.safeParse({
    f965s: [minimalItem({ s_corp_deferred_amount: -100 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f965.inputSchema: negative remaining_balance fails", () => {
  const parsed = f965.inputSchema.safeParse({
    f965s: [minimalItem({ remaining_balance: -200 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f965.inputSchema: invalid transfer_agreement_type fails", () => {
  const parsed = f965.inputSchema.safeParse({
    f965s: [minimalItem({ transfer_agreement_type: "INVALID" })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f965.inputSchema: all valid transfer_agreement_type values pass", () => {
  for (const t of Object.values(TransferAgreementType)) {
    const parsed = f965.inputSchema.safeParse({
      f965s: [minimalItem({ transfer_agreement_type: t })],
    });
    assertEquals(parsed.success, true);
  }
});

Deno.test("f965.inputSchema: optional fields absent passes", () => {
  const parsed = f965.inputSchema.safeParse({ f965s: [minimalItem()] });
  assertEquals(parsed.success, true);
});

Deno.test("f965.inputSchema: full item with all fields passes", () => {
  const parsed = f965.inputSchema.safeParse({
    f965s: [minimalItem({
      net_965_tax_liability: 50000,
      installment_election: true,
      current_year_installment: 12500,
      transfer_agreement_type: TransferAgreementType.NONE,
      s_corp_deferred_amount: 0,
      remaining_balance: 0,
    })],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Per-field routing
// =============================================================================

Deno.test("f965.compute: current_year_installment > 0 — routes to schedule2", () => {
  const result = compute([minimalItem({ current_year_installment: 10000 })]);
  const out = findOutput(result, "schedule2");
  assertEquals(out?.nodeType, "schedule2");
});

Deno.test("f965.compute: current_year_installment = 0 — no output emitted", () => {
  const result = compute([minimalItem({ current_year_installment: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f965.compute: current_year_installment absent (uses 0 default) — no output emitted", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f965.compute: current_year_installment routes to schedule2 line9_965_net_tax_liability", () => {
  const result = compute([minimalItem({ current_year_installment: 8000 })]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line9_965_net_tax_liability, 8000);
});

Deno.test("f965.compute: transfer_agreement_type does not change routing amount", () => {
  const resultNone = compute([minimalItem({
    current_year_installment: 5000,
    transfer_agreement_type: TransferAgreementType.NONE,
  })]);
  const resultC = compute([minimalItem({
    current_year_installment: 5000,
    transfer_agreement_type: TransferAgreementType.C,
  })]);
  const fieldsNone = fieldsOf(resultNone.outputs, schedule2)!;
  const fieldsC = fieldsOf(resultC.outputs, schedule2)!;
  assertEquals(fieldsNone.line9_965_net_tax_liability, 5000);
  assertEquals(fieldsC.line9_965_net_tax_liability, 5000);
});

Deno.test("f965.compute: installment_election false, current_year_installment 0 — no output", () => {
  const result = compute([minimalItem({
    installment_election: false,
    current_year_installment: 0,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f965.compute: s_corp_deferred_amount does not route to schedule2", () => {
  const result = compute([minimalItem({
    s_corp_deferred_amount: 25000,
    current_year_installment: 0,
  })]);
  // s_corp deferral is informational only — no output
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Aggregation — multiple items
// =============================================================================

Deno.test("f965.compute: multiple items — installments summed into one schedule2 output", () => {
  const result = compute([
    minimalItem({ tax_year_of_inclusion: "2017", current_year_installment: 8000 }),
    minimalItem({ tax_year_of_inclusion: "2018", current_year_installment: 4000 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line9_965_net_tax_liability, 12000);
  assertEquals(result.outputs.filter((o) => o.nodeType === "schedule2").length, 1);
});

Deno.test("f965.compute: multiple items, one zero — sum excludes zero", () => {
  const result = compute([
    minimalItem({ tax_year_of_inclusion: "2017", current_year_installment: 6000 }),
    minimalItem({ tax_year_of_inclusion: "2018", current_year_installment: 0 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line9_965_net_tax_liability, 6000);
});

Deno.test("f965.compute: multiple items all zero — no output", () => {
  const result = compute([
    minimalItem({ tax_year_of_inclusion: "2017", current_year_installment: 0 }),
    minimalItem({ tax_year_of_inclusion: "2018", current_year_installment: 0 }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Thresholds
// =============================================================================

Deno.test("f965.compute: 8% installment (year 1–5) — exact amount passed through", () => {
  // Net liability 100000, year 1–5 installment = 8% = 8000
  const result = compute([minimalItem({
    net_965_tax_liability: 100_000,
    installment_election: true,
    current_year_installment: 8_000,
  })]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line9_965_net_tax_liability, 8_000);
});

Deno.test("f965.compute: 25% installment (year 8 — final) — exact amount passed through", () => {
  // Net liability 100000, year 8 installment = 25% = 25000
  const result = compute([minimalItem({
    net_965_tax_liability: 100_000,
    installment_election: true,
    current_year_installment: 25_000,
  })]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line9_965_net_tax_liability, 25_000);
});

// =============================================================================
// 5. Hard Validation
// =============================================================================

Deno.test("f965.compute: throws on negative current_year_installment", () => {
  assertThrows(
    () => compute([minimalItem({ current_year_installment: -1 })]),
    Error,
  );
});

Deno.test("f965.compute: throws on negative net_965_tax_liability", () => {
  assertThrows(
    () => compute([minimalItem({ net_965_tax_liability: -1 })]),
    Error,
  );
});

Deno.test("f965.compute: does not throw when all optional fields absent", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 6. Output routing
// =============================================================================

Deno.test("f965.compute: schedule2 output has correct nodeType", () => {
  const result = compute([minimalItem({ current_year_installment: 5000 })]);
  const out = findOutput(result, schedule2.nodeType);
  assertEquals(out?.nodeType, "schedule2");
});

Deno.test("f965.compute: no schedule2 output when installment is zero", () => {
  const result = compute([minimalItem({ current_year_installment: 0 })]);
  const out = findOutput(result, "schedule2");
  assertEquals(out, undefined);
});

// =============================================================================
// 7. Edge Cases
// =============================================================================

Deno.test("f965.compute: transfer_agreement_type C — still routes installment to schedule2", () => {
  const result = compute([minimalItem({
    current_year_installment: 9000,
    transfer_agreement_type: TransferAgreementType.C,
  })]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line9_965_net_tax_liability, 9000);
});

Deno.test("f965.compute: transfer_agreement_type D — still routes installment to schedule2", () => {
  const result = compute([minimalItem({
    current_year_installment: 7500,
    transfer_agreement_type: TransferAgreementType.D,
  })]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line9_965_net_tax_liability, 7500);
});

Deno.test("f965.compute: transfer_agreement_type E — still routes installment to schedule2", () => {
  const result = compute([minimalItem({
    current_year_installment: 6000,
    transfer_agreement_type: TransferAgreementType.E,
  })]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line9_965_net_tax_liability, 6000);
});

Deno.test("f965.compute: remaining_balance present — does not route to schedule2", () => {
  const result = compute([minimalItem({
    current_year_installment: 0,
    remaining_balance: 50000,
  })]);
  // remaining_balance is informational — no output
  assertEquals(result.outputs.length, 0);
});

Deno.test("f965.compute: large installment amount — routes correctly", () => {
  const result = compute([minimalItem({ current_year_installment: 999_999 })]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line9_965_net_tax_liability, 999_999);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("f965.compute: smoke test — two inclusion years, installment election, year 8 final payment", () => {
  const result = compute([
    // 2017 inclusion: net liability 80000, year 8 = 25% = 20000
    minimalItem({
      tax_year_of_inclusion: "2017",
      net_965_tax_liability: 80_000,
      installment_election: true,
      current_year_installment: 20_000,
      transfer_agreement_type: TransferAgreementType.NONE,
      s_corp_deferred_amount: 0,
      remaining_balance: 0,
    }),
    // 2018 inclusion: net liability 40000, year 7 = 20% = 8000
    minimalItem({
      tax_year_of_inclusion: "2018",
      net_965_tax_liability: 40_000,
      installment_election: true,
      current_year_installment: 8_000,
      transfer_agreement_type: TransferAgreementType.NONE,
      remaining_balance: 10_000,
    }),
  ]);

  // Total installment = 20000 + 8000 = 28000 → schedule2 line9
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line9_965_net_tax_liability, 28_000);
  assertEquals(result.outputs.length, 1);
});
