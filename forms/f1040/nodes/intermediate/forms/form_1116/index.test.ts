import { assertEquals, assertThrows } from "@std/assert";
import { form1116, IncomeCategory, priorYearCarryoverSchema } from "./index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import { form6251 } from "../form6251/index.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { FilingStatus } from "../../../types.ts";
import { qualifiedDividendTax2025 } from "../../worksheets/tax_table_2025.ts";
import { scheduleCLedger } from "../../../inputs/form1116_schedule_c_source/test-fixture.ts";

const ctx = { taxYear: 2025, formType: "f1040" };
const zeroPriorPassive = {
  income_category: IncomeCategory.Passive,
  prior_year_form1116_line23_limit: 500,
  prior_year_form1116_line24_allowed_credit: 500,
  prior_year_schedule_b_line8_balance: 0 as const,
  source_document_references: [
    "Filed 2024 Form 1116 passive basket, lines 23 and 24; filed Schedule B line 8",
  ],
  no_foreign_tax_redetermination_or_special_adjustment: true as const,
};
const zeroPriorGeneral = {
  ...zeroPriorPassive,
  income_category: IncomeCategory.General,
  source_document_references: [
    "Filed 2024 Form 1116 general basket, lines 23 and 24; filed Schedule B line 8",
  ],
};

function credit(input: Parameters<typeof form1116.compute>[1]): number {
  const result = form1116.compute(ctx, input);
  return fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_credit ?? 0;
}

Deno.test("form1116: no foreign tax items produces no output", () => {
  assertEquals(
    form1116.compute(ctx, { worldwide_taxable_income: 50_000 }).outputs,
    [],
  );
  assertEquals(
    form1116.compute(ctx, {
      qualified_vehicle_loan_interest_deduction: 500,
    }).outputs,
    [],
  );
});

Deno.test("form1116: sourced Schedule K-3 line 12 reduces the credit and current excess, not Part II tax", () => {
  const result = form1116.compute(ctx, {
    foreign_tax_items: [{
      foreign_tax_paid: 500,
      foreign_gross_income: 10_000,
      income_category: IncomeCategory.Passive,
      schedule_k3_line12_reduction: {
        amount: 100,
        source_document_reference: "2025 Schedule K-3 Part III, section 4",
      },
    }],
    worldwide_taxable_income: 10_000,
    us_tax_before_credits: 300,
    carryover_reviews: [zeroPriorPassive],
  });
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_credit,
    300,
  );
  const summary = result.outputs.find((row) => row.nodeType === "form_1116")
    ?.fields.category_summaries as Array<{
      foreignTaxPaid: number;
      foreignTaxReduction: number;
      currentYearExcessTax: number;
    }>;
  assertEquals(summary[0].foreignTaxPaid, 500);
  assertEquals(summary[0].foreignTaxReduction, 100);
  assertEquals(summary[0].currentYearExcessTax, 100);
  assertEquals(
    result.outputs.find((row) => row.nodeType === "form1116_schedule_b")
      ?.fields.current_year_excess_tax,
    100,
  );
});

Deno.test("form1116: Schedule K-3 line 12 cannot exceed its sourced tax", () => {
  assertThrows(
    () =>
      form1116.compute(ctx, {
        foreign_tax_items: [{
          foreign_tax_paid: 50,
          foreign_gross_income: 10_000,
          income_category: IncomeCategory.Passive,
          schedule_k3_line12_reduction: {
            amount: 60,
            source_document_reference: "2025 Schedule K-3 Part III, section 4",
          },
        }],
        worldwide_taxable_income: 10_000,
        us_tax_before_credits: 300,
      }),
    Error,
    "exceeds category foreign tax",
  );
});

Deno.test("form1116: line 1b source split must agree with line 1a", () => {
  assertThrows(
    () =>
      form1116.compute(ctx, {
        foreign_tax_items: [{
          foreign_tax_paid: 2_000,
          foreign_gross_income: 139_000,
          income_category: IncomeCategory.General,
          alternative_compensation_sourcing: {
            specific_compensation_description: "Consulting salary",
            alternative_allocation_basis: "Project locations",
            alternative_allocation_computation: "Project fee allocation",
            geographical_comparison: "Project location is more accurate",
            compensation_item_total_usd: 300_000,
            alternative_us_source_usd: 160_000,
            alternative_foreign_source_usd: 140_000,
            ordinary_us_source_usd: 180_000,
            ordinary_foreign_source_usd: 120_000,
            source_document_reference: "2025 project ledger",
          },
        }],
      }),
    Error,
    "must equal line 1a",
  );
});

