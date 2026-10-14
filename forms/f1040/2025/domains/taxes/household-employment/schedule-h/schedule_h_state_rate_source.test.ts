import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import {
  computeScheduleHAmounts,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/taxes/household-employment/schedule_h/index.ts";
import { scheduleH } from "../../../../mef/forms/taxes/household-employment/schedule_h.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const optionalEnv = (name: string): string | undefined => {
  try {
    return Deno.env.get(name);
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return undefined;
    throw error;
  }
};
const xsd = optionalEnv("SCHEDULE_H_STATE_RATE_XSD_PATH") ?? new URL(
  "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

function source(late = false) {
  return {
    employer_ein: "123456789",
    cash_wages_over_2025_limit: true,
    cash_wages_over_quarter_limit: true,
    ss_wages: 8_000,
    medicare_wages: 8_000,
    federal_income_tax_withheld: 0,
    federal_unemployment: {
      paid_only_one_state: false,
      all_contributions_paid_on_time: !late,
      all_futa_wages_state_taxable: true,
      taxable_futa_wages: 7_000,
      all_household_employees_included: true,
      prior_year_quarter_threshold_met: false,
      ...(late ? { late_contributions: 200 } : {}),
      employee_wages: [{
        employee_id: "household-adult",
        payroll_source_reference: "2025-complete-adult-payroll",
        relationship: "unrelated",
        age_18_or_older_for_fica: true,
        ordinary_cash_only: true,
        annual_cash_wages: 8_000,
        quarterly_cash_wages: [2_000, 2_000, 2_000, 2_000],
        w2: {
          source_reference: "2025-issued-adult-w2",
          box2_federal_income_tax_withheld: 0,
          box3_social_security_wages: 8_000,
          box5_medicare_wages: 8_000,
        },
      }],
      state_rows: [
        {
          state: "CA",
          taxable_state_wages: 2_000,
          experience_rate: .03,
          rate_period_from: "2025-01-01",
          rate_period_to: "2025-03-31",
          contributions_paid_by_due_date: 60,
        },
        {
          state: "CA",
          taxable_state_wages: 4_000,
          experience_rate: .05,
          rate_period_from: "2025-04-01",
          rate_period_to: "2025-12-31",
          contributions_paid_by_due_date: late ? 0 : 200,
        },
        {
          state: "TX",
          taxable_state_wages: 2_000,
          experience_rate: .027,
          rate_period_from: "2025-01-01",
          rate_period_to: "2025-12-31",
          contributions_paid_by_due_date: 54,
        },
      ],
      credit_reduction_wages: [{ state: "CA", taxable_futa_wages: 6_000 }],
      state_payroll_review: {
        all_household_cash_payments_included: true,
        rate_notices: [
          {
            state: "CA",
            period_from: "2025-01-01",
            period_to: "2025-03-31",
            experience_rate: .03,
            annual_taxable_wage_base: 7_000,
            source_reference: "CA-rate-notice-Q1",
          },
          {
            state: "CA",
            period_from: "2025-04-01",
            period_to: "2025-12-31",
            experience_rate: .05,
            annual_taxable_wage_base: 7_000,
            source_reference: "CA-rate-notice-Q2-Q4",
          },
          {
            state: "TX",
            period_from: "2025-01-01",
            period_to: "2025-12-31",
            experience_rate: .027,
            annual_taxable_wage_base: 9_000,
            source_reference: "TX-rate-notice-2025",
          },
        ],
        wage_payments: [
          {
            employee_id: "household-adult",
            paid_date: "2025-03-31",
            state: "CA",
            cash_wages: 2_000,
            payment_reference: "adult-CA-Q1-pay",
          },
          {
            employee_id: "household-adult",
            paid_date: "2025-06-30",
            state: "CA",
            cash_wages: 2_000,
            payment_reference: "adult-CA-Q2-pay",
          },
          {
            employee_id: "household-adult",
            paid_date: "2025-09-30",
            state: "CA",
            cash_wages: 2_000,
            payment_reference: "adult-CA-Q3-pay",
          },
          {
            employee_id: "household-adult",
            paid_date: "2025-12-31",
            state: "TX",
            cash_wages: 2_000,
            payment_reference: "adult-TX-Q4-pay",
          },
        ],
        contribution_payments: [
          {
            rate_notice_source_reference: "CA-rate-notice-Q1",
            paid_date: "2025-04-15",
            amount: 60,
            payment_reference: "CA-Q1-SUTA-receipt",
          },
          {
            rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
            paid_date: late ? "2026-04-16" : "2026-01-15",
            amount: 200,
            payment_reference: "CA-Q2-Q4-SUTA-receipt",
          },
          {
            rate_notice_source_reference: "TX-rate-notice-2025",
            paid_date: "2026-01-15",
            amount: 54,
            payment_reference: "TX-Q4-SUTA-receipt",
          },
        ],
      },
    },
  };
}

function changeSourceQuarterWages(raw: any, first: number, fourth: number) {
  const unemployment = raw.federal_unemployment;
  const annual = first + 4_000 + fourth;
  unemployment.employee_wages[0].annual_cash_wages = annual;
  unemployment.employee_wages[0].quarterly_cash_wages = [
    first,
    2_000,
    2_000,
    fourth,
  ];
  unemployment.employee_wages[0].w2.box3_social_security_wages = annual;
  unemployment.employee_wages[0].w2.box5_medicare_wages = annual;
  raw.ss_wages = annual;
  raw.medicare_wages = annual;
  unemployment.state_payroll_review.wage_payments[0].cash_wages = first;
  unemployment.state_payroll_review.wage_payments[3].cash_wages = fourth;
  unemployment.state_rows[0].taxable_state_wages = first;
  unemployment.state_rows[2].taxable_state_wages = fourth;
  unemployment.credit_reduction_wages[0].taxable_futa_wages = first + 4_000;
}

function mixedFamilyStateSource(stateCoveredChild: boolean) {
  const raw: any = source(false);
  raw.family_employer_ssn = "111223333";
  raw.federal_income_tax_withheld = 250;
  const unemployment = raw.federal_unemployment;
  const child = {
    employee_id: "child-employee-1",
    employee_ssn: "400001041",
    relationship: "child",
    relationship_source_reference: "family-relationship-record",
    birth_date: stateCoveredChild ? "2005-01-01" : "2008-06-15",
    birth_date_source_reference: stateCoveredChild
      ? "age20-reviewed-birth-record"
      : "age17-reviewed-birth-record",
    payroll_source_reference: "2025-child-payroll-ledger",
    ordinary_cash_only: true,
    annual_cash_wages: 5_000,
    quarterly_cash_wages: [1_250, 1_250, 1_250, 1_250],
    federal_withholding_agreement: {
      w4_source_reference: "2025-child-form-w4",
      employee_requested_and_employer_agreed: true,
    },
    w2: {
      source_reference: "2025-child-form-w2",
      employee_ssn: "400001041",
      box1_wages: 5_000,
      box2_federal_income_tax_withheld: 250,
      box3_social_security_wages: 0,
      box5_medicare_wages: 0,
    },
  };
  unemployment.employee_wages.push(child);
  const review = unemployment.state_payroll_review;
  const childPayments = ["2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31"]
    .map((date, index) => ({
      employee_id: child.employee_id,
      paid_date: date,
      state: "CA",
      cash_wages: 1_250,
      payment_reference: `child-CA-Q${index + 1}-pay`,
      ...(stateCoveredChild
        ? {
          family_state_coverage_source_reference: `CA-UI-covered-age20-Q${
            index + 1
          }`,
        }
        : { coverage_source_reference: `CA-UI-excluded-age17-Q${index + 1}` }),
    }));
  if (stateCoveredChild) {
    review.wage_payments.push(...childPayments);
    unemployment.state_rows[0].taxable_state_wages += 1_250;
    unemployment.state_rows[1].taxable_state_wages += 3_750;
    unemployment.state_rows[0].contributions_paid_by_due_date += 37.5;
    unemployment.state_rows[1].contributions_paid_by_due_date += 187.5;
    review.contribution_payments.push(
      {
        rate_notice_source_reference: "CA-rate-notice-Q1",
        paid_date: "2025-04-15",
        amount: 37.5,
        payment_reference: "child-CA-Q1-UI-receipt",
      },
      {
        rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
        paid_date: "2026-01-15",
        amount: 187.5,
        payment_reference: "child-CA-Q2-Q4-UI-receipt",
      },
    );
  } else review.excluded_state_wage_payments = childPayments;
  return raw;
}

function sectionAReviewedOhioSource() {
  const raw: any = source(false);
  const previous = raw.federal_unemployment;
  const payments = previous.state_payroll_review.wage_payments.map(
    (payment: any) => ({ ...payment, state: "OH" }),
  );
  raw.federal_unemployment = {
    paid_only_one_state: true,
    all_contributions_paid_on_time: true,
    all_futa_wages_state_taxable: true,
    state: "OH",
    contributions_paid: 240,
    taxable_wages: 7_000,
    all_household_employees_included: true,
    prior_year_quarter_threshold_met: false,
    employee_wages: previous.employee_wages,
    state_review_rows: [{
      state: "OH",
      taxable_state_wages: 8_000,
      experience_rate: .03,
      rate_period_from: "2025-01-01",
      rate_period_to: "2025-12-31",
      contributions_paid_by_due_date: 240,
    }],
    state_payroll_review: {
      all_household_cash_payments_included: true,
      rate_notices: [{
        state: "OH",
        period_from: "2025-01-01",
        period_to: "2025-12-31",
        experience_rate: .03,
        annual_taxable_wage_base: 9_000,
        source_reference: "OH-2025-household-UI-notice",
      }],
      wage_payments: payments,
      contribution_payments: [{
        rate_notice_source_reference: "OH-2025-household-UI-notice",
        paid_date: "2026-01-15",
        amount: 240,
        payment_reference: "OH-2025-household-UI-receipt",
      }],
    },
  };
  return raw;
}

const longOrdinaryPeriod = (
  from: string,
  to: string,
  id: string,
  allocation = id,
) => ({
  kind: "over_31_days",
  period_from: from,
  period_to: to,
  period_source_reference: `${id}-ordinary-payroll-schedule`,
  service_time_source_reference: `${allocation}-allocated-service-ledger`,
});
const shortBirthdayPeriod = (
  id: string,
  excludedHours: number,
  coveredHours: number,
) => ({
  kind: "within_31_days",
  period_from: "2025-06-01",
  period_to: "2025-06-30",
  period_source_reference: `${id}-ordinary-June-payroll`,
  service_time_source_reference: `${id}-June-service-hours`,
  excluded_service_hours: excludedHours,
  covered_service_hours: coveredHours,
});

Deno.test("Schedule H reviewed Ohio state receipts retain the correct Section A filing path", async () => {
  const raw = sectionAReviewedOhioSource();
  const amounts = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
  assertEquals(amounts.futaTax, 42);
  assertEquals(amounts.totalTax, 1_266);
  const { result, bundle } = await verifyAdditionalPacket(
    raw,
    "reviewed-oh-section-a",
    1_266,
    6,
  );
  assertEquals(bundle.xml.includes("<IRS1040ScheduleH"), true);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const pending = buildPending(result.pending);
  const rejected = async (edit: (row: any) => void) => {
    const altered: any = structuredClone(raw);
    edit(altered.federal_unemployment);
    assertThrows(() =>
      computeScheduleHAmounts(inputSchema.parse(altered), 2025)
    );
    assertThrows(() => scheduleH.build(altered, { filer, pending }));
    await assertRejects(() =>
      buildPdfBytes(
        { ...bundle.pending, schedule_h: altered },
        filer,
        ".pdf-cache",
      )
    );
    assertEquals(
      f1040_2025.executeReturn({
        ...structuredClone(base.inputs),
        schedule_h: altered,
      }).diagnostics.some((row) => row.nodeType === "schedule_h"),
      true,
    );
  };
  await rejected((row) => {
    row.contributions_paid = 239;
  });
  await rejected((row) => {
    row.state_review_rows[0].taxable_state_wages = 7_999;
  });
  await rejected((row) => {
    row.state_payroll_review.contribution_payments[0].amount = 239;
  });
  await rejected((row) => {
    row.state_payroll_review.rate_notices[0].state = "CA";
  });
  await rejected((row) => {
    delete row.state_payroll_review;
  });
});

function turning18MixedStateSource() {
  const raw: any = mixedFamilyStateSource(false);
  const unemployment = raw.federal_unemployment;
  const child = unemployment.employee_wages[1];
  child.birth_date = "2007-06-15";
  child.birth_date_source_reference = "reviewed-turning18-birth-record";
  const review = unemployment.state_payroll_review;
  review.excluded_state_wage_payments = [
    {
      employee_id: child.employee_id,
      paid_date: "2025-03-31",
      state: "CA",
      cash_wages: 1_250,
      payment_reference: "child-CA-Q1-pay",
      coverage_source_reference: "CA-child-before18-Q1",
      service_from: "2025-01-01",
      service_to: "2025-03-31",
      ordinary_pay_period: longOrdinaryPeriod(
        "2025-01-01",
        "2025-03-31",
        "child18-Q1",
      ),
    },
    {
      employee_id: child.employee_id,
      paid_date: "2025-06-30",
      state: "CA",
      cash_wages: 750,
      payment_reference: "child-CA-Q2-before18-pay",
      coverage_source_reference: "CA-child-before18-Q2",
      service_from: "2025-04-01",
      service_to: "2025-06-14",
      ordinary_pay_period: longOrdinaryPeriod(
        "2025-04-01",
        "2025-06-30",
        "child18-Q2",
        "child18-Q2-before",
      ),
    },
  ];
  review.wage_payments.push(
    {
      employee_id: child.employee_id,
      paid_date: "2025-06-30",
      state: "CA",
      cash_wages: 500,
      payment_reference: "child-CA-Q2-after18-pay",
      family_state_coverage_source_reference: "CA-child-after18-Q2",
      service_from: "2025-06-15",
      service_to: "2025-06-30",
      ordinary_pay_period: longOrdinaryPeriod(
        "2025-04-01",
        "2025-06-30",
        "child18-Q2",
        "child18-Q2-after",
      ),
    },
    {
      employee_id: child.employee_id,
      paid_date: "2025-09-30",
      state: "CA",
      cash_wages: 1_250,
      payment_reference: "child-CA-Q3-pay",
      family_state_coverage_source_reference: "CA-child-after18-Q3",
      service_from: "2025-07-01",
      service_to: "2025-09-30",
      ordinary_pay_period: longOrdinaryPeriod(
        "2025-07-01",
        "2025-09-30",
        "child18-Q3",
      ),
    },
    {
      employee_id: child.employee_id,
      paid_date: "2025-12-31",
      state: "CA",
      cash_wages: 1_250,
      payment_reference: "child-CA-Q4-pay",
      family_state_coverage_source_reference: "CA-child-after18-Q4",
      service_from: "2025-10-01",
      service_to: "2025-12-31",
      ordinary_pay_period: longOrdinaryPeriod(
        "2025-10-01",
        "2025-12-31",
        "child18-Q4",
      ),
    },
  );
  unemployment.state_rows[1].taxable_state_wages = 7_000;
  unemployment.state_rows[1].contributions_paid_by_due_date = 350;
  review.contribution_payments.push({
    rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
    paid_date: "2026-01-15",
    amount: 150,
    payment_reference: "child-CA-after18-UI-receipt",
  });
  return raw;
}

function turning18ShortPeriodSource() {
  const raw: any = turning18MixedStateSource();
  const unemployment = raw.federal_unemployment;
  const review = unemployment.state_payroll_review;
  review.excluded_state_wage_payments = review.excluded_state_wage_payments.filter(
    (payment: any) => payment.payment_reference !== "child-CA-Q2-before18-pay",
  );
  const june = review.wage_payments.find((payment: any) =>
    payment.payment_reference === "child-CA-Q2-after18-pay"
  );
  june.cash_wages = 1_250;
  june.service_from = "2025-06-01";
  june.ordinary_pay_period = shortBirthdayPeriod("child18", 40, 60);
  june.family_state_coverage_source_reference = "CA-child-June-majority-covered";
  unemployment.state_rows[1].taxable_state_wages = 7_750;
  unemployment.state_rows[1].contributions_paid_by_due_date = 387.5;
  review.contribution_payments.find((payment: any) =>
    payment.payment_reference === "child-CA-after18-UI-receipt"
  ).amount = 187.5;
  return raw;
}

const noOrdinaryPeriod = (from: string, to: string, id: string) => ({
  kind: "no_ordinary_period",
  period_from: from,
  period_to: to,
  period_source_reference: `${id}-irregular-payment-period`,
  service_time_source_reference: `${id}-dated-service-allocation`,
});
const noOrdinaryPractice = (id: string) => ({
  employer_pay_practice_source_reference: `${id}-employer-irregular-pay-practice`,
  complete_payment_period_ledger_source_reference:
    `${id}-complete-2025-payment-period-ledger`,
  no_ordinary_payment_period_verified: true,
});

function turning18NoOrdinarySource() {
  const raw: any = turning18MixedStateSource();
  const review = raw.federal_unemployment.state_payroll_review;
  const child = raw.federal_unemployment.employee_wages[1];
  review.child_no_ordinary_frequency_reviews = [{
    employee_id: child.employee_id,
    ...noOrdinaryPractice("child18"),
  }];
  const cash = (
    id: string, from: string, to: string, paid: string, amount: number,
    covered: boolean,
  ) => ({
    employee_id: child.employee_id,
    paid_date: paid,
    state: "CA",
    cash_wages: amount,
    payment_reference: `${id}-cash-payment`,
    ...(covered
      ? { family_state_coverage_source_reference: `${id}-CA-coverage` }
      : { coverage_source_reference: `${id}-CA-exclusion` }),
    service_from: from,
    service_to: to,
    ordinary_pay_period: noOrdinaryPeriod(from, to, id),
  });
  review.wage_payments = review.wage_payments.filter((payment: any) =>
    payment.employee_id !== child.employee_id
  );
  review.excluded_state_wage_payments = [
    cash("child18-Jan", "2025-01-01", "2025-01-23", "2025-01-23", 300, false),
    cash("child18-FebMar", "2025-01-24", "2025-03-31", "2025-03-31", 950, false),
    cash("child18-AprJun", "2025-04-01", "2025-06-14", "2025-06-30", 750, false),
  ];
  review.wage_payments.push(
    cash("child18-Jun", "2025-06-15", "2025-06-30", "2025-06-30", 500, true),
    cash("child18-JulAug", "2025-07-01", "2025-08-19", "2025-08-19", 600, true),
    cash("child18-AugSep", "2025-08-20", "2025-09-30", "2025-09-30", 650, true),
    cash("child18-OctNov", "2025-10-01", "2025-11-13", "2025-11-13", 600, true),
    cash("child18-NovDec", "2025-11-14", "2025-12-31", "2025-12-31", 650, true),
  );
  return raw;
}

function turning21NoOrdinarySource() {
  const raw: any = turning21MixedStateSource();
  const unemployment = raw.federal_unemployment;
  const child = unemployment.employee_wages[1];
  const review = child.age_21_transition_review;
  review.no_ordinary_frequency_review = noOrdinaryPractice("child21");
  const service = (
    id: string, from: string, to: string, paid: string, amount: number,
  ) => ({
    payment_reference: `${id}-service-payment`,
    service_from: from,
    service_to: to,
    paid_date: paid,
    cash_wages: amount,
    ordinary_pay_period: noOrdinaryPeriod(from, to, id),
  });
  review.wage_payments = [
    service("child21-Jan", "2025-01-01", "2025-01-23", "2025-01-23", 300),
    service("child21-FebMar", "2025-01-24", "2025-03-31", "2025-03-31", 1_200),
    service("child21-JunEarly", "2025-06-01", "2025-06-06", "2025-07-01", 600),
    service("child21-JunBefore", "2025-06-07", "2025-06-14", "2025-07-01", 900),
    service("child21-JunAfter", "2025-06-15", "2025-06-30", "2025-07-01", 1_000),
    service("child21-JulAug", "2025-07-01", "2025-08-19", "2025-08-19", 2_000),
    service("child21-AugSep", "2025-08-20", "2025-09-30", "2025-09-30", 2_000),
    service("child21-OctDec", "2025-10-01", "2025-12-31", "2025-12-31", 3_000),
  ];
  child.quarterly_cash_wages = [1_500, 0, 6_500, 3_000];
  child.w2.box3_social_security_wages = 8_000;
  child.w2.box5_medicare_wages = 8_000;
  raw.ss_wages = raw.medicare_wages = 16_000;
  unemployment.credit_reduction_wages[0].taxable_futa_wages = 10_000;
  const state = unemployment.state_payroll_review;
  state.wage_payments = state.wage_payments.filter((payment: any) =>
    payment.employee_id !== child.employee_id
  );
  for (const service of review.wage_payments) {
    state.wage_payments.push({
      employee_id: child.employee_id,
      paid_date: service.paid_date,
      state: "CA",
      cash_wages: service.cash_wages,
      payment_reference: `CA-${service.payment_reference}`,
      family_state_coverage_source_reference:
        `CA-covered-${service.payment_reference}`,
      service_payment_reference: service.payment_reference,
      service_from: service.service_from,
      service_to: service.service_to,
      ordinary_pay_period: structuredClone(service.ordinary_pay_period),
    });
  }
  return raw;
}

function turning21NoOrdinarySharedPeriodSource() {
  const raw: any = turning21NoOrdinarySource();
  const unemployment = raw.federal_unemployment;
  const child = unemployment.employee_wages[1];
  const serviceRows = child.age_21_transition_review.wage_payments.filter(
    (payment: any) => payment.service_from >= "2025-06-01" &&
      payment.service_to <= "2025-06-30",
  );
  for (const payment of serviceRows) {
    payment.ordinary_pay_period.period_from = "2025-06-01";
    payment.ordinary_pay_period.period_to = "2025-06-30";
    payment.ordinary_pay_period.period_source_reference =
      "child21-June-shared-irregular-payment-period";
    const state = unemployment.state_payroll_review.wage_payments.find(
      (row: any) => row.service_payment_reference === payment.payment_reference,
    );
    state.ordinary_pay_period = structuredClone(payment.ordinary_pay_period);
  }
  return raw;
}

function turning18OhioNoOrdinarySource() {
  const raw: any = sectionAReviewedOhioSource();
  const family: any = turning18NoOrdinarySource();
  const unemployment = raw.federal_unemployment;
  const child = family.federal_unemployment.employee_wages[1];
  raw.family_employer_ssn = "111223333";
  raw.federal_income_tax_withheld = 250;
  unemployment.employee_wages.push(child);
  unemployment.contributions_paid = 330;
  unemployment.state_review_rows[0].taxable_state_wages = 11_000;
  unemployment.state_review_rows[0].contributions_paid_by_due_date = 330;
  const review = unemployment.state_payroll_review;
  review.child_no_ordinary_frequency_reviews = structuredClone(
    family.federal_unemployment.state_payroll_review
      .child_no_ordinary_frequency_reviews,
  );
  const ohio = (payment: any) => {
    const result = structuredClone(payment);
    result.state = "OH";
    if (result.family_state_coverage_source_reference) {
      result.family_state_coverage_source_reference =
        result.family_state_coverage_source_reference.replace("CA", "OH");
    }
    if (result.coverage_source_reference) {
      result.coverage_source_reference =
        result.coverage_source_reference.replace("CA", "OH");
    }
    return result;
  };
  review.wage_payments.push(
    ...family.federal_unemployment.state_payroll_review.wage_payments.filter(
      (payment: any) => payment.employee_id === child.employee_id
    ).map(ohio),
  );
  review.excluded_state_wage_payments =
    family.federal_unemployment.state_payroll_review
      .excluded_state_wage_payments.map(ohio);
  review.contribution_payments.push({
    rate_notice_source_reference: "OH-2025-household-UI-notice",
    paid_date: "2026-01-15",
    amount: 90,
    payment_reference: "OH-child18-irregular-UI-receipt",
  });
  return raw;
}

function child20PartialStateSource() {
  const raw: any = mixedFamilyStateSource(true);
  const unemployment = raw.federal_unemployment;
  const review = unemployment.state_payroll_review;
  unemployment.all_contributions_paid_on_time = false;
  unemployment.state_rows[1].contributions_paid_by_due_date = 287.5;
  review.contribution_payments = review.contribution_payments.filter((
    payment: any,
  ) =>
    payment.payment_reference !== "CA-Q2-Q4-SUTA-receipt" &&
    payment.payment_reference !== "child-CA-Q2-Q4-UI-receipt"
  );
  review.quarterly_assessments = [
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 2,
      taxable_state_wages: 3_250,
      assessed_contribution: 162.5,
      source_reference: "CA-Q2-DE9-child20-assessment",
    },
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 3,
      taxable_state_wages: 3_250,
      assessed_contribution: 162.5,
      source_reference: "CA-Q3-DE9-child20-assessment",
    },
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 4,
      taxable_state_wages: 1_250,
      assessed_contribution: 62.5,
      source_reference: "CA-Q4-DE9-child20-assessment",
    },
  ];
  review.contribution_payments.push(
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      assessment_quarter: 2,
      paid_date: "2025-07-15",
      amount: 100,
      payment_reference: "CA-Q2-SUTA-receipt",
    },
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      assessment_quarter: 2,
      paid_date: "2025-07-15",
      amount: 62.5,
      payment_reference: "child20-CA-Q2-UI-receipt",
    },
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      assessment_quarter: 3,
      paid_date: "2025-10-15",
      amount: 62.5,
      payment_reference: "child20-CA-Q3-UI-receipt",
    },
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      assessment_quarter: 4,
      paid_date: "2026-01-15",
      amount: 62.5,
      payment_reference: "child20-CA-Q4-UI-receipt",
    },
  );
  review.unpaid_contribution_review = {
    filing_review_date: "2026-04-15",
    notice_balances: [
      {
        rate_notice_source_reference: "CA-rate-notice-Q1",
        state: "CA",
        statement_as_of_date: "2026-04-15",
        outstanding_balance: 0,
        balance_record_reference: "CA-Q1-child20-account",
      },
      {
        rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
        state: "CA",
        statement_as_of_date: "2026-04-15",
        outstanding_balance: 100,
        balance_record_reference: "CA-Q2-Q4-child20-account",
      },
      {
        rate_notice_source_reference: "TX-rate-notice-2025",
        state: "TX",
        statement_as_of_date: "2026-04-15",
        outstanding_balance: 0,
        balance_record_reference: "TX-Q4-child20-account",
      },
    ],
  };
  return raw;
}

