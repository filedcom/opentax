import { assertEquals, assertStringIncludes } from "@std/assert";
import { form8582 } from "./f8582.ts";

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

Deno.test("f8582: empty object returns empty string", () => {
  assertEquals(form8582.build({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("f8582: all unknown keys returns empty string", () => {
  assertEquals(form8582.build({ junk: 999, foo: "bar", active: true }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("f8582: passive_schedule_c at zero is emitted", () => {
  const result = form8582.build({ passive_schedule_c: 0 });
  assertStringIncludes(
    result,
    "<PassiveScheduleCIncomeAmt>0</PassiveScheduleCIncomeAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 7 fields)
// ---------------------------------------------------------------------------

Deno.test("f8582: passive_schedule_c maps to PassiveScheduleCIncomeAmt", () => {
  const result = form8582.build({ passive_schedule_c: 5000 });
  assertStringIncludes(
    result,
    "<PassiveScheduleCIncomeAmt>5000</PassiveScheduleCIncomeAmt>",
  );
});

Deno.test("f8582: passive_schedule_f maps to PassiveScheduleFIncomeAmt", () => {
  const result = form8582.build({ passive_schedule_f: 3000 });
  assertStringIncludes(
    result,
    "<PassiveScheduleFIncomeAmt>3000</PassiveScheduleFIncomeAmt>",
  );
});

Deno.test("f8582: current_income maps to CurrentYearIncomeAmt", () => {
  const result = form8582.build({ current_income: 12000 });
  assertStringIncludes(
    result,
    "<CurrentYearIncomeAmt>12000</CurrentYearIncomeAmt>",
  );
});

Deno.test("f8582: current_loss maps to CurrentYearLossAmt", () => {
  const result = form8582.build({ current_loss: 8000 });
  assertStringIncludes(
    result,
    "<CurrentYearLossAmt>8000</CurrentYearLossAmt>",
  );
});

Deno.test("f8582: prior_unallowed maps to PriorYearUnallowedLossAmt", () => {
  const result = form8582.build({ prior_unallowed: 2000 });
  assertStringIncludes(
    result,
    "<PriorYearUnallowedLossAmt>2000</PriorYearUnallowedLossAmt>",
  );
});

Deno.test("f8582: modified_agi maps to ModifiedAGIAmt", () => {
  const result = form8582.build({ modified_agi: 95000 });
  assertStringIncludes(
    result,
    "<ModifiedAGIAmt>95000</ModifiedAGIAmt>",
  );
});

Deno.test("f8582: active_participation maps to ActiveParticipationAmt", () => {
  const result = form8582.build({ active_participation: 15000 });
  assertStringIncludes(
    result,
    "<ActiveParticipationAmt>15000</ActiveParticipationAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("f8582: single known field emits only that element, absent fields omitted", () => {
  const result = form8582.build({ passive_schedule_c: 5000 });
  assertStringIncludes(
    result,
    "<PassiveScheduleCIncomeAmt>5000</PassiveScheduleCIncomeAmt>",
  );
  assertNotIncludes(result, "<PassiveScheduleFIncomeAmt>");
  assertNotIncludes(result, "<CurrentYearIncomeAmt>");
  assertNotIncludes(result, "<ModifiedAGIAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  passive_schedule_c: 5000,
  passive_schedule_f: 3000,
  current_income: 12000,
  current_loss: 8000,
  prior_unallowed: 2000,
  modified_agi: 95000,
  active_participation: 15000,
};

Deno.test("f8582: all 7 fields present: output wrapped in IRS8582 tag", () => {
  const result = form8582.build(allFields);
  assertStringIncludes(result, "<IRS8582>");
  assertStringIncludes(result, "</IRS8582>");
});

Deno.test("f8582: all 7 fields present: all elements emitted", () => {
  const result = form8582.build(allFields);
  assertStringIncludes(
    result,
    "<PassiveScheduleCIncomeAmt>5000</PassiveScheduleCIncomeAmt>",
  );
  assertStringIncludes(
    result,
    "<PassiveScheduleFIncomeAmt>3000</PassiveScheduleFIncomeAmt>",
  );
  assertStringIncludes(
    result,
    "<CurrentYearIncomeAmt>12000</CurrentYearIncomeAmt>",
  );
  assertStringIncludes(result, "<CurrentYearLossAmt>8000</CurrentYearLossAmt>");
  assertStringIncludes(
    result,
    "<PriorYearUnallowedLossAmt>2000</PriorYearUnallowedLossAmt>",
  );
  assertStringIncludes(result, "<ModifiedAGIAmt>95000</ModifiedAGIAmt>");
  assertStringIncludes(
    result,
    "<ActiveParticipationAmt>15000</ActiveParticipationAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: Boolean/enum fields are silently ignored
// ---------------------------------------------------------------------------

Deno.test("f8582: boolean active field is silently ignored", () => {
  const result = form8582.build({ active: true, passive_schedule_c: 5000 });
  assertStringIncludes(
    result,
    "<PassiveScheduleCIncomeAmt>5000</PassiveScheduleCIncomeAmt>",
  );
  assertNotIncludes(result, "active");
  assertNotIncludes(result, "true");
});
