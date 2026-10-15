import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../nodes/types.ts";
import {
  calculateMortgageSources2026,
  mortgageClaim2026Schema,
  mortgageInsuranceDeduction2026,
} from "./mortgage-source.ts";
import {
  syntheticMortgage2026,
  syntheticPurchasePoints2026,
} from "./mortgage.fixture.ts";
import { calculateScheduleA2026 } from "../schedule-a.ts";
import { syntheticScheduleA2026 } from "../schedule-a.fixture.ts";
import { mortgage_interest_2026 } from "./mortgage-interest.ts";
Deno.test("2026 mortgage sources reconcile payments and flow insurance through Schedule A", () => {
  const source = syntheticMortgage2026();
  const r = calculateMortgageSources2026(source);
  assertEquals([
    r.table1.line11,
    r.table1.ratio,
    r.lines.line8a,
    r.insuranceBeforeIncomeLimit,
  ], [490_000, 1, 24_000, 1200]);
  const schedule = syntheticScheduleA2026();
  schedule.source_scope_review = {
    ...schedule.source_scope_review,
    no_mortgage_or_investment_interest: undefined,
    has_mortgage_interest_sources: true,
    no_investment_interest: true,
  };
  const a = calculateScheduleA2026({
    ...schedule,
    mortgage_source_2026: source,
  });
  assertEquals([
    a.lines.line8a,
    a.lines.line8d,
    a.lines.line10,
    a.beforeOverallLimit,
  ], [24_000, 1200, 25_200, 25_200]);
  assertThrows(
    () =>
      calculateScheduleA2026({
        ...syntheticScheduleA2026(),
        mortgage_source_2026: source,
      }),
    Error,
    "inventory review",
  );
});
Deno.test("2026 whole-return mortgage cap covers old and new debt without doubling allowances", () => {
  const raw = syntheticMortgage2026();
  raw.loans[0].original_principal = 1_200_000;
  raw.loans[0].monthly_balances.forEach((r) => r.closing_balance = 1_200_000);
  const r = calculateMortgageSources2026(raw);
  assertEquals([r.table1.line11, r.table1.ratio, r.lines.line8a], [
    750_000,
    .625,
    15_000,
  ]);
  raw.filing_status = FilingStatus.MFS;
  raw.mfs_payment_review = {
    record_reference: "separate-funds",
    qualified_home_selection_review_reference: "spouse-home-election",
    noncommunity_property: true,
    expenses_paid_solely_by_filer: true,
  };
  assertEquals(calculateMortgageSources2026(raw).table1.ratio, .313);
  const old = structuredClone(raw.loans[0]);
  old.loan_id = "older-loan";
  old.account_number = "older-account";
  old.origination_date = "2010-01-01";
  old.maturity_date = "2040-01-01";
  old.monthly_balances.forEach((r) => r.closing_balance = 400_000);
  old.interest_statements[0].source_document_reference = "1098-older";
  old.interest_statements[0].account_number = "older-account";
  old.interest_statements[0].form1098!.box3_origination_date = "2010-01-01";
  old.interest_statements[0].form1098!.box5_mortgage_insurance = 0;
  old.interest_statements[0].payments.forEach((p) =>
    p.payment_id = `older-${p.payment_id}`
  );
  old.mortgage_insurance = [];
  raw.loans.push(old);
  assertEquals(calculateMortgageSources2026(raw).table1.line11, 400_000);
});
Deno.test("2026 purchase points use current monthly balances, source route and seller basis", () => {
  const raw = syntheticPurchasePoints2026();
  const r = calculateMortgageSources2026(raw);
  assertEquals([
    r.loans[0].average,
    r.lines.line8a,
    r.lines.line8c,
    r.sellerPaidPointsBasisReduction,
  ], [490_000, 22_000, 0, 1000]);
  raw.loans[0].points![0].reported_on_form1098 = false;
  raw.loans[0].points![0].current_form1098_reference = undefined;
  raw.loans[0].interest_statements[0].form1098!.box6_points = 0;
  assertEquals(calculateMortgageSources2026(raw).lines, {
    line8a: 12_000,
    line8b: 0,
    line8c: 10_000,
  });
  raw.loans[0].points![0].immediate_review!
    .funds_provided_without_lender_or_broker_borrowing = 4000;
  // $5,000 immediate plus 6/360 of the remaining $5,000.
  assertEquals(calculateMortgageSources2026(raw).lines.line8c, 5083);
});
Deno.test("2026 loan points retain fractional allocation through the debt-limit ratio", () => {
  const raw = syntheticPurchasePoints2026();
  const loan = raw.loans[0];
  loan.original_principal = 1_000_000;
  loan.monthly_balances.forEach((r) => {
    if (r.month >= 7) r.closing_balance = 1_000_000;
  });
  const p = loan.points![0];
  p.treatment = "ratable";
  p.immediate_review = undefined;
  p.total_points = 10_010;
  p.seller_paid_points = 0;
  loan.interest_statements[0].form1098!.box6_points = 10_010;
  // 10,010 * 6/360 * .75 = 125.125, not round(166.833)*.75.
  const r = calculateMortgageSources2026(raw);
  assertEquals([r.table1.ratio, r.lines.line8a], [.75, 9125]);
});
Deno.test("2026 prior points reconcile remaining allocation without accepting a deduction total", () => {
  const raw = syntheticMortgage2026();
  raw.loans[0].points = [{
    points_id: "old-points",
    points_paid_separately_not_financed: true,
    source_document_reference: "2020-settlement",
    payer_ssn: "111223333",
    paid_on: "2020-01-01",
    total_points: 3000,
    service_charges: 0,
    seller_paid_points: 0,
    reported_on_form1098: false,
    treatment: "ratable",
    loan_term_months: 360,
    comparable_local_loan_terms_reference: "2020-terms",
    payment_months_2026: Array.from(
      { length: 12 },
      (_, i) => ({ month: i + 1, payment_record: `points-${i}` }),
    ),
    prior_allocation: {
      filed_return_and_points_workpaper_reference: "2020-2025-points",
      allocated_before_2026: 600,
      remaining_unallocated_at_start_2026: 2400,
    },
  }];
  assertEquals(calculateMortgageSources2026(raw).lines.line8c, 100);
  raw.loans[0].points[0].prior_allocation!.remaining_unallocated_at_start_2026 =
    3000;
  assertThrows(
    () => calculateMortgageSources2026(raw),
    Error,
    "allocation does not reconcile",
  );
});
Deno.test("2026 insurance allocation follows 84-month and VA/RHS rules before income phaseout", () => {
  const raw = syntheticPurchasePoints2026();
  raw.loans[0].mortgage_insurance = [{
    premium_id: "upfront",
    source_document_reference: "insurance-bill",
    payer_ssn: "111223333",
    paid_on: "2026-07-01",
    contract_issued_on: "2026-07-01",
    provider: "FHA",
    qualified_insurance_record: "insurance-contract",
    amount_paid: 8400,
    refunded_amount: 0,
    current_form1098_reference: "1098-home",
    allocation: {
      method: "prepaid",
      coverage_starts_on: "2026-07-01",
      mortgage_term_months: 360,
      allocation_record_reference: "premium-allocation",
      not_previously_deducted_for_2026: true,
    },
  }];
  raw.loans[0].interest_statements[0].form1098!.box5_mortgage_insurance = 8400;
  assertEquals(
    calculateMortgageSources2026(raw).insuranceBeforeIncomeLimit,
    600,
  );
  raw.loans[0].mortgage_insurance[0].provider = "VA";
  assertEquals(
    calculateMortgageSources2026(raw).insuranceBeforeIncomeLimit,
    8400,
  );
  for (
    const [status, agi, expected] of [
      [FilingStatus.Single, 100_000, 1200],
      [FilingStatus.Single, 100_001, 1080],
      [FilingStatus.Single, 109_000, 120],
      [FilingStatus.Single, 109_001, 0],
      [FilingStatus.MFS, 50_001, 1080],
      [FilingStatus.MFS, 54_501, 0],
    ] as const
  ) {
    assertEquals(mortgageInsuranceDeduction2026(1200, agi, status), expected);
  }
});
Deno.test("2026 mortgage source review rejects mismatched statements, duplicates and unmodeled recoveries", () => {
  for (
    const change of [
      (r: ReturnType<typeof syntheticMortgage2026>) => {
        r.loans[0].interest_statements[0].interest_received++;
      },
      (r: ReturnType<typeof syntheticMortgage2026>) => {
        r.loans.push(structuredClone(r.loans[0]));
      },
      (r: ReturnType<typeof syntheticMortgage2026>) => {
        r.loans[0].monthly_balances[1].month = 1;
      },
      (r: ReturnType<typeof syntheticMortgage2026>) => {
        r.loans[0].interest_statements[0].borrower_ssn = "999887777";
      },
      (r: ReturnType<typeof syntheticMortgage2026>) => {
        r.loans[0].interest_statements[0].form1098!.box5_mortgage_insurance++;
      },
      (r: ReturnType<typeof syntheticMortgage2026>) => {
        r.loans[0].monthly_balances[11].closing_balance = 0;
      },
    ]
  ) {
    const raw = syntheticMortgage2026();
    change(raw);
    assertThrows(() => calculateMortgageSources2026(raw));
  }
  const raw = syntheticMortgage2026();
  assertEquals(
    mortgageClaim2026Schema.safeParse({ ...raw, tax_year: 2025 }).success,
    false,
  );
  assertThrows(() =>
    calculateMortgageSources2026({
      ...raw,
      loans: [{
        ...raw.loans[0],
        interest_statements: [{
          ...raw.loans[0].interest_statements[0],
          form1098: {
            ...raw.loans[0].interest_statements[0].form1098!,
            box4_prior_year_refund: 500,
          },
        }],
      }],
    } as never)
  );
});
Deno.test("2026 refinancing preserves original debt category only with principal and term evidence", () => {
  const raw = syntheticMortgage2026();
  const loan = raw.loans[0];
  loan.purpose = "refinance";
  loan.refinance = {
    original_acquisition_date: "2010-01-01",
    original_acquisition_record: "original-closing",
    predecessor_payoff_reference: "old-payoff",
    predecessor_principal_at_refinance: 500_000,
    original_maturity_date: "2050-01-01",
    no_cashout_or_term_extension: true,
  };
  assertEquals(calculateMortgageSources2026(raw).loans[0].category, "pre2017");
  loan.refinance.predecessor_principal_at_refinance = 400_000;
  assertThrows(
    () => calculateMortgageSources2026(raw),
    Error,
    "Refinance must reconcile",
  );
});
Deno.test("2026 mortgage source node requires correct year and keeps owner-derived inputs private", () => {
  const raw = syntheticMortgage2026();
  assertEquals(mortgageClaim2026Schema.safeParse(raw).success, false);
  const ctx = { formType: "f1040", taxYear: 2026 };
  assertEquals(
    mortgage_interest_2026.compute(ctx, {
      filing_status: FilingStatus.Single,
      taxpayer_ssn: "111223333",
    }),
    { outputs: [] },
  );
  assertThrows(
    () => mortgage_interest_2026.compute({ ...ctx, taxYear: 2025 }, raw),
    Error,
    "2026",
  );
  assertEquals(
    mortgage_interest_2026.compute(ctx, raw).outputs[1].nodeType,
    "schedule_a",
  );
});

