import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../core/test-utils/emitted-rule.ts";
import { S2_RULES } from "./s2.ts";

test("S2-F1040-146-02 counts only line 26 of a Schedule H that also has line 8e", () => {
  const passes = (line9: number) =>
    emittedRulePasses(S2_RULES, "S2-F1040-146-02", {
      documents: `<IRS1040Schedule2 documentId="s"><HouseholdEmploymentTaxAmt>${line9}</HouseholdEmploymentTaxAmt></IRS1040Schedule2>` +
        '<IRS1040ScheduleH documentId="h1"><TotSocSecMedcrAndFedIncmTaxAmt>474</TotSocSecMedcrAndFedIncmTaxAmt><CombinedFUTATaxPlusNetTaxesAmt>500</CombinedFUTATaxPlusNetTaxesAmt></IRS1040ScheduleH>' +
        '<IRS1040ScheduleH documentId="h2"><TotSocSecMedcrAndFedIncmTaxAmt>100</TotSocSecMedcrAndFedIncmTaxAmt></IRS1040ScheduleH>',
    });
  assertEquals(passes(600), true);
  assertEquals(passes(1_074), false);
});
