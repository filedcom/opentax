import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  form1116 as form1116Node,
  IncomeCategory,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";
import { form1116 } from "./f1116.ts";
import { form1116ScheduleB } from "./f1116_schedule_b.ts";

const priorYearReview = {
  income_category: IncomeCategory.Passive,
  prior_year_form1116_line23_limit: 500,
  prior_year_form1116_line24_allowed_credit: 500,
  prior_year_schedule_b_line8_balance: 0 as const,
  source_document_references: [
    "Filed 2024 Form 1116 passive basket, lines 23 and 24; filed 2024 Schedule B line 8",
  ],
  no_foreign_tax_redetermination_or_special_adjustment: true as const,
};

function calculated() {
  return form1116Node.compute({ taxYear: 2025, formType: "f1040" }, {
    foreign_tax_items: [{
      foreign_tax_paid: 500,
      foreign_gross_income: 5_000,
      income_category: IncomeCategory.Passive,
      irs_country_code: "CA",
      tax_paid_or_accrued_date: "2025-11-01",
      tax_kind: ForeignTaxKind.Interest,
      tax_credit_method: ForeignTaxCreditMethod.Paid,
    }],
    worldwide_taxable_income: 80_000,
    us_tax_before_credits: 7_200,
    carryover_reviews: [priorYearReview],
  });
}

Deno.test("Form 1116 Schedule B carries current excess after a sourced zero carryback", () => {
  const outputs = calculated().outputs;
  const scheduleB = outputs.find((item) =>
    item.nodeType === "form1116_schedule_b"
  )?.fields;
  const form = outputs.find((item) => item.nodeType === "form_1116")?.fields;
  assertEquals(scheduleB?.current_year_excess_tax, 50);
  assertEquals(form !== undefined, true);
});

Deno.test("Form 1116 Schedule B serializer uses native TY2025 line 6 and 8 groups", () => {
  const fields = {
    category: IncomeCategory.Passive,
    current_year_excess_tax: 50,
    prior_year_review: priorYearReview,
  };
  const xml = form1116ScheduleB.build(fields);
  assertStringIncludes(
    xml,
    "<ForeignIncPassiveCategoryInd>X</ForeignIncPassiveCategoryInd>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTxCyovGenCurrTYGrp><CurrentTaxYearAmt>50</CurrentTaxYearAmt><TotalAmt>50</TotalAmt></ForeignTxCyovGenCurrTYGrp>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTxCyovFollowingTYGrp><CurrentTaxYearAmt>50</CurrentTaxYearAmt><TotalAmt>50</TotalAmt></ForeignTxCyovFollowingTYGrp>",
  );
  assertEquals(xml.includes("ActlTentAmtCarriedBackPrTYGrp"), false);
});

Deno.test("Form 1116 refuses an excess-tax XML document without matching Schedule B", () => {
  const summary = {
    category: IncomeCategory.Passive,
    items: [{
      foreign_tax_paid: 500,
      foreign_gross_income: 5_000,
      income_category: IncomeCategory.Passive,
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
    automaticallyApportionedDeductions: 0,
    foreignTaxableIncome: 5_000,
    allowedCredit: 450,
    currentYearExcessTax: 50,
  };
  assertThrows(
    () =>
      form1116.build({
        category_summaries: [summary],
        total_income: 80_000,
        us_tax_before_credits: 7_200,
      }),
    Error,
    "matching sourced Schedule B",
  );
  const [xml] = form1116.build({
    category_summaries: [summary],
    total_income: 80_000,
    us_tax_before_credits: 7_200,
  }, {
    pending: {
      form1116_schedule_b: {
        category: IncomeCategory.Passive,
        current_year_excess_tax: 50,
        prior_year_review: priorYearReview,
      },
    },
  });
  assertStringIncludes(xml, "<ForeignTaxCreditAmt>450</ForeignTaxCreditAmt>");
});
