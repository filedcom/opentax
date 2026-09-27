import { assertEquals } from "@std/assert";
import { scheduleBFilingRequired } from "./schedule_b_filing.ts";
import type { ScheduleBFilingFacts } from "./schedule_b_filing.ts";

const none: ScheduleBFilingFacts = {
  taxableInterest: 0,
  ordinaryDividends: 0,
  sellerFinancedInterest: false,
  nomineeInterest: 0,
  accruedInterest: 0,
  oidAdjustment: 0,
  bondPremiumAdjustment: 0,
  savingsBondExclusion: 0,
  nomineeDividends: 0,
  foreignAccount: false,
  foreignTrust: false,
};

Deno.test("Schedule B uses separate strict $1,500 income thresholds", () => {
  assertEquals(
    scheduleBFilingRequired({
      ...none,
      taxableInterest: 1_500,
      ordinaryDividends: 1_500,
    }),
    false,
  );
  assertEquals(
    scheduleBFilingRequired({ ...none, taxableInterest: 1_501 }),
    true,
  );
  assertEquals(
    scheduleBFilingRequired({ ...none, ordinaryDividends: 1_501 }),
    true,
  );
});

Deno.test("Schedule B special filing triggers apply below the income thresholds", () => {
  const triggers: Partial<ScheduleBFilingFacts>[] = [
    { sellerFinancedInterest: true },
    { nomineeInterest: 1 },
    { accruedInterest: 1 },
    { oidAdjustment: 1 },
    { bondPremiumAdjustment: 1 },
    { savingsBondExclusion: 1 },
    { nomineeDividends: 1 },
    { foreignAccount: true },
    { foreignTrust: true },
  ];
  for (const trigger of triggers) {
    assertEquals(scheduleBFilingRequired({ ...none, ...trigger }), true);
  }
});
