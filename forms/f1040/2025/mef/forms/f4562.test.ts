import { assertEquals, assertStringIncludes } from "@std/assert";
import { form4562 } from "./f4562.ts";

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
  assertEquals(form4562.build({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(form4562.build({ form4562: { junk: 999, foo: "bar", baz: 0 } }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("section_179_deduction at zero is emitted", () => {
  const result = form4562.build({ form4562: { section_179_deduction: 0 } });
  assertStringIncludes(
    result,
    "<Section179DeductionAmt>0</Section179DeductionAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 12 fields)
// ---------------------------------------------------------------------------

Deno.test("section_179_deduction maps to Section179DeductionAmt", () => {
  const result = form4562.build({ form4562: { section_179_deduction: 10000 } });
  assertStringIncludes(
    result,
    "<Section179DeductionAmt>10000</Section179DeductionAmt>",
  );
});

Deno.test("section_179_cost maps to Section179CostAmt", () => {
  const result = form4562.build({ form4562: { section_179_cost: 25000 } });
  assertStringIncludes(
    result,
    "<Section179CostAmt>25000</Section179CostAmt>",
  );
});

Deno.test("section_179_elected maps to Section179ElectedCostAmt", () => {
  const result = form4562.build({ form4562: { section_179_elected: 20000 } });
  assertStringIncludes(
    result,
    "<Section179ElectedCostAmt>20000</Section179ElectedCostAmt>",
  );
});

Deno.test("section_179_carryover maps to Section179CarryoverAmt", () => {
  const result = form4562.build({ form4562: { section_179_carryover: 5000 } });
  assertStringIncludes(
    result,
    "<Section179CarryoverAmt>5000</Section179CarryoverAmt>",
  );
});

Deno.test("business_income_limit maps to BusinessIncomeLimitAmt", () => {
  const result = form4562.build({ form4562: { business_income_limit: 80000 } });
  assertStringIncludes(
    result,
    "<BusinessIncomeLimitAmt>80000</BusinessIncomeLimitAmt>",
  );
});

Deno.test("bonus_depreciation_basis maps to BonusDepreciationBasisAmt", () => {
  const result = form4562.build({ form4562: { bonus_depreciation_basis: 50000 } });
  assertStringIncludes(
    result,
    "<BonusDepreciationBasisAmt>50000</BonusDepreciationBasisAmt>",
  );
});

Deno.test("bonus_depreciation_basis_post_jan19 maps to BonusDeprecBasisPostJan19Amt", () => {
  const result = form4562.build({ form4562: { bonus_depreciation_basis_post_jan19: 30000 } });
  assertStringIncludes(
    result,
    "<BonusDeprecBasisPostJan19Amt>30000</BonusDeprecBasisPostJan19Amt>",
  );
});

Deno.test("macrs_gds_basis maps to MACRSGDSBasisAmt", () => {
  const result = form4562.build({ form4562: { macrs_gds_basis: 40000 } });
  assertStringIncludes(
    result,
    "<MACRSGDSBasisAmt>40000</MACRSGDSBasisAmt>",
  );
});

Deno.test("macrs_gds_recovery_period maps to MACRSGDSRecoveryPeriodAmt", () => {
  const result = form4562.build({ form4562: { macrs_gds_recovery_period: 7 } });
  assertStringIncludes(
    result,
    "<MACRSGDSRecoveryPeriodAmt>7</MACRSGDSRecoveryPeriodAmt>",
  );
});

Deno.test("macrs_gds_year_of_service maps to MACRSGDSYearOfServiceAmt", () => {
  const result = form4562.build({ form4562: { macrs_gds_year_of_service: 3 } });
  assertStringIncludes(
    result,
    "<MACRSGDSYearOfServiceAmt>3</MACRSGDSYearOfServiceAmt>",
  );
});

Deno.test("macrs_prior_depreciation maps to MACRSPriorDepreciationAmt", () => {
  const result = form4562.build({ form4562: { macrs_prior_depreciation: 12000 } });
  assertStringIncludes(
    result,
    "<MACRSPriorDepreciationAmt>12000</MACRSPriorDepreciationAmt>",
  );
});

Deno.test("business_use_pct maps to BusinessUsePct", () => {
  const result = form4562.build({ form4562: { business_use_pct: 80 } });
  assertStringIncludes(result, "<BusinessUsePct>80</BusinessUsePct>");
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("single known field emits only that element, absent fields omitted", () => {
  const result = form4562.build({ form4562: { section_179_deduction: 10000 } });
  assertStringIncludes(
    result,
    "<Section179DeductionAmt>10000</Section179DeductionAmt>",
  );
  assertNotIncludes(result, "<Section179CostAmt>");
  assertNotIncludes(result, "<BonusDepreciationBasisAmt>");
  assertNotIncludes(result, "<MACRSGDSBasisAmt>");
});

Deno.test("two fields present: only those two elements emitted", () => {
  const result = form4562.build({ form4562: {
    section_179_deduction: 10000,
    business_use_pct: 80,
  } });
  assertStringIncludes(
    result,
    "<Section179DeductionAmt>10000</Section179DeductionAmt>",
  );
  assertStringIncludes(result, "<BusinessUsePct>80</BusinessUsePct>");
  assertNotIncludes(result, "<Section179CostAmt>");
  assertNotIncludes(result, "<BonusDepreciationBasisAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  section_179_deduction: 10000,
  section_179_cost: 25000,
  section_179_elected: 20000,
  section_179_carryover: 5000,
  business_income_limit: 80000,
  bonus_depreciation_basis: 50000,
  bonus_depreciation_basis_post_jan19: 30000,
  macrs_gds_basis: 40000,
  macrs_gds_recovery_period: 7,
  macrs_gds_year_of_service: 3,
  macrs_prior_depreciation: 12000,
  business_use_pct: 80,
};

Deno.test("all 12 fields present: output wrapped in IRS4562 tag", () => {
  const result = form4562.build({ form4562: allFields });
  assertStringIncludes(result, "<IRS4562>");
  assertStringIncludes(result, "</IRS4562>");
});

Deno.test("all 12 fields present: all elements emitted", () => {
  const result = form4562.build({ form4562: allFields });
  assertStringIncludes(
    result,
    "<Section179DeductionAmt>10000</Section179DeductionAmt>",
  );
  assertStringIncludes(
    result,
    "<Section179CostAmt>25000</Section179CostAmt>",
  );
  assertStringIncludes(
    result,
    "<Section179ElectedCostAmt>20000</Section179ElectedCostAmt>",
  );
  assertStringIncludes(
    result,
    "<Section179CarryoverAmt>5000</Section179CarryoverAmt>",
  );
  assertStringIncludes(
    result,
    "<BusinessIncomeLimitAmt>80000</BusinessIncomeLimitAmt>",
  );
  assertStringIncludes(
    result,
    "<BonusDepreciationBasisAmt>50000</BonusDepreciationBasisAmt>",
  );
  assertStringIncludes(
    result,
    "<BonusDeprecBasisPostJan19Amt>30000</BonusDeprecBasisPostJan19Amt>",
  );
  assertStringIncludes(
    result,
    "<MACRSGDSBasisAmt>40000</MACRSGDSBasisAmt>",
  );
  assertStringIncludes(
    result,
    "<MACRSGDSRecoveryPeriodAmt>7</MACRSGDSRecoveryPeriodAmt>",
  );
  assertStringIncludes(
    result,
    "<MACRSGDSYearOfServiceAmt>3</MACRSGDSYearOfServiceAmt>",
  );
  assertStringIncludes(
    result,
    "<MACRSPriorDepreciationAmt>12000</MACRSPriorDepreciationAmt>",
  );
  assertStringIncludes(result, "<BusinessUsePct>80</BusinessUsePct>");
});

// ---------------------------------------------------------------------------
// Section 7: Boolean fields silently skipped
// ---------------------------------------------------------------------------

Deno.test("boolean field is silently ignored", () => {
  const result = form4562.build({ form4562: {
    listed_property: true,
    section_179_deduction: 10000,
  } });
  assertStringIncludes(
    result,
    "<Section179DeductionAmt>10000</Section179DeductionAmt>",
  );
  assertNotIncludes(result, "listed_property");
  assertNotIncludes(result, "true");
});
