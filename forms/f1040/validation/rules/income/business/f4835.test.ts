import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../core/test-utils/emitted-rule.ts";
import { F4835_RULES } from "./f4835.ts";

test("F4835-001 nets positive line 32 amounts against deductible line 34c losses", () => {
  const passes = (line40: number) =>
    emittedRulePasses(F4835_RULES, "F4835-001", {
      documents: `<IRS1040ScheduleE documentId="e"><NetFarmRentalIncomeOrLossAmt>${line40}</NetFarmRentalIncomeOrLossAmt></IRS1040ScheduleE>` +
        '<IRS4835 documentId="f1"><NetFarmRentalIncomeOrLossAmt>11061</NetFarmRentalIncomeOrLossAmt></IRS4835>' +
        '<IRS4835 documentId="f2"><NetFarmRentalIncomeOrLossAmt>-500</NetFarmRentalIncomeOrLossAmt><FarmRentalDeductibleLossAmt>400</FarmRentalDeductibleLossAmt></IRS4835>',
    });
  assertEquals(passes(10_661), true);
  assertEquals(passes(10_561), false);
});
