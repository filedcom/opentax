import { assertEquals, assertThrows } from "@std/assert";
import { schedule_h } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return schedule_h.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("zero wages → no tax", () => {
  const result = compute({ ss_wages: 0, medicare_wages: 0 });
  assertEquals(result.outputs.length, 0);
});

// ─── Explicit taxable wage lines ────────────────────────────────────────────

Deno.test("total payroll alone cannot determine each employee's FICA wages", () => {
  assertThrows(
    () => compute({ total_cash_wages: 2_000 }),
    Error,
    "Unrecognized key",
  );
});

Deno.test("2,800 of already-taxable wages produces the form-line tax", () => {
  // Employer SS: $2,800 × 6.2% = $173.60
  // Employer Medicare: $2,800 × 1.45% = $40.60
  // Employee SS: $2,800 × 6.2% = $173.60
  // Employee Medicare: $2,800 × 1.45% = $40.60
  // Total FICA: $428.40 → rounded to $428
  const result = compute({ ss_wages: 2_800, medicare_wages: 2_800 });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line9_household_employment, 428);
});

Deno.test("10,000 of already-taxable wages produces the full combined tax", () => {
  // Full FICA: 15.3% × $10,000 = $1,530.
  const result = compute({ ss_wages: 10_000, medicare_wages: 10_000 });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line9_household_employment, 1_530);
});

// ─── FICA Tax Computation ─────────────────────────────────────────────────────

Deno.test("ambiguous aggregate FICA wages require both taxable wage lines", () => {
  assertThrows(
    () => compute({ fica_wages: 10_000 }),
    Error,
    "Unrecognized key",
  );
});

Deno.test("explicit ss_wages and medicare_wages — computed separately", () => {
  // SS wages $10,000, Medicare wages $10,000
  // Same as above: $1,530
  const result = compute({
    ss_wages: 10_000,
    medicare_wages: 10_000,
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line9_household_employment, 1_530);
});

Deno.test("aggregate taxable SS wages from multiple employees are not capped again", () => {
  // Each employee's wage base has already been applied to the line 1 input.
  // Medicare employer+employee: $200,000 × 2.9% = $5,800
  // Total: $24,800 + $5,800 = $30,600.
  const result = compute({
    ss_wages: 200_000,
    medicare_wages: 200_000,
  });
  const s2 = findOutput(result, "schedule2");
  const tax = s2?.fields.line9_household_employment as number;
  assertEquals(tax, 30_600);
});

Deno.test("Additional Medicare Tax applies only to sourced per-employee excess wages", () => {
  const result = compute({
    ss_wages: 176_100,
    medicare_wages: 220_000,
    additional_medicare_wages: 20_000,
  });
  assertEquals(
    findOutput(result, "schedule2")?.fields.line9_household_employment,
    28_396,
  );
  const noExcess = compute({
    ss_wages: 352_200,
    medicare_wages: 400_000,
    additional_medicare_wages: 0,
  });
  assertEquals(
    findOutput(noExcess, "schedule2")?.fields.line9_household_employment,
    55_273,
  );
  assertThrows(
    () =>
      compute({
        ss_wages: 176_100,
        medicare_wages: 220_000,
        additional_medicare_wages: 220_001,
      }),
    Error,
    "sufficient Medicare wage amount",
  );
});

// ─── Federal Income Tax Withheld ─────────────────────────────────────────────

Deno.test("federal income tax withheld adds to total", () => {
  // $10,000 FICA wages → $1,530 FICA + $1,000 federal withheld = $2,530
  const result = compute({
    ss_wages: 10_000,
    medicare_wages: 10_000,
    federal_income_tax_withheld: 1_000,
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line9_household_employment, 2_530);
});

// ─── FUTA ─────────────────────────────────────────────────────────────────────

Deno.test("single-state Section A FUTA is 0.6% of taxable wages", () => {
  // $10,000 FICA wages plus $7,000 taxable FUTA wages.
  const result = compute({
    ss_wages: 10_000,
    medicare_wages: 10_000,
    cash_wages_over_quarter_limit: true,
    federal_unemployment: {
      paid_only_one_state: true,
      all_contributions_paid_on_time: true,
      all_futa_wages_state_taxable: true,
      state: "OH",
      contributions_paid: 100,
      taxable_wages: 7_000,
    },
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line9_household_employment, 1_572);
});

Deno.test("Section B FUTA routes the credit-reduced tax to Schedule 2", () => {
  const result = compute({
    cash_wages_over_quarter_limit: true,
    federal_unemployment: {
      paid_only_one_state: false,
      all_contributions_paid_on_time: true,
      all_futa_wages_state_taxable: true,
      taxable_futa_wages: 7_000,
      state_rows: [{
        state: "CA",
        taxable_state_wages: 7_000,
        experience_rate: 0.05,
        rate_period_from: "2025-01-01",
        rate_period_to: "2025-12-31",
        contributions_paid_by_due_date: 350,
      }],
      credit_reduction_wages: [{ state: "CA", taxable_futa_wages: 7_000 }],
    },
  });
  assertEquals(
    findOutput(result, "schedule2")?.fields.line9_household_employment,
    126,
  );
});

// ─── Explicit Withholding Amounts ────────────────────────────────────────────

Deno.test("employee withholding fields cannot override Schedule H tax", () => {
  assertThrows(
    () =>
      compute({
        ss_wages: 10_000,
        medicare_wages: 10_000,
        employee_ss_withheld: 500,
        employee_medicare_withheld: 100,
      }),
    Error,
    "employee_ss_withheld",
  );
});

// ─── Combined Scenario ────────────────────────────────────────────────────────

Deno.test("combined: FICA + federal withholding + Section A FUTA", () => {
  // FICA wages $20,000:
  // Employer+Employee SS: $20,000 × 12.4% = $2,480
  // Employer+Employee Medicare: $20,000 × 2.9% = $580
  // Federal withheld: $2,000
  // FUTA: $7,000 × 0.6% = $42
  // Total: $2,480 + $580 + $2,000 + $42 = $5,102
  const result = compute({
    ss_wages: 20_000,
    medicare_wages: 20_000,
    federal_income_tax_withheld: 2_000,
    cash_wages_over_quarter_limit: true,
    federal_unemployment: {
      paid_only_one_state: true,
      all_contributions_paid_on_time: true,
      all_futa_wages_state_taxable: true,
      state: "OH",
      contributions_paid: 100,
      taxable_wages: 7_000,
    },
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line9_household_employment, 5_102);
});

// ─── Output Routing ───────────────────────────────────────────────────────────

Deno.test("output routes to schedule2 line9_household_employment", () => {
  // $5,000 FICA wages → 15.3% = $765
  const result = compute({ ss_wages: 5_000, medicare_wages: 5_000 });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line9_household_employment, 765);
});
