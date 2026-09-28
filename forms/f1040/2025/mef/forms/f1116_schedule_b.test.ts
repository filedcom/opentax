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
    case: "current_year_excess" as const,
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
        case: "current_year_excess",
        category: IncomeCategory.Passive,
        current_year_excess_tax: 50,
        prior_year_review: priorYearReview,
      },
    },
  });
  assertStringIncludes(xml, "<ForeignTaxCreditAmt>450</ForeignTaxCreditAmt>");
});

Deno.test("Form 1116 Schedule B reconciles a single 2024 vintage through lines 1, 3, 4, and 8", () => {
  const source = {
    income_category: IncomeCategory.Passive,
    prior_year_schedule_b_line8_current_year_amount: 600,
    prior_year_schedule_b_line8_other_vintages_total: 0 as const,
    no_intervening_adjustments: true as const,
    source_document_references: [
      "Filed 2024 Schedule B (Form 1116), passive line 8 columns xiii and xiv",
    ],
  };
  const fields = {
    case: "prior_year_use" as const,
    category: IncomeCategory.Passive,
    prior_year_carryover: 600,
    used_prior_year_carryover: 300,
    remaining_prior_year_carryover: 300,
    prior_year_carryover_source: source,
  };
  const xml = form1116ScheduleB.build(fields);
  assertStringIncludes(
    xml,
    "<ForeignTxCyovPrTYGrp><FirstPrecedingTYAmt>600</FirstPrecedingTYAmt><TotalAmt>600</TotalAmt></ForeignTxCyovPrTYGrp>",
  );
  assertStringIncludes(
    xml,
    "<AdjForeignTxCyovPrTYGrp><FirstPrecedingTYAmt>600</FirstPrecedingTYAmt><TotalAmt>600</TotalAmt></AdjForeignTxCyovPrTYGrp>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTxCyovUsedCurrTYGrp><FirstPrecedingTYAmt>-300</FirstPrecedingTYAmt><TotalAmt>-300</TotalAmt></ForeignTxCyovUsedCurrTYGrp>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTxCyovFollowingTYGrp><FirstPrecedingTYAmt>300</FirstPrecedingTYAmt><TotalAmt>300</TotalAmt></ForeignTxCyovFollowingTYGrp>",
  );
  assertThrows(
    () =>
      form1116ScheduleB.build({
        ...fields,
        remaining_prior_year_carryover: 400,
      }),
    Error,
    "do not reconcile",
  );
  const formFields = {
    category_summaries: [{
      category: IncomeCategory.Passive,
      items: [{
        foreign_tax_paid: 200,
        foreign_gross_income: 10_000,
        income_category: IncomeCategory.Passive,
        irs_country_code: "CA",
        tax_paid_or_accrued_date: "2025-11-01",
        tax_kind: ForeignTaxKind.Interest,
        tax_credit_method: ForeignTaxCreditMethod.Paid,
      }],
      foreignTaxPaid: 200,
      foreignGrossIncome: 10_000,
      includedForeignIncome: 10_000,
      directlyAllocableDeductions: 0,
      explicitlyApportionedDeductions: 0,
      automaticallyApportionedDeductions: 0,
      foreignTaxableIncome: 10_000,
      allowedCredit: 500,
      currentYearExcessTax: 0,
      priorYearCarryover: 600,
      usedPriorYearCarryover: 300,
    }],
    total_income: 50_000,
    us_tax_before_credits: 2_500,
  };
  assertThrows(
    () => form1116.build(formFields),
    Error,
    "matching sourced Schedule B reconciliation",
  );
  const [formXml] = form1116.build(formFields, {
    pending: { form1116_schedule_b: fields },
  });
  assertStringIncludes(
    formXml,
    "<ForeignTaxCrCarrybackOrOverAmt>600</ForeignTaxCrCarrybackOrOverAmt>",
  );
  assertStringIncludes(
    formXml,
    "<ForeignTaxAvailableForCrRedAmt>800</ForeignTaxAvailableForCrRedAmt>",
  );
  assertStringIncludes(
    formXml,
    "<GrossForeignTaxCreditAmt>500</GrossForeignTaxCreditAmt>",
  );
});
