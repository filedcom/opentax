import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildIRS5329 } from "./f5329.ts";

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

Deno.test("empty object returns empty string", () => {
  assertEquals(buildIRS5329({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(buildIRS5329({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("early_distribution at zero is emitted", () => {
  const result = buildIRS5329({ early_distribution: 0 });
  assertStringIncludes(
    result,
    "<EarlyDistributionAmt>0</EarlyDistributionAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 15 fields)
// ---------------------------------------------------------------------------

Deno.test("early_distribution maps to EarlyDistributionAmt", () => {
  const result = buildIRS5329({ early_distribution: 5000 });
  assertStringIncludes(
    result,
    "<EarlyDistributionAmt>5000</EarlyDistributionAmt>",
  );
});

Deno.test("simple_ira_early_distribution maps to SimpleIRAEarlyDistriAmt", () => {
  const result = buildIRS5329({ simple_ira_early_distribution: 3000 });
  assertStringIncludes(
    result,
    "<SimpleIRAEarlyDistriAmt>3000</SimpleIRAEarlyDistriAmt>",
  );
});

Deno.test("esa_able_distribution maps to ESAABLEDistributionAmt", () => {
  const result = buildIRS5329({ esa_able_distribution: 2000 });
  assertStringIncludes(
    result,
    "<ESAABLEDistributionAmt>2000</ESAABLEDistributionAmt>",
  );
});

Deno.test("excess_traditional_ira maps to ExcessContriTradIRAAmt", () => {
  const result = buildIRS5329({ excess_traditional_ira: 1500 });
  assertStringIncludes(
    result,
    "<ExcessContriTradIRAAmt>1500</ExcessContriTradIRAAmt>",
  );
});

Deno.test("traditional_ira_value maps to TraditionalIRAValueAmt", () => {
  const result = buildIRS5329({ traditional_ira_value: 50000 });
  assertStringIncludes(
    result,
    "<TraditionalIRAValueAmt>50000</TraditionalIRAValueAmt>",
  );
});

Deno.test("excess_roth_ira maps to ExcessContriRothIRAAmt", () => {
  const result = buildIRS5329({ excess_roth_ira: 1000 });
  assertStringIncludes(
    result,
    "<ExcessContriRothIRAAmt>1000</ExcessContriRothIRAAmt>",
  );
});

Deno.test("roth_ira_value maps to RothIRAValueAmt", () => {
  const result = buildIRS5329({ roth_ira_value: 30000 });
  assertStringIncludes(result, "<RothIRAValueAmt>30000</RothIRAValueAmt>");
});

Deno.test("excess_coverdell_esa maps to ExcessContriCoverdellESAAmt", () => {
  const result = buildIRS5329({ excess_coverdell_esa: 500 });
  assertStringIncludes(
    result,
    "<ExcessContriCoverdellESAAmt>500</ExcessContriCoverdellESAAmt>",
  );
});

Deno.test("coverdell_esa_value maps to CoverdellESAValueAmt", () => {
  const result = buildIRS5329({ coverdell_esa_value: 10000 });
  assertStringIncludes(
    result,
    "<CoverdellESAValueAmt>10000</CoverdellESAValueAmt>",
  );
});

Deno.test("excess_archer_msa maps to ExcessContriArcherMSAAmt", () => {
  const result = buildIRS5329({ excess_archer_msa: 750 });
  assertStringIncludes(
    result,
    "<ExcessContriArcherMSAAmt>750</ExcessContriArcherMSAAmt>",
  );
});

Deno.test("archer_msa_value maps to ArcherMSAValueAmt", () => {
  const result = buildIRS5329({ archer_msa_value: 8000 });
  assertStringIncludes(result, "<ArcherMSAValueAmt>8000</ArcherMSAValueAmt>");
});

Deno.test("excess_hsa maps to ExcessContriHSAAmt", () => {
  const result = buildIRS5329({ excess_hsa: 600 });
  assertStringIncludes(result, "<ExcessContriHSAAmt>600</ExcessContriHSAAmt>");
});

Deno.test("hsa_value maps to HSAValueAmt", () => {
  const result = buildIRS5329({ hsa_value: 4000 });
  assertStringIncludes(result, "<HSAValueAmt>4000</HSAValueAmt>");
});

Deno.test("excess_able maps to ExcessContriABLEAmt", () => {
  const result = buildIRS5329({ excess_able: 400 });
  assertStringIncludes(
    result,
    "<ExcessContriABLEAmt>400</ExcessContriABLEAmt>",
  );
});

Deno.test("able_value maps to ABLEAccountValueAmt", () => {
  const result = buildIRS5329({ able_value: 15000 });
  assertStringIncludes(
    result,
    "<ABLEAccountValueAmt>15000</ABLEAccountValueAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("single known field emits only that element, absent fields omitted", () => {
  const result = buildIRS5329({ early_distribution: 5000 });
  assertStringIncludes(
    result,
    "<EarlyDistributionAmt>5000</EarlyDistributionAmt>",
  );
  assertNotIncludes(result, "<SimpleIRAEarlyDistriAmt>");
  assertNotIncludes(result, "<ExcessContriTradIRAAmt>");
  assertNotIncludes(result, "<HSAValueAmt>");
});

Deno.test("two fields present: only those two elements emitted", () => {
  const result = buildIRS5329({
    early_distribution: 5000,
    excess_traditional_ira: 1500,
  });
  assertStringIncludes(
    result,
    "<EarlyDistributionAmt>5000</EarlyDistributionAmt>",
  );
  assertStringIncludes(
    result,
    "<ExcessContriTradIRAAmt>1500</ExcessContriTradIRAAmt>",
  );
  assertNotIncludes(result, "<SimpleIRAEarlyDistriAmt>");
  assertNotIncludes(result, "<HSAValueAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  early_distribution: 5000,
  simple_ira_early_distribution: 3000,
  esa_able_distribution: 2000,
  excess_traditional_ira: 1500,
  traditional_ira_value: 50000,
  excess_roth_ira: 1000,
  roth_ira_value: 30000,
  excess_coverdell_esa: 500,
  coverdell_esa_value: 10000,
  excess_archer_msa: 750,
  archer_msa_value: 8000,
  excess_hsa: 600,
  hsa_value: 4000,
  excess_able: 400,
  able_value: 15000,
};

Deno.test("all 15 fields present: output wrapped in IRS5329 tag", () => {
  const result = buildIRS5329(allFields);
  assertStringIncludes(result, "<IRS5329>");
  assertStringIncludes(result, "</IRS5329>");
});

Deno.test("all 15 fields present: all elements emitted", () => {
  const result = buildIRS5329(allFields);
  assertStringIncludes(
    result,
    "<EarlyDistributionAmt>5000</EarlyDistributionAmt>",
  );
  assertStringIncludes(
    result,
    "<SimpleIRAEarlyDistriAmt>3000</SimpleIRAEarlyDistriAmt>",
  );
  assertStringIncludes(
    result,
    "<ESAABLEDistributionAmt>2000</ESAABLEDistributionAmt>",
  );
  assertStringIncludes(
    result,
    "<ExcessContriTradIRAAmt>1500</ExcessContriTradIRAAmt>",
  );
  assertStringIncludes(
    result,
    "<TraditionalIRAValueAmt>50000</TraditionalIRAValueAmt>",
  );
  assertStringIncludes(
    result,
    "<ExcessContriRothIRAAmt>1000</ExcessContriRothIRAAmt>",
  );
  assertStringIncludes(result, "<RothIRAValueAmt>30000</RothIRAValueAmt>");
  assertStringIncludes(
    result,
    "<ExcessContriCoverdellESAAmt>500</ExcessContriCoverdellESAAmt>",
  );
  assertStringIncludes(
    result,
    "<CoverdellESAValueAmt>10000</CoverdellESAValueAmt>",
  );
  assertStringIncludes(
    result,
    "<ExcessContriArcherMSAAmt>750</ExcessContriArcherMSAAmt>",
  );
  assertStringIncludes(result, "<ArcherMSAValueAmt>8000</ArcherMSAValueAmt>");
  assertStringIncludes(result, "<ExcessContriHSAAmt>600</ExcessContriHSAAmt>");
  assertStringIncludes(result, "<HSAValueAmt>4000</HSAValueAmt>");
  assertStringIncludes(
    result,
    "<ExcessContriABLEAmt>400</ExcessContriABLEAmt>",
  );
  assertStringIncludes(
    result,
    "<ABLEAccountValueAmt>15000</ABLEAccountValueAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: Non-numeric enum fields are ignored
// ---------------------------------------------------------------------------

Deno.test("distribution_code enum field is silently ignored", () => {
  const result = buildIRS5329({
    distribution_code: "7",
    early_distribution: 5000,
  });
  assertStringIncludes(
    result,
    "<EarlyDistributionAmt>5000</EarlyDistributionAmt>",
  );
  assertNotIncludes(result, "distribution_code");
  assertNotIncludes(result, '"7"');
});

Deno.test("early_distribution_exception enum field is silently ignored", () => {
  const result = buildIRS5329({
    early_distribution_exception: "02",
    excess_traditional_ira: 1500,
  });
  assertStringIncludes(
    result,
    "<ExcessContriTradIRAAmt>1500</ExcessContriTradIRAAmt>",
  );
  assertNotIncludes(result, "early_distribution_exception");
});
