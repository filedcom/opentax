import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../core/test-utils/emitted-rule.ts";
import { F8949_RULES } from "./f8949.ts";

const codes = (value: string) =>
  `<IRS8949 documentId="a"><ShortTermCapitalGainAndLossGrp><CapitalGainAndLossAssetGrp><AdjustmentsToGainOrLossCd>${value}</AdjustmentsToGainOrLossCd></CapitalGainAndLossAssetGrp></ShortTermCapitalGainAndLossGrp></IRS8949>`;

test("F8949-002 and F8949-003-04 need distinct, sorted, listed adjustment codes", () => {
  assertEquals(emittedRulePasses(F8949_RULES, "F8949-002", { documents: codes("BW") }), true);
  assertEquals(emittedRulePasses(F8949_RULES, "F8949-002", { documents: codes("WB") }), false);
  assertEquals(emittedRulePasses(F8949_RULES, "F8949-002", { documents: codes("BB") }), false);
  assertEquals(emittedRulePasses(F8949_RULES, "F8949-003-04", { documents: codes("BW") }), true);
  assertEquals(emittedRulePasses(F8949_RULES, "F8949-003-04", { documents: codes("BA") }), false);
});