Deno.test("form1116: disclosed 2025 foreign tax redetermination fails before credit or carryover", () => {
  assertThrows(
    () =>
      form1116.compute(ctx, {
        foreign_tax_redeterminations: [scheduleCLedger()],
      }),
    Error,
    "needs native Schedule C",
  );
  assertThrows(
    () =>
      form1116.compute(ctx, {
        foreign_tax_redeterminations: [scheduleCLedger(
          IncomeCategory.General,
          "additional_accrued_tax",
        )],
        foreign_tax_items: [{
          foreign_tax_paid: 500,
          foreign_gross_income: 1_000,
          income_category: IncomeCategory.General,
        }],
      }),
    Error,
    "needs native Schedule C",
  );
});

Deno.test("form1116: an unpaid-accrual event cannot disappear when the current-year credit is zero", () => {
  assertThrows(
    () =>
      form1116.compute(ctx, {
        foreign_tax_redeterminations: [scheduleCLedger(
          IncomeCategory.Passive,
          "accrued_tax_unpaid_after_24_months",
        )],
        worldwide_taxable_income: 0,
        us_tax_before_credits: 0,
      }),
    Error,
    "needs native Schedule C",
  );
});

Deno.test("form1116: missing return limitation inputs fail closed", () => {
  assertThrows(
    () =>
      credit({
        foreign_tax_items: [{
          foreign_tax_paid: 500,
          foreign_gross_income: 1_000,
          income_category: IncomeCategory.Passive,
        }],
      }),
    Error,
    "needs the sourced Form 1040",
  );
});

Deno.test("form1116: line 18 adds back only Schedule 1-A senior deduction", () => {
  const result = form1116.compute(ctx, {
    carryover_reviews: [zeroPriorPassive],
    foreign_tax_items: [{
      foreign_tax_paid: 2_000,
      foreign_gross_income: 10_000,
      income_category: IncomeCategory.Passive,
    }],
    worldwide_taxable_income: 40_000,
    enhanced_senior_deduction: 6_000,
    us_tax_before_credits: 4_000,
  });
  assertEquals(
    fieldsOf(result.outputs, f1040)?.form1116_line18_worldwide_taxable_income,
    46_000,
  );
  assertEquals(fieldsOf(result.outputs, f1040)?.form1116_line20_us_tax, 4_000);
  assertEquals(
    result.outputs.find((item) => item.nodeType === "form_1116")?.fields
      .total_income,
    46_000,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_credit,
    870,
  );
});

const qdcgtSource = {
  taxable_income: 100_000,
  qualified_dividends: 20_000,
  net_capital_gain: 0,
  filing_status: FilingStatus.Single,
  special_rate_gain: 0,
  form4952_election: 0,
  foreign_earned_income_exclusion: 0,
  form8615_applies: false,
  regular_tax_before_additional_items: qualifiedDividendTax2025(
    100_000,
    20_000,
    0,
    FilingStatus.Single,
  ),
};
const zeroForeignPreference = {
  all_foreign_sources_reviewed: true as const,
  foreign_qualified_dividends: 0 as const,
  foreign_capital_gains_or_losses_present: false as const,
  source_document_references: [
    "2025 1099-DIV, 1099-B, and foreign tax source review",
  ],
  no_amt_liability_verified: true as const,
};

Deno.test("form1116: sourced QDCGT worksheet adjusts line 18, not ordinary foreign numerator", () => {
  const result = form1116.compute(ctx, {
    carryover_reviews: [zeroPriorPassive],
    foreign_tax_items: [{
      foreign_tax_paid: 2_000,
      foreign_gross_income: 10_000,
      income_category: IncomeCategory.Passive,
    }],
    worldwide_taxable_income: 100_000,
    us_tax_before_credits: qdcgtSource.regular_tax_before_additional_items,
    regular_tax_preference_facts: qdcgtSource,
    foreign_preferential_income_review: zeroForeignPreference,
  });
  assertEquals(
    fieldsOf(result.outputs, f1040)?.form1116_line18_worldwide_taxable_income,
    88_108,
  );
  const summary = result.outputs.find((row) => row.nodeType === "form_1116")
    ?.fields.category_summaries as Array<{ foreignTaxableIncome: number }>;
  assertEquals(summary[0].foreignTaxableIncome, 10_000);
});

