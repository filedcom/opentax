import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../../2025/registry.ts";
import { FilingStatus } from "../../../nodes/types.ts";

const ctx = { taxYear: 2025, formType: "f1040" };
const plan = buildExecutionPlan(registry);

// Synthetic single return worked by hand:
// - Taxable income 250,000 - 15,750 standard deduction = 234,250; the 2025
//   Tax Computation Worksheet gives 40,199 + 32% x 36,950 = 52,023.
// - 2025 Form 6251: AMTI 250,000 (line 2a adds back the standard deduction),
//   less the 88,100 single exemption = 161,900 x 26% = 42,094 (line 9).
// - 2025 Form 8801: line 19 = 2024 line 26 carryforward 86,216 = line 21;
//   line 22 = 52,023; line 23 = 42,094; line 24 = 9,929; line 25 = 9,929
//   to Schedule 3 line 6b; line 26 = 76,287 carried to 2026.
// https://www.irs.gov/pub/irs-pdf/f8801.pdf (2025 Form 8801, Part II)
test("Form 8801: a 2024 line 26 carryforward alone allows the 2025 credit", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Payer",
    },
    w2: [{
      box1_wages: 250_000,
      box2_fed_withheld: 50_000,
      box3_ss_wages: 176_100,
      box4_ss_withheld: 10_918.2,
      box5_medicare_wages: 250_000,
      box6_medicare_withheld: 3_625,
      box12_entries: [],
    }],
    f8801: { prior_year_carryforward: 86_216 },
  }, ctx);

  assertEquals(result.diagnostics, []);
  const form1040 = result.pending.f1040 ?? {};
  assertEquals(form1040.line16_income_tax, 52_023);
  assertEquals(form1040.form8801_line22_regular_tax, 52_023);
  assertEquals(form1040.form8801_line23_tentative_minimum_tax, 42_094);
  assertEquals(form1040.form8801_line25_credit_allowed, 9_929);
  assertEquals(form1040.form8801_line26_carryforward, 76_287);
  assertEquals(form1040.line20_nonrefundable_credits, 9_929);
  assertEquals(form1040.line22_tax_after_credits, 42_094);
  assertEquals(
    result.pending.schedule3?.line6b_prior_year_min_tax_credit,
    9_929,
  );
});