function turning21MixedStateSource() {
  const raw: any = mixedFamilyStateSource(true);
  const unemployment = raw.federal_unemployment;
  const child = unemployment.employee_wages[1];
  child.birth_date = "2004-06-15";
  child.birth_date_source_reference = "reviewed-2004-birth-record";
  child.annual_cash_wages = child.w2.box1_wages = 11_000;
  child.quarterly_cash_wages = [1_500, 0, 2_500, 7_000];
  child.w2.box3_social_security_wages = child.w2.box5_medicare_wages = 9_500;
  child.age_21_transition_review = {
    service_payment_ledger_source_reference:
      "2025-child-dated-service-payment-ledger",
    wage_payments: [
      {
        payment_reference: "child-payment-one",
        service_from: "2025-01-01",
        service_to: "2025-03-31",
        paid_date: "2025-03-31",
        cash_wages: 1_500,
        ordinary_pay_period: longOrdinaryPeriod(
          "2025-01-01",
          "2025-03-31",
          "child21-Q1",
        ),
      },
      {
        payment_reference: "child-birthday-June-payment",
        service_from: "2025-06-01",
        service_to: "2025-06-30",
        paid_date: "2025-07-01",
        cash_wages: 2_500,
        ordinary_pay_period: shortBirthdayPeriod("child21", 40, 40),
      },
      {
        payment_reference: "child-payment-four",
        service_from: "2025-07-01",
        service_to: "2025-12-31",
        paid_date: "2025-12-31",
        cash_wages: 7_000,
        ordinary_pay_period: longOrdinaryPeriod(
          "2025-07-01",
          "2025-12-31",
          "child21-second-half",
        ),
      },
    ],
  };
  raw.ss_wages = raw.medicare_wages = 17_500;
  unemployment.taxable_futa_wages = 14_000;
  unemployment.all_futa_wages_state_taxable = false;
  unemployment.prior_year_eligible_quarter_source_reference =
    "2024-eligible-quarter-payment-ledger";
  unemployment.prior_year_eligible_quarter_cash_wages = [100, 250, 300, 0];
  unemployment.credit_reduction_wages[0].taxable_futa_wages = 11_500;
  unemployment.state_rows[0].taxable_state_wages = 3_500;
  unemployment.state_rows[0].contributions_paid_by_due_date = 105;
  unemployment.state_rows[1].taxable_state_wages = 9_500;
  unemployment.state_rows[1].contributions_paid_by_due_date = 475;
  const review = unemployment.state_payroll_review;
  review.wage_payments = review.wage_payments.filter((payment: any) =>
    payment.employee_id !== child.employee_id
  );
  for (const service of child.age_21_transition_review.wage_payments) {
    review.wage_payments.push({
      employee_id: child.employee_id,
      paid_date: service.paid_date,
      state: "CA",
      cash_wages: service.cash_wages,
      payment_reference: `CA-${service.payment_reference}`,
      family_state_coverage_source_reference:
        `CA-covered-${service.payment_reference}`,
      service_payment_reference: service.payment_reference,
      service_from: service.service_from,
      service_to: service.service_to,
      ...(service.ordinary_pay_period
        ? { ordinary_pay_period: service.ordinary_pay_period }
        : {}),
    });
  }
  review.contribution_payments = review.contribution_payments.filter((
    payment: any,
  ) => !payment.payment_reference.startsWith("child-CA-"));
  review.contribution_payments.push(
    {
      rate_notice_source_reference: "CA-rate-notice-Q1",
      paid_date: "2025-04-15",
      amount: 45,
      payment_reference: "child21-CA-Q1-UI-receipt",
    },
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      paid_date: "2026-01-15",
      amount: 275,
      payment_reference: "child21-CA-Q2-Q4-UI-receipt",
    },
  );
  return raw;
}

