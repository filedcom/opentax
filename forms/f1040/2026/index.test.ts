import { test } from "bun:test";
import { assertEquals, assertStrictEquals } from "@std/assert";
import { catalog } from "../../../catalog.ts";
import { f1040_2025 } from "../2025/index.ts";
import { f1040_2026 } from "./index.ts";
import { pdfReviewFixtures } from "../2025/pdf/review-fixtures.ts";
import { signed } from "../../../scripts/testing/mef.ts";

const keys = (entries: typeof f1040_2025.inputNodes) =>
  entries.map((entry) => entry.inputKey ?? entry.node.nodeType).sort();

test("the catalog serves f1040:2026 with the 2026v1.0 MeF version", () => {
  assertEquals(catalog["f1040:2026"], f1040_2026);
  assertEquals(f1040_2026.taxYear, 2026);
  assertEquals(f1040_2026.mefSchemaVersion, "2026v1.0");
});

test("TY2026 accepts every input TY2025 accepts, on the same registry", () => {
  assertEquals(keys(f1040_2026.inputNodes), keys(f1040_2025.inputNodes));
  assertStrictEquals(f1040_2026.registry, f1040_2025.registry);
});

test("TY2026 PDF output is refused rather than printed on 2025 forms", async () => {
  let message = "";
  try {
    await f1040_2026.buildPdfBytes({}, undefined);
  } catch (error) {
    message = String(error);
  }
  assertEquals(message.includes("TY2026 PDF"), true);
});

const sample = (id: string) => {
  const fixture = pdfReviewFixtures.find((row) => row.id === id);
  if (!fixture) throw new Error(`missing sample ${id}`);
  return signed(fixture.inputs as Record<string, unknown>);
};
const errors = (result: ReturnType<typeof f1040_2026.executeReturn>) =>
  result.diagnostics.filter((d) => d.severity === "error");

test("TY2026 runs the staged return pipeline: Form 8839 is settled in two passes, not sent to the bare graph", () => {
  const result = f1040_2026.executeReturn(sample("single-reviewed-adoption-credit"));
  assertEquals(errors(result), []);
  assertEquals(result.pending.form8839_route !== undefined, true);
});

test("Schedule 1-A owned-SE tips use the return year's social security wage base", () => {
  const inputs = sample("mixed-cf-tip-no-health");
  const base = (def: typeof f1040_2026) => {
    const result = def.executeReturn(inputs);
    assertEquals(errors(result), []);
    return (result.pending.schedule1a as Record<string, unknown>)
      .qualified_tips_ss_wage_base;
  };
  // SSA contribution and benefit base: $176,100 for 2025, $184,500 for 2026.
  assertEquals(base(f1040_2025), 176_100);
  assertEquals(base(f1040_2026), 184_500);
});
