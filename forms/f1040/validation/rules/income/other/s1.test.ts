import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../core/test-utils/emitted-rule.ts";
import { S1_RULES } from "./s1.ts";

test("S1-F1040-080-03 reads line 9 from Schedule 1, not a same-named Schedule E element", () => {
  const ret = (schedule1: string) =>
    `<IRS1040Schedule1 documentId="s">${schedule1}</IRS1040Schedule1>` +
    '<IRS1040ScheduleE documentId="e"><TotalOtherIncomeAmt>750</TotalOtherIncomeAmt></IRS1040ScheduleE>' +
    '<OtherIncomeTypeStatement documentId="o"><OtherIncomeTypeStmt><OtherIncomeAmt>40</OtherIncomeAmt></OtherIncomeTypeStmt></OtherIncomeTypeStatement>';
  const passes = (schedule1: string) => emittedRulePasses(S1_RULES, "S1-F1040-080-03", { documents: ret(schedule1) });
  assertEquals(passes("<JuryDutyPayAmt>100</JuryDutyPayAmt><TotalOtherIncomeAmt>140</TotalOtherIncomeAmt>"), true);
  assertEquals(passes("<JuryDutyPayAmt>100</JuryDutyPayAmt><TotalOtherIncomeAmt>100</TotalOtherIncomeAmt>"), false);
});

test("S1-F1040-115 takes Schedule E line 41 over line 26 when both are filled", () => {
  const passes = (line5: number) =>
    emittedRulePasses(S1_RULES, "S1-F1040-115", {
      documents: `<IRS1040Schedule1 documentId="s"><RentalRealEstateIncomeLossAmt>${line5}</RentalRealEstateIncomeLossAmt></IRS1040Schedule1>` +
        '<IRS1040ScheduleE documentId="e"><TotalIncomeOrLossAmt>500</TotalIncomeOrLossAmt><TotalSuppIncomeOrLossAmt>800</TotalSuppIncomeOrLossAmt></IRS1040ScheduleE>',
    });
  assertEquals(passes(800), true);
  assertEquals(passes(500), false);
});