function turning21HighPreBirthdaySource() {
  const raw: any = turning21MixedStateSource();
  const unemployment = raw.federal_unemployment;
  const child = unemployment.employee_wages[1];
  child.birth_date_source_reference =
    "high-prebirthday-reviewed-2004-birth-record";
  child.payroll_source_reference = "high-prebirthday-complete-cash-payroll";
  child.quarterly_cash_wages = [7_000, 0, 2_000, 2_000];
  child.w2.source_reference = "high-prebirthday-child-issued-w2";
  child.w2.box3_social_security_wages = child.w2.box5_medicare_wages = 4_000;
  child.age_21_transition_review.service_payment_ledger_source_reference =
    "high-prebirthday-dated-service-payment-ledger";
  const service = child.age_21_transition_review.wage_payments;
  [7_000, 2_000, 2_000].forEach((wages, index) => {
    service[index].cash_wages = wages;
  });
  raw.ss_wages = raw.medicare_wages = 12_000;
  unemployment.taxable_futa_wages = 11_000;
  unemployment.credit_reduction_wages[0].taxable_futa_wages = 6_000;
  unemployment.state_rows[0].taxable_state_wages = 9_000;
  unemployment.state_rows[0].contributions_paid_by_due_date = 270;
  unemployment.state_rows[1].taxable_state_wages = 4_000;
  unemployment.state_rows[1].contributions_paid_by_due_date = 200;
  const review = unemployment.state_payroll_review;
  const names = [
    "CA-high-prebirthday-rate-Q1",
    "CA-high-prebirthday-rate-Q2-Q4",
  ];
  review.rate_notices[0].source_reference = names[0];
  review.rate_notices[1].source_reference = names[1];
  review.contribution_payments.forEach((payment: any) => {
    if (payment.rate_notice_source_reference === "CA-rate-notice-Q1") {
      payment.rate_notice_source_reference = names[0];
    }
    if (payment.rate_notice_source_reference === "CA-rate-notice-Q2-Q4") {
      payment.rate_notice_source_reference = names[1];
    }
    if (payment.payment_reference === "child21-CA-Q1-UI-receipt") {
      payment.amount = 210;
    }
  });
  review.contribution_payments = review.contribution_payments.filter(
    (payment: any) =>
      payment.payment_reference !== "child21-CA-Q2-Q4-UI-receipt",
  );
  review.wage_payments.filter((payment: any) =>
    payment.employee_id === child.employee_id
  )
    .forEach((payment: any, index: number) => {
      payment.cash_wages = service[index].cash_wages;
      payment.family_state_coverage_source_reference =
        `CA-high-prebirthday-covered-${index + 1}`;
    });
  return raw;
}

