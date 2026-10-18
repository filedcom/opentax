import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../core/test-utils/emitted-rule.ts";
import { F8959_RULES } from "./f8959.ts";

test("F8959-010-02 adds every filed Schedule SE line 6", () => {
  const se = (id: string, amount: number) =>
    `<IRS1040ScheduleSE documentId="${id}"><CombinedSEAndChurchWagesAmt>${amount}</CombinedSEAndChurchWagesAmt></IRS1040ScheduleSE>`;
  const ret = (line8: number) =>
    `<IRS8959 documentId="m"><TotalSelfEmploymentIncomeAmt>${line8}</TotalSelfEmploymentIncomeAmt></IRS8959>` +
    se("s1", 33616) + se("s2", 52086);
  assertEquals(emittedRulePasses(F8959_RULES, "F8959-010-02", { documents: ret(85702) }), true);
  assertEquals(emittedRulePasses(F8959_RULES, "F8959-010-02", { documents: ret(85703) }), false);
});

test("F8959-002 reads Form 8959 line 3 apart from Form 8919's own total", () => {
  const ret = (line3: number) =>
    `<IRS8959 documentId="m"><TotalWagesWithNoWithholdingAmt>${line3}</TotalWagesWithNoWithholdingAmt></IRS8959>` +
    `<IRS8919 documentId="w"><TotalWagesWithNoWithholdingAmt>400</TotalWagesWithNoWithholdingAmt></IRS8919>`;
  assertEquals(emittedRulePasses(F8959_RULES, "F8959-002", { documents: ret(400) }), true);
  assertEquals(emittedRulePasses(F8959_RULES, "F8959-002", { documents: ret(0) }), false);
});
