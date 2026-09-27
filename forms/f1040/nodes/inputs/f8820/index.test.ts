import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm8820, f8820, inputSchema } from "./index.ts";
import { f3800 } from "../f3800/index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";

const drug = {
  generic_name: "Test Orphan Drug",
  designation_application_number: "FDA-123",
  designation_date: "2024-03-15",
  qualified_clinical_testing_expenses: 100_000,
  qualifying_testing_confirmed: true,
  expenses_exclude_third_party_funding: true,
  expenses_not_used_for_research_credit: true,
};

function source(overrides: Record<string, unknown> = {}) {
  return inputSchema.parse({
    f8820s: [drug],
    reduced_section280c_credit_election: true,
    form8932_overlapping_wage_credit: 0,
    subject_to_passive_activity_limit: false,
    ...overrides,
  });
}

Deno.test("Form 8820 reduced section 280C election uses 19.75%", () => {
  const lines = calculateForm8820(source());
  assertEquals(lines, {
    line1: 100_000,
    line2a: 19_750,
    line2b: 0,
    line2c: 19_750,
    line4: 19_750,
  });
});

Deno.test("Form 8820 full credit uses 25% and needs the deduction statement", () => {
  assertThrows(() =>
    calculateForm8820(source({
      reduced_section280c_credit_election: false,
    }))
  );
  const lines = calculateForm8820(source({
    reduced_section280c_credit_election: false,
    expense_reduction_statement_file_name: "orphan-drug-deduction.pdf",
  }));
  assertEquals(lines.line2a, 25_000);
  assertEquals(lines.line4, 25_000);
});

Deno.test("Form 8820 subtracts overlapping Form 8932 wage credit", () => {
  const lines = calculateForm8820(source({
    form8932_overlapping_wage_credit: 1_250,
  }));
  assertEquals(lines.line2b, 1_250);
  assertEquals(lines.line2c, 18_500);
  assertThrows(() =>
    calculateForm8820(source({
      form8932_overlapping_wage_credit: 20_000,
    }))
  );
});

Deno.test("Form 8820 requires identified, qualified drugs", () => {
  assertEquals(
    inputSchema.safeParse({
      ...source(),
      f8820s: [{ ...drug, qualifying_testing_confirmed: false }],
    }).success,
    false,
  );
  assertThrows(() =>
    calculateForm8820(source({
      f8820s: [{ ...drug, designation_date: "2025-02-30" }],
    }))
  );
  assertThrows(() =>
    calculateForm8820(source({
      f8820s: [drug, { ...drug, generic_name: "Other Drug" }],
    }))
  );
});

Deno.test("Form 8820 sends the classified source credit to Form 3800", () => {
  const result = f8820.compute(
    { taxYear: 2025, formType: "f1040" },
    source(),
  );
  assertEquals(result.outputs.length, 1);
  assertEquals(fieldsOf(result.outputs, f3800)?.f8820_credit, {
    credit_amount: 19_750,
    subject_to_passive_activity_limit: false,
  });
  assertEquals(
    result.outputs.some((output) => output.nodeType === "schedule3"),
    false,
  );
});

Deno.test("Form 8820 zero expenses produce no credit", () => {
  const result = f8820.compute(
    { taxYear: 2025, formType: "f1040" },
    source({
      f8820s: [{ ...drug, qualified_clinical_testing_expenses: 0 }],
    }),
  );
  assertEquals(result.outputs, []);
});