Deno.test("Schedule H CA mixed family coverage separates state wages and federal FUTA wages", async () => {
  for (
    const [id, covered] of [["mixed-ca-child17-state-excluded", false], [
      "mixed-ca-child20-state-covered",
      true,
    ]] as const
  ) {
    const raw = mixedFamilyStateSource(covered);
    const amounts = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
    assertEquals(amounts.totalTax, 1_588);
    assertEquals(amounts.sectionB?.allowedCredit, 306);
    assertEquals(amounts.futaTax, 114);
    assertEquals(raw.federal_unemployment.taxable_futa_wages, 7_000);
    assertEquals(
      raw.federal_unemployment.state_rows[0].taxable_state_wages,
      covered ? 3_250 : 2_000,
    );
    assertEquals(
      raw.federal_unemployment.state_rows[1].taxable_state_wages,
      covered ? 7_750 : 4_000,
    );
    await verifyAdditionalPacket(raw, id, 1_588);
  }
});

Deno.test("Schedule H CA child turning 18 or 21 joins dated service to state and federal wage bases", async () => {
  const turn18 = turning18MixedStateSource();
  await verifyAdditionalPacket(turn18, "mixed-ca-child-turns18", 1_588);
  const turn21 = turning21MixedStateSource();
  const amounts = computeScheduleHAmounts(inputSchema.parse(turn21), 2025);
  assertEquals(amounts.futaTax, 222);
  assertEquals(amounts.totalTax, 3_150);
  await verifyAdditionalPacket(turn21, "mixed-ca-child-turns21", 3_150);
  const highPre = turning21HighPreBirthdaySource();
  const highPreAmounts = computeScheduleHAmounts(
    inputSchema.parse(highPre),
    2025,
  );
  assertEquals(highPreAmounts.futaTax, 138);
  assertEquals(highPreAmounts.totalTax, 2_224);
  await verifyAdditionalPacket(
    highPre,
    "mixed-ca-child-turns21-high-prebirthday",
    2_224,
  );
});