Deno.test("form1116: preferential denominator fails closed without source review or on special tax routes", () => {
  const base = {
    foreign_tax_items: [{
      foreign_tax_paid: 2_000,
      foreign_gross_income: 10_000,
      income_category: IncomeCategory.Passive,
    }],
    worldwide_taxable_income: 100_000,
    us_tax_before_credits: qdcgtSource.regular_tax_before_additional_items,
    regular_tax_preference_facts: qdcgtSource,
  };
  assertThrows(
    () => form1116.compute(ctx, base),
    Error,
    "documented review of foreign qualified dividends",
  );
  assertThrows(() =>
    form1116.compute(ctx, {
      ...base,
      foreign_preferential_income_review: {
        ...zeroForeignPreference,
        foreign_qualified_dividends: 500 as never,
      },
    }), Error);
  assertThrows(() =>
    form1116.compute(ctx, {
      ...base,
      foreign_preferential_income_review: {
        ...zeroForeignPreference,
        foreign_capital_gains_or_losses_present: true as never,
      },
    }), Error);
  assertThrows(
    () =>
      form1116.compute(ctx, {
        ...base,
        foreign_preferential_income_review: zeroForeignPreference,
        known_foreign_qualified_dividends: 500,
      }),
    Error,
    "foreign qualified dividends need the foreign-source rate-adjustment worksheet",
  );
  assertThrows(
    () =>
      form1116.compute(ctx, {
        ...base,
        foreign_preferential_income_review: zeroForeignPreference,
        regular_tax_preference_facts: {
          ...qdcgtSource,
          special_rate_gain: 500,
        },
      }),
    Error,
    "Schedule D Tax Worksheet",
  );
  assertThrows(
    () =>
      form1116.compute(ctx, {
        ...base,
        foreign_preferential_income_review: zeroForeignPreference,
        tentative_minimum_tax: 1,
      }),
    Error,
    "AMT",
  );
});

Deno.test("form1116: documented all-asset method puts vehicle interest on line 4b", () => {
  const result = form1116.compute(ctx, {
    carryover_reviews: [zeroPriorPassive],
    foreign_tax_items: [{
      foreign_tax_paid: 3_000,
      foreign_gross_income: 20_000,
      income_category: IncomeCategory.Passive,
      irs_country_code: "CA",
    }],
    qualified_vehicle_loan_interest_deduction: 2_000,
    vehicle_interest_asset_method: {
      all_assets_included_verified: true,
      assets: [
        {
          asset_id: "US-stock",
          source_document_reference: "2025 broker tax-basis statement US",
          beginning_tax_book_value: 40_000,
          ending_tax_book_value: 40_000,
          income_source: "us",
        },
        {
          asset_id: "CA-stock",
          source_document_reference: "2025 broker tax-basis statement CA",
          beginning_tax_book_value: 60_000,
          ending_tax_book_value: 60_000,
          income_source: "foreign",
          income_category: IncomeCategory.Passive,
          irs_country_code: "CA",
        },
      ],
    },
    worldwide_taxable_income: 50_000,
    us_tax_before_credits: 5_000,
  });
  const summary = result.outputs.find((item) => item.nodeType === "form_1116")
    ?.fields.category_summaries as Array<Record<string, unknown>>;
  assertEquals(summary[0].vehicleInterestByCountry, [{
    irsCountryCode: "CA",
    amount: 1_200,
  }]);
  assertEquals(summary[0].foreignTaxableIncome, 18_800);
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_credit,
    1_880,
  );
});

Deno.test("form1116: vehicle-interest claim without complete asset facts fails closed", () => {
  assertThrows(
    () =>
      form1116.compute(ctx, {
        foreign_tax_items: [{
          foreign_tax_paid: 3_000,
          foreign_gross_income: 20_000,
          income_category: IncomeCategory.Passive,
          irs_country_code: "CA",
        }],
        qualified_vehicle_loan_interest_deduction: 2_000,
        worldwide_taxable_income: 50_000,
        us_tax_before_credits: 5_000,
      }),
    Error,
    "complete documented asset-method inventory",
  );
});

