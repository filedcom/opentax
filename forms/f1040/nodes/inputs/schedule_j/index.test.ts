import { assertEquals, assertThrows } from "@std/assert";
import { schedule_j } from "./index.ts";

const base = {
  elected_farm_income: 50_000,
  prior_year_taxable_income_py1: 20_000,
  prior_year_taxable_income_py2: 25_000,
  prior_year_taxable_income_py3: 30_000,
  schedule_j_tax: 8_000,
};

function compute(input: Record<string, unknown>) {
  return schedule_j.compute(
    { taxYear: 2025, formType: "f1040" },
    input as Parameters<typeof schedule_j.compute>[1],
  );
}

Deno.test("Schedule J validates its supplied worksheet facts", () => {
  assertEquals(schedule_j.inputSchema.safeParse(base).success, true);
  assertEquals(
    schedule_j.inputSchema.safeParse({ ...base, elected_farm_income: -1 })
      .success,
    false,
  );
});

Deno.test("Schedule J with no farm-income election has no filing output", () => {
  assertEquals(
    compute({ ...base, elected_farm_income: 0, schedule_j_tax: 0 }).outputs,
    [],
  );
});

Deno.test("active Schedule J fails closed until line 23 can be reconciled", () => {
  assertThrows(
    () => compute(base),
    Error,
    "Schedule J is not filing-ready",
  );
  assertThrows(
    () => compute({ ...base, elected_farm_income_capital_gain: 10_000 }),
    Error,
    "Schedule J is not filing-ready",
  );
});

Deno.test("Schedule J rejects malformed input before filing checks", () => {
  assertThrows(() => compute({ ...base, schedule_j_tax: "not_a_number" }));
});
