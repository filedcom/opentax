import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildIRS8853 } from "./f8853.ts";

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
  assertEquals(buildIRS8853({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("all unknown keys returns empty string", () => {
  assertEquals(buildIRS8853({ junk: 999, foo: "bar", baz: 0 }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("employer_archer_msa at zero is emitted", () => {
  const result = buildIRS8853({ employer_archer_msa: 0 });
  assertStringIncludes(
    result,
    "<EmployerArcherMSAContriAmt>0</EmployerArcherMSAContriAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 15 fields)
// ---------------------------------------------------------------------------

Deno.test("employer_archer_msa maps to EmployerArcherMSAContriAmt", () => {
  const result = buildIRS8853({ employer_archer_msa: 1000 });
  assertStringIncludes(
    result,
    "<EmployerArcherMSAContriAmt>1000</EmployerArcherMSAContriAmt>",
  );
});

Deno.test("taxpayer_archer_msa_contributions maps to TxpyrArcherMSAContriAmt", () => {
  const result = buildIRS8853({ taxpayer_archer_msa_contributions: 2000 });
  assertStringIncludes(
    result,
    "<TxpyrArcherMSAContriAmt>2000</TxpyrArcherMSAContriAmt>",
  );
});

Deno.test("line3_limitation_amount maps to ArcherMSALimitationAmt", () => {
  const result = buildIRS8853({ line3_limitation_amount: 3000 });
  assertStringIncludes(
    result,
    "<ArcherMSALimitationAmt>3000</ArcherMSALimitationAmt>",
  );
});

Deno.test("compensation maps to CompensationAmt", () => {
  const result = buildIRS8853({ compensation: 50000 });
  assertStringIncludes(result, "<CompensationAmt>50000</CompensationAmt>");
});

Deno.test("archer_msa_distributions maps to ArcherMSADistributionAmt", () => {
  const result = buildIRS8853({ archer_msa_distributions: 1500 });
  assertStringIncludes(
    result,
    "<ArcherMSADistributionAmt>1500</ArcherMSADistributionAmt>",
  );
});

Deno.test("archer_msa_rollover maps to ArcherMSARolloverAmt", () => {
  const result = buildIRS8853({ archer_msa_rollover: 500 });
  assertStringIncludes(result, "<ArcherMSARolloverAmt>500</ArcherMSARolloverAmt>");
});

Deno.test("archer_msa_qualified_expenses maps to ArcherMSAQualifiedExpnsAmt", () => {
  const result = buildIRS8853({ archer_msa_qualified_expenses: 800 });
  assertStringIncludes(
    result,
    "<ArcherMSAQualifiedExpnsAmt>800</ArcherMSAQualifiedExpnsAmt>",
  );
});

Deno.test("medicare_advantage_distributions maps to MedcrAdvntageMSADistriAmt", () => {
  const result = buildIRS8853({ medicare_advantage_distributions: 1200 });
  assertStringIncludes(
    result,
    "<MedcrAdvntageMSADistriAmt>1200</MedcrAdvntageMSADistriAmt>",
  );
});

Deno.test("medicare_advantage_qualified_expenses maps to MedcrAdvntageMSAQlfyExpnsAmt", () => {
  const result = buildIRS8853({ medicare_advantage_qualified_expenses: 900 });
  assertStringIncludes(
    result,
    "<MedcrAdvntageMSAQlfyExpnsAmt>900</MedcrAdvntageMSAQlfyExpnsAmt>",
  );
});

Deno.test("ltc_gross_payments maps to LTCGrossPaymentsAmt", () => {
  const result = buildIRS8853({ ltc_gross_payments: 4000 });
  assertStringIncludes(result, "<LTCGrossPaymentsAmt>4000</LTCGrossPaymentsAmt>");
});

Deno.test("ltc_qualified_contract_amount maps to LTCQualifiedContractAmt", () => {
  const result = buildIRS8853({ ltc_qualified_contract_amount: 5000 });
  assertStringIncludes(
    result,
    "<LTCQualifiedContractAmt>5000</LTCQualifiedContractAmt>",
  );
});

Deno.test("ltc_accelerated_death_benefits maps to LTCAcceleratedDeathBnftAmt", () => {
  const result = buildIRS8853({ ltc_accelerated_death_benefits: 6000 });
  assertStringIncludes(
    result,
    "<LTCAcceleratedDeathBnftAmt>6000</LTCAcceleratedDeathBnftAmt>",
  );
});

Deno.test("ltc_period_days maps to LTCPeriodDaysCnt", () => {
  const result = buildIRS8853({ ltc_period_days: 30 });
  assertStringIncludes(result, "<LTCPeriodDaysCnt>30</LTCPeriodDaysCnt>");
});

Deno.test("ltc_actual_costs maps to LTCActualCostsAmt", () => {
  const result = buildIRS8853({ ltc_actual_costs: 2500 });
  assertStringIncludes(result, "<LTCActualCostsAmt>2500</LTCActualCostsAmt>");
});

Deno.test("ltc_reimbursements maps to LTCReimbursementsAmt", () => {
  const result = buildIRS8853({ ltc_reimbursements: 1800 });
  assertStringIncludes(result, "<LTCReimbursementsAmt>1800</LTCReimbursementsAmt>");
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("single known field emits only that element, absent fields omitted", () => {
  const result = buildIRS8853({ employer_archer_msa: 1000 });
  assertStringIncludes(
    result,
    "<EmployerArcherMSAContriAmt>1000</EmployerArcherMSAContriAmt>",
  );
  assertNotIncludes(result, "<TxpyrArcherMSAContriAmt>");
  assertNotIncludes(result, "<CompensationAmt>");
  assertNotIncludes(result, "<LTCGrossPaymentsAmt>");
});

Deno.test("two fields present: only those two elements emitted", () => {
  const result = buildIRS8853({
    employer_archer_msa: 1000,
    ltc_reimbursements: 1800,
  });
  assertStringIncludes(
    result,
    "<EmployerArcherMSAContriAmt>1000</EmployerArcherMSAContriAmt>",
  );
  assertStringIncludes(
    result,
    "<LTCReimbursementsAmt>1800</LTCReimbursementsAmt>",
  );
  assertNotIncludes(result, "<CompensationAmt>");
  assertNotIncludes(result, "<ArcherMSADistributionAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  employer_archer_msa: 1000,
  taxpayer_archer_msa_contributions: 2000,
  line3_limitation_amount: 3000,
  compensation: 50000,
  archer_msa_distributions: 1500,
  archer_msa_rollover: 500,
  archer_msa_qualified_expenses: 800,
  medicare_advantage_distributions: 1200,
  medicare_advantage_qualified_expenses: 900,
  ltc_gross_payments: 4000,
  ltc_qualified_contract_amount: 5000,
  ltc_accelerated_death_benefits: 6000,
  ltc_period_days: 30,
  ltc_actual_costs: 2500,
  ltc_reimbursements: 1800,
};

Deno.test("all 15 fields present: output wrapped in IRS8853 tag", () => {
  const result = buildIRS8853(allFields);
  assertStringIncludes(result, "<IRS8853>");
  assertStringIncludes(result, "</IRS8853>");
});

Deno.test("all 15 fields present: all elements emitted", () => {
  const result = buildIRS8853(allFields);
  assertStringIncludes(
    result,
    "<EmployerArcherMSAContriAmt>1000</EmployerArcherMSAContriAmt>",
  );
  assertStringIncludes(
    result,
    "<TxpyrArcherMSAContriAmt>2000</TxpyrArcherMSAContriAmt>",
  );
  assertStringIncludes(
    result,
    "<ArcherMSALimitationAmt>3000</ArcherMSALimitationAmt>",
  );
  assertStringIncludes(result, "<CompensationAmt>50000</CompensationAmt>");
  assertStringIncludes(
    result,
    "<ArcherMSADistributionAmt>1500</ArcherMSADistributionAmt>",
  );
  assertStringIncludes(result, "<ArcherMSARolloverAmt>500</ArcherMSARolloverAmt>");
  assertStringIncludes(
    result,
    "<ArcherMSAQualifiedExpnsAmt>800</ArcherMSAQualifiedExpnsAmt>",
  );
  assertStringIncludes(
    result,
    "<MedcrAdvntageMSADistriAmt>1200</MedcrAdvntageMSADistriAmt>",
  );
  assertStringIncludes(
    result,
    "<MedcrAdvntageMSAQlfyExpnsAmt>900</MedcrAdvntageMSAQlfyExpnsAmt>",
  );
  assertStringIncludes(result, "<LTCGrossPaymentsAmt>4000</LTCGrossPaymentsAmt>");
  assertStringIncludes(
    result,
    "<LTCQualifiedContractAmt>5000</LTCQualifiedContractAmt>",
  );
  assertStringIncludes(
    result,
    "<LTCAcceleratedDeathBnftAmt>6000</LTCAcceleratedDeathBnftAmt>",
  );
  assertStringIncludes(result, "<LTCPeriodDaysCnt>30</LTCPeriodDaysCnt>");
  assertStringIncludes(result, "<LTCActualCostsAmt>2500</LTCActualCostsAmt>");
  assertStringIncludes(result, "<LTCReimbursementsAmt>1800</LTCReimbursementsAmt>");
});

// ---------------------------------------------------------------------------
// Section 7: Non-numeric fields (booleans) are silently ignored
// ---------------------------------------------------------------------------

Deno.test("archer_msa_exception boolean field is silently ignored", () => {
  const result = buildIRS8853({
    archer_msa_exception: true,
    employer_archer_msa: 1000,
  });
  assertStringIncludes(
    result,
    "<EmployerArcherMSAContriAmt>1000</EmployerArcherMSAContriAmt>",
  );
  assertNotIncludes(result, "archer_msa_exception");
  assertNotIncludes(result, "true");
});

Deno.test("medicare_advantage_exception boolean field is silently ignored", () => {
  const result = buildIRS8853({
    medicare_advantage_exception: false,
    ltc_gross_payments: 4000,
  });
  assertStringIncludes(result, "<LTCGrossPaymentsAmt>4000</LTCGrossPaymentsAmt>");
  assertNotIncludes(result, "medicare_advantage_exception");
});
