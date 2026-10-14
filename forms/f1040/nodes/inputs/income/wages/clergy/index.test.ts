import { assertEquals, assertThrows } from "@std/assert";
import { clergy } from "./index.ts";

const ctx = { taxYear: 2025, formType: "f1040" } as const;

Deno.test("clergy input keeps invalid money and empty claims out", () => {
  assertEquals(clergy.inputSchema.safeParse({ clergys: [] }).success, false);
  for (
    const key of [
      "ministerial_wages",
      "housing_allowance_designated",
      "actual_housing_expenses",
      "fair_market_rental_value",
      "parsonage_value",
    ]
  ) {
    assertEquals(
      clergy.inputSchema.safeParse({ clergys: [{ [key]: -1 }] }).success,
      false,
    );
  }
});

Deno.test("clergy refuses wage and housing claims without source reconciliation", () => {
  for (
    const item of [
      { ministerial_wages: 50_000, is_ordained_minister: true },
      {
        ministerial_wages: 50_000,
        housing_allowance_designated: 12_000,
        actual_housing_expenses: 10_000,
        fair_market_rental_value: 15_000,
        is_ordained_minister: true,
      },
      {
        ministerial_wages: 40_000,
        parsonage_value: 15_000,
        is_ordained_minister: true,
      },
      {
        ministerial_wages: 50_000,
        housing_allowance_designated: 12_000,
        has_4361_exemption: true,
        is_ordained_minister: true,
      },
    ]
  ) {
    assertThrows(
      () => clergy.compute(ctx, { clergys: [item] }),
      Error,
      "TY2025 clergy income needs a matched W-2",
    );
  }
});

Deno.test("clergy does not turn an empty or nonordained record into a silent exclusion", () => {
  for (
    const item of [{}, {
      ministerial_wages: 50_000,
      is_ordained_minister: false,
    }]
  ) {
    assertThrows(
      () => clergy.compute(ctx, { clergys: [item] }),
      Error,
      "TY2025 clergy income needs a matched W-2",
    );
  }
});