Deno.test("form1116: line 18 floors the signed return amount after the senior addback", () => {
  const result = form1116.compute(ctx, {
    carryover_reviews: [zeroPriorPassive],
    foreign_tax_items: [{
      foreign_tax_paid: 100,
      foreign_gross_income: 1_000,
      income_category: IncomeCategory.Passive,
    }],
    worldwide_taxable_income: -5_750,
    enhanced_senior_deduction: 6_000,
    us_tax_before_credits: 0,
  });
  assertEquals(
    fieldsOf(result.outputs, f1040)?.form1116_line18_worldwide_taxable_income,
    250,
  );
  assertEquals(fieldsOf(result.outputs, schedule3), undefined);
});

Deno.test("form1116: applies taxable-income ratio", () => {
  assertEquals(
    credit({
      carryover_reviews: [zeroPriorPassive],
      foreign_tax_items: [{
        foreign_tax_paid: 500,
        foreign_gross_income: 1_000,
        income_category: IncomeCategory.Passive,
        apportioned_deductions: 155.94,
      }],
      worldwide_taxable_income: 85_250,
      us_tax_before_credits: 13_669,
    }),
    135,
  );
});

Deno.test("Form 1116 sends the same allowed foreign tax credit to Form 6251 line 10", () => {
  const result = form1116.compute(ctx, {
    carryover_reviews: [zeroPriorPassive],
    foreign_tax_items: [{
      foreign_tax_paid: 500,
      foreign_gross_income: 1_000,
      income_category: IncomeCategory.Passive,
      apportioned_deductions: 155.94,
    }],
    worldwide_taxable_income: 85_250,
    us_tax_before_credits: 13_669,
  });
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_credit,
    135,
  );
  assertEquals(
    fieldsOf(result.outputs, form6251)?.schedule3_line1_foreign_tax_credit,
    135,
  );
});

Deno.test("form1116: directly allocable deductions reduce the limit", () => {
  assertEquals(
    credit({
      carryover_reviews: [zeroPriorPassive],
      foreign_tax_items: [{
        foreign_tax_paid: 500,
        foreign_gross_income: 10_000,
        directly_allocable_deductions: 8_000,
        income_category: IncomeCategory.Passive,
      }],
      worldwide_taxable_income: 100_000,
      us_tax_before_credits: 10_000,
    }),
    200,
  );
});

Deno.test("form1116: computes passive and general category limits separately", () => {
  assertEquals(
    credit({
      carryover_reviews: [zeroPriorPassive],
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
    }),
    1_100,
  );
});

Deno.test("form1116: excluded wages reduce eligible income and credit", () => {
  assertEquals(
    credit({
      carryover_reviews: [zeroPriorGeneral],
      foreign_tax_items: [{
        foreign_tax_paid: 1_000,
        foreign_gross_income: 20_000,
        excluded_income: 15_000,
        income_category: IncomeCategory.General,
      }],
      worldwide_taxable_income: 50_000,
      us_tax_before_credits: 5_000,
    }),
    500,
  );
});

Deno.test("form1116: same-category items aggregate before applying the limit", () => {
  assertEquals(
    credit({
      carryover_reviews: [zeroPriorPassive],
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
    }),
    500,
  );
});

Deno.test("form1116: current-year excess needs a sourced prior-year review", () => {
  const base = {
    foreign_tax_items: [{
      foreign_tax_paid: 500,
      foreign_gross_income: 5_000,
      income_category: IncomeCategory.Passive,
    }],
    worldwide_taxable_income: 80_000,
    us_tax_before_credits: 7_200,
  };
  assertThrows(
    () => form1116.compute(ctx, base),
    Error,
    "sourced prior-year carryback and carryover review",
  );
  assertThrows(
    () =>
      form1116.compute(ctx, {
        ...base,
        carryover_reviews: [{
          ...zeroPriorPassive,
          prior_year_form1116_line23_limit: 600,
        }],
      }),
    Error,
    "one-year carryback must be determined",
  );
  assertThrows(
    () =>
      form1116.compute(ctx, {
        ...base,
        carryover_reviews: [{
          ...zeroPriorPassive,
          prior_year_form1116_line24_allowed_credit: 600,
        }],
      }),
    Error,
    "line 24 cannot exceed line 23",
  );
  const result = form1116.compute(ctx, {
    ...base,
    carryover_reviews: [{
      ...zeroPriorPassive,
      // The filed line 24 can include carryovers used on line 10. The
      // prior-year capacity is tested after those credits, not from current
      // taxes alone.
      prior_year_form1116_line23_limit: 600,
      prior_year_form1116_line24_allowed_credit: 600,
    }],
  });
  const scheduleB = result.outputs.find((row) =>
    row.nodeType === "form1116_schedule_b"
  )?.fields;
  assertEquals(scheduleB?.current_year_excess_tax, 50);
  assertEquals(scheduleB?.category, IncomeCategory.Passive);
});

