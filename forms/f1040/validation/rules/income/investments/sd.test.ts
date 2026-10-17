import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../core/test-utils/emitted-rule.ts";
import { SD_RULES } from "./sd.ts";

const ret = (line7: number, scheduleD: string, extra = "") =>
  `<IRS1040 documentId="a"><CapitalGainLossAmt>${line7}</CapitalGainLossAmt></IRS1040>` +
  `<IRS1040ScheduleD documentId="d">${scheduleD}</IRS1040ScheduleD>${extra}`;

test("SD-F1040-001 carries a limited loss from line 21 to line 7 as a negative amount", () => {
  const loss = "<NetSTAndLTCapitalGainOrLossAmt>-5000</NetSTAndLTCapitalGainOrLossAmt><AllowableLossAmt>3000</AllowableLossAmt>";
  assertEquals(emittedRulePasses(SD_RULES, "SD-F1040-001", { documents: ret(-3000, loss) }), true);
  assertEquals(emittedRulePasses(SD_RULES, "SD-F1040-001", { documents: ret(-5000, loss) }), false);
  const gain = "<NetSTAndLTCapitalGainOrLossAmt>11713</NetSTAndLTCapitalGainOrLossAmt>";
  assertEquals(emittedRulePasses(SD_RULES, "SD-F1040-001", { documents: ret(11713, gain) }), true);
});

test("SD-F1040-006 totals the Forms 8949 with box A checked", () => {
  const f8949 = (box: string, amount: number) =>
    `<IRS8949 documentId="f${amount}"><ShortTermCapitalGainAndLossGrp><${box}>X</${box}>` +
    `<TotalGainOrLossAmt>${amount}</TotalGainOrLossAmt></ShortTermCapitalGainAndLossGrp></IRS8949>`;
  const line1b = (amount: number) =>
    `<TotalSTCGL1099ShowsBasisGrp><TotalGainOrLossAmt>${amount}</TotalGainOrLossAmt></TotalSTCGL1099ShowsBasisGrp>`;
  const forms = f8949("TransRptOn1099BThatShowBssInd", 400) + f8949("TransRptOn1099BThatShowBssInd", 100) +
    f8949("TransRptOn1099BNotShowBasisInd", 50);
  assertEquals(emittedRulePasses(SD_RULES, "SD-F1040-006", { documents: ret(0, line1b(500), forms) }), true);
  assertEquals(emittedRulePasses(SD_RULES, "SD-F1040-006", { documents: ret(0, line1b(550), forms) }), false);
});
