import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildIRS1040ScheduleF } from "./schedule_f.ts";

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

Deno.test("schedule_f: empty object returns empty string", () => {
  assertEquals(buildIRS1040ScheduleF({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("schedule_f: all unknown keys returns empty string", () => {
  assertEquals(buildIRS1040ScheduleF({ junk: 999, foo: "bar" }), "");
});

// ---------------------------------------------------------------------------
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("schedule_f: crop_insurance at zero is emitted", () => {
  const result = buildIRS1040ScheduleF({ crop_insurance: 0 });
  assertStringIncludes(
    result,
    "<CropInsuranceProceedsAmt>0</CropInsuranceProceedsAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 2 fields)
// ---------------------------------------------------------------------------

Deno.test("schedule_f: crop_insurance maps to CropInsuranceProceedsAmt", () => {
  const result = buildIRS1040ScheduleF({ crop_insurance: 25000 });
  assertStringIncludes(
    result,
    "<CropInsuranceProceedsAmt>25000</CropInsuranceProceedsAmt>",
  );
});

Deno.test("schedule_f: line8_other_income maps to OtherFarmIncomeAmt", () => {
  const result = buildIRS1040ScheduleF({ line8_other_income: 5000 });
  assertStringIncludes(
    result,
    "<OtherFarmIncomeAmt>5000</OtherFarmIncomeAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("schedule_f: single known field emits only that element, absent fields omitted", () => {
  const result = buildIRS1040ScheduleF({ crop_insurance: 25000 });
  assertStringIncludes(
    result,
    "<CropInsuranceProceedsAmt>25000</CropInsuranceProceedsAmt>",
  );
  assertNotIncludes(result, "<OtherFarmIncomeAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  crop_insurance: 25000,
  line8_other_income: 5000,
};

Deno.test("schedule_f: all 2 fields present: output wrapped in IRS1040ScheduleF tag", () => {
  const result = buildIRS1040ScheduleF(allFields);
  assertStringIncludes(result, "<IRS1040ScheduleF>");
  assertStringIncludes(result, "</IRS1040ScheduleF>");
});

Deno.test("schedule_f: all 2 fields present: all elements emitted", () => {
  const result = buildIRS1040ScheduleF(allFields);
  assertStringIncludes(
    result,
    "<CropInsuranceProceedsAmt>25000</CropInsuranceProceedsAmt>",
  );
  assertStringIncludes(
    result,
    "<OtherFarmIncomeAmt>5000</OtherFarmIncomeAmt>",
  );
});
