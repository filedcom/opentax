import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  IncomeCategory,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";
import { form1116 } from "./f1116.ts";

const passive = {
  category: IncomeCategory.Passive,
  items: [{
    foreign_tax_paid: 500,
    income_category: IncomeCategory.Passive,
    foreign_gross_income: 5_000,
    irs_country_code: "CA",
    tax_paid_or_accrued_date: "2025-11-01",
    tax_kind: ForeignTaxKind.Interest,
    tax_credit_method: ForeignTaxCreditMethod.Paid,
  }],
  foreignTaxPaid: 500,
  foreignGrossIncome: 5_000,
  includedForeignIncome: 5_000,
  directlyAllocableDeductions: 0,
  explicitlyApportionedDeductions: 0,
  automaticallyApportionedDeductions: 500,
  foreignTaxableIncome: 4_500,
  allowedCredit: 450,
};

const fields = {
  category_summaries: [passive],
  total_income: 80_000,
  worldwide_gross_income: 100_000,
  general_deductions: 10_000,
  standard_or_itemized_deduction: 10_000,
  other_deductions: 0,
  us_tax_before_credits: 8_000,
};

Deno.test("Form 1116 limitation inputs alone do not create a form", () => {
  assertEquals(
    form1116.build({ total_income: 80_000, us_tax_before_credits: 8_000 }),
    [],
  );
});

Deno.test("Form 1116 refuses an aggregate foreign tax without source details", () => {
  assertThrows(
    () => form1116.build({ foreign_tax_paid: 500 }),
    Error,
    "category calculation details",
  );
});

Deno.test("Form 1116 uses the IRS passive category and actual limitation tags", () => {
  const [xml] = form1116.build(fields);
  assertStringIncludes(
    xml,
    "<ForeignIncPassiveCategoryInd>X</ForeignIncPassiveCategoryInd>",
  );
  assertStringIncludes(xml, "<ForeignCountryCd>CA</ForeignCountryCd>");
  assertStringIncludes(
    xml,
    "<ForeignGrossIncomeAmt>5000</ForeignGrossIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<ItemizedOrStandardDeductionAmt>10000</ItemizedOrStandardDeductionAmt>",
  );
  assertStringIncludes(
    xml,
    "<ProRataDeductionsNotRelatedAmt>500</ProRataDeductionsNotRelatedAmt>",
  );
  assertStringIncludes(
    xml,
    "<MaxAllowedForeignTaxCreditAmt>450</MaxAllowedForeignTaxCreditAmt>",
  );
  assertStringIncludes(xml, "<ForeignTaxCreditAmt>450</ForeignTaxCreditAmt>");
});

Deno.test("Form 1116 source details must reconcile with category totals", () => {
  assertThrows(
    () =>
      form1116.build({
        ...fields,
        category_summaries: [{ ...passive, foreignTaxPaid: 400 }],
      }),
    Error,
    "totals differ",
  );
});

Deno.test("Form 1116 never emits unsupported direct expenses without their statement", () => {
  assertThrows(
    () =>
      form1116.build({
        ...fields,
        category_summaries: [{
          ...passive,
          items: [{ ...passive.items[0], directly_allocable_deductions: 100 }],
          directlyAllocableDeductions: 100,
          foreignTaxableIncome: 4_400,
          allowedCredit: 440,
        }],
      }),
    Error,
    "supporting statement",
  );
});
