import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { ALL_RULES } from "./index.ts";
import {
  rulesForReturnVersion,
  TY2026_NEW_RULES,
  TY2026_RETIRED_RULES,
} from "./ty2026.ts";

const numbers = (rules: readonly { ruleNumber: string }[]) =>
  new Set(rules.map((rule) => rule.ruleNumber));

test("TY2025 returns keep the full 2025 rule set", () => {
  assertEquals(rulesForReturnVersion("2025v5.4"), ALL_RULES);
  assertEquals(rulesForReturnVersion(undefined), ALL_RULES);
});

test("TY2026 returns swap the 2026v1.0 replacements for retired 2025 rules", () => {
  const rules = numbers(rulesForReturnVersion("2026v1.0"));
  for (const retired of TY2026_RETIRED_RULES) {
    assertEquals(rules.has(retired), false, retired);
  }
  for (const id of ["F1040-339-12", "F1040-350-13", "SH-F1040-008-11"]) {
    assertEquals(rules.has(id), true, id);
  }
  assertEquals(numbers(TY2026_NEW_RULES).size, TY2026_NEW_RULES.length);
  const single = TY2026_NEW_RULES.find((r) => r.ruleNumber === "F1040-339-12");
  assertEquals(single?.ruleText.endsWith("must equal 16100."), true);
});