Deno.test("form1116: sourced 2024 carryover is used only after 2025 foreign tax", () => {
  const base = {
    foreign_tax_items: [{
      foreign_tax_paid: 200,
      foreign_gross_income: 10_000,
      income_category: IncomeCategory.Passive,
    }],
    worldwide_taxable_income: 50_000,
    prior_year_carryovers: [{
      income_category: IncomeCategory.Passive,
      vintages: [{
        vintage_tax_year: 2024 as const,
        prior_year_schedule_b_line8_vintage_amount: 600,
      }],
      prior_year_schedule_b_line8_total: 600,
      prior_year_schedule_b_line8_other_vintages_total: 0 as const,
      no_intervening_adjustments: true as const,
      source_document_references: [
        "Filed 2024 Schedule B (Form 1116), passive basket, line 8 columns xiii and xiv",
      ],
    }],
  };
  const result = form1116.compute(ctx, {
    ...base,
    us_tax_before_credits: 2_500,
  });
  const summary = result.outputs.find((row) => row.nodeType === "form_1116")
    ?.fields.category_summaries as Array<{
      allowedCredit: number;
      priorYearCarryover: number;
      usedPriorYearCarryover: number;
    }>;
  assertEquals(summary[0].priorYearCarryover, 600);
  assertEquals(summary[0].usedPriorYearCarryover, 300);
  assertEquals(summary[0].allowedCredit, 500);
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_credit,
    500,
  );
  const scheduleB = result.outputs.find((row) =>
    row.nodeType === "form1116_schedule_b"
  )?.fields;
  assertEquals(scheduleB?.used_prior_year_carryover, 300);
  assertEquals(scheduleB?.remaining_prior_year_carryover, 300);
  const fullyUsed = form1116.compute(ctx, {
    ...base,
    us_tax_before_credits: 5_000,
  });
  const fullyUsedScheduleB = fullyUsed.outputs.find((row) =>
    row.nodeType === "form1116_schedule_b"
  )?.fields;
  assertEquals(fullyUsedScheduleB?.used_prior_year_carryover, 600);
  assertEquals(fullyUsedScheduleB?.remaining_prior_year_carryover, 0);
});

Deno.test("form1116: sourced 2023 carryover feeds the credit and Schedule B", () => {
  const result = form1116.compute(ctx, {
    foreign_tax_items: [{
      foreign_tax_paid: 200,
      foreign_gross_income: 10_000,
      income_category: IncomeCategory.General,
    }],
    worldwide_taxable_income: 50_000,
    us_tax_before_credits: 2_500,
    prior_year_carryovers: [{
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
    }],
  });
  const summary = result.outputs.find((row) => row.nodeType === "form_1116")
    ?.fields.category_summaries as Array<{
      allowedCredit: number;
      priorYearCarryover: number;
      usedPriorYearCarryover: number;
    }>;
  assertEquals(summary[0].priorYearCarryover, 600);
  assertEquals(summary[0].usedPriorYearCarryover, 300);
  assertEquals(summary[0].allowedCredit, 500);
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_credit,
    500,
  );
  const scheduleB = result.outputs.find((row) =>
    row.nodeType === "form1116_schedule_b"
  )?.fields;
  assertEquals(
    (scheduleB?.prior_year_carryover_source as {
      vintages: Array<{ vintage_tax_year: number }>;
    } | undefined)?.vintages[0].vintage_tax_year,
    2023,
  );
  assertEquals(scheduleB?.remaining_prior_year_carryover, 300);
});

