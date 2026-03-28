import { assertEquals } from "@std/assert";
import { f2441 } from "./index.ts";

// ---- Unit: taxable employer benefits ----

Deno.test("f2441.compute: employer benefits within exclusion limit produce no taxable income", () => {
  const result = f2441.compute({
    f2441s: [{
      employer_dep_care_benefits: 4000,
      qualifying_expenses_paid: 5000,
      qualifying_person_count: 1,
    }],
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output, undefined);
});

Deno.test("f2441.compute: employer benefits exceeding $5000 route taxable excess to f1040 line1e", () => {
  const result = f2441.compute({
    f2441s: [{
      employer_dep_care_benefits: 6500,
      qualifying_expenses_paid: 3000,
      qualifying_person_count: 1,
    }],
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  // taxable = 6500 - 5000 = 1500
  assertEquals(input.line1e_taxable_dep_care, 1500);
});

Deno.test("f2441.compute: MFS exclusion limit is $2500", () => {
  const result = f2441.compute({
    f2441s: [{
      employer_dep_care_benefits: 3000,
      qualifying_expenses_paid: 5000,
      qualifying_person_count: 1,
      filing_status: "mfs",
    }],
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  // taxable = 3000 - 2500 = 500
  assertEquals(input.line1e_taxable_dep_care, 500);
});

// ---- Unit: credit computation ----

Deno.test("f2441.compute: credit routes to schedule3 line2 for qualifying expenses", () => {
  const result = f2441.compute({
    f2441s: [{
      qualifying_expenses_paid: 3000,
      qualifying_person_count: 1,
      agi: 50000,
    }],
  });

  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output !== undefined, true);
  const input = schedule3Output!.input as Record<string, unknown>;
  // credit = 3000 * 0.20 = 600
  assertEquals(input.line2_childcare_credit, 600);
});

Deno.test("f2441.compute: max qualifying expenses capped at $3000 for 1 person", () => {
  const result = f2441.compute({
    f2441s: [{
      qualifying_expenses_paid: 10000,
      qualifying_person_count: 1,
      agi: 50000,
    }],
  });

  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output !== undefined, true);
  const input = schedule3Output!.input as Record<string, unknown>;
  // capped at 3000, credit = 3000 * 0.20 = 600
  assertEquals(input.line2_childcare_credit, 600);
});

Deno.test("f2441.compute: max qualifying expenses capped at $6000 for 2+ persons", () => {
  const result = f2441.compute({
    f2441s: [{
      qualifying_expenses_paid: 10000,
      qualifying_person_count: 2,
      agi: 50000,
    }],
  });

  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output !== undefined, true);
  const input = schedule3Output!.input as Record<string, unknown>;
  // capped at 6000, credit = 6000 * 0.20 = 1200
  assertEquals(input.line2_childcare_credit, 1200);
});

Deno.test("f2441.compute: credit rate is 35% for AGI <= $15000", () => {
  const result = f2441.compute({
    f2441s: [{
      qualifying_expenses_paid: 2000,
      qualifying_person_count: 1,
      agi: 12000,
    }],
  });

  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output !== undefined, true);
  const input = schedule3Output!.input as Record<string, unknown>;
  // credit = 2000 * 0.35 = 700
  assertEquals(input.line2_childcare_credit, 700);
});

Deno.test("f2441.compute: employer benefits reduce net qualifying expenses", () => {
  const result = f2441.compute({
    f2441s: [{
      qualifying_expenses_paid: 3000,
      employer_dep_care_benefits: 2000,
      qualifying_person_count: 1,
      agi: 50000,
    }],
  });

  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output !== undefined, true);
  const input = schedule3Output!.input as Record<string, unknown>;
  // net qualifying = min(3000, 3000) - min(2000, 5000) = 3000 - 2000 = 1000
  // credit = 1000 * 0.20 = 200
  assertEquals(input.line2_childcare_credit, 200);
});

Deno.test("f2441.compute: zero expenses produce no credit output", () => {
  const result = f2441.compute({
    f2441s: [{
      qualifying_expenses_paid: 0,
      qualifying_person_count: 1,
      agi: 50000,
    }],
  });

  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output, undefined);
});