Deno.test("Schedule H no ordinary pay period uses actual birthday-side services for federal and state wages", async () => {
  for (const [id, raw, expectedTax, expectedFuta] of [
    ["child18-no-ordinary-period", turning18NoOrdinarySource(), 1_588, 114],
    ["child21-no-ordinary-period", turning21NoOrdinarySource(), 2_902, 204],
    ["child21-shared-irregular-period", turning21NoOrdinarySharedPeriodSource(), 2_902, 204],
    ["child18-ohio-no-ordinary", turning18OhioNoOrdinarySource(), 1_516, 42],
  ] as const) {
    const amount = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
    assertEquals(amount.futaTax, expectedFuta);
    assertEquals(amount.totalTax, expectedTax);
    await verifyAdditionalPacket(
      raw, id, expectedTax, id === "child18-ohio-no-ordinary" ? 6 : 7,
    );
  }
  const rejects = async (original: any, edit: (raw: any) => void) => {
    const packet = f1040_2025.executeReturn({
      ...structuredClone(base.inputs), schedule_h: original,
    });
    assertEquals(packet.diagnostics, []);
    const pending = buildPending(packet.pending);
    const filer = extractFilerIdentity(packet.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    const altered = structuredClone(original);
    edit(altered);
    assertThrows(() => computeScheduleHAmounts(inputSchema.parse(altered), 2025));
    assertEquals(f1040_2025.executeReturn({
      ...structuredClone(base.inputs), schedule_h: altered,
    }).diagnostics.some((item) =>
      item.nodeType === "schedule_h" || item.nodeType === "start"
    ), true);
    assertThrows(() => scheduleH.build(altered, { filer, pending }));
    await assertRejects(() => buildPdfBytes(
      { ...bundle.pending, schedule_h: altered }, filer, ".pdf-cache",
    ));
  };
  const child21 = turning21NoOrdinarySource();
  await rejects(child21, (raw) => {
    delete raw.federal_unemployment.employee_wages[1]
      .age_21_transition_review.no_ordinary_frequency_review;
  });
  await rejects(turning21NoOrdinarySharedPeriodSource(), (raw) => {
    const service = raw.federal_unemployment.employee_wages[1]
      .age_21_transition_review.wage_payments[3];
    service.ordinary_pay_period.period_to = "2025-06-29";
    const state = raw.federal_unemployment.state_payroll_review.wage_payments
      .find((row: any) => row.service_payment_reference === service.payment_reference);
    state.ordinary_pay_period = structuredClone(service.ordinary_pay_period);
  });
  await rejects(child21, (raw) => {
    raw.federal_unemployment.employee_wages[1]
      .age_21_transition_review.wage_payments[2].service_from = "2025-06-14";
  });
  await rejects(child21, (raw) => {
    raw.federal_unemployment.employee_wages[1]
      .age_21_transition_review.wage_payments[2].ordinary_pay_period
      .period_to = "2025-07-14";
  });
  await rejects(child21, (raw) => {
    raw.federal_unemployment.employee_wages[1]
      .age_21_transition_review.wage_payments[2].ordinary_pay_period.kind =
        "within_31_days";
  });
  await rejects(child21, (raw) => {
    raw.federal_unemployment.state_payroll_review.wage_payments =
      raw.federal_unemployment.state_payroll_review.wage_payments.filter(
        (payment: any) =>
          payment.service_payment_reference !== "child21-JunAfter-service-payment"
      );
  });
  const child18 = turning18NoOrdinarySource();
  await rejects(child18, (raw) => {
    delete raw.federal_unemployment.state_payroll_review
      .child_no_ordinary_frequency_reviews;
  });
  await rejects(turning18OhioNoOrdinarySource(), (raw) => {
    raw.federal_unemployment.state_payroll_review.wage_payments =
      raw.federal_unemployment.state_payroll_review.wage_payments.filter(
        (payment: any) => payment.payment_reference !== "child18-Jun-cash-payment"
      );
  });
  await rejects(child18, (raw) => {
    raw.federal_unemployment.state_payroll_review
      .child_no_ordinary_frequency_reviews[0]
      .no_ordinary_payment_period_verified = false;
  });
  await rejects(child18, (raw) => {
    raw.federal_unemployment.state_payroll_review
      .child_no_ordinary_frequency_reviews[0].employee_id =
        "orphan-child-no-ordinary-review";
  });
  await rejects(child18, (raw) => {
    raw.federal_unemployment.state_payroll_review
      .child_no_ordinary_frequency_reviews.push({
        employee_id: "orphan-child-no-ordinary-review",
        employer_pay_practice_source_reference:
          "orphan-employer-irregular-pay-practice",
        complete_payment_period_ledger_source_reference:
          "orphan-complete-payment-period-ledger",
        no_ordinary_payment_period_verified: true,
      });
  });
  await rejects(child18, (raw) => {
    const row = raw.federal_unemployment.state_payroll_review
      .excluded_state_wage_payments[0];
    row.ordinary_pay_period.kind = "within_31_days";
  });
  await rejects(child18, (raw) => {
    raw.federal_unemployment.state_payroll_review.wage_payments =
      raw.federal_unemployment.state_payroll_review.wage_payments.filter(
        (payment: any) => payment.payment_reference !== "child18-Jun-cash-payment"
      );
  });
});

Deno.test("Schedule H crossing ordinary pay period uses sourced half, covered-majority and excluded-majority service time", async () => {
  for (
    const [id, coveredHours, excludedHours, expectedTax, expectedFuta] of [
      ["child21-period-exact-half", 40, 40, 3_150, 222],
      ["child21-period-covered-majority", 60, 40, 3_150, 222],
      ["child21-period-excluded-majority", 40, 60, 2_737, 192],
    ] as const
  ) {
    const raw = turning21MixedStateSource();
    const child = raw.federal_unemployment.employee_wages[1];
    const period =
      child.age_21_transition_review.wage_payments[1].ordinary_pay_period;
    period.covered_service_hours = coveredHours;
    period.excluded_service_hours = excludedHours;
    period.service_time_source_reference = `${id}-June-service-hours`;
    raw.federal_unemployment.state_payroll_review.wage_payments.find(
      (payment: any) =>
        payment.service_payment_reference === "child-birthday-June-payment",
    ).ordinary_pay_period = structuredClone(period);
    if (coveredHours < excludedHours) {
      child.w2.box3_social_security_wages = 7_000;
      child.w2.box5_medicare_wages = 7_000;
      raw.ss_wages = raw.medicare_wages = 15_000;
      raw.federal_unemployment.credit_reduction_wages[0].taxable_futa_wages =
        9_000;
    }
    const amounts = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
    assertEquals(amounts.futaTax, expectedFuta);
    assertEquals(amounts.totalTax, expectedTax);
    await verifyAdditionalPacket(raw, id, expectedTax);
  }
});

Deno.test("Schedule H California child turning 18 uses the actual June ordinary-period majority", async () => {
  const raw = turning18ShortPeriodSource();
  const amounts = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
  assertEquals(amounts.futaTax, 114);
  assertEquals(amounts.totalTax, 1_588);
  const { result, bundle } = await verifyAdditionalPacket(
    raw, "child18-June-majority-covered", 1_588,
  );
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const pending = buildPending(result.pending);
  const wrong = async (edit: (row: any) => void) => {
    const altered: any = structuredClone(raw);
    edit(altered.federal_unemployment);
    assertThrows(() => computeScheduleHAmounts(inputSchema.parse(altered), 2025));
    assertThrows(() => scheduleH.build(altered, { filer, pending }));
    await assertRejects(() => buildPdfBytes(
      { ...bundle.pending, schedule_h: altered }, filer, ".pdf-cache",
    ));
  };
  await wrong((row) => {
    row.state_payroll_review.wage_payments.find((p: any) =>
      p.payment_reference === "child-CA-Q2-after18-pay"
    ).ordinary_pay_period.covered_service_hours = 0;
  });
  await wrong((row) => {
    row.state_payroll_review.wage_payments.find((p: any) =>
      p.payment_reference === "child-CA-Q2-after18-pay"
    ).ordinary_pay_period.period_from = "2025-05-01";
  });
  await wrong((row) => {
    row.state_payroll_review.rate_notices[1].annual_taxable_wage_base = 10_000;
  });
});

Deno.test("Schedule H CA covered child age 20 changes actual credit with adult state balance still unpaid", async () => {
  const raw = child20PartialStateSource();
  const amount = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
  assertEquals(amount.sectionB?.additionalCredit, 163);
  assertEquals(amount.sectionB?.contributions, 440);
  assertEquals(amount.sectionB?.maximumCredit, 378);
  assertEquals(amount.sectionB?.allowedCredit, 306);
  assertEquals(amount.futaTax, 114);
  assertEquals(amount.totalTax, 1_588);
  await verifyAdditionalPacket(raw, "mixed-ca-child20-partial-state", 1_588);
});

Deno.test("Schedule H mixed family state coverage rejects missing or contradictory relationship and wage sources", async () => {
  const accepted = mixedFamilyStateSource(false);
  const result = f1040_2025.executeReturn({
    ...structuredClone(base.inputs),
    schedule_h: accepted,
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending),
    filer = extractFilerIdentity(result.pending.f1040)!;
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  const mutations: Array<(raw: any) => void> = [
    (raw) => {
      raw.federal_unemployment.state_payroll_review.excluded_state_wage_payments
        .pop();
    },
    (raw) => {
      raw.federal_unemployment.state_payroll_review
        .excluded_state_wage_payments[0].coverage_source_reference = "";
    },
    (raw) => {
      raw.federal_unemployment.state_payroll_review
        .excluded_state_wage_payments[0].employee_id = "household-adult";
    },
    (raw) => {
      raw.federal_unemployment.state_payroll_review
        .excluded_state_wage_payments[0].cash_wages = 1_251;
    },
    (raw) => {
      raw.federal_unemployment.state_payroll_review
        .excluded_state_wage_payments[0].payment_reference = "adult-CA-Q1-pay";
    },
    (raw) => {
      raw.federal_unemployment.employee_wages[1].birth_date = "2007-06-15";
    },
    (raw) => {
      raw.federal_unemployment.employee_wages[1].relationship = "unrelated";
    },
  ];
  for (const mutate of mutations) {
    const raw = structuredClone(accepted);
    mutate(raw);
    const publicResult = f1040_2025.executeReturn({
      ...structuredClone(base.inputs),
      schedule_h: raw,
    });
    assertEquals(
      publicResult.diagnostics.some((d: any) => d.severity === "error"),
      true,
    );
    assertThrows(() => scheduleH.build(raw, { filer, pending }));
    await assertRejects(() =>
      buildPdfBytes({ ...bundle.pending, schedule_h: raw }, filer, ".pdf-cache")
    );
  }
});

Deno.test("Schedule H CA family cash alone cannot satisfy federal FUTA quarter and dated transitions reject source conflicts", async () => {
  const below: any = mixedFamilyStateSource(false);
  const adult = below.federal_unemployment.employee_wages[0];
  adult.annual_cash_wages = 3_200;
  adult.quarterly_cash_wages = [800, 800, 800, 800];
  adult.w2.box3_social_security_wages = adult.w2.box5_medicare_wages = 3_200;
  below.ss_wages = below.medicare_wages = 3_200;
  below.cash_wages_over_quarter_limit = false;
  below.federal_unemployment.taxable_futa_wages = 3_200;
  below.federal_unemployment.state_payroll_review.wage_payments.forEach((
    payment: any,
  ) => payment.cash_wages = 800);
  below.federal_unemployment.state_rows[0].taxable_state_wages = 800;
  below.federal_unemployment.state_rows[0].contributions_paid_by_due_date = 24;
  below.federal_unemployment.state_rows[1].taxable_state_wages = 1_600;
  below.federal_unemployment.state_rows[1].contributions_paid_by_due_date = 80;
  below.federal_unemployment.state_rows[2].taxable_state_wages = 800;
  below.federal_unemployment.state_rows[2].contributions_paid_by_due_date =
    21.6;
  below.federal_unemployment.credit_reduction_wages[0].taxable_futa_wages =
    2_400;
  [24, 80, 21.6].forEach((amount, index) =>
    below.federal_unemployment.state_payroll_review.contribution_payments[index]
      .amount = amount
  );
  assertThrows(
    () => computeScheduleHAmounts(inputSchema.parse(below), 2025),
    Error,
    "Part II requires a true quarter-limit answer",
  );
  below.cash_wages_over_quarter_limit = true;
  assertThrows(
    () => computeScheduleHAmounts(inputSchema.parse(below), 2025),
    Error,
    "FUTA needs a $1,000 current- or prior-year quarter",
  );

  const mutations: Array<[any, (raw: any) => void]> = [
    [turning18MixedStateSource(), (raw) => {
      raw.federal_unemployment.state_payroll_review
        .excluded_state_wage_payments[1].service_to = "2025-06-15";
    }],
    [turning18MixedStateSource(), (raw) => {
      raw.federal_unemployment.state_payroll_review
        .excluded_state_wage_payments[1].service_from = "2025-06-15";
    }],
    [turning18MixedStateSource(), (raw) => {
      raw.federal_unemployment.state_payroll_review.wage_payments.find((
        p: any,
      ) => p.payment_reference === "child-CA-Q2-after18-pay").paid_date =
        "2025-06-14";
    }],
    [turning21HighPreBirthdaySource(), (raw) => {
      raw.federal_unemployment.state_payroll_review.wage_payments.find((
        p: any,
      ) => p.service_payment_reference === "child-birthday-June-payment")
        .family_state_coverage_source_reference = "";
    }],
    [turning21HighPreBirthdaySource(), (raw) => {
      raw.federal_unemployment.state_payroll_review.wage_payments.find((
        p: any,
      ) => p.service_payment_reference === "child-birthday-June-payment").cash_wages =
        999;
    }],
    [turning21HighPreBirthdaySource(), (raw) => {
      raw.federal_unemployment.state_payroll_review.wage_payments.find((
        p: any,
      ) => p.service_payment_reference === "child-birthday-June-payment").service_from =
        "2025-06-15";
    }],
    [turning21HighPreBirthdaySource(), (raw) => {
      raw.federal_unemployment.taxable_futa_wages = 7_000;
    }],
    [turning21HighPreBirthdaySource(), (raw) => {
      raw.federal_unemployment.credit_reduction_wages[0].taxable_futa_wages =
        10_000;
    }],
  ];
  for (const [accepted, edit] of mutations) {
    const result = f1040_2025.executeReturn({
      ...structuredClone(base.inputs),
      schedule_h: accepted,
    });
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending),
      filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    const bad = structuredClone(accepted);
    edit(bad);
    assertEquals(
      f1040_2025.executeReturn({
        ...structuredClone(base.inputs),
        schedule_h: bad,
      }).diagnostics.some((d: any) => d.severity === "error"),
      true,
    );
    assertThrows(() => scheduleH.build(bad, { filer, pending }));
    await assertRejects(() =>
      buildPdfBytes({ ...bundle.pending, schedule_h: bad }, filer, ".pdf-cache")
    );
  }
});

async function verifyAdditionalPacket(
  raw: any,
  id: string,
  expectedTax: number,
  expectedPages = 7,
) {
  const schedule = inputSchema.parse(raw);
  const inputs = { ...structuredClone(base.inputs), schedule_h: schedule };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  assertEquals(
    result.pending.schedule2.line9_household_employment,
    expectedTax,
  );
  assertEquals(result.pending.f1040.line23_other_taxes, expectedTax);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  const origins: any[] = [];
  const pdf = await buildPdfBytes(
    bundle.pending,
    filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  assertEquals(origins.length, expectedPages);
  const temp = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(temp, bundle.xml);
    const check = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, temp],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(check.code, 0, new TextDecoder().decode(check.stderr));
  } finally {
    await Deno.remove(temp);
  }
  const dir = optionalEnv("SCHEDULE_H_STATE_RATE_EVIDENCE_DIR");
  if (dir) {
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      `${dir}/${id}.json`,
      JSON.stringify(
        {
          inputs,
          pending,
          preparedPending: bundle.pending,
          carryforwards: result.carryforwards,
          filer,
          origins,
        },
        null,
        2,
      ),
    );
    await Deno.writeTextFile(`${dir}/${id}.xml`, bundle.xml);
    await Deno.writeFile(`${dir}/${id}.pdf`, pdf);
  }
  return { schedule, result, bundle };
}

Deno.test("Schedule H sources changed CA rates, TX wages and contributions into Section B full packet", async () => {
  const dir = optionalEnv("SCHEDULE_H_STATE_RATE_EVIDENCE_DIR");
  for (
    const [id, late, expected] of [
      ["changed-rate-multistate", false, {
        credit: 306,
        futa: 114,
        tax: 1_338,
        tentative: 432,
      }],
      ["changed-rate-late", true, {
        credit: 291,
        futa: 129,
        tax: 1_353,
        tentative: 232,
      }],
    ] as const
  ) {
    const schedule = inputSchema.parse(source(late));
    const amounts = computeScheduleHAmounts(schedule, 2025);
    assertEquals(amounts.socialSecurityTax, 992);
    assertEquals(amounts.medicareTax, 232);
    assertEquals(amounts.sectionB?.additionalCredit, 118);
    assertEquals(amounts.sectionB?.tentativeCredit, expected.tentative);
    assertEquals(amounts.sectionB?.allowedCredit, expected.credit);
    assertEquals(amounts.futaTax, expected.futa);
    assertEquals(amounts.totalTax, expected.tax);
    const inputs = { ...structuredClone(base.inputs), schedule_h: schedule };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.schedule2.line9_household_employment,
      expected.tax,
    );
    const pending = buildPending(result.pending),
      filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    const origins: any[] = [],
      pdf = await buildPdfBytes(
        bundle.pending,
        filer,
        ".pdf-cache",
        bundle,
        origins,
      );
    assertEquals(
      origins.filter((origin) => origin.formKey === "schedule_h").length,
      3,
    );
    const temp = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(temp, bundle.xml);
      const check = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, temp],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(check.code, 0, new TextDecoder().decode(check.stderr));
    } finally {
      await Deno.remove(temp);
    }
    const altered: any = structuredClone(schedule);
    altered.federal_unemployment.state_rows[1].taxable_state_wages = 3_999;
    assertThrows(() => scheduleH.build(altered, { filer, pending }));
    await assertRejects(() =>
      buildPdfBytes(
        { ...bundle.pending, schedule_h: altered },
        filer,
        ".pdf-cache",
      )
    );
    if (dir) {
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        `${dir}/${id}.json`,
        JSON.stringify(
          {
            inputs,
            pending,
            preparedPending: bundle.pending,
            carryforwards: result.carryforwards,
            filer,
            origins,
          },
          null,
          2,
        ),
      );
      await Deno.writeTextFile(`${dir}/${id}.xml`, bundle.xml);
      await Deno.writeFile(`${dir}/${id}.pdf`, pdf);
    }
  }
});

