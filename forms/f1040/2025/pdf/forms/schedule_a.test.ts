import { assertEquals, assertThrows } from "@std/assert";
import { scheduleAPdf } from "./schedule_a.ts";

Deno.test("Schedule A PDF rejects a finalized capital-gain election without reconciled Form 8283 source", () => {
  assertThrows(
    () =>
      scheduleAPdf.includeWhen?.({
        line_12_noncash_contributions: 24_000,
        line_13_contribution_carryover: 5_000,
        charitable_limits_finalized: true,
        capital_gain_election_finalized: true,
      }, { f1040: { line12e_itemized_deductions: 29_000 } }),
    Error,
    "complete Schedule A source",
  );
  assertEquals(
    scheduleAPdf.includeWhen?.({ capital_gain_election_finalized: true }, {
      f1040: { line12a_standard_deduction: 15_750 },
    }),
    false,
  );
});
