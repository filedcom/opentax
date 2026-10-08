import { assertEquals, assertThrows } from "@std/assert";
import { f1095a } from "../../../../nodes/inputs/f1095a/index.ts";
import { roundForm8962Amounts } from "./form8962-money.ts";

Deno.test("Form 8962 adds exact cents before rounding a three-policy half-dollar", () => {
  assertEquals(500 + 300.08 + 200.42 < 1_000.5, true);
  assertEquals(roundForm8962Amounts([500, 300.08, 200.42]), 1_001);
  assertEquals(roundForm8962Amounts([500.26, 300.26]), 801);
  assertThrows(
    () => roundForm8962Amounts([100.001]),
    Error,
    "safe cent precision",
  );
});

Deno.test("three 1095-A policy premiums keep a half dollar through source aggregation", () => {
  const policies = [500, 300.08, 200.42].map((premium, index) => ({
    issuer_name: "Texas Marketplace",
    policy_number: `POLICY-${index + 1}`,
    coverage_state: "TX",
    monthly_premiums: index === 2
      ? [...Array(11).fill(premium), 200.43]
      : Array(12).fill(premium),
    monthly_slcsps: Array(12).fill(1_100),
    monthly_aptcs: Array(12).fill(100),
  }));
  const result = f1095a.compute(
    { taxYear: 2025, formType: "f1040" },
    { f1095as: policies },
  );
  const fields = result.outputs.find((item) => item.nodeType === "form8962")
    ?.fields;
  assertEquals((fields?.monthly_premiums as number[])[0], 1_001);
  assertEquals((fields?.monthly_aptcs as number[])[0], 300);
});
