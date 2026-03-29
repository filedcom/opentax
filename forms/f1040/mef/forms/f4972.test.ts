import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildIRS4972 } from "./f4972.ts";

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

Deno.test("f4972: empty object returns empty string", () => {
  assertEquals(buildIRS4972({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("f4972: all unknown keys returns empty string", () => {
  assertEquals(buildIRS4972({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("f4972: lump_sum_amount at zero is emitted", () => {
  const result = buildIRS4972({ lump_sum_amount: 0 });
  assertStringIncludes(result, "<LumpSumDistriAmt>0</LumpSumDistriAmt>");
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 3 fields)
// ---------------------------------------------------------------------------

Deno.test("f4972: lump_sum_amount maps to LumpSumDistriAmt", () => {
  const result = buildIRS4972({ lump_sum_amount: 100000 });
  assertStringIncludes(result, "<LumpSumDistriAmt>100000</LumpSumDistriAmt>");
});

Deno.test("f4972: capital_gain_amount maps to CapitalGainAmt", () => {
  const result = buildIRS4972({ capital_gain_amount: 25000 });
  assertStringIncludes(result, "<CapitalGainAmt>25000</CapitalGainAmt>");
});

Deno.test("f4972: death_benefit_exclusion maps to DeathBenefitExclusionAmt", () => {
  const result = buildIRS4972({ death_benefit_exclusion: 5000 });
  assertStringIncludes(
    result,
    "<DeathBenefitExclusionAmt>5000</DeathBenefitExclusionAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("f4972: single known field emits only that element, absent fields omitted", () => {
  const result = buildIRS4972({ lump_sum_amount: 100000 });
  assertStringIncludes(result, "<LumpSumDistriAmt>100000</LumpSumDistriAmt>");
  assertNotIncludes(result, "<CapitalGainAmt>");
  assertNotIncludes(result, "<DeathBenefitExclusionAmt>");
});

Deno.test("f4972: two fields present: only those two elements emitted", () => {
  const result = buildIRS4972({
    lump_sum_amount: 100000,
    capital_gain_amount: 25000,
  });
  assertStringIncludes(result, "<LumpSumDistriAmt>100000</LumpSumDistriAmt>");
  assertStringIncludes(result, "<CapitalGainAmt>25000</CapitalGainAmt>");
  assertNotIncludes(result, "<DeathBenefitExclusionAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  lump_sum_amount: 100000,
  capital_gain_amount: 25000,
  death_benefit_exclusion: 5000,
};

Deno.test("f4972: all 3 fields present: output wrapped in IRS4972 tag", () => {
  const result = buildIRS4972(allFields);
  assertStringIncludes(result, "<IRS4972>");
  assertStringIncludes(result, "</IRS4972>");
});

Deno.test("f4972: all 3 fields present: all elements emitted", () => {
  const result = buildIRS4972(allFields);
  assertStringIncludes(result, "<LumpSumDistriAmt>100000</LumpSumDistriAmt>");
  assertStringIncludes(result, "<CapitalGainAmt>25000</CapitalGainAmt>");
  assertStringIncludes(
    result,
    "<DeathBenefitExclusionAmt>5000</DeathBenefitExclusionAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: Non-numeric fields (boolean) silently ignored
// ---------------------------------------------------------------------------

Deno.test("f4972: boolean field is silently ignored", () => {
  const result = buildIRS4972({
    elected_lump_sum: true,
    lump_sum_amount: 50000,
  });
  assertStringIncludes(result, "<LumpSumDistriAmt>50000</LumpSumDistriAmt>");
  assertNotIncludes(result, "elected_lump_sum");
  assertNotIncludes(result, "true");
});