Deno.test("form1116: two sourced vintages use the oldest balance first", () => {
  const result = form1116.compute(ctx, {
    foreign_tax_items: [{
      foreign_tax_paid: 200,
      foreign_gross_income: 10_000,
      income_category: IncomeCategory.Passive,
    }],
    worldwide_taxable_income: 50_000,
    us_tax_before_credits: 2_500,
    prior_year_carryovers: [{
      income_category: IncomeCategory.Passive,
      vintages: [
        {
          vintage_tax_year: 2023,
          prior_year_schedule_b_line8_vintage_amount: 100,
        },
        {
          vintage_tax_year: 2024,
          prior_year_schedule_b_line8_vintage_amount: 500,
        },
      ],
      prior_year_schedule_b_line8_total: 600,
      prior_year_schedule_b_line8_other_vintages_total: 0,
      no_intervening_adjustments: true,
      source_document_references: [
        "Filed 2024 passive Schedule B line 8, 2023/2024 columns and total",
      ],
    }],
  });
  const summary = result.outputs.find((row) => row.nodeType === "form_1116")
    ?.fields.category_summaries as Array<{
      allowedCredit: number;
      priorYearCarryover: number;
      usedPriorYearCarryover: number;
    }>;
  assertEquals(summary[0].priorYearCarryover, 600);
  assertEquals(summary[0].usedPriorYearCarryover, 300);
  assertEquals(summary[0].allowedCredit, 500);
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_credit,
    500,
  );
});

Deno.test("form1116: rejects unmodeled older, mixed, or unreviewed carryover vintages", () => {
  const base = {
    foreign_tax_items: [{
      foreign_tax_paid: 200,
      foreign_gross_income: 10_000,
      income_category: IncomeCategory.Passive,
    }],
    worldwide_taxable_income: 50_000,
    us_tax_before_credits: 2_500,
  };
  const source = {
    income_category: IncomeCategory.Passive,
    vintages: [{
      vintage_tax_year: 2023 as const,
      prior_year_schedule_b_line8_vintage_amount: 600,
    }],
    prior_year_schedule_b_line8_total: 600,
    prior_year_schedule_b_line8_other_vintages_total: 0 as const,
    no_intervening_adjustments: true as const,
    source_document_references: [
      "Filed 2024 Schedule B (Form 1116), passive basket, line 8 first-preceding-year column",
    ],
  };
  assertThrows(
    () =>
      form1116.compute(ctx, {
        ...base,
        prior_year_carryovers: [source, {
          ...source,
          vintages: [{
            vintage_tax_year: 2024,
            prior_year_schedule_b_line8_vintage_amount: 600,
          }],
        }],
      }),
    Error,
    "one matching passive or general income category",
  );
  assertEquals(
    priorYearCarryoverSchema.safeParse({
      ...source,
      prior_year_schedule_b_line8_other_vintages_total: 100,
    }).success,
    false,
  );
  assertEquals(
    priorYearCarryoverSchema.safeParse({
      ...source,
      vintages: [source.vintages[0], source.vintages[0]],
      prior_year_schedule_b_line8_total: 1_200,
    }).success,
    false,
  );
  assertEquals(
    priorYearCarryoverSchema.safeParse({
      ...source,
      prior_year_schedule_b_line8_total: 599,
    }).success,
    false,
  );
  assertEquals(
    priorYearCarryoverSchema.safeParse({
      ...source,
      vintages: [{
        vintage_tax_year: 2019,
        prior_year_schedule_b_line8_vintage_amount: 600,
      }],
    }).success,
    false,
  );
});

