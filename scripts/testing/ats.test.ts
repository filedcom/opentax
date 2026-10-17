import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { ATS_SCENARIO_INPUTS } from "../../forms/f1040/e2e/ats/ty2025-check-replay.ts";
import { TY2025_ATS_CASES } from "../../forms/f1040/e2e/ats/ty2025_cases.ts";
import { passes } from "./ats.ts";

const clean = {
  id: "1040-01",
  findings: [],
  schemaValid: true,
  valuesMatched: 3,
  valuesCompared: 3,
};

test("a scenario passes only when it files cleanly, validates and matches every packet value", () => {
  assertEquals(passes(clean), true);
  assertEquals(passes({ ...clean, schemaValid: null }), true);
  assertEquals(passes({ ...clean, findings: ["rule FW2-499"] }), false);
  assertEquals(passes({ ...clean, schemaValid: false }), false);
  assertEquals(passes({ ...clean, valuesMatched: 2 }), false);
});

test("every TY2025 Form 1040 ATS scenario is scored", () => {
  assertEquals(
    Object.keys(ATS_SCENARIO_INPUTS).sort(),
    TY2025_ATS_CASES.filter((c) => c.returnType === "1040").map((c) => c.id).sort(),
  );
});
