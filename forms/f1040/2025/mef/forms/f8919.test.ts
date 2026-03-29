import { assertEquals, assertStringIncludes } from "@std/assert";
import { form8919 } from "./f8919.ts";

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

Deno.test("f8919: empty object returns empty string", () => {
  assertEquals(form8919.build({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("f8919: all unknown keys returns empty string", () => {
  assertEquals(form8919.build({ form8919: { junk: 999, foo: "bar", baz: 0 } }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("f8919: wages at zero is emitted", () => {
  const result = form8919.build({ form8919: { wages: 0 } });
  assertStringIncludes(result, "<WagesReceivedAmt>0</WagesReceivedAmt>");
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 2 fields)
// ---------------------------------------------------------------------------

Deno.test("f8919: wages maps to WagesReceivedAmt", () => {
  const result = form8919.build({ form8919: { wages: 45000 } });
  assertStringIncludes(result, "<WagesReceivedAmt>45000</WagesReceivedAmt>");
});

Deno.test("f8919: prior_ss_wages maps to PriorSSWagesAmt", () => {
  const result = form8919.build({ form8919: { prior_ss_wages: 20000 } });
  assertStringIncludes(result, "<PriorSSWagesAmt>20000</PriorSSWagesAmt>");
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("f8919: single known field emits only that element, absent fields omitted", () => {
  const result = form8919.build({ form8919: { wages: 45000 } });
  assertStringIncludes(result, "<WagesReceivedAmt>45000</WagesReceivedAmt>");
  assertNotIncludes(result, "<PriorSSWagesAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  wages: 45000,
  prior_ss_wages: 20000,
};

Deno.test("f8919: all 2 fields present: output wrapped in IRS8919 tag", () => {
  const result = form8919.build({ form8919: allFields });
  assertStringIncludes(result, "<IRS8919>");
  assertStringIncludes(result, "</IRS8919>");
});

Deno.test("f8919: all 2 fields present: all elements emitted", () => {
  const result = form8919.build({ form8919: allFields });
  assertStringIncludes(result, "<WagesReceivedAmt>45000</WagesReceivedAmt>");
  assertStringIncludes(result, "<PriorSSWagesAmt>20000</PriorSSWagesAmt>");
});

// ---------------------------------------------------------------------------
// Section 7: Non-numeric fields (reason_code enum) silently ignored
// ---------------------------------------------------------------------------

Deno.test("f8919: reason_code string field is silently ignored", () => {
  const result = form8919.build({ form8919: { reason_code: "G", wages: 10000 } });
  assertStringIncludes(result, "<WagesReceivedAmt>10000</WagesReceivedAmt>");
  assertNotIncludes(result, "reason_code");
  assertNotIncludes(result, '"G"');
});