Deno.test("form1116: reviewed 2021-2024 vintages feed one oldest-first credit", () => {
  const result = form1116.compute(ctx, {
    foreign_tax_items: [{
      foreign_tax_paid: 200,
      foreign_gross_income: 10_000,
      income_category: IncomeCategory.Passive,
    }],
    worldwide_taxable_income: 50_000,
    us_tax_before_credits: 2_500,
    prior_year_carryovers: [{
      income_category: IncomeCategory.Passive,
      vintages: [
        {
          vintage_tax_year: 2024,
          prior_year_schedule_b_line8_vintage_amount: 400,
        },
        {
          vintage_tax_year: 2021,
          prior_year_schedule_b_line8_vintage_amount: 100,
        },
        {
          vintage_tax_year: 2023,
          prior_year_schedule_b_line8_vintage_amount: 300,
        },
        {
          vintage_tax_year: 2022,
          prior_year_schedule_b_line8_vintage_amount: 200,
        },
      ],
      prior_year_schedule_b_line8_total: 1_000,
      prior_year_schedule_b_line8_other_vintages_total: 0,
      no_intervening_adjustments: true,
      source_document_references: [
        "Filed 2024 passive Schedule B line 8, 2021-2024 columns and total",
      ],
    }],
  });
  const summary = result.outputs.find((row) => row.nodeType === "form_1116")
    ?.fields.category_summaries as Array<{
      allowedCredit: number;
      priorYearCarryover: number;
      usedPriorYearCarryover: number;
    }>;
  assertEquals(summary[0].priorYearCarryover, 1_000);
  assertEquals(summary[0].usedPriorYearCarryover, 300);
  assertEquals(summary[0].allowedCredit, 500);
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_credit,
    500,
  );
});

Deno.test("form1116: 2024 carryover rejects mixed categories and 2025 excess", () => {
  const prior = {
    income_category: IncomeCategory.Passive,
    vintages: [{
      vintage_tax_year: 2024 as const,
      prior_year_schedule_b_line8_vintage_amount: 600,
    }],
    prior_year_schedule_b_line8_total: 600,
    prior_year_schedule_b_line8_other_vintages_total: 0 as const,
    no_intervening_adjustments: true as const,
    source_document_references: [
      "Filed 2024 Schedule B (Form 1116), passive basket, line 8",
    ],
  };
  const base = {
    foreign_tax_items: [{
      foreign_tax_paid: 200,
      foreign_gross_income: 10_000,
      income_category: IncomeCategory.Passive,
    }],
    worldwide_taxable_income: 50_000,
    us_tax_before_credits: 2_500,
  };
  assertThrows(
    () =>
      form1116.compute(ctx, {
        ...base,
        prior_year_carryovers: [{
          ...prior,
          income_category: IncomeCategory.General,
        }],
      }),
    Error,
    "one matching passive or general",
  );
  assertThrows(
    () =>
      form1116.compute(ctx, {
        ...base,
        foreign_tax_items: [{
          ...base.foreign_tax_items[0],
          foreign_tax_paid: 600,
        }],
        prior_year_carryovers: [prior],
      }),
    Error,
    "needs one sourced prior-year carryback and carryover review",
  );
});

Deno.test("form1116: Part IV caps combined category credits at U.S. tax", () => {
  assertEquals(
    credit({
      foreign_tax_items: [
        {
          foreign_tax_paid: 1_000,
          foreign_gross_income: 10_000,
          income_category: IncomeCategory.Passive,
        },
        {
          foreign_tax_paid: 1_000,
          foreign_gross_income: 10_000,
          income_category: IncomeCategory.General,
        },
      ],
      worldwide_taxable_income: 10_000,
      us_tax_before_credits: 1_000,
    }),
    1_000,
  );
});

Deno.test("form1116: unsupported separate categories cannot send a credit to Schedule 3", () => {
  for (
    const category of [
      IncomeCategory.Section951A,
      IncomeCategory.Branch,
      IncomeCategory.Treaty,
      IncomeCategory.Section901j,
    ]
  ) {
    assertThrows(
      () =>
        form1116.compute(ctx, {
          foreign_tax_items: [{
            foreign_tax_paid: 500,
            foreign_gross_income: 10_000,
            income_category: category,
          }],
          worldwide_taxable_income: 100_000,
          us_tax_before_credits: 10_000,
        }),
      Error,
      "needs category-specific source facts and calculation",
    );
  }
});

Deno.test("form1116: unsupported category cannot ride alongside a supported basket", () => {
  assertThrows(
    () =>
      form1116.compute(ctx, {
        foreign_tax_items: [
          {
            foreign_tax_paid: 100,
            foreign_gross_income: 1_000,
            income_category: IncomeCategory.Passive,
          },
          {
            foreign_tax_paid: 100,
            foreign_gross_income: 1_000,
            income_category: IncomeCategory.Branch,
          },
        ],
        worldwide_taxable_income: 10_000,
        us_tax_before_credits: 1_000,
      }),
    Error,
    "needs category-specific source facts and calculation",
  );
});
