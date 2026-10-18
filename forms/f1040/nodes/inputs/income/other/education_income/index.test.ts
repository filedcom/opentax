import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { education_income } from "./index.ts";

const payment = (taxYear: number) => ({
  kind: "w2_education_payment" as const,
  student_ssn: "111-22-3333",
  source_document_reference: `${taxYear} employer tuition payment`,
  tax_year: taxYear,
  taxable_amount: 1_000,
  employer_ein: "12-3456789",
  w2_box1_wages: 75_000,
  payroll_allocation_record_id: `${taxYear} payroll allocation`,
});

// Pub. 970, chapter 1: taxable scholarship and education payments are income
// for the year received, so each source names the return's tax year.
test("education income sources must be for the return year", () => {
  const compute = (taxYear: number, sourceYear: number) =>
    education_income.compute({ taxYear, formType: "f1040" }, {
      education_incomes: [payment(sourceYear)],
    });
  assertEquals(compute(2026, 2026).outputs, []);
  assertThrows(() => compute(2026, 2025), Error, "must be for 2026");
  assertThrows(() => compute(2025, 2026), Error, "must be for 2025");
});
