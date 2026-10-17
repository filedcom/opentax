import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { catalog } from "../../../catalog.ts";
import { assertTy2026Inputs, f1040_2026, inputNodes } from "./index.ts";

test("the catalog serves f1040:2026 with the 2026v1.0 MeF version", () => {
  assertEquals(catalog["f1040:2026"], f1040_2026);
  assertEquals(f1040_2026.taxYear, 2026);
  assertEquals(f1040_2026.mefSchemaVersion, "2026v1.0");
  assertEquals(
    inputNodes.map((entry) => entry.inputKey ?? entry.node.nodeType).sort(),
    ["f8888", "general", "w2"],
  );
});

test("a TY2026 return refuses inputs whose path still applies TY2025 law", () => {
  assertThrows(
    () => assertTy2026Inputs({ general: {}, schedule_h: {} }),
    Error,
    "schedule_h",
  );
  assertThrows(
    () =>
      assertTy2026Inputs({
        general: { dependents: [{ first_name: "A" }] },
      }),
    Error,
    "dependents",
  );
  assertTy2026Inputs({ general: { dependents: [] }, w2: [] });
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
