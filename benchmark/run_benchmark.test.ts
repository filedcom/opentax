import { assertEquals, assertThrows } from "@std/assert";
import { join } from "@std/path";
import {
  compareExpectedNumericLines,
  taxCommandOutputOrThrow,
} from "./run_benchmark.ts";

Deno.test("compareExpectedNumericLines checks every expected numeric line, not just refund", () => {
  const failures = compareExpectedNumericLines(
    {
      line11_agi: 40_000,
      line24_total_tax: 3_000,
      line33_total_payments: 3_500,
      line35a_refund: 500,
    },
    {
      line11_agi: 50_000,
      line24_total_tax: 3_000,
      line33_total_payments: 4_000,
      line35a_refund: 500,
    },
  );

  assertEquals(failures.map((f) => f.line), [
    "line11_agi",
    "line33_total_payments",
  ]);
});

Deno.test("compareExpectedNumericLines rejects missing and nonfinite actual values", () => {
  const failures = compareExpectedNumericLines(
    {
      line11_agi: Number.NaN,
    },
    {
      line11_agi: 50_000,
      line24_total_tax: 3_000,
    },
  );

  assertEquals(failures.map((f) => f.reason), ["nonfinite", "missing"]);
});

Deno.test("compareExpectedNumericLines rejects multi-entry actual values", () => {
  const failures = compareExpectedNumericLines(
    {
      line33_total_payments: [1000, 2000],
    },
    {
      line33_total_payments: 3000,
    },
  );

  assertEquals(failures, [
    {
      line: "line33_total_payments",
      expected: 3000,
      actual: [1000, 2000],
      reason: "multi_entry",
      tolerance: 5,
    },
  ]);
});

Deno.test("compareExpectedNumericLines applies the documented rounding tolerance", () => {
  const failures = compareExpectedNumericLines(
    {
      line24_total_tax: 1004.99,
      line35a_refund: 1005.01,
    },
    {
      line24_total_tax: 1000,
      line35a_refund: 1000,
    },
  );

  assertEquals(failures.map((f) => f.line), ["line35a_refund"]);
});

Deno.test("taxCommandOutputOrThrow rejects command failures", () => {
  assertThrows(
    () =>
      taxCommandOutputOrThrow(2, "stdout detail", "stderr detail", [
        "return",
        "get",
      ]),
    Error,
    "opentax command failed (2)",
  );
});

Deno.test("scoring rejects invalid expected values and empty numeric expectations", () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    assertThrows(() =>
      compareExpectedNumericLines({ line11_agi: 0 }, { line11_agi: value })
    );
  }
  assertThrows(() => compareExpectedNumericLines({}, {}));
  assertThrows(() =>
    compareExpectedNumericLines({ line11_agi: 1 }, { line11_agi: 1 }, NaN)
  );
});

Deno.test("scoring rejects null, undefined, strings and empty actual arrays", () => {
  for (const value of [null, undefined, "0", [], [Infinity], [0, NaN]]) {
    assertEquals(
      compareExpectedNumericLines({ line11_agi: value }, { line11_agi: 0 })
        .length,
      1,
    );
  }
});

Deno.test("run_benchmark exits nonzero for an empty runnable case set", async () => {
  const form = `__empty_${crypto.randomUUID()}`;
  const casesDir = join("benchmark", "cases", form, "2025");
  await Deno.mkdir(casesDir, { recursive: true });
  try {
    const command = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read=benchmark",
        "--allow-write=benchmark",
        "--allow-run=deno",
        "benchmark/run_benchmark.ts",
        "--form",
        form,
        "--year",
        "2025",
        "--json",
      ],
      stdout: "piped",
      stderr: "piped",
    });
    const { code, stderr } = await command.output();
    assertEquals(code, 1);
    assertEquals(
      new TextDecoder().decode(stderr).includes(
        "No runnable benchmark cases found",
      ),
      true,
    );
  } finally {
    await Deno.remove(join("benchmark", "cases", form), { recursive: true });
  }
});
