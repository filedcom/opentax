import { arrangementQuoteContribution } from "../../../../../nodes/inputs/credits/health/f8941/arrangements.ts";
import {
  calculateForm8941,
  inputSchema,
} from "../../../../../nodes/inputs/credits/health/f8941/index.ts";
import { form8941MultiplePlanInputs } from "./review-8941-multiple-plans.fixture.ts";
import { form8941TierChangeSource } from "./review-8941-tier-changes.fixture.ts";

const cents = (n: number) => Math.round(n * 100);
const money = (n: number) => Math.round(n * 100) / 100;
const lastDay = (month: number) =>
  new Date(Date.UTC(2025, month, 0)).getUTCDate();
const day = (month: number, number: number) =>
  `2025-${String(month).padStart(2, "0")}-${String(number).padStart(2, "0")}`;

/** Carrier daily-billing facts for actual midmonth marriage, birth, divorce. */
export function form8941PartMonthSource() {
  const s: any = structuredClone(form8941TierChangeSource("independent-mixed"));
  for (
    const [index, dependentIndex, firstMonth] of [[1, 0, 3], [1, 1, 6], [
      3,
      0,
      3,
    ]]
  ) {
    const e = s.employees[index],
      review = s.shop_review.employee_premium_reviews[index];
    for (
      const dependent of [
        e.covered_dependents[dependentIndex],
        review.covered_dependents[dependentIndex],
      ]
    ) {
      for (const record of dependent.plan_eligibility_records) {
        record.eligibility_period.first_month = firstMonth;
        record.eligibility_period.coverage_start_date = day(firstMonth, 1);
        record.eligibility_effective_date = day(
          firstMonth,
          dependentIndex === 1 ? 25 : 20,
        );
      }
    }
  }
  for (
    const [index, month, eventDay] of [[1, 3, 20], [1, 6, 25], [1, 9, 18], [
      3,
      3,
      20,
    ], [3, 9, 18]]
  ) {
    const e = s.employees[index],
      invoice = s.shop_review.employee_premium_reviews[index].monthly_premiums
        .find((x: any) => x.month === month);
    const next = e.coverage_periods.find((p: any) =>
      p.first_month === month + 1
    );
    const policy = s.monthly_plan_arrangements.find((p: any) =>
      p.month === month && p.shop_plan_reference === invoice.shop_plan_reference
    );
    const quote = policy.eligible_employee_quotes.find((q: any) =>
      q.employee_reference === e.employee_reference
    );
    const final = lastDay(month);
    const invoiceDate = day(month, final), paymentDate = day(month + 1, 5);
    const parts = [
      {
        start: 1,
        end: eventDay - 1,
        tier: invoice.coverage_tier,
        members: invoice.covered_dependent_references,
      },
      {
        start: eventDay,
        end: final,
        tier: next.coverage_tier,
        members: next.covered_dependent_references,
      },
    ];
    invoice.carrier_daily_proration_rule_source_reference =
      `Synthetic carrier daily billing rule-${index}-${month}`;
    invoice.invoice_date = invoiceDate;
    invoice.payment_date = paymentDate;
    invoice.coverage_segments = parts.map((part, segment) => {
      const quotePremium = part.tier === "family"
        ? quote.family_premium
        : quote.employee_only_premium;
      const fullPayment =
        arrangementQuoteContribution(policy, quote, part.tier).employerPayment;
      const days = part.end - part.start + 1;
      return {
        coverage_start_date: day(month, part.start),
        coverage_end_date: day(month, part.end),
        invoice_date: invoiceDate,
        payment_date: paymentDate,
        coverage_tier: part.tier,
        covered_dependent_references: [...part.members],
        billed_premium: money(
          Math.round(cents(quotePremium) * days / final) / 100,
        ),
        employer_payment: money(
          Math.round(cents(fullPayment) * days / final) / 100,
        ),
        insured_quote_reference: quote.quote_source_reference,
        shop_invoice_reference:
          `Synthetic carrier segment invoice-${index}-${month}-${segment}`,
        employer_payment_reference:
          `Synthetic carrier segment payment-${index}-${month}-${segment}`,
      };
    });
    invoice.billed_premium = money(
      invoice.coverage_segments.reduce(
        (n: number, x: any) => n + x.billed_premium,
        0,
      ),
    );
    invoice.employer_payment = money(
      invoice.coverage_segments.reduce(
        (n: number, x: any) => n + x.employer_payment,
        0,
      ),
    );
    const invoices =
      s.shop_review.employee_premium_reviews[index].monthly_premiums;
    e.tax_year_shop_premium = money(
      invoices.reduce((n: number, x: any) => n + x.billed_premium, 0),
    );
    e.employer_premium_paid = money(
      invoices.reduce((n: number, x: any) => n + x.employer_payment, 0),
    );
  }
  const parsed = inputSchema.parse(s);
  if (!("schedule_c_business_reference" in parsed)) {
    throw new Error("Expected Schedule C part-month source");
  }
  return parsed as Extract<
    ReturnType<typeof inputSchema.parse>,
    { schedule_c_business_reference: string }
  >;
}

export function form8941PartMonthInputs(receipts = 350000) {
  const input = form8941MultiplePlanInputs("independent-mixed", receipts);
  const source = form8941PartMonthSource();
  if (!("employees" in source)) throw new Error("Expected multiple-QHP source");
  const lines = calculateForm8941(source);
  return {
    ...input,
    f8941: source,
    schedule_c: input.schedule_c.map((b) => ({
      ...b,
      line_26_wages: source.employees.reduce(
        (n, e) => n + e.social_security_medicare_wages,
        0,
      ),
      line_14_employee_benefits: source.other_schedule_c_employee_benefits +
        lines.line4,
    })),
  };
}
