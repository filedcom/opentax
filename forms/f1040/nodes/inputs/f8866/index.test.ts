import { assertEquals, assertThrows } from "@std/assert";
import { f8866, LookbackYear } from "./index.ts";

type F8866Item = Parameters<typeof f8866.compute>[1]["f8866s"][number];

function minimalItem(overrides: Partial<F8866Item> = {}): F8866Item {
  return {
    property_description: "Film production costs",
    date_placed_in_service: "2022-01-15",
    lookback_year: LookbackYear.Third,
    ...overrides,
  };
}

function compute(items: F8866Item[]) {
  return f8866.compute(
    { taxYear: 2025, formType: "f1040" },
    { f8866s: items },
  );
}

Deno.test("Form 8866 validates source before filing review", () => {
  assertThrows(() => compute([]), Error);
  assertEquals(
    f8866.inputSchema.safeParse({ f8866s: [minimalItem({ property_description: "" })] }).success,
    false,
  );
  assertEquals(
    f8866.inputSchema.safeParse({ f8866s: [{ ...minimalItem(), lookback_year: "5th" }] }).success,
    false,
  );
  assertEquals(
    f8866.inputSchema.safeParse({ f8866s: [{ ...minimalItem(), total_income_forecast: -1 }] }).success,
    false,
  );
});

Deno.test("Form 8866 blocks owed interest instead of Schedule 1 income", () => {
  assertThrows(
    () => compute([minimalItem({ interest_owed_or_due: 950 })]),
    Error,
    "Schedule 2 line 17n or separate-refund filing branch",
  );
});

Deno.test("Form 8866 blocks refunded interest instead of Schedule 1 deduction", () => {
  assertThrows(
    () => compute([minimalItem({ interest_owed_or_due: -600 })]),
    Error,
    "Schedule 2 line 17n or separate-refund filing branch",
  );
});

Deno.test("Form 8866 does not drop zero, missing or offsetting interest source", () => {
  for (const items of [
    [minimalItem()],
    [minimalItem({ interest_owed_or_due: 0 })],
    [
      minimalItem({ interest_owed_or_due: 500 }),
      minimalItem({ lookback_year: LookbackYear.Tenth, interest_owed_or_due: -500 }),
    ],
  ]) {
    assertThrows(() => compute(items), Error, "Form 8866 look-back interest");
  }
});

Deno.test("Form 8866 workpaper facts still require a filing-branch review", () => {
  assertThrows(
    () => compute([minimalItem({
      lookback_year: LookbackYear.Tenth,
      total_income_forecast: 500_000,
      actual_income: 420_000,
      recomputed_depreciation: 42_000,
      prior_year_depreciation_claimed: 50_000,
      interest_owed_or_due: 1_100,
    })]),
    Error,
    "Form 8866 look-back interest",
  );
});
