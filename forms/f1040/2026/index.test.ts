import { test } from "bun:test";
import { assertEquals, assertStrictEquals } from "@std/assert";
import { catalog } from "../../../catalog.ts";
import { f1040_2025 } from "../2025/index.ts";
import { f1040_2026 } from "./index.ts";

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
