import { assertEquals, assertThrows } from "@std/assert";
import {
  assertRefinancePointsSource,
  inputSchema,
  mortgage_refinance_points,
  refinancePointsDeduction,
} from "./index.ts";

const refinance = {
  mortgage_id: "loan-1",
  recipient_tin: "111223333",
  lender_name: "Refinance Lender",
  form1098_source_document_reference: "2025 payer copy",
  closing_disclosure_reference: "2025 closing disclosure",
  pub936_workpaper_reference: "2025 Pub. 936 workpaper",
  refinance_close_year: 2025 as const,
  refinance_close_month: 6,
  prior_qualified_home_debt: 100_000,
  refinanced_principal: 100_000,
  loan_term_months: 180,
  total_points_charged: 3_000,
  points_for_nondeductible_services: 1_000,
  monthly_payment_records: [7, 8, 9, 10, 11, 12].map((month) => ({
    month,
    document_reference: `payment-${month}`,
  })),
  qualified_home_secured_verified: true as const,
  points_not_reported_in_box6_verified: true as const,
  points_paid_directly_verified: true as const,
  acquisition_debt_limit_verified: true as const,
};
const source = { refinances: [refinance] };
const form1098 = {
  f1098s: [{
    lender_name: refinance.lender_name,
    recipient_tin: refinance.recipient_tin,
    source_document_reference: refinance.form1098_source_document_reference,
    box1_mortgage_interest: 0,
  }],
};

Deno.test("ordinary refinance points amortize once and reconcile to line 8c", () => {
  assertEquals(refinancePointsDeduction(source), 67);
  const result = mortgage_refinance_points.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(source),
  );
  assertEquals(result.outputs[0].fields.line_8c_points_no_1098, 67);
  assertRefinancePointsSource(source, form1098, ["111-22-3333"], 67);
});

Deno.test("ordinary refinance points paid off in 2025 deduct remaining balance on line 8c", () => {
  const paidOff = {
    ...refinance,
    monthly_payment_records: [7, 8, 9].map((month) => ({
      month,
      document_reference: `payment-${month}`,
    })),
    early_payoff_2025: {
      payoff_month_2025: 9,
      payoff_statement_reference: "2025 full-payoff statement",
      full_payoff_verified: true as const,
      refinanced_with_same_lender: false as const,
    },
  };
  const paidOffSource = { refinances: [paidOff] };
  assertEquals(refinancePointsDeduction(paidOffSource), 2_000);
  const result = mortgage_refinance_points.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(paidOffSource),
  );
  assertEquals(result.outputs[0].fields.line_8c_points_no_1098, 2_000);
  assertRefinancePointsSource(
    paidOffSource,
    form1098,
    ["111-22-3333"],
    2_000,
  );
  assertEquals(
    inputSchema.safeParse({
      refinances: [{
        ...paidOff,
        early_payoff_2025: {
          ...paidOff.early_payoff_2025,
          refinanced_with_same_lender: true,
        },
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      refinances: [{
        ...paidOff,
        monthly_payment_records: refinance.monthly_payment_records,
      }],
    }).success,
    false,
  );
});

Deno.test("mixed prior-debt and main-home-improvement refinance points allocate immediate and ratable portions", () => {
  const improved = {
    ...refinance,
    prior_qualified_home_debt: 75_000,
    improvement: {
      amount_used_to_substantially_improve_main_home: 25_000,
      improvement_expense_records_reference:
        "2025 main-home improvement invoices",
      main_home_and_substantial_improvement_verified: true as const,
      pub936_immediate_points_tests_1_through_6_verified: true as const,
      points_paid_with_own_funds_verified: true as const,
    },
  };
  const improvedSource = { refinances: [improved] };
  // $500 immediately plus $50 from six months of the remaining $1,500.
  assertEquals(refinancePointsDeduction(improvedSource), 550);
  assertRefinancePointsSource(
    improvedSource,
    form1098,
    ["111223333"],
    550,
  );
  assertEquals(
    inputSchema.safeParse({
      refinances: [{ ...improved, prior_qualified_home_debt: 70_000 }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      refinances: [{
        ...improved,
        improvement: {
          ...improved.improvement,
          points_paid_with_own_funds_verified: false,
        },
      }],
    }).success,
    false,
  );
});

Deno.test("2024-origin refinance points use a filed-year ledger for 2025 amortization", () => {
  const priorLoan = {
    ...refinance,
    refinance_close_year: 2024 as const,
    refinance_close_month: 6,
    monthly_payment_records: Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      document_reference: `2025-payment-${index + 1}`,
    })),
    prior_year_2024: {
      filed_2024_return_reference: "Filed 2024 Form 1040/Schedule A",
      filed_2024_points_workpaper_reference: "2024 loan points ledger",
      filed_2024_loan_points_deduction: 67,
      payment_records_2024: [7, 8, 9, 10, 11, 12].map((month) => ({
        month,
        document_reference: `2024-payment-${month}`,
      })),
    },
  };
  const priorSource = { refinances: [priorLoan] };
  assertEquals(refinancePointsDeduction(priorSource), 133);
  assertRefinancePointsSource(priorSource, form1098, ["111223333"], 133);
  assertEquals(
    inputSchema.safeParse({
      refinances: [{
        ...priorLoan,
        prior_year_2024: {
          ...priorLoan.prior_year_2024,
          filed_2024_loan_points_deduction: 0,
        },
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      refinances: [{
        ...priorLoan,
        prior_year_2024: undefined,
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      refinances: [{
        ...priorLoan,
        monthly_payment_records: priorLoan.monthly_payment_records.slice(1),
      }],
    }).success,
    false,
  );
});

Deno.test("refinance points reject mismatched payer, owner, and filed amount", () => {
  assertThrows(
    () => assertRefinancePointsSource(source, undefined, ["111223333"], 67),
    Error,
    "linked payer-issued Form 1098",
  );
  assertThrows(
    () => assertRefinancePointsSource(source, form1098, ["999887777"], 67),
    Error,
    "recipient must match",
  );
  assertThrows(
    () => assertRefinancePointsSource(source, form1098, ["111223333"], 68),
    Error,
    "line 8c must equal",
  );
  assertThrows(
    () =>
      assertRefinancePointsSource(
        source,
        {
          f1098s: [{
            ...form1098.f1098s[0],
            box6_points_paid: 100,
            box6_current_year_deductible_points: 0,
            box6_deduction_workpaper_reference: "2025 points workpaper",
          }],
        },
        ["111223333"],
        67,
      ),
    Error,
    "no box 6 points",
  );
});

Deno.test("refinance points reject cash-out, service fees, and payment gaps", () => {
  for (
    const change of [
      { refinanced_principal: 101_000 },
      { points_for_nondeductible_services: 3_000 },
      {
        monthly_payment_records: refinance.monthly_payment_records.filter((
          record,
        ) => record.month !== 9),
      },
      {
        monthly_payment_records: refinance.monthly_payment_records.map((
          record,
        ) => ({
          ...record,
          document_reference: "same payment",
        })),
      },
    ]
  ) {
    assertEquals(
      inputSchema.safeParse({
        refinances: [{ ...refinance, ...change }],
      }).success,
      false,
    );
  }
});
