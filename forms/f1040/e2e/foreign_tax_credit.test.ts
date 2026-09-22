/**
 * E2E — Form 1116 §904 limitation and the general-category wage path.
 *
 * Form 1116 (2025) Part III:
 *   line 19 "Divide line 17 by line 18. If line 17 is more than line 18, enter '1'."
 *   line 20 "Individuals: Enter the total of Form 1040, 1040-SR, or 1040-NR, line 16,
 *            and Schedule 2 (Form 1040), line 1z."
 *   line 21 "Multiply line 20 by line 19 (maximum amount of credit)"
 *   line 24 "Enter the smaller of line 14 or line 23."
 * IRC §904(a).
 *
 * Without the limitation inputs the graph handed Schedule 3 the whole foreign
 * tax, so a $500 box 6 withholding on $1,000 of foreign interest produced a
 * $500 credit instead of the $135.34 the ratio allows.
 */

import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute, type ExecuteResult } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { FilingStatus } from "../nodes/types.ts";

const ctx = { taxYear: 2025, formType: "f1040" };
const plan = buildExecutionPlan(registry);

function runReturn(inputs: Record<string, unknown>): ExecuteResult {
  return execute(plan, registry, inputs, ctx);
}

/** Round to 2 decimal places for floating-point comparison. */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function singleGeneral() {
  return {
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Test",
    taxpayer_last_name: "Taxpayer",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1985-06-15",
  };
}

function w2Item(wages: number, withheld: number) {
  return {
    box1_wages: wages,
    box2_fed_withheld: withheld,
    box3_ss_wages: wages,
    box4_ss_withheld: wages * 0.062,
    box5_medicare_wages: wages,
    box6_medicare_withheld: wages * 0.0145,
    employer_ein: "12-3456789",
    employer_name: "ACME Corp",
    box12_entries: [],
  };
}

// ── Passive category: 1099-INT box 6 above the §904(j) de minimis election ───
//
// Wages $100,000 + foreign interest $1,000 = gross income $101,000
// Std ded $15,750 → taxable $85,250 → line 16 = $13,669.00
// line 19 = 1,000 / 101,000; line 21 = 13,669 × that = $135.34
// line 24 = min($500 paid, $135.34 limit) = $135.34

Deno.test("Form 1116: 1099-INT box 6 credit is capped by the §904 ratio, not taken whole", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(100_000, 12_000)],
    f1099int: [{ payer_name: "FOREIGN BANK", box1: 1_000, box6: 500 }],
  });

  const f1116 = result.pending["form_1116"] ?? {};
  assertEquals(f1116["foreign_tax_paid"], 500, "Part II line 8 — foreign tax paid");
  assertEquals(f1116["foreign_income"], 1_000, "Part I line 1a — gross foreign source income");
  assertEquals(f1116["total_income"], 85_250, "Part III line 18, worldwide taxable income");
  assertEquals(f1116["us_tax_before_credits"], 13_669, "Part III line 20 — Form 1040 line 16");

  const credit = result.pending["schedule3"]?.["line1_foreign_tax_credit"] as number;
  assertEquals(r2(credit), 135.34, "Part III line 24 — credit limited to line 21");

  const f = result.pending["f1040"] ?? {};
  assertEquals(r2(f["line24_total_tax"] as number), 13_533.66, "total tax = 13,669 − 135.34");
});

// ── General category: foreign tax on wages reaches Form 1116 ─────────────────
//
// Compensation for personal services as an employee is general category income
// (Form 1116 Part I box d; line 1b). The §904(j) de minimis election covers only
// passive income reported on a payee statement, so wage tax files Form 1116 at
// any amount.

Deno.test("Form 1116: foreign tax on foreign-employer wages routes as general category", () => {
  const result = runReturn({
    general: singleGeneral(),
    fec: [{
      foreign_employer_name: "Foreign Employer GmbH",
      country_code: "DE",
      compensation_amount: 80_000,
      currency: "EUR",
      compensation_usd: 80_000,
      foreign_service_compensation_usd: 80_000,
      foreign_tax_paid_usd: 9_000,
    }],
  });

  const f1116 = result.pending["form_1116"] ?? {};
  assertEquals(f1116["foreign_tax_paid"], 9_000, "Part II line 8 — foreign tax on wages");
  assertEquals(f1116["foreign_income"], 80_000, "Part I line 1a — the wages themselves");
  const categories = f1116["category_summaries"] as Array<Record<string, unknown>>;
  assertEquals(categories[0].category, "general", "Part I box d, general category");
});

Deno.test("Form 1116: passive and general income remain separate through the full return", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(100_000, 12_000)],
    f1099int: [{ payer_name: "FOREIGN BANK", box1: 1_000, box6: 500 }],
    fec: [{
      foreign_employer_name: "Foreign Employer GmbH",
      country_code: "DE",
      compensation_amount: 10_000,
      compensation_usd: 10_000,
      foreign_service_compensation_usd: 10_000,
      foreign_tax_paid_usd: 900,
    }],
  });

  const categories = result.pending["form_1116"]?.["category_summaries"] as Array<Record<string, unknown>>;
  assertEquals(categories.map((category) => category.category).sort(), ["general", "passive"]);
  assertEquals(categories.map((category) => category.foreignTaxPaid).sort((a, b) => Number(a) - Number(b)), [500, 900]);
});

Deno.test("Form 1116: K-1 foreign tax requires and preserves its income category", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(100_000, 12_000)],
    k1_trust: [{
      estate_trust_name: "Foreign Income Trust",
      box1_interest: 5_000,
      box14_foreign_tax: 800,
      box14_foreign_income: 5_000,
      box14_foreign_income_category: "passive",
    }],
  });

  const categories = result.pending["form_1116"]?.["category_summaries"] as Array<Record<string, unknown>>;
  assertEquals(categories.length, 1);
  assertEquals(categories[0].category, "passive");
  assertEquals(categories[0].foreignTaxPaid, 800);
  assertEquals(categories[0].foreignGrossIncome, 5_000);
});