Deno.test("Schedule H state review rejects dated payroll, rate, contribution and credit conflicts", () => {
  const wrong = (edit: (raw: any) => void) => {
    const raw: any = source();
    edit(raw);
    assertThrows(() => computeScheduleHAmounts(inputSchema.parse(raw), 2025));
  };
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.wage_payments[0].cash_wages =
      1_999
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.wage_payments[0].employee_id =
      "missing-worker"
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.wage_payments[1].paid_date =
      "2025-02-30"
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.wage_payments[1].paid_date =
      "2025-03-31"
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.rate_notices[1].period_from =
      "2025-03-31"
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.rate_notices[1]
      .experience_rate = .04
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.rate_notices[0]
      .experience_rate = .030245
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.rate_notices[0].state = "ZZ"
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.rate_notices[2]
      .annual_taxable_wage_base = 7_000
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.rate_notices[0]
      .source_reference = "2025-issued-adult-w2"
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.contribution_payments[1]
      .amount = 199
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.contribution_payments[1]
      .paid_date = "2026-04-16"
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.contribution_payments[1]
      .paid_date = "2025-08-01"
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.contribution_payments[1]
      .payment_reference = "CA-Q1-SUTA-receipt"
  );
  wrong((s) =>
    s.federal_unemployment.credit_reduction_wages[0].taxable_futa_wages = 5_999
  );
  wrong((s) => s.federal_unemployment.all_futa_wages_state_taxable = false);
  wrong((s) => s.federal_unemployment.taxable_futa_wages = 8_000);
});

Deno.test("Schedule H state contribution cents reconcile exact receipts before filing", async () => {
  const raw: any = source();
  const unemployment = raw.federal_unemployment;
  changeSourceQuarterWages(raw, 2_003, 2_000);
  unemployment.state_rows[0].experience_rate = .0302;
  unemployment.state_rows[0].contributions_paid_by_due_date = 60.49;
  unemployment.state_payroll_review.rate_notices[0].experience_rate = .0302;
  unemployment.state_payroll_review.contribution_payments[0].amount = 60.49;
  const schedule = inputSchema.parse(raw);
  const amounts = computeScheduleHAmounts(schedule, 2025);
  assertEquals(amounts.sectionB?.contributions, 314);
  assertEquals(amounts.sectionB?.allowedCredit, 306);
  assertEquals(amounts.totalTax, 1_338);
  const inputs = { ...structuredClone(base.inputs), schedule_h: schedule };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  const origins: any[] = [];
  const pdf = await buildPdfBytes(
    bundle.pending,
    filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  assertEquals(origins.length, 7);
  const temp = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(temp, bundle.xml);
    const check = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, temp],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(check.code, 0, new TextDecoder().decode(check.stderr));
  } finally {
    await Deno.remove(temp);
  }
  const dir = optionalEnv("SCHEDULE_H_STATE_RATE_EVIDENCE_DIR");
  if (dir) {
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      `${dir}/changed-rate-cents.json`,
      JSON.stringify(
        {
          inputs,
          pending,
          preparedPending: bundle.pending,
          carryforwards: result.carryforwards,
          filer,
          origins,
        },
        null,
        2,
      ),
    );
    await Deno.writeTextFile(`${dir}/changed-rate-cents.xml`, bundle.xml);
    await Deno.writeFile(`${dir}/changed-rate-cents.pdf`, pdf);
  }
  unemployment.state_payroll_review.contribution_payments[0].amount = 30.24;
  unemployment.state_payroll_review.contribution_payments.push({
    rate_notice_source_reference: "CA-rate-notice-Q1",
    paid_date: "2025-04-15",
    amount: 30.25,
    payment_reference: "CA-Q1-second-SUTA-receipt",
  });
  assertEquals(
    computeScheduleHAmounts(inputSchema.parse(raw), 2025).totalTax,
    1_338,
  );
  unemployment.state_payroll_review.contribution_payments[1].amount = 30.24;
  assertThrows(() => computeScheduleHAmounts(inputSchema.parse(raw), 2025));
});

Deno.test("Schedule H rounds two source-cent rows before an uncapped credit", async () => {
  const raw: any = source(true);
  const unemployment = raw.federal_unemployment;
  changeSourceQuarterWages(raw, 2_003, 2_001);
  unemployment.state_rows[0].experience_rate = .0302;
  unemployment.state_rows[0].contributions_paid_by_due_date = 60.49;
  unemployment.state_payroll_review.rate_notices[0].experience_rate = .0302;
  unemployment.state_payroll_review.contribution_payments[0].amount = 60.49;
  unemployment.state_rows[2].experience_rate = .02723;
  unemployment.state_rows[2].contributions_paid_by_due_date = 54.49;
  unemployment.state_payroll_review.rate_notices[2].experience_rate = .02723;
  unemployment.state_payroll_review.contribution_payments[2].amount = 54.49;
  const schedule = inputSchema.parse(raw);
  const amounts = computeScheduleHAmounts(schedule, 2025);
  assertEquals(
    amounts.sectionB?.rows.map((row) => row.contributions_paid_by_due_date),
    [60, 0, 54],
  );
  assertEquals(amounts.sectionB?.contributions, 114);
  assertEquals(amounts.sectionB?.tentativeCredit, 232);
  assertEquals(amounts.sectionB?.allowedCredit, 291);
  assertEquals(amounts.futaTax, 129);
  assertEquals(amounts.totalTax, 1_353);
  const inputs = { ...structuredClone(base.inputs), schedule_h: schedule };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule2.line9_household_employment, 1_353);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertEquals(
    bundle.xml.includes(
      "<TotalContriStateUnemplFundAmt>114</TotalContriStateUnemplFundAmt>",
    ),
    true,
  );
  assertEquals(
    bundle.xml.includes("<TentativeFUTACreditAmt>232</TentativeFUTACreditAmt>"),
    true,
  );
  const origins: any[] = [];
  const pdf = await buildPdfBytes(
    bundle.pending,
    filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  assertEquals(origins.length, 7);
  const temp = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(temp, bundle.xml);
    const check = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, temp],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(check.code, 0, new TextDecoder().decode(check.stderr));
  } finally {
    await Deno.remove(temp);
  }
  const dir = optionalEnv("SCHEDULE_H_STATE_RATE_EVIDENCE_DIR");
  if (dir) {
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      `${dir}/changed-rate-late-cents.json`,
      JSON.stringify(
        {
          inputs,
          pending,
          preparedPending: bundle.pending,
          carryforwards: result.carryforwards,
          filer,
          origins,
        },
        null,
        2,
      ),
    );
    await Deno.writeTextFile(`${dir}/changed-rate-late-cents.xml`, bundle.xml);
    await Deno.writeFile(`${dir}/changed-rate-late-cents.pdf`, pdf);
  }
});

Deno.test("Schedule H late source cents cannot leak fractional tax to Form 1040", async () => {
  const raw: any = source(true);
  const unemployment = raw.federal_unemployment;
  unemployment.state_rows[0].contributions_paid_by_due_date = 30.49;
  unemployment.state_payroll_review.contribution_payments[0].amount = 30.49;
  unemployment.state_payroll_review.contribution_payments.push({
    rate_notice_source_reference: "CA-rate-notice-Q1",
    paid_date: "2026-04-16",
    amount: 29.51,
    payment_reference: "CA-Q1-late-balance-receipt",
  });
  unemployment.late_contributions = 229.51;
  const schedule = inputSchema.parse(raw);
  const amounts = computeScheduleHAmounts(schedule, 2025);
  assertEquals(amounts.sectionB?.contributions, 84);
  assertEquals(amounts.sectionB?.tentativeCredit, 202);
  assertEquals(amounts.sectionB?.allowedCredit, 288);
  assertEquals(amounts.futaTax, 132);
  assertEquals(amounts.totalTax, 1_356);
  const inputs = { ...structuredClone(base.inputs), schedule_h: schedule };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule2.line9_household_employment, 1_356);
  assertEquals(result.pending.f1040.line23_other_taxes, 1_356);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertEquals(
    bundle.xml.includes(
      "<TotalContriStateUnemplFundAmt>84</TotalContriStateUnemplFundAmt>",
    ),
    true,
  );
  assertEquals(bundle.xml.includes("<FUTATaxAmt>132</FUTATaxAmt>"), true);
  const origins: any[] = [];
  const pdf = await buildPdfBytes(
    bundle.pending,
    filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  assertEquals(origins.length, 7);
  const temp = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(temp, bundle.xml);
    const check = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, temp],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(check.code, 0, new TextDecoder().decode(check.stderr));
  } finally {
    await Deno.remove(temp);
  }
  const dir = optionalEnv("SCHEDULE_H_STATE_RATE_EVIDENCE_DIR");
  if (dir) {
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      `${dir}/changed-rate-split-late-cents.json`,
      JSON.stringify(
        {
          inputs,
          pending,
          preparedPending: bundle.pending,
          carryforwards: result.carryforwards,
          filer,
          origins,
        },
        null,
        2,
      ),
    );
    await Deno.writeTextFile(
      `${dir}/changed-rate-split-late-cents.xml`,
      bundle.xml,
    );
    await Deno.writeFile(`${dir}/changed-rate-split-late-cents.pdf`, pdf);
  }
});

Deno.test("Schedule H zero state experience rate needs no invented payment", async () => {
  const raw: any = source();
  const unemployment = raw.federal_unemployment;
  unemployment.state_rows[0].experience_rate = 0;
  unemployment.state_rows[0].contributions_paid_by_due_date = 0;
  unemployment.state_payroll_review.rate_notices[0].experience_rate = 0;
  unemployment.state_payroll_review.contribution_payments.shift();
  const amounts = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
  assertEquals(amounts.sectionB?.rows[0].creditAtStateRate, 0);
  assertEquals(amounts.sectionB?.rows[0].contributions_paid_by_due_date, 0);
  assertEquals(amounts.totalTax, 1_338);
  const { bundle } = await verifyAdditionalPacket(
    raw,
    "changed-rate-zero",
    1_338,
  );
  assertEquals(
    bundle.xml.includes(
      "<UnemploymentStateExperienceRt>0</UnemploymentStateExperienceRt>",
    ),
    true,
  );
});

