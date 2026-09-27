import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import { scheduleSE as rawScheduleSE } from "./schedule_se.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Test Filer",
  nameLine1: "FILER TEST",
  nameControl: "FILE",
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
};
const scheduleSE = {
  build: (fields: Parameters<typeof rawScheduleSE.build>[0]) =>
    rawScheduleSE.build(fields, { filer }),
};

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
  assertStringIncludes(
    result,
    "<NetNonFarmProfitLossAmt>0</NetNonFarmProfitLossAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 5 fields)
// Tag names verified against IRS1040ScheduleSE.xsd (TY2025 v5.4)
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

Deno.test("schedule_se: unreported_tips_4137 maps to UnreportedTipsAmt", () => {
  const result = scheduleSE.build({ unreported_tips_4137: 2000 });
  assertStringIncludes(
    result,
    "<UnreportedTipsAmt>2000</UnreportedTipsAmt>",
  );
});

Deno.test("schedule_se: wages_8919 maps to WagesSubjectToSSTAmt", () => {
  const result = scheduleSE.build({ wages_8919: 8000 });
  assertStringIncludes(
    result,
    "<WagesSubjectToSSTAmt>8000</WagesSubjectToSSTAmt>",
  );
});

Deno.test("schedule_se: w2_ss_wages alone does not emit SE form (W-2-only filer)", () => {
  const result = scheduleSE.build({ w2_ss_wages: 100000 });
  assertEquals(result, "");
});

Deno.test("schedule_se: w2_ss_wages maps to SSTWagesRRTCompAmt when SE income present", () => {
  const result = scheduleSE.build({
    net_profit_schedule_c: 30000,
    w2_ss_wages: 100000,
  });
  assertStringIncludes(
    result,
    "<SSTWagesRRTCompAmt>100000</SSTWagesRRTCompAmt>",
  );
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

Deno.test("schedule_se: uses the filer SSN and checks a supplied pending SSN", () => {
  const result = scheduleSE.build({
    net_profit_schedule_c: 30000,
    taxpayer_ssn: "123-45-6789",
  });
  assertStringIncludes(result, "<SSN>123456789</SSN>");
});

Deno.test("schedule_se: rejects missing or conflicting filer identity", () => {
  assertThrows(
    () => rawScheduleSE.build({ net_profit_schedule_c: 30000 }),
    Error,
    "needs the filer's nine-digit SSN",
  );
  assertThrows(
    () =>
      scheduleSE.build({
        net_profit_schedule_c: 30000,
        taxpayer_ssn: "987654321",
      }),
    Error,
    "does not match the filer",
  );
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
  assertNotIncludes(result, "<UnreportedTipsAmt>");
  assertNotIncludes(result, "<WagesSubjectToSSTAmt>");
  assertNotIncludes(result, "<SSTWagesRRTCompAmt>");
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
  assertNotIncludes(result, "<SSTWagesRRTCompAmt>");
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
    "<UnreportedTipsAmt>2000</UnreportedTipsAmt>",
  );
  assertStringIncludes(
    result,
    "<WagesSubjectToSSTAmt>8000</WagesSubjectToSSTAmt>",
  );
  assertStringIncludes(
    result,
    "<SSTWagesRRTCompAmt>100000</SSTWagesRRTCompAmt>",
  );
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

Deno.test("schedule_se: farm election maps Parts I and II in TY2025 XSD order", () => {
  const result = scheduleSE.build({
    farm_optional_method_elected: true,
    gross_farm_income: 9_000,
    net_profit_schedule_f: -2_000,
    net_profit_schedule_c: 1_000,
    w2_ss_wages: 2_000,
  });
  assertNotIncludes(result, "<NetFarmProfitLossAmt>");
  const expected = [
    "<NetNonFarmProfitLossAmt>1000</NetNonFarmProfitLossAmt>",
    "<SETotalNetEarningsOrLossAmt>1000</SETotalNetEarningsOrLossAmt>",
    "<MinimumProfitForSETaxAmt>924</MinimumProfitForSETaxAmt>",
    "<OptionalMethodAmt>6000</OptionalMethodAmt>",
    "<CombinedSEAmt>6924</CombinedSEAmt>",
    "<CombinedSEAndChurchWagesAmt>6924</CombinedSEAndChurchWagesAmt>",
    "<SSTWagesRRTCompAmt>2000</SSTWagesRRTCompAmt>",
    "<SETaxFarmOptionalMethodAmt>6000</SETaxFarmOptionalMethodAmt>",
  ];
  let previous = -1;
  for (const xml of expected) {
    const current = result.indexOf(xml);
    assertEquals(current > previous, true, `Missing or out of order: ${xml}`);
    previous = current;
  }
});

Deno.test("schedule_se: farm election caps line 15 at $7,240", () => {
  const result = scheduleSE.build({
    farm_optional_method_elected: true,
    gross_farm_income: 10_860,
    net_profit_schedule_f: 7_840,
  });
  assertStringIncludes(result, "<OptionalMethodAmt>7240</OptionalMethodAmt>");
  assertStringIncludes(
    result,
    "<SETaxFarmOptionalMethodAmt>7240</SETaxFarmOptionalMethodAmt>",
  );
  assertNotIncludes(result, "<NetFarmProfitLossAmt>");
});

Deno.test("schedule_se: farm election refuses missing or ineligible source facts", () => {
  assertThrows(
    () =>
      scheduleSE.build({
        farm_optional_method_elected: true,
        net_profit_schedule_f: -2_000,
      }),
    Error,
    "requires gross farm income and net farm profit",
  );
  assertThrows(
    () =>
      scheduleSE.build({
        farm_optional_method_elected: true,
        gross_farm_income: 12_000,
        net_profit_schedule_f: 8_000,
      }),
    Error,
    "unavailable",
  );
});

Deno.test("schedule_se: elected line 4c below $400 stops without a form", () => {
  assertEquals(
    scheduleSE.build({
      farm_optional_method_elected: true,
      gross_farm_income: 300,
      net_profit_schedule_f: -1_000,
    }),
    "",
  );
});