Deno.test("2026 insurance phaseout rounds worksheet reduction before subtraction", () => {
  assertEquals(
    mortgageInsuranceDeduction2026(1205, 100001, FilingStatus.Single),
    1084,
  );
});

Deno.test("2026 seller-financed payments and January prepaid interest retain the correct line", () => {
  const raw = syntheticMortgage2026();
  const loan = raw.loans[0];
  loan.mortgage_insurance = [];
  const statement = loan.interest_statements[0];
  statement.kind = "lender_payment_statement";
  statement.form1098 = undefined;
  statement.seller_financed = true;
  statement.seller_address = "200 Example Avenue";
  statement.interest_allocable_to_2027 = 500;
  const r = calculateMortgageSources2026(raw);
  assertEquals(r.lines, { line8a: 0, line8b: 23500, line8c: 0 });
  statement.seller_address = undefined;
  assertThrows(
    () => calculateMortgageSources2026(raw),
    Error,
    "Seller-financed",
  );
});
Deno.test("2026 grandfathered and binding-contract debt preserve their documented classifications", () => {
  const raw = syntheticMortgage2026();
  const loan = raw.loans[0];
  loan.origination_date = "1987-10-13";
  loan.maturity_date = "2027-10-13";
  loan.interest_statements[0].form1098!.box3_origination_date =
    loan.origination_date;
  assertThrows(() => calculateMortgageSources2026(raw), Error, "continuous");
  loan.grandfathered_continuous_security_record = "recorded-lien-history";
  loan.original_principal = 1500000;
  loan.monthly_balances.forEach((r) => r.closing_balance = 1200000);
  assertEquals(calculateMortgageSources2026(raw).table1.line11, 1200000);
  loan.origination_date = "2018-03-01";
  loan.maturity_date = "2048-03-01";
  loan.interest_statements[0].form1098!.box3_origination_date =
    loan.origination_date;
  loan.grandfathered_continuous_security_record = undefined;
  loan.binding_contract_exception = {
    binding_contract_date: "2017-12-14",
    required_closing_date: "2017-12-31",
    purchase_date: "2018-03-01",
    contract_and_closing_reference: "binding-contract-closing",
  };
  assertEquals(calculateMortgageSources2026(raw).table1.line11, 1000000);
  loan.binding_contract_exception.binding_contract_date = "2017-12-15";
  assertThrows(
    () => calculateMortgageSources2026(raw),
    Error,
    "binding-contract",
  );
});

Deno.test("2026 newly refinanced loans require the predecessor payoff source path", () => {
  const raw = syntheticPurchasePoints2026();
  const loan = raw.loans[0];
  loan.purpose = "refinance";
  assertThrows(
    () => calculateMortgageSources2026(raw),
    Error,
    "predecessor payoff",
  );
});
