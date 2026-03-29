import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildIRS4137 } from "./f4137.ts";

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

Deno.test("f4137: empty object returns empty string", () => {
  assertEquals(buildIRS4137({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("f4137: all unknown keys returns empty string", () => {
  assertEquals(buildIRS4137({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("f4137: allocated_tips at zero is emitted", () => {
  const result = buildIRS4137({ allocated_tips: 0 });
  assertStringIncludes(result, "<AllocatedTipsAmt>0</AllocatedTipsAmt>");
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 4 fields)
// ---------------------------------------------------------------------------

Deno.test("f4137: allocated_tips maps to AllocatedTipsAmt", () => {
  const result = buildIRS4137({ allocated_tips: 1500 });
  assertStringIncludes(result, "<AllocatedTipsAmt>1500</AllocatedTipsAmt>");
});

Deno.test("f4137: total_tips_received maps to TotalTipsRcvdAmt", () => {
  const result = buildIRS4137({ total_tips_received: 8000 });
  assertStringIncludes(result, "<TotalTipsRcvdAmt>8000</TotalTipsRcvdAmt>");
});

Deno.test("f4137: reported_tips maps to TipsReportedToEmployerAmt", () => {
  const result = buildIRS4137({ reported_tips: 3000 });
  assertStringIncludes(
    result,
    "<TipsReportedToEmployerAmt>3000</TipsReportedToEmployerAmt>",
  );
});

Deno.test("f4137: ss_wages_from_w2 maps to SocSecWagesFromW2Amt", () => {
  const result = buildIRS4137({ ss_wages_from_w2: 50000 });
  assertStringIncludes(
    result,
    "<SocSecWagesFromW2Amt>50000</SocSecWagesFromW2Amt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("f4137: single known field emits only that element, absent fields omitted", () => {
  const result = buildIRS4137({ allocated_tips: 1500 });
  assertStringIncludes(result, "<AllocatedTipsAmt>1500</AllocatedTipsAmt>");
  assertNotIncludes(result, "<TotalTipsRcvdAmt>");
  assertNotIncludes(result, "<TipsReportedToEmployerAmt>");
  assertNotIncludes(result, "<SocSecWagesFromW2Amt>");
});

Deno.test("f4137: two fields present: only those two elements emitted", () => {
  const result = buildIRS4137({ allocated_tips: 1500, reported_tips: 3000 });
  assertStringIncludes(result, "<AllocatedTipsAmt>1500</AllocatedTipsAmt>");
  assertStringIncludes(
    result,
    "<TipsReportedToEmployerAmt>3000</TipsReportedToEmployerAmt>",
  );
  assertNotIncludes(result, "<TotalTipsRcvdAmt>");
  assertNotIncludes(result, "<SocSecWagesFromW2Amt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  allocated_tips: 1500,
  total_tips_received: 8000,
  reported_tips: 3000,
  ss_wages_from_w2: 50000,
};

Deno.test("f4137: all 4 fields present: output wrapped in IRS4137 tag", () => {
  const result = buildIRS4137(allFields);
  assertStringIncludes(result, "<IRS4137>");
  assertStringIncludes(result, "</IRS4137>");
});

Deno.test("f4137: all 4 fields present: all elements emitted", () => {
  const result = buildIRS4137(allFields);
  assertStringIncludes(result, "<AllocatedTipsAmt>1500</AllocatedTipsAmt>");
  assertStringIncludes(result, "<TotalTipsRcvdAmt>8000</TotalTipsRcvdAmt>");
  assertStringIncludes(
    result,
    "<TipsReportedToEmployerAmt>3000</TipsReportedToEmployerAmt>",
  );
  assertStringIncludes(
    result,
    "<SocSecWagesFromW2Amt>50000</SocSecWagesFromW2Amt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: Non-numeric fields are silently ignored
// ---------------------------------------------------------------------------

Deno.test("f4137: string field is silently ignored", () => {
  const result = buildIRS4137({ reason_code: "G", allocated_tips: 500 });
  assertStringIncludes(result, "<AllocatedTipsAmt>500</AllocatedTipsAmt>");
  assertNotIncludes(result, "reason_code");
  assertNotIncludes(result, '"G"');
});
