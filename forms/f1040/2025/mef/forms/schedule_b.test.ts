import { assertEquals, assertStringIncludes } from "@std/assert";
import { scheduleB } from "./schedule_b.ts";

function assertNotIncludes(actual: string, expected: string) {
  assertEquals(
    actual.includes(expected),
    false,
    `Expected string NOT to include: ${expected}`,
  );
}

// ---------------------------------------------------------------------------
// Section 1: Empty input
// ---------------------------------------------------------------------------

Deno.test("schedule_b: empty object returns empty string", () => {
  assertEquals(scheduleB.build({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("schedule_b: all unknown keys returns empty string", () => {
  assertEquals(
    scheduleB.build({ junk: 999, foo: "bar", payer_name: "Bank" }),
    "",
  );
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("schedule_b: taxable_interest_net at zero is emitted", () => {
  const result = scheduleB.build({ taxable_interest_net: 0 });
  assertStringIncludes(
    result,
    "<TotalInterestAmt>0</TotalInterestAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 3 fields)
// ---------------------------------------------------------------------------

Deno.test("schedule_b: taxable_interest_net maps to TotalInterestAmt", () => {
  const result = scheduleB.build({ taxable_interest_net: 3000 });
  assertStringIncludes(
    result,
    "<TotalInterestAmt>3000</TotalInterestAmt>",
  );
});

Deno.test("schedule_b: ee_bond_exclusion maps to ExcludibleSavingsBondIntAmt", () => {
  const result = scheduleB.build({ ee_bond_exclusion: 500 });
  assertStringIncludes(
    result,
    "<ExcludibleSavingsBondIntAmt>500</ExcludibleSavingsBondIntAmt>",
  );
});

Deno.test("schedule_b: ordinaryDividends maps to TotalOrdinaryDividendsAmt", () => {
  const result = scheduleB.build({ ordinaryDividends: 1200 });
  assertStringIncludes(
    result,
    "<TotalOrdinaryDividendsAmt>1200</TotalOrdinaryDividendsAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("schedule_b: single known field emits only that element, absent fields omitted", () => {
  const result = scheduleB.build({ taxable_interest_net: 3000 });
  assertStringIncludes(
    result,
    "<TotalInterestAmt>3000</TotalInterestAmt>",
  );
  assertNotIncludes(result, "<ExcludibleSavingsBondIntAmt>");
  assertNotIncludes(result, "<TotalOrdinaryDividendsAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  taxable_interest_net: 3000,
  ee_bond_exclusion: 500,
  ordinaryDividends: 1200,
};

Deno.test("schedule_b: all 3 fields present: output wrapped in IRS1040ScheduleB tag", () => {
  const result = scheduleB.build(allFields);
  assertStringIncludes(result, "<IRS1040ScheduleB>");
  assertStringIncludes(result, "</IRS1040ScheduleB>");
});

Deno.test("schedule_b: all 3 fields present: all elements emitted", () => {
  const result = scheduleB.build(allFields);
  assertStringIncludes(
    result,
    "<TotalInterestAmt>3000</TotalInterestAmt>",
  );
  assertStringIncludes(
    result,
    "<ExcludibleSavingsBondIntAmt>500</ExcludibleSavingsBondIntAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalOrdinaryDividendsAmt>1200</TotalOrdinaryDividendsAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: String fields are silently ignored
// ---------------------------------------------------------------------------

Deno.test("schedule_b: payer_name string field is silently ignored", () => {
  const result = scheduleB.build({
    payer_name: "Bank of America",
    taxable_interest_net: 3000,
  });
  assertStringIncludes(
    result,
    "<TotalInterestAmt>3000</TotalInterestAmt>",
  );
  assertNotIncludes(result, "payer_name");
  assertNotIncludes(result, "Bank of America");
});
