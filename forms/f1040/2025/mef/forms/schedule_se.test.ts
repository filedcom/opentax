import { assertEquals, assertStringIncludes } from "@std/assert";
import { scheduleSE } from "./schedule_se.ts";

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

Deno.test("schedule_se: empty object returns empty string", () => {
  assertEquals(scheduleSE.build({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("schedule_se: all unknown keys returns empty string", () => {
  assertEquals(scheduleSE.build({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("schedule_se: net_profit_schedule_c at zero is emitted", () => {
  const result = scheduleSE.build({ net_profit_schedule_c: 0 });
  assertStringIncludes(result, "<NetProfitOrLossAmt>0</NetProfitOrLossAmt>");
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 5 fields)
// ---------------------------------------------------------------------------

Deno.test("schedule_se: net_profit_schedule_c maps to NetProfitOrLossAmt", () => {
  const result = scheduleSE.build({ net_profit_schedule_c: 30000 });
  assertStringIncludes(
    result,
    "<NetProfitOrLossAmt>30000</NetProfitOrLossAmt>",
  );
});

Deno.test("schedule_se: net_profit_schedule_f maps to NetFarmProfitOrLossAmt", () => {
  const result = scheduleSE.build({ net_profit_schedule_f: 15000 });
  assertStringIncludes(
    result,
    "<NetFarmProfitOrLossAmt>15000</NetFarmProfitOrLossAmt>",
  );
});

Deno.test("schedule_se: unreported_tips_4137 maps to Form4137UnreportedTipsAmt", () => {
  const result = scheduleSE.build({ unreported_tips_4137: 2000 });
  assertStringIncludes(
    result,
    "<Form4137UnreportedTipsAmt>2000</Form4137UnreportedTipsAmt>",
  );
});

Deno.test("schedule_se: wages_8919 maps to WagesSubjectToSSTAmt", () => {
  const result = scheduleSE.build({ wages_8919: 8000 });
  assertStringIncludes(
    result,
    "<WagesSubjectToSSTAmt>8000</WagesSubjectToSSTAmt>",
  );
});

Deno.test("schedule_se: w2_ss_wages maps to SocSecWagesAmt", () => {
  const result = scheduleSE.build({ w2_ss_wages: 100000 });
  assertStringIncludes(result, "<SocSecWagesAmt>100000</SocSecWagesAmt>");
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("schedule_se: single known field emits only that element, absent fields omitted", () => {
  const result = scheduleSE.build({ net_profit_schedule_c: 30000 });
  assertStringIncludes(
    result,
    "<NetProfitOrLossAmt>30000</NetProfitOrLossAmt>",
  );
  assertNotIncludes(result, "<NetFarmProfitOrLossAmt>");
  assertNotIncludes(result, "<Form4137UnreportedTipsAmt>");
  assertNotIncludes(result, "<WagesSubjectToSSTAmt>");
  assertNotIncludes(result, "<SocSecWagesAmt>");
});

Deno.test("schedule_se: two fields present: only those two elements emitted", () => {
  const result = scheduleSE.build({
    net_profit_schedule_c: 30000,
    wages_8919: 8000,
  });
  assertStringIncludes(
    result,
    "<NetProfitOrLossAmt>30000</NetProfitOrLossAmt>",
  );
  assertStringIncludes(
    result,
    "<WagesSubjectToSSTAmt>8000</WagesSubjectToSSTAmt>",
  );
  assertNotIncludes(result, "<NetFarmProfitOrLossAmt>");
  assertNotIncludes(result, "<SocSecWagesAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  net_profit_schedule_c: 30000,
  net_profit_schedule_f: 15000,
  unreported_tips_4137: 2000,
  wages_8919: 8000,
  w2_ss_wages: 100000,
};

Deno.test("schedule_se: all 5 fields present: output wrapped in IRS1040ScheduleSE tag", () => {
  const result = scheduleSE.build(allFields);
  assertStringIncludes(result, "<IRS1040ScheduleSE>");
  assertStringIncludes(result, "</IRS1040ScheduleSE>");
});

Deno.test("schedule_se: all 5 fields present: all elements emitted", () => {
  const result = scheduleSE.build(allFields);
  assertStringIncludes(
    result,
    "<NetProfitOrLossAmt>30000</NetProfitOrLossAmt>",
  );
  assertStringIncludes(
    result,
    "<NetFarmProfitOrLossAmt>15000</NetFarmProfitOrLossAmt>",
  );
  assertStringIncludes(
    result,
    "<Form4137UnreportedTipsAmt>2000</Form4137UnreportedTipsAmt>",
  );
  assertStringIncludes(
    result,
    "<WagesSubjectToSSTAmt>8000</WagesSubjectToSSTAmt>",
  );
  assertStringIncludes(result, "<SocSecWagesAmt>100000</SocSecWagesAmt>");
});

// ---------------------------------------------------------------------------
// Section 7: Non-numeric fields silently ignored
// ---------------------------------------------------------------------------

Deno.test("schedule_se: string field is silently ignored", () => {
  const result = scheduleSE.build({
    filing_status: "MFJ",
    net_profit_schedule_c: 30000,
  });
  assertStringIncludes(
    result,
    "<NetProfitOrLossAmt>30000</NetProfitOrLossAmt>",
  );
  assertNotIncludes(result, "filing_status");
  assertNotIncludes(result, "MFJ");
});
