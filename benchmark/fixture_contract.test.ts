import { assertEquals, assertThrows } from "@std/assert";
import { classifyFixtureExpectations } from "./run_benchmark.ts";

Deno.test("malformed unmapped oracles cannot masquerade as metadata", () => {
  for (const value of [null, "100", [], {}]) {
    assertThrows(() =>
      classifyFixtureExpectations({
        correct: { line11_agi: 100, income_tax: value },
      })
    );
  }
});

Deno.test("fixture metadata is distinct from summary lines and intermediate oracles", () => {
  const result = classifyFixtureExpectations({
    year: 2025,
    case: "synthetic",
    inputs: { wages: 100 },
    correct: { line11_agi: 100, standard_deduction: 15750, income_tax: 0 },
  });
  assertEquals(result.expectedLines, { line11_agi: 100 });
  assertEquals(result.unsupportedChecks.map((check) => check.field), [
    "standard_deduction",
    "income_tax",
  ]);
  assertEquals(result.metadata, ["year", "case", "inputs"]);
});

Deno.test("flat fixture metadata is excluded but unknown numeric oracles remain unsupported", () => {
  const result = classifyFixtureExpectations({
    year: 2025,
    line33_total_payments: 200,
    mystery: 99,
  });
  assertEquals(result.expectedLines, { line33_total_payments: 200 });
  assertEquals(result.unsupportedChecks, [{
    field: "mystery",
    expected: 99,
    kind: "unmapped_oracle",
  }]);
  assertEquals(result.metadata, ["year"]);
});

Deno.test("a field named like a filed line needs an explicit supported contract", () => {
  const result = classifyFixtureExpectations({
    correct: { line999_unknown: 1 },
  });
  assertEquals(result.expectedLines, {});
  assertEquals(result.unsupportedChecks.length, 1);
});

Deno.test("intermediate values are not inferred from similarly named filed lines", () => {
  const result = classifyFixtureExpectations({
    correct: { income_tax: 10, line24_total_tax: 20 },
  });
  assertEquals(result.expectedLines, { line24_total_tax: 20 });
  assertEquals(result.unsupportedChecks, [{
    field: "income_tax",
    expected: 10,
    kind: "unmapped_oracle",
  }]);
});