Deno.test("Schedule H filed wage dollars drive line 17 credits after source-cent reconciliation", async () => {
  const raw: any = source();
  const unemployment = raw.federal_unemployment;
  unemployment.employee_wages[0].annual_cash_wages = 8_009.49;
  unemployment.employee_wages[0].quarterly_cash_wages[0] = 2_009.49;
  unemployment.employee_wages[0].w2.box3_social_security_wages = 8_009.49;
  unemployment.employee_wages[0].w2.box5_medicare_wages = 8_009.49;
  raw.ss_wages = 8_009.49;
  raw.medicare_wages = 8_009.49;
  unemployment.state_payroll_review.wage_payments[0].cash_wages = 2_009.49;
  unemployment.state_rows[0].taxable_state_wages = 2_009.49;
  unemployment.state_rows[0].contributions_paid_by_due_date = 60.28;
  unemployment.state_payroll_review.contribution_payments[0].amount = 60.28;
  unemployment.credit_reduction_wages[0].taxable_futa_wages = 6_009.49;
  const amounts = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
  assertEquals(amounts.sectionB?.rows[0].taxable_state_wages, 2_009);
  assertEquals(amounts.sectionB?.rows[0].creditAt54, 108);
  assertEquals(amounts.sectionB?.rows[0].creditAtStateRate, 60);
  assertEquals(amounts.totalTax, 1_339);
  const { bundle } = await verifyAdditionalPacket(
    raw,
    "changed-rate-wage-cents",
    1_339,
  );
  assertEquals(
    bundle.xml.includes(
      "<TxblWagesPaidStUnemplFundAmt>2009</TxblWagesPaidStUnemplFundAmt>",
    ),
    true,
  );
  unemployment.state_payroll_review.wage_payments[0].cash_wages = 2_009.491;
  assertThrows(() => computeScheduleHAmounts(inputSchema.parse(raw), 2025));
});

Deno.test("Schedule H legacy Section B native ratio matches its printed rate", async () => {
  const raw: any = source();
  delete raw.federal_unemployment.state_payroll_review;
  const schedule = inputSchema.parse(raw);
  const inputs = { ...structuredClone(base.inputs), schedule_h: schedule };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertEquals(
    bundle.xml.includes(
      "<UnemploymentStateExperienceRt>0.03</UnemploymentStateExperienceRt>",
    ),
    true,
  );
  assertEquals(
    bundle.xml.includes(
      "<UnemploymentStateExperienceRt>0</UnemploymentStateExperienceRt>",
    ),
    false,
  );
  const temp = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(temp, bundle.xml);
    const check = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, temp],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(check.code, 0, new TextDecoder().decode(check.stderr));
  } finally {
    await Deno.remove(temp);
  }
  raw.federal_unemployment.state_rows[0].experience_rate = .030245;
  assertThrows(() => computeScheduleHAmounts(inputSchema.parse(raw), 2025));
});

Deno.test("Schedule H accepts accrued quarterly state receipts within one rate period", async () => {
  const raw: any = source();
  const receipts = raw.federal_unemployment.state_payroll_review
    .contribution_payments;
  receipts[1] = {
    rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
    assessment_quarter: 2,
    paid_date: "2025-07-15",
    amount: 100,
    payment_reference: "CA-Q2-SUTA-receipt",
  };
  receipts.push({
    rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
    assessment_quarter: 3,
    paid_date: "2025-10-15",
    amount: 100,
    payment_reference: "CA-Q3-SUTA-receipt",
  });
  raw.federal_unemployment.state_payroll_review.quarterly_assessments = [
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 2,
      taxable_state_wages: 2_000,
      assessed_contribution: 100,
      source_reference: "CA-Q2-DE9-assessment",
    },
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 3,
      taxable_state_wages: 2_000,
      assessed_contribution: 100,
      source_reference: "CA-Q3-DE9-assessment",
    },
  ];
  const amounts = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
  assertEquals(amounts.sectionB?.rows[1].contributions_paid_by_due_date, 200);
  assertEquals(amounts.sectionB?.contributions, 314);
  assertEquals(amounts.totalTax, 1_338);
  const { schedule, result, bundle } = await verifyAdditionalPacket(
    raw,
    "changed-rate-quarterly-receipts",
    1_338,
  );
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const pending = buildPending(result.pending);
  const bad = (edit: (review: any) => void) => {
    const altered: any = structuredClone(schedule);
    edit(altered.federal_unemployment.state_payroll_review);
    assertThrows(() =>
      computeScheduleHAmounts(inputSchema.parse(altered), 2025)
    );
    assertThrows(() => scheduleH.build(altered, { filer, pending }));
    return assertRejects(() =>
      buildPdfBytes(
        { ...bundle.pending, schedule_h: altered },
        filer,
        ".pdf-cache",
      )
    );
  };
  await bad((review) =>
    review.contribution_payments[1].paid_date = "2025-05-31"
  );
  await bad((review) => {
    review.contribution_payments[1].amount = 101;
    review.contribution_payments[3].amount = 99;
  });
  await bad((review) => review.quarterly_assessments.pop());
  await bad((review) =>
    review.quarterly_assessments[0].taxable_state_wages = 1_999
  );
  await bad((review) => review.contribution_payments[3].assessment_quarter = 2);
  const publicBad = structuredClone(raw);
  publicBad.federal_unemployment.state_payroll_review
    .contribution_payments[1].paid_date = "2025-05-31";
  const resultBad = f1040_2025.executeReturn({
    ...structuredClone(base.inputs),
    schedule_h: inputSchema.parse(publicBad),
  });
  assertEquals(
    resultBad.diagnostics.some((d) => d.nodeType === "schedule_h"),
    true,
  );
});

Deno.test("Schedule H reconciles separately rounded quarter assessments on cent wages", async () => {
  const raw: any = source();
  const unemployment = raw.federal_unemployment;
  const employee = unemployment.employee_wages[0];
  employee.quarterly_cash_wages = [2_000, 2_000.11, 2_000.11, 1_999.78];
  unemployment.state_payroll_review.wage_payments[1].cash_wages = 2_000.11;
  unemployment.state_payroll_review.wage_payments[2].cash_wages = 2_000.11;
  unemployment.state_payroll_review.wage_payments[3].cash_wages = 1_999.78;
  unemployment.state_rows[1].taxable_state_wages = 4_000.22;
  unemployment.state_rows[1].contributions_paid_by_due_date = 200.02;
  unemployment.state_rows[2].taxable_state_wages = 1_999.78;
  unemployment.state_rows[2].contributions_paid_by_due_date = 53.99;
  unemployment.credit_reduction_wages[0].taxable_futa_wages = 6_000.22;
  const receipts = unemployment.state_payroll_review.contribution_payments;
  receipts[1] = {
    rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
    assessment_quarter: 2,
    paid_date: "2025-07-15",
    amount: 100.01,
    payment_reference: "CA-Q2-cent-receipt",
  };
  receipts[2].amount = 53.99;
  receipts.push({
    rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
    assessment_quarter: 3,
    paid_date: "2025-10-15",
    amount: 100.01,
    payment_reference: "CA-Q3-cent-receipt",
  });
  unemployment.state_payroll_review.quarterly_assessments = [
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 2,
      taxable_state_wages: 2_000.11,
      assessed_contribution: 100.01,
      source_reference: "CA-Q2-cent-DE9-assessment",
    },
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 3,
      taxable_state_wages: 2_000.11,
      assessed_contribution: 100.01,
      source_reference: "CA-Q3-cent-DE9-assessment",
    },
  ];
  const amounts = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
  assertEquals(amounts.sectionB?.rows[1].contributions_paid_by_due_date, 200);
  assertEquals(amounts.sectionB?.contributions, 314);
  assertEquals(amounts.totalTax, 1_338);
  await verifyAdditionalPacket(
    raw,
    "changed-rate-quarterly-cent-assessments",
    1_338,
  );
  const missing = structuredClone(raw);
  delete missing.federal_unemployment.state_payroll_review
    .quarterly_assessments;
  delete missing.federal_unemployment.state_payroll_review
    .contribution_payments[1].assessment_quarter;
  delete missing.federal_unemployment.state_payroll_review
    .contribution_payments[3].assessment_quarter;
  assertThrows(() => computeScheduleHAmounts(inputSchema.parse(missing), 2025));
  const wrong = structuredClone(raw);
  wrong.federal_unemployment.state_payroll_review.quarterly_assessments[1]
    .assessed_contribution = 100;
  assertThrows(() => computeScheduleHAmounts(inputSchema.parse(wrong), 2025));
});

Deno.test("Schedule H retains a zero-taxable quarter after the state wage base", async () => {
  const raw: any = source();
  const unemployment = raw.federal_unemployment;
  unemployment.employee_wages[0].annual_cash_wages = 9_000;
  unemployment.employee_wages[0].quarterly_cash_wages = [
    2_000,
    5_000,
    1_000,
    1_000,
  ];
  unemployment.employee_wages[0].w2.box3_social_security_wages = 9_000;
  unemployment.employee_wages[0].w2.box5_medicare_wages = 9_000;
  raw.ss_wages = 9_000;
  raw.medicare_wages = 9_000;
  const wages = unemployment.state_payroll_review.wage_payments;
  wages[1].cash_wages = 5_000;
  wages[2].cash_wages = 1_000;
  wages[3].cash_wages = 1_000;
  unemployment.state_rows[1].taxable_state_wages = 5_000;
  unemployment.state_rows[1].contributions_paid_by_due_date = 250;
  unemployment.state_rows[2].taxable_state_wages = 1_000;
  unemployment.state_rows[2].contributions_paid_by_due_date = 27;
  unemployment.credit_reduction_wages[0].taxable_futa_wages = 7_000;
  const receipts = unemployment.state_payroll_review.contribution_payments;
  receipts[1] = {
    rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
    assessment_quarter: 2,
    paid_date: "2025-07-15",
    amount: 250,
    payment_reference: "CA-Q2-base-limit-receipt",
  };
  receipts[2].amount = 27;
  unemployment.state_payroll_review.quarterly_assessments = [
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 2,
      taxable_state_wages: 5_000,
      assessed_contribution: 250,
      source_reference: "CA-Q2-base-limit-assessment",
    },
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 3,
      taxable_state_wages: 0,
      assessed_contribution: 0,
      source_reference: "CA-Q3-zero-taxable-assessment",
    },
  ];
  const amounts = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
  assertEquals(amounts.sectionB?.additionalCredit, 95);
  assertEquals(amounts.sectionB?.allowedCredit, 294);
  assertEquals(amounts.futaTax, 126);
  assertEquals(amounts.totalTax, 1_503);
  const { schedule, result, bundle } = await verifyAdditionalPacket(
    raw,
    "changed-rate-base-exhausted-quarter",
    1_503,
  );
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const pending = buildPending(result.pending);
  const badAssessment = (edit: (review: any) => void) => {
    const altered: any = structuredClone(schedule);
    edit(altered.federal_unemployment.state_payroll_review);
    assertThrows(() =>
      computeScheduleHAmounts(inputSchema.parse(altered), 2025)
    );
    assertThrows(() => scheduleH.build(altered, { filer, pending }));
    return assertRejects(() =>
      buildPdfBytes(
        { ...bundle.pending, schedule_h: altered },
        filer,
        ".pdf-cache",
      )
    );
  };
  await badAssessment((review) => review.quarterly_assessments[1].quarter = 4);
  await badAssessment((review) =>
    review.quarterly_assessments[1].taxable_state_wages = 1
  );
  await badAssessment((review) =>
    review.quarterly_assessments[1].assessed_contribution = 1
  );
  const phantom = structuredClone(raw);
  phantom.federal_unemployment.state_payroll_review.quarterly_assessments[1]
    .quarter = 4;
  const rejected = f1040_2025.executeReturn({
    ...structuredClone(base.inputs),
    schedule_h: inputSchema.parse(phantom),
  });
  assertEquals(
    rejected.diagnostics.some((d) => d.nodeType === "schedule_h"),
    true,
  );
});

