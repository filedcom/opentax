import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  categorySummarySchema,
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  form1116 as form1116Node,
  IncomeCategory,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";
import { form1116 } from "./f1116.ts";
import {
  form1116ScheduleB,
  scheduleBFieldsSchema,
} from "./f1116_schedule_b.ts";

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
  const scheduleB = scheduleBFieldsSchema.parse(
    outputs.find((item) => item.nodeType === "form1116_schedule_b")?.fields,
  );
  const form = outputs.find((item) => item.nodeType === "form_1116")?.fields;
  if (scheduleB.case !== "current_year_excess") {
    throw new Error(`Unexpected Schedule B case: ${scheduleB.case}`);
  }
  assertEquals(scheduleB?.current_year_excess_tax, 50);
  assertEquals(form !== undefined, true);
});

Deno.test("Form 1116 Schedule B combines a reviewed 2024 balance with 2025 excess without consuming prior tax", () => {
  const priorSource = {
    income_category: IncomeCategory.Passive,
    vintages: [{
      vintage_tax_year: 2024 as const,
      prior_year_schedule_b_line8_vintage_amount: 600,
    }],
    prior_year_schedule_b_line8_total: 600,
    prior_year_schedule_b_line8_other_vintages_total: 0 as const,
    no_intervening_adjustments: true as const,
    source_document_references: ["Filed 2024 passive Schedule B line 8"],
  };
  const review = {
    ...priorYearReview,
    prior_year_schedule_b_line8_balance: 600,
  };
  const input = {
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
    carryover_reviews: [review],
    prior_year_carryovers: [priorSource],
  };
  const outputs = form1116Node.compute(
    { taxYear: 2025, formType: "f1040" },
    input,
  ).outputs;
  const scheduleB = outputs.find((item) =>
    item.nodeType === "form1116_schedule_b"
  )?.fields;
  const parent = outputs.find((item) => item.nodeType === "form_1116")?.fields;
  const formFields = {
    category_summaries: categorySummarySchema.array().parse(
      parent?.category_summaries,
    ),
    total_income: 80_000,
    us_tax_before_credits: 7_200,
  };
  assertEquals(scheduleB?.case, "combined_current_excess_prior_balance");
  assertEquals(scheduleB?.current_year_excess_tax, 50);
  assertEquals(scheduleB?.used_prior_year_carryover, 0);
  const xml = form1116ScheduleB.build(scheduleBFieldsSchema.parse(scheduleB));
  assertStringIncludes(
    xml,
    "<ForeignTxCyovPrTYGrp><FirstPrecedingTYAmt>600</FirstPrecedingTYAmt><TotalAmt>600</TotalAmt></ForeignTxCyovPrTYGrp>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTxCyovGenCurrTYGrp><CurrentTaxYearAmt>50</CurrentTaxYearAmt><TotalAmt>50</TotalAmt></ForeignTxCyovGenCurrTYGrp>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTxCyovFollowingTYGrp><FirstPrecedingTYAmt>600</FirstPrecedingTYAmt><CurrentTaxYearAmt>50</CurrentTaxYearAmt><TotalAmt>650</TotalAmt></ForeignTxCyovFollowingTYGrp>",
  );
  const [formXml] = form1116.build(formFields, {
    pending: {
      form1116_schedule_b: scheduleB,
      schedule3: { line1_foreign_tax_credit: 450 },
    },
  });
  assertStringIncludes(
    formXml,
    "<ForeignTaxCrCarrybackOrOverAmt>600</ForeignTaxCrCarrybackOrOverAmt>",
  );
  assertThrows(
    () =>
      form1116.build(formFields, {
        pending: {
          form1116_schedule_b: {
            ...scheduleB,
            current_year_excess_tax: 51,
          },
        },
      }),
    Error,
    "matching sourced Schedule B",
  );
  assertThrows(
    () =>
      form1116.build(formFields, {
        pending: {
          form1116_schedule_b: {
            ...scheduleB,
            prior_year_review: {
              ...review,
              prior_year_schedule_b_line8_balance: 0,
            },
          },
        },
      }),
    Error,
    "does not match its prior-year source",
  );
  assertThrows(
    () =>
      form1116Node.compute(
        { taxYear: 2025, formType: "f1040" },
        { ...input, carryover_reviews: [priorYearReview] },
      ),
    Error,
    "review must reconcile",
  );
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
      schedule3: { line1_foreign_tax_credit: 450 },
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
    vintages: [{
      vintage_tax_year: 2024 as const,
      prior_year_schedule_b_line8_vintage_amount: 600,
    }],
    prior_year_schedule_b_line8_total: 600,
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
    pending: {
      form1116_schedule_b: fields,
      schedule3: { line1_foreign_tax_credit: 500 },
    },
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

Deno.test("Form 1116 Schedule B places a sourced 2023 vintage in the second-preceding column", () => {
  const xml = form1116ScheduleB.build({
    case: "prior_year_use",
    category: IncomeCategory.General,
    prior_year_carryover: 600,
    used_prior_year_carryover: 300,
    remaining_prior_year_carryover: 300,
    prior_year_carryover_source: {
      income_category: IncomeCategory.General,
      vintages: [{
        vintage_tax_year: 2023,
        prior_year_schedule_b_line8_vintage_amount: 600,
      }],
      prior_year_schedule_b_line8_total: 600,
      prior_year_schedule_b_line8_other_vintages_total: 0,
      no_intervening_adjustments: true,
      source_document_references: [
        "Filed 2024 Schedule B (Form 1116), general basket, line 8 first-preceding-year column",
      ],
    },
  });
  assertStringIncludes(
    xml,
    "<ForeignIncGeneralCategoryInd>X</ForeignIncGeneralCategoryInd>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTxCyovPrTYGrp><SecondPrecedingTYAmt>600</SecondPrecedingTYAmt><TotalAmt>600</TotalAmt></ForeignTxCyovPrTYGrp>",
  );
  assertStringIncludes(
    xml,
    "<AdjForeignTxCyovPrTYGrp><SecondPrecedingTYAmt>600</SecondPrecedingTYAmt><TotalAmt>600</TotalAmt></AdjForeignTxCyovPrTYGrp>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTxCyovUsedCurrTYGrp><SecondPrecedingTYAmt>-300</SecondPrecedingTYAmt><TotalAmt>-300</TotalAmt></ForeignTxCyovUsedCurrTYGrp>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTxCyovFollowingTYGrp><SecondPrecedingTYAmt>300</SecondPrecedingTYAmt><TotalAmt>300</TotalAmt></ForeignTxCyovFollowingTYGrp>",
  );
  assertEquals(xml.includes("FirstPrecedingTYAmt"), false);
});

Deno.test("Form 1116 Schedule B allocates two vintages oldest-first in native column order", () => {
  const xml = form1116ScheduleB.build({
    case: "prior_year_use",
    category: IncomeCategory.Passive,
    prior_year_carryover: 600,
    used_prior_year_carryover: 300,
    remaining_prior_year_carryover: 300,
    prior_year_carryover_source: {
      income_category: IncomeCategory.Passive,
      // Deliberately reverse source order; native XML is older column first.
      vintages: [
        {
          vintage_tax_year: 2024,
          prior_year_schedule_b_line8_vintage_amount: 500,
        },
        {
          vintage_tax_year: 2023,
          prior_year_schedule_b_line8_vintage_amount: 100,
        },
      ],
      prior_year_schedule_b_line8_total: 600,
      prior_year_schedule_b_line8_other_vintages_total: 0,
      no_intervening_adjustments: true,
      source_document_references: [
        "Filed 2024 passive Schedule B line 8, both vintage columns and total",
      ],
    },
  });
  assertStringIncludes(
    xml,
    "<ForeignTxCyovPrTYGrp><SecondPrecedingTYAmt>100</SecondPrecedingTYAmt><FirstPrecedingTYAmt>500</FirstPrecedingTYAmt><TotalAmt>600</TotalAmt></ForeignTxCyovPrTYGrp>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTxCyovUsedCurrTYGrp><SecondPrecedingTYAmt>-100</SecondPrecedingTYAmt><FirstPrecedingTYAmt>-200</FirstPrecedingTYAmt><TotalAmt>-300</TotalAmt></ForeignTxCyovUsedCurrTYGrp>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTxCyovFollowingTYGrp><SecondPrecedingTYAmt>0</SecondPrecedingTYAmt><FirstPrecedingTYAmt>300</FirstPrecedingTYAmt><TotalAmt>300</TotalAmt></ForeignTxCyovFollowingTYGrp>",
  );
});

Deno.test("Form 1116 Schedule B carries 2022 through the third-preceding column", () => {
  const xml = form1116ScheduleB.build({
    case: "prior_year_use",
    category: IncomeCategory.Passive,
    prior_year_carryover: 600,
    used_prior_year_carryover: 250,
    remaining_prior_year_carryover: 350,
    prior_year_carryover_source: {
      income_category: IncomeCategory.Passive,
      vintages: [
        {
          vintage_tax_year: 2024,
          prior_year_schedule_b_line8_vintage_amount: 300,
        },
        {
          vintage_tax_year: 2022,
          prior_year_schedule_b_line8_vintage_amount: 100,
        },
        {
          vintage_tax_year: 2023,
          prior_year_schedule_b_line8_vintage_amount: 200,
        },
      ],
      prior_year_schedule_b_line8_total: 600,
      prior_year_schedule_b_line8_other_vintages_total: 0,
      no_intervening_adjustments: true,
      source_document_references: [
        "Filed 2024 Schedule B line 8, 2022-2024 columns and total",
      ],
    },
  });
  assertStringIncludes(
    xml,
    "<ForeignTxCyovPrTYGrp><ThirdPrecedingTYAmt>100</ThirdPrecedingTYAmt><SecondPrecedingTYAmt>200</SecondPrecedingTYAmt><FirstPrecedingTYAmt>300</FirstPrecedingTYAmt><TotalAmt>600</TotalAmt></ForeignTxCyovPrTYGrp>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTxCyovUsedCurrTYGrp><ThirdPrecedingTYAmt>-100</ThirdPrecedingTYAmt><SecondPrecedingTYAmt>-150</SecondPrecedingTYAmt><TotalAmt>-250</TotalAmt></ForeignTxCyovUsedCurrTYGrp>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTxCyovFollowingTYGrp><ThirdPrecedingTYAmt>0</ThirdPrecedingTYAmt><SecondPrecedingTYAmt>50</SecondPrecedingTYAmt><FirstPrecedingTYAmt>300</FirstPrecedingTYAmt><TotalAmt>350</TotalAmt></ForeignTxCyovFollowingTYGrp>",
  );
});

Deno.test("Form 1116 Schedule B carries four reviewed vintages from 2021 oldest first", () => {
  const xml = form1116ScheduleB.build({
    case: "prior_year_use",
    category: IncomeCategory.Passive,
    prior_year_carryover: 1000,
    used_prior_year_carryover: 350,
    remaining_prior_year_carryover: 650,
    prior_year_carryover_source: {
      income_category: IncomeCategory.Passive,
      vintages: [
        {
          vintage_tax_year: 2024,
          prior_year_schedule_b_line8_vintage_amount: 400,
        },
        {
          vintage_tax_year: 2022,
          prior_year_schedule_b_line8_vintage_amount: 200,
        },
        {
          vintage_tax_year: 2021,
          prior_year_schedule_b_line8_vintage_amount: 100,
        },
        {
          vintage_tax_year: 2023,
          prior_year_schedule_b_line8_vintage_amount: 300,
        },
      ],
      prior_year_schedule_b_line8_total: 1000,
      prior_year_schedule_b_line8_other_vintages_total: 0,
      no_intervening_adjustments: true,
      source_document_references: [
        "Filed 2024 passive Schedule B line 8, 2021-2024 columns and total",
      ],
    },
  });
  assertStringIncludes(
    xml,
    "<ForeignTxCyovPrTYGrp><FourthPrecedingTYAmt>100</FourthPrecedingTYAmt><ThirdPrecedingTYAmt>200</ThirdPrecedingTYAmt><SecondPrecedingTYAmt>300</SecondPrecedingTYAmt><FirstPrecedingTYAmt>400</FirstPrecedingTYAmt><TotalAmt>1000</TotalAmt></ForeignTxCyovPrTYGrp>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTxCyovUsedCurrTYGrp><FourthPrecedingTYAmt>-100</FourthPrecedingTYAmt><ThirdPrecedingTYAmt>-200</ThirdPrecedingTYAmt><SecondPrecedingTYAmt>-50</SecondPrecedingTYAmt><TotalAmt>-350</TotalAmt></ForeignTxCyovUsedCurrTYGrp>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTxCyovFollowingTYGrp><FourthPrecedingTYAmt>0</FourthPrecedingTYAmt><ThirdPrecedingTYAmt>0</ThirdPrecedingTYAmt><SecondPrecedingTYAmt>250</SecondPrecedingTYAmt><FirstPrecedingTYAmt>400</FirstPrecedingTYAmt><TotalAmt>650</TotalAmt></ForeignTxCyovFollowingTYGrp>",
  );
});

Deno.test("Form 1116 Schedule B carries an originated-2020 credit into the fifth-preceding column", () => {
  const source = {
    income_category: IncomeCategory.Passive,
    vintages: [
      {
        vintage_tax_year: 2021 as const,
        prior_year_schedule_b_line8_vintage_amount: 200,
      },
      {
        vintage_tax_year: 2020 as const,
        prior_year_schedule_b_line8_vintage_amount: 100,
      },
    ],
    prior_year_schedule_b_line8_total: 300,
    prior_year_schedule_b_line8_other_vintages_total: 0 as const,
    no_intervening_adjustments: true as const,
    source_document_references: [
      "Filed 2024 Schedule B line 8, original 2020 and 2021 vintages",
    ],
  };
  const fields = {
    case: "prior_year_use" as const,
    category: IncomeCategory.Passive,
    prior_year_carryover: 300,
    used_prior_year_carryover: 150,
    remaining_prior_year_carryover: 150,
    prior_year_carryover_source: source,
  };
  const xml = form1116ScheduleB.build(fields);
  assertStringIncludes(
    xml,
    "<ForeignTxCyovPrTYGrp><FifthPrecedingTYAmt>100</FifthPrecedingTYAmt><FourthPrecedingTYAmt>200</FourthPrecedingTYAmt><TotalAmt>300</TotalAmt></ForeignTxCyovPrTYGrp>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTxCyovUsedCurrTYGrp><FifthPrecedingTYAmt>-100</FifthPrecedingTYAmt><FourthPrecedingTYAmt>-50</FourthPrecedingTYAmt><TotalAmt>-150</TotalAmt></ForeignTxCyovUsedCurrTYGrp>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTxCyovFollowingTYGrp><FifthPrecedingTYAmt>0</FifthPrecedingTYAmt><FourthPrecedingTYAmt>150</FourthPrecedingTYAmt><TotalAmt>150</TotalAmt></ForeignTxCyovFollowingTYGrp>",
  );
  assertThrows(
    () =>
      form1116ScheduleB.build({
        ...fields,
        prior_year_carryover_source: {
          ...source,
          prior_year_schedule_b_line8_total: 301,
        },
      }),
    Error,
    "vintages do not match its total",
  );
  assertThrows(
    () =>
      form1116ScheduleB.build({
        ...fields,
        prior_year_carryover_source: {
          ...source,
          vintages: [
            ...source.vintages,
            {
              vintage_tax_year: 2020 as const,
              prior_year_schedule_b_line8_vintage_amount: 1,
            },
          ],
          prior_year_schedule_b_line8_total: 301,
        },
      }),
    Error,
    "duplicate vintage",
  );
  assertThrows(
    () =>
      scheduleBFieldsSchema.parse({
        ...fields,
        prior_year_carryover_source: {
          ...source,
          vintages: [{
            vintage_tax_year: 2019,
            prior_year_schedule_b_line8_vintage_amount: 300,
          }],
        },
      }),
    Error,
  );
});
