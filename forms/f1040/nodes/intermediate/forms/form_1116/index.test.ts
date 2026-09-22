import { assertEquals } from "@std/assert";
import { IncomeCategory, form1116 } from "./index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";

const ctx = { taxYear: 2025, formType: "f1040" };

function credit(input: Parameters<typeof form1116.compute>[1]): number {
  const result = form1116.compute(ctx, input);
  return fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_credit ?? 0;
}

Deno.test("form1116: no foreign tax items produces no output", () => {
  assertEquals(form1116.compute(ctx, { worldwide_taxable_income: 50_000 }).outputs, []);
});

Deno.test("form1116: missing limitation inputs never grants full credit", () => {
  assertEquals(credit({
    foreign_tax_items: [{
      foreign_tax_paid: 500,
      foreign_gross_income: 1_000,
      income_category: IncomeCategory.Passive,
    }],
  }), 0);
});

Deno.test("form1116: applies taxable-income ratio", () => {
  assertEquals(credit({
    foreign_tax_items: [{
      foreign_tax_paid: 500,
      foreign_gross_income: 1_000,
      income_category: IncomeCategory.Passive,
      apportioned_deductions: 155.94,
    }],
    worldwide_taxable_income: 85_250,
    us_tax_before_credits: 13_669,
  }), 135.336728914956);
});

Deno.test("form1116: directly allocable deductions reduce the limit", () => {
  assertEquals(credit({
    foreign_tax_items: [{
      foreign_tax_paid: 500,
      foreign_gross_income: 10_000,
      directly_allocable_deductions: 8_000,
      income_category: IncomeCategory.Passive,
    }],
    worldwide_taxable_income: 100_000,
    us_tax_before_credits: 10_000,
  }), 200);
});

Deno.test("form1116: computes passive and general category limits separately", () => {
  assertEquals(credit({
    foreign_tax_items: [
      {
        foreign_tax_paid: 2_000,
        foreign_gross_income: 10_000,
        income_category: IncomeCategory.Passive,
      },
      {
        foreign_tax_paid: 100,
        foreign_gross_income: 10_000,
        income_category: IncomeCategory.General,
      },
    ],
    worldwide_taxable_income: 100_000,
    us_tax_before_credits: 10_000,
  }), 1_100);
});

Deno.test("form1116: excluded wages reduce eligible income and credit", () => {
  assertEquals(credit({
    foreign_tax_items: [{
      foreign_tax_paid: 1_000,
      foreign_gross_income: 20_000,
      excluded_income: 15_000,
      income_category: IncomeCategory.General,
    }],
    worldwide_taxable_income: 50_000,
    us_tax_before_credits: 5_000,
  }), 500);
});

Deno.test("form1116: same-category items aggregate before applying the limit", () => {
  assertEquals(credit({
    foreign_tax_items: [
      {
        foreign_tax_paid: 300,
        foreign_gross_income: 2_000,
        income_category: IncomeCategory.Passive,
      },
      {
        foreign_tax_paid: 400,
        foreign_gross_income: 3_000,
        income_category: IncomeCategory.Passive,
      },
    ],
    worldwide_taxable_income: 50_000,
    us_tax_before_credits: 5_000,
  }), 500);
});