function unpaidStateSource(
  kind: "partial" | "unpaid" | "partial-late" | "all-unpaid",
) {
  const raw: any = source();
  const unemployment = raw.federal_unemployment;
  const review = unemployment.state_payroll_review;
  unemployment.all_contributions_paid_on_time = false;
  unemployment.state_rows[1].contributions_paid_by_due_date =
    kind === "unpaid" || kind === "all-unpaid" ? 0 : 100;
  review.contribution_payments = review.contribution_payments.filter(
    (payment: any) =>
      payment.rate_notice_source_reference !== "CA-rate-notice-Q2-Q4",
  );
  if (kind !== "unpaid" && kind !== "all-unpaid") {
    review.contribution_payments.push({
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      assessment_quarter: 2,
      paid_date: "2025-07-15",
      amount: 100,
      payment_reference: "CA-Q2-SUTA-receipt",
    });
  }
  if (kind === "partial-late") {
    unemployment.late_contributions = 50;
    review.contribution_payments.push({
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      assessment_quarter: 3,
      paid_date: "2026-05-15",
      amount: 50,
      payment_reference: "CA-Q3-partial-late-receipt",
    });
  }
  if (kind === "all-unpaid") {
    review.contribution_payments = [];
    unemployment.state_rows[0].contributions_paid_by_due_date = 0;
    unemployment.state_rows[2].contributions_paid_by_due_date = 0;
  }
  review.quarterly_assessments = [
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 2,
      taxable_state_wages: 2_000,
      assessed_contribution: 100,
      source_reference: "CA-Q2-DE9-assessment",
    },
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 3,
      taxable_state_wages: 2_000,
      assessed_contribution: 100,
      source_reference: "CA-Q3-DE9-assessment",
    },
  ];
  const reviewDate = kind === "partial-late" ? "2026-06-01" : "2026-04-15";
  review.unpaid_contribution_review = {
    filing_review_date: reviewDate,
    notice_balances: [
      {
        rate_notice_source_reference: "CA-rate-notice-Q1",
        state: "CA",
        statement_as_of_date: reviewDate,
        outstanding_balance: kind === "all-unpaid" ? 60 : 0,
        balance_record_reference: `CA-Q1-account-${kind}`,
      },
      {
        rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
        state: "CA",
        statement_as_of_date: reviewDate,
        outstanding_balance: kind === "unpaid" || kind === "all-unpaid"
          ? 200
          : kind === "partial"
          ? 100
          : 50,
        balance_record_reference: `CA-Q2-Q3-account-${kind}`,
      },
      {
        rate_notice_source_reference: "TX-rate-notice-2025",
        state: "TX",
        statement_as_of_date: reviewDate,
        outstanding_balance: kind === "all-unpaid" ? 54 : 0,
        balance_record_reference: `TX-Q4-account-${kind}`,
      },
    ],
  };
  return raw;
}

Deno.test("Schedule H retains assessed state contributions partly or wholly unpaid at filing", async () => {
  for (
    const [kind, tax, contributions, futa] of [
      ["partial", 1_384, 214, 160],
      ["unpaid", 1_484, 114, 260],
      ["partial-late", 1_343, 214, 119],
      ["all-unpaid", 1_598, 0, 374],
    ] as const
  ) {
    const raw = unpaidStateSource(kind);
    const amounts = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
    assertEquals(amounts.sectionB?.contributions, contributions);
    assertEquals(amounts.futaTax, futa);
    assertEquals(amounts.totalTax, tax);
    const { bundle } = await verifyAdditionalPacket(
      raw,
      `changed-rate-${kind}-unpaid-state`,
      tax,
    );
    assertEquals(
      bundle.xml.includes(`<FUTATaxAmt>${futa}</FUTATaxAmt>`),
      true,
    );
    assertEquals(
      bundle.xml.includes(
        `<TotalContriStateUnemplFundAmt>${contributions}</TotalContriStateUnemplFundAmt>`,
      ),
      true,
    );
  }
});

function txOnlyUnpaidStateSource() {
  const raw: any = source();
  const unemployment = raw.federal_unemployment;
  const review = unemployment.state_payroll_review;
  unemployment.paid_only_one_state = true;
  unemployment.all_contributions_paid_on_time = false;
  unemployment.state_rows = [{
    ...unemployment.state_rows[2],
    taxable_state_wages: 8_000,
    contributions_paid_by_due_date: 0,
  }];
  unemployment.credit_reduction_wages = [];
  review.rate_notices = [review.rate_notices[2]];
  review.contribution_payments = [];
  for (const [index, payment] of review.wage_payments.entries()) {
    payment.state = "TX";
    payment.payment_reference = `TX-Q${index + 1}-household-payroll`;
  }
  review.unpaid_contribution_review = {
    filing_review_date: "2026-04-15",
    notice_balances: [{
      rate_notice_source_reference: "TX-rate-notice-2025",
      state: "TX",
      statement_as_of_date: "2026-04-15",
      outstanding_balance: 216,
      balance_record_reference: "TX-full-year-account-unpaid",
    }],
  };
  return raw;
}

Deno.test("Schedule H one-state wholly unpaid assessment uses Section B without a late worksheet", async () => {
  const raw = txOnlyUnpaidStateSource();
  const amounts = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
  assertEquals(amounts.sectionB?.additionalCredit, 216);
  assertEquals(amounts.sectionB?.contributions, 0);
  assertEquals(amounts.sectionB?.needsWorksheet, false);
  assertEquals(amounts.futaTax, 204);
  assertEquals(amounts.totalTax, 1_428);
  const { bundle } = await verifyAdditionalPacket(
    raw,
    "tx-only-wholly-unpaid-state",
    1_428,
    6,
  );
  assertEquals(bundle.xml.includes("<FUTATaxAmt>204</FUTATaxAmt>"), true);
});

Deno.test("Schedule H unpaid state balances reject missing, stale, duplicate and contradicted source records at every exporter", async () => {
  const raw = unpaidStateSource("partial");
  const { schedule, result, bundle } = await verifyAdditionalPacket(
    raw,
    "changed-rate-partial-unpaid-negative-control",
    1_384,
  );
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const pending = buildPending(result.pending);
  const bad = async (edit: (row: any) => void) => {
    const altered: any = structuredClone(schedule);
    edit(altered.federal_unemployment);
    assertThrows(() =>
      computeScheduleHAmounts(inputSchema.parse(altered), 2025)
    );
    assertThrows(() => scheduleH.build(altered, { filer, pending }));
    await assertRejects(() =>
      buildPdfBytes(
        { ...bundle.pending, schedule_h: altered },
        filer,
        ".pdf-cache",
      )
    );
    const rejected = f1040_2025.executeReturn({
      ...structuredClone(base.inputs),
      schedule_h: altered,
    });
    assertEquals(
      rejected.diagnostics.some((diagnostic) =>
        diagnostic.nodeType === "schedule_h"
      ),
      true,
    );
  };
  await bad((row) =>
    delete row.state_payroll_review.unpaid_contribution_review
  );
  await bad((row) =>
    row.state_payroll_review.unpaid_contribution_review.notice_balances.pop()
  );
  await bad((row) =>
    row.state_payroll_review.unpaid_contribution_review.notice_balances[1]
      .outstanding_balance = 99
  );
  await bad((row) =>
    row.state_payroll_review.unpaid_contribution_review.notice_balances[1]
      .outstanding_balance = 100.001
  );
  await bad((row) =>
    row.state_payroll_review.unpaid_contribution_review.notice_balances[2]
      .balance_record_reference =
        row.state_payroll_review.unpaid_contribution_review.notice_balances[1]
          .balance_record_reference
  );
  await bad((row) =>
    row.state_payroll_review.unpaid_contribution_review.notice_balances[2]
      .rate_notice_source_reference = "CA-rate-notice-Q2-Q4"
  );
  await bad((row) =>
    row.state_payroll_review.unpaid_contribution_review.notice_balances[1]
      .statement_as_of_date = "2026-04-16"
  );
  await bad((row) =>
    row.state_payroll_review.unpaid_contribution_review.notice_balances[1]
      .state = "TX"
  );
  await bad((row) => row.all_contributions_paid_on_time = true);
  await bad((row) => {
    row.state_payroll_review.contribution_payments.push({
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      assessment_quarter: 3,
      paid_date: "2025-10-15",
      amount: 100,
      payment_reference: "CA-Q3-SUTA-receipt",
    });
    row.state_payroll_review.unpaid_contribution_review.notice_balances[1]
      .outstanding_balance = 0;
    row.state_rows[1].contributions_paid_by_due_date = 200;
    // All liabilities have been paid by the deadline, contradicting line 11.
    row.all_contributions_paid_on_time = false;
  });
  await bad((row) => row.late_contributions = 100);
  await bad((row) =>
    row.state_payroll_review.contribution_payments[1].amount = 201
  );
  await bad((row) =>
    row.state_payroll_review.unpaid_contribution_review.filing_review_date =
      "2026-04-14"
  );
  await bad((row) => {
    row.state_payroll_review.contribution_payments[1].paid_date = "2026-05-15";
    row.late_contributions = 100;
  });
});
