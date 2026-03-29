import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildIRS2441 } from "./f2441.ts";

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
  assertEquals(buildIRS2441({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(buildIRS2441({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("dep_care_benefits at zero is emitted", () => {
  const result = buildIRS2441({ dep_care_benefits: 0 });
  assertStringIncludes(
    result,
    "<DependentCareBenefitsAmt>0</DependentCareBenefitsAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping
// ---------------------------------------------------------------------------

Deno.test("dep_care_benefits maps to DependentCareBenefitsAmt", () => {
  const result = buildIRS2441({ dep_care_benefits: 5000 });
  assertStringIncludes(
    result,
    "<DependentCareBenefitsAmt>5000</DependentCareBenefitsAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output wrapped in root tag
// ---------------------------------------------------------------------------

Deno.test("dep_care_benefits wrapped in IRS2441 tag", () => {
  const result = buildIRS2441({ dep_care_benefits: 5000 });
  assertStringIncludes(result, "<IRS2441>");
  assertStringIncludes(result, "</IRS2441>");
});

// ---------------------------------------------------------------------------
// Section 6: Unknown keys not in output
// ---------------------------------------------------------------------------

Deno.test("known field emitted, unknown field dropped", () => {
  const result = buildIRS2441({ dep_care_benefits: 2500, junk: 999 });
  assertStringIncludes(
    result,
    "<DependentCareBenefitsAmt>2500</DependentCareBenefitsAmt>",
  );
  assertNotIncludes(result, "junk");
  assertNotIncludes(result, "999");
});

// ---------------------------------------------------------------------------
// Section 7: Non-number fields ignored
// ---------------------------------------------------------------------------

Deno.test("non-number field alongside numeric field: only numeric emitted", () => {
  const result = buildIRS2441({
    dep_care_benefits: 3000,
    some_flag: true,
    some_label: "MFS",
  });
  assertStringIncludes(
    result,
    "<DependentCareBenefitsAmt>3000</DependentCareBenefitsAmt>",
  );
  assertNotIncludes(result, "some_flag");
  assertNotIncludes(result, "some_label");
});

Deno.test("only non-number fields provided returns empty string", () => {
  assertEquals(
    buildIRS2441({ filing_status: "MFS", has_dependents: true }),
    "",
  );
});
