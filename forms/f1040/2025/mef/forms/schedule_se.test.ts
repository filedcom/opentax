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
// Section 3: Zero value emitted (tag name verified against IRS1040ScheduleSE.xsd)
// ---------------------------------------------------------------------------

Deno.test("schedule_se: net_profit_schedule_c at zero is emitted", () => {
  const result = scheduleSE.build({ net_profit_schedule_c: 0 });
  assertStringIncludes(result, "<NetNonFarmProfitLossAmt>0</NetNonFarmProfitLossAmt>");
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 5 fields)
// Tag names verified against IRS1040ScheduleSE.xsd (2025v3.0)
// ---------------------------------------------------------------------------

Deno.test("schedule_se: net_profit_schedule_c maps to NetNonFarmProfitLossAmt", () => {
  const result = scheduleSE.build({ net_profit_schedule_c: 30000 });
  assertStringIncludes(
    result,
    "<NetNonFarmProfitLossAmt>30000</NetNonFarmProfitLossAmt>",
  );
});

Deno.test("schedule_se: net_profit_schedule_f maps to NetFarmProfitLossAmt", () => {
  const result = scheduleSE.build({ net_profit_schedule_f: 15000 });
  assertStringIncludes(
    result,
    "<NetFarmProfitLossAmt>15000</NetFarmProfitLossAmt>",
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
// Section 5: Required SSN field
// ---------------------------------------------------------------------------

Deno.test("schedule_se: SSN element emitted before income fields", () => {
  const result = scheduleSE.build({ net_profit_schedule_c: 30000 });
  assertStringIncludes(result, "<SSN>");
  // SSN appears before income field in the output
  const ssnPos = result.indexOf("<SSN>");
  const incomePos = result.indexOf("<NetNonFarmProfitLossAmt>");
  assertEquals(ssnPos < incomePos, true, "SSN must precede income fields");
});

Deno.test("schedule_se: uses taxpayer_ssn from pending when available", () => {
  const result = scheduleSE.build({
    net_profit_schedule_c: 30000,
    taxpayer_ssn: "123-45-6789",
  });
  assertStringIncludes(result, "<SSN>123-45-6789</SSN>");
});

Deno.test("schedule_se: falls back to placeholder SSN when taxpayer_ssn absent", () => {
  const result = scheduleSE.build({ net_profit_schedule_c: 30000 });
  assertStringIncludes(result, "<SSN>000000000</SSN>");
});

// ---------------------------------------------------------------------------
// Section 6: Sparse output
// ---------------------------------------------------------------------------

Deno.test("schedule_se: single known field emits only that element, absent fields omitted", () => {
  const result = scheduleSE.build({ net_profit_schedule_c: 30000 });
  assertStringIncludes(
    result,
    "<NetNonFarmProfitLossAmt>30000</NetNonFarmProfitLossAmt>",
  );
  assertNotIncludes(result, "<NetFarmProfitLossAmt>");
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
    "<NetNonFarmProfitLossAmt>30000</NetNonFarmProfitLossAmt>",
  );
  assertStringIncludes(
    result,
    "<WagesSubjectToSSTAmt>8000</WagesSubjectToSSTAmt>",
  );
  assertNotIncludes(result, "<NetFarmProfitLossAmt>");
  assertNotIncludes(result, "<SocSecWagesAmt>");
});

// ---------------------------------------------------------------------------
// Section 7: All fields present
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
    "<NetNonFarmProfitLossAmt>30000</NetNonFarmProfitLossAmt>",
  );
  assertStringIncludes(
    result,
    "<NetFarmProfitLossAmt>15000</NetFarmProfitLossAmt>",
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
// Section 8: Non-numeric fields silently ignored
// ---------------------------------------------------------------------------

Deno.test("schedule_se: string field is silently ignored", () => {
  const result = scheduleSE.build({
    filing_status: "MFJ",
    net_profit_schedule_c: 30000,
  });
  assertStringIncludes(
    result,
    "<NetNonFarmProfitLossAmt>30000</NetNonFarmProfitLossAmt>",
  );
  assertNotIncludes(result, "filing_status");
  assertNotIncludes(result, "MFJ");
});
