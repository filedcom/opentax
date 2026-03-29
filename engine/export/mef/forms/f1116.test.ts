import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildIRS1116 } from "./f1116.ts";

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

Deno.test("f1116: empty object returns empty string", () => {
  assertEquals(buildIRS1116({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("f1116: all unknown keys returns empty string", () => {
  assertEquals(
    buildIRS1116({ junk: 999, foo: "bar", income_category: "GEN" }),
    "",
  );
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("f1116: foreign_tax_paid at zero is emitted", () => {
  const result = buildIRS1116({ foreign_tax_paid: 0 });
  assertStringIncludes(
    result,
    "<ForeignTaxesPaidOrAccruedAmt>0</ForeignTaxesPaidOrAccruedAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 4 fields)
// ---------------------------------------------------------------------------

Deno.test("f1116: foreign_tax_paid maps to ForeignTaxesPaidOrAccruedAmt", () => {
  const result = buildIRS1116({ foreign_tax_paid: 1500 });
  assertStringIncludes(
    result,
    "<ForeignTaxesPaidOrAccruedAmt>1500</ForeignTaxesPaidOrAccruedAmt>",
  );
});

Deno.test("f1116: foreign_income maps to ForeignSourceIncomeAmt", () => {
  const result = buildIRS1116({ foreign_income: 8000 });
  assertStringIncludes(
    result,
    "<ForeignSourceIncomeAmt>8000</ForeignSourceIncomeAmt>",
  );
});

Deno.test("f1116: total_income maps to TotalIncomeAmt", () => {
  const result = buildIRS1116({ total_income: 75000 });
  assertStringIncludes(
    result,
    "<TotalIncomeAmt>75000</TotalIncomeAmt>",
  );
});

Deno.test("f1116: us_tax_before_credits maps to USTaxBeforeCreditsAmt", () => {
  const result = buildIRS1116({ us_tax_before_credits: 12000 });
  assertStringIncludes(
    result,
    "<USTaxBeforeCreditsAmt>12000</USTaxBeforeCreditsAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("f1116: single known field emits only that element, absent fields omitted", () => {
  const result = buildIRS1116({ foreign_tax_paid: 1500 });
  assertStringIncludes(
    result,
    "<ForeignTaxesPaidOrAccruedAmt>1500</ForeignTaxesPaidOrAccruedAmt>",
  );
  assertNotIncludes(result, "<ForeignSourceIncomeAmt>");
  assertNotIncludes(result, "<TotalIncomeAmt>");
  assertNotIncludes(result, "<USTaxBeforeCreditsAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  foreign_tax_paid: 1500,
  foreign_income: 8000,
  total_income: 75000,
  us_tax_before_credits: 12000,
};

Deno.test("f1116: all 4 fields present: output wrapped in IRS1116 tag", () => {
  const result = buildIRS1116(allFields);
  assertStringIncludes(result, "<IRS1116>");
  assertStringIncludes(result, "</IRS1116>");
});

Deno.test("f1116: all 4 fields present: all elements emitted", () => {
  const result = buildIRS1116(allFields);
  assertStringIncludes(
    result,
    "<ForeignTaxesPaidOrAccruedAmt>1500</ForeignTaxesPaidOrAccruedAmt>",
  );
  assertStringIncludes(
    result,
    "<ForeignSourceIncomeAmt>8000</ForeignSourceIncomeAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalIncomeAmt>75000</TotalIncomeAmt>",
  );
  assertStringIncludes(
    result,
    "<USTaxBeforeCreditsAmt>12000</USTaxBeforeCreditsAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: Enum/string fields are silently ignored
// ---------------------------------------------------------------------------

Deno.test("f1116: income_category enum field is silently ignored", () => {
  const result = buildIRS1116({
    income_category: "GEN",
    foreign_tax_paid: 1500,
  });
  assertStringIncludes(
    result,
    "<ForeignTaxesPaidOrAccruedAmt>1500</ForeignTaxesPaidOrAccruedAmt>",
  );
  assertNotIncludes(result, "income_category");
  assertNotIncludes(result, "GEN");
});

Deno.test("f1116: filing_status string field is silently ignored", () => {
  const result = buildIRS1116({ filing_status: "MFJ", foreign_income: 8000 });
  assertStringIncludes(
    result,
    "<ForeignSourceIncomeAmt>8000</ForeignSourceIncomeAmt>",
  );
  assertNotIncludes(result, "filing_status");
  assertNotIncludes(result, "MFJ");
});
