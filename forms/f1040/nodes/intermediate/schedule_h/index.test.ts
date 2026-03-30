import { assertEquals } from "@std/assert";
import { schedule_h } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return schedule_h.compute({ taxYear: 2025 }, input);
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
  const result = compute({ total_cash_wages: 0 });
  assertEquals(result.outputs.length, 0);
});

// ─── FICA Threshold ───────────────────────────────────────────────────────────

Deno.test("wages below $2,800 threshold → no FICA (no explicit fica_wages)", () => {
  // $2,000 total wages — below $2,800 threshold
  const result = compute({ total_cash_wages: 2_000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("wages at $2,800 threshold → FICA applies", () => {
  // $2,800 exactly — triggers FICA
  // FICA on $2,800: SS (12.4%) + Medicare (2.9%) = 15.3% × $2,800 = $428.40 → $428
  const result = compute({ total_cash_wages: 2_800 });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2 !== undefined, true);
  const tax = s2?.fields.line7a_household_employment as number;
  assertEquals(tax > 0, true);
});

Deno.test("wages above $2,800 → FICA applies on all wages", () => {
  const result = compute({ total_cash_wages: 10_000 });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2 !== undefined, true);
});

// ─── FICA Tax Computation ─────────────────────────────────────────────────────

Deno.test("explicit fica_wages — full FICA: employer + employee share", () => {
  // $10,000 FICA wages
  // Employer SS: $10,000 × 6.2% = $620
  // Employer Medicare: $10,000 × 1.45% = $145
  // Employee SS: $10,000 × 6.2% = $620
  // Employee Medicare: $10,000 × 1.45% = $145
  // Total FICA: $620 + $145 + $620 + $145 = $1,530
  const result = compute({ fica_wages: 10_000 });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line7a_household_employment, 1_530);
});

Deno.test("explicit ss_wages and medicare_wages — computed separately", () => {
  // SS wages $10,000, Medicare wages $10,000
  // Same as above: $1,530
  const result = compute({
    ss_wages: 10_000,
    medicare_wages: 10_000,
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line7a_household_employment, 1_530);
});

Deno.test("SS wages above wage base — capped at $176,100", () => {
  // SS wages $200,000 — capped at $176,100 for SS tax
  // SS employer+employee: $176,100 × 12.4% = $21,836.40 → rounded
  // Medicare employer+employee: $200,000 × 2.9% = $5,800
  // Total: $21,836 + $5,800 = $27,636 (approx, depends on rounding)
  const result = compute({
    ss_wages: 200_000,
    medicare_wages: 200_000,
  });
  const s2 = findOutput(result, "schedule2");
  const tax = s2?.fields.line7a_household_employment as number;
  // SS portion capped: 176100 × 12.4% = $21,836.40 rounded to $21,836
  // Medicare: 200000 × 2.9% = $5,800
  // Total ≈ $27,636
  assertEquals(tax, 27_636);
});

// ─── Federal Income Tax Withheld ─────────────────────────────────────────────

Deno.test("federal income tax withheld adds to total", () => {
  // $10,000 FICA wages → $1,530 FICA + $1,000 federal withheld = $2,530
  const result = compute({
    fica_wages: 10_000,
    federal_income_tax_withheld: 1_000,
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line7a_household_employment, 2_530);
});

// ─── FUTA ─────────────────────────────────────────────────────────────────────

Deno.test("FUTA tax adds to total", () => {
  // $10,000 FICA wages → $1,530 FICA + $100 FUTA = $1,630
  const result = compute({
    fica_wages: 10_000,
    futa_tax: 100,
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line7a_household_employment, 1_630);
});

// ─── Explicit Withholding Amounts ────────────────────────────────────────────

Deno.test("explicit employee withholding overrides computed amounts", () => {
  // Use explicit withholding instead of computed
  // SS wages $10,000, Medicare wages $10,000
  // Employee SS withheld: $500 (instead of computed $620)
  // Employee Medicare withheld: $100 (instead of computed $145)
  // Employer SS: $620, Employer Medicare: $145
  // Total: $620 + $145 + $500 + $100 = $1,365
  const result = compute({
    ss_wages: 10_000,
    medicare_wages: 10_000,
    employee_ss_withheld: 500,
    employee_medicare_withheld: 100,
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line7a_household_employment, 1_365);
});

// ─── Combined Scenario ────────────────────────────────────────────────────────

Deno.test("combined: FICA + federal withholding + FUTA", () => {
  // FICA wages $20,000:
  // Employer+Employee SS: $20,000 × 12.4% = $2,480
  // Employer+Employee Medicare: $20,000 × 2.9% = $580
  // Federal withheld: $2,000
  // FUTA: $420
  // Total: $2,480 + $580 + $2,000 + $420 = $5,480
  const result = compute({
    fica_wages: 20_000,
    federal_income_tax_withheld: 2_000,
    futa_tax: 420,
  });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2?.fields.line7a_household_employment, 5_480);
});

// ─── Output Routing ───────────────────────────────────────────────────────────

Deno.test("output routes to schedule2 line7a_household_employment", () => {
  const result = compute({ fica_wages: 5_000 });
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2 !== undefined, true);
  assertEquals("line7a_household_employment" in (s2?.fields ?? {}), true);
});
