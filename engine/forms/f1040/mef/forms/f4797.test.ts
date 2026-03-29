import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildIRS4797 } from "./f4797.ts";

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

Deno.test("f4797: empty object returns empty string", () => {
  assertEquals(buildIRS4797({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("f4797: all unknown keys returns empty string", () => {
  assertEquals(buildIRS4797({ junk: 999, foo: "bar", sales: [] }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("f4797: section_1231_gain at zero is emitted", () => {
  const result = buildIRS4797({ section_1231_gain: 0 });
  assertStringIncludes(
    result,
    "<Section1231GainLossAmt>0</Section1231GainLossAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 5 fields)
// ---------------------------------------------------------------------------

Deno.test("f4797: section_1231_gain maps to Section1231GainLossAmt", () => {
  const result = buildIRS4797({ section_1231_gain: 20000 });
  assertStringIncludes(
    result,
    "<Section1231GainLossAmt>20000</Section1231GainLossAmt>",
  );
});

Deno.test("f4797: nonrecaptured_1231_loss maps to Nonrecaptured1231LossAmt", () => {
  const result = buildIRS4797({ nonrecaptured_1231_loss: 5000 });
  assertStringIncludes(
    result,
    "<Nonrecaptured1231LossAmt>5000</Nonrecaptured1231LossAmt>",
  );
});

Deno.test("f4797: ordinary_gain maps to OrdinaryGainLossAmt", () => {
  const result = buildIRS4797({ ordinary_gain: 8000 });
  assertStringIncludes(
    result,
    "<OrdinaryGainLossAmt>8000</OrdinaryGainLossAmt>",
  );
});

Deno.test("f4797: recapture_1245 maps to Section1245DepreciationAmt", () => {
  const result = buildIRS4797({ recapture_1245: 3000 });
  assertStringIncludes(
    result,
    "<Section1245DepreciationAmt>3000</Section1245DepreciationAmt>",
  );
});

Deno.test("f4797: recapture_1250 maps to Section1250DepreciationAmt", () => {
  const result = buildIRS4797({ recapture_1250: 1500 });
  assertStringIncludes(
    result,
    "<Section1250DepreciationAmt>1500</Section1250DepreciationAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("f4797: single known field emits only that element, absent fields omitted", () => {
  const result = buildIRS4797({ section_1231_gain: 20000 });
  assertStringIncludes(
    result,
    "<Section1231GainLossAmt>20000</Section1231GainLossAmt>",
  );
  assertNotIncludes(result, "<Nonrecaptured1231LossAmt>");
  assertNotIncludes(result, "<OrdinaryGainLossAmt>");
  assertNotIncludes(result, "<Section1245DepreciationAmt>");
  assertNotIncludes(result, "<Section1250DepreciationAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  section_1231_gain: 20000,
  nonrecaptured_1231_loss: 5000,
  ordinary_gain: 8000,
  recapture_1245: 3000,
  recapture_1250: 1500,
};

Deno.test("f4797: all 5 fields present: output wrapped in IRS4797 tag", () => {
  const result = buildIRS4797(allFields);
  assertStringIncludes(result, "<IRS4797>");
  assertStringIncludes(result, "</IRS4797>");
});

Deno.test("f4797: all 5 fields present: all elements emitted", () => {
  const result = buildIRS4797(allFields);
  assertStringIncludes(
    result,
    "<Section1231GainLossAmt>20000</Section1231GainLossAmt>",
  );
  assertStringIncludes(
    result,
    "<Nonrecaptured1231LossAmt>5000</Nonrecaptured1231LossAmt>",
  );
  assertStringIncludes(
    result,
    "<OrdinaryGainLossAmt>8000</OrdinaryGainLossAmt>",
  );
  assertStringIncludes(
    result,
    "<Section1245DepreciationAmt>3000</Section1245DepreciationAmt>",
  );
  assertStringIncludes(
    result,
    "<Section1250DepreciationAmt>1500</Section1250DepreciationAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: Array fields are silently ignored
// ---------------------------------------------------------------------------

Deno.test("f4797: array sales field is silently ignored", () => {
  const result = buildIRS4797({
    sales: [{ amount: 1000 }],
    section_1231_gain: 20000,
  });
  assertStringIncludes(
    result,
    "<Section1231GainLossAmt>20000</Section1231GainLossAmt>",
  );
  assertNotIncludes(result, "sales");
});
