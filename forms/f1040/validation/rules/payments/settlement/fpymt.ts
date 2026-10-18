/**
 * MeF Business Rules: FPYMT
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 13 rules (13 implemented, 0 stubs)
 *
 * MeF's received date is its own record. Rules that compare a payment date
 * with it use the earliest date the return can be received: the day after
 * the tax period, each signature date, 'ReturnTs' and the processing date.
 * An upper bound so checked always holds at MeF; a lower bound holds unless
 * MeF receives the return later than that date.
 */

import type {
  ReturnContext,
  RuleCheck,
  RuleDef,
} from "../../../../../../core/validation/types.ts";
import {
  all,
  allDistinct,
  any,
  dateMonthDayEq,
  dateYearEqConst,
  formPresent,
  gt,
  hasValue,
  ifThen,
  notGtNum,
  notGtPctOfField,
  rule,
} from "../../../../../../core/validation/mod.ts";
import {
  EnvelopeFact,
  factText,
  isoDay,
} from "../../../../../../core/validation/predicates.ts";

const PAYMENT_DATE = "Payment/RequestedPaymentDt";
const ES_DUE_DATE = "ESPayment/EstimatedPaymentDueDt";
const PAYMENT_965_DATE = "965Payment/RequestedPaymentDt";

/**
 * April 15 after the tax year, moved past a weekend and the District of
 * Columbia's Emancipation Day (April 16, observed on the nearest weekday);
 * IRC §7503 and the Form 1040 instructions.
 */
export function returnDueDay(taxYear: number): number {
  const april15 = Date.UTC(taxYear + 1, 3, 15) / 86_400_000;
  const weekday = new Date(april15 * 86_400_000).getUTCDay();
  const shift: Readonly<Record<number, number>> = { 5: 3, 6: 3, 0: 2 };
  return april15 + (shift[weekday] ?? 0);
}

/** The earliest day MeF can receive this return. */
function earliestReceivedDay(ctx: ReturnContext): number | undefined {
  const days = [
    (isoDay(ctx.field("TaxPeriodEndDt")) ?? NaN) + 1,
    isoDay(ctx.field("PrimarySignatureDt")) ?? NaN,
    isoDay(ctx.field("SpouseSignatureDt")) ?? NaN,
    isoDay(factText(ctx, EnvelopeFact.ProcessingDate)) ?? NaN,
    // The return is created ('ReturnTs') before MeF receives it.
    isoDay(String(ctx.field("ReturnHeader/ReturnTs") ?? "").slice(0, 10)) ?? NaN,
  ].filter((d) => !Number.isNaN(d));
  return days.length > 0 ? Math.max(...days) : undefined;
}

const dueDay = (ctx: ReturnContext): number | undefined => {
  const year = ctx.num("TaxYr");
  return year > 0 ? returnDueDay(year) : undefined;
};

/** Every value of `dateXml` satisfies `check` against the return's dates. */
const eachDate = (
  dateXml: string,
  check: (day: number, received: number, due: number | undefined) => boolean,
): RuleCheck =>
(ctx) => {
  const received = earliestReceivedDay(ctx);
  if (received === undefined) return true;
  const due = dueDay(ctx);
  return ctx.fieldArray(dateXml).every((v) => {
    const day = isoDay(v);
    return day === undefined || check(day, received, due);
  });
};

/** Not more than 5 days before the received date. */
const notFiveDaysBeforeReceipt = (dateXml: string) =>
  eachDate(dateXml, (day, received) => day >= received - 5);

/** If received by the due date, on or before the due date. */
const byDueDateWhenTimely = (dateXml: string) =>
  eachDate(dateXml, (day, received, due) =>
    due === undefined || received > due || day <= due);

/** If received after the due date, not after the received date. */
const byReceiptWhenLate = (dateXml: string) =>
  eachDate(dateXml, (day, received, due) =>
    day <= Math.max(due ?? received, received));

/** The same calendar date one year later, in days. */
const oneYearAfter = (day: number): number => {
  const d = new Date(day * 86_400_000);
  return Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate()) /
    86_400_000;
};

export const FPYMT_RULES: readonly RuleDef[] = [
  rule(
    "FPYMT-045-02",
    "reject",
    "incorrect_data",
    allDistinct(ES_DUE_DATE),
    "'EstimatedPaymentDueDt' in the IRS ES Payment Record must not be the same as another IRS ES Payment Record filed with the same return.",
  ),
  rule(
    "FPYMT-057-03",
    "reject",
    "incorrect_data",
    ifThen(hasValue("PaymentAmt"), all(gt("PaymentAmt", 0), notGtNum("PaymentAmt", 99999999))),
    "In IRS Payment Record or IRS ES Payment Record or IRS 965 Payment Record, 'PaymentAmt' must be greater than zero, but less than or equal to $99,999,999.",
  ),
  rule(
    "FPYMT-071-01",
    "reject",
    "incorrect_data",
    notFiveDaysBeforeReceipt(PAYMENT_DATE),
    "'RequestedPaymentDt' in the IRS Payment Record must not be more than 5 days prior to the received date.",
  ),
  rule(
    "FPYMT-072-01",
    "reject",
    "incorrect_data",
    byDueDateWhenTimely(PAYMENT_DATE),
    "If the return is received on or before the due date of the return, then the 'RequestedPaymentDt' in the IRS Payment Record must be on the due date or before the due date.",
  ),
  rule(
    "FPYMT-074-01",
    "reject",
    "incorrect_data",
    byReceiptWhenLate(PAYMENT_DATE),
    "If the return is received after the due date of the return, then the 'RequestedPaymentDt' in the IRS Payment Record must not be later than the date the return was received.",
  ),
  rule(
    "FPYMT-086",
    "reject",
    "incorrect_data",
    notFiveDaysBeforeReceipt(ES_DUE_DATE),
    "'EstimatedPaymentDueDt' in the IRS ES Payment Record must not be more than 5 days prior to the received date.",
  ),
  rule(
    "FPYMT-087",
    "reject",
    "incorrect_data",
    eachDate(ES_DUE_DATE, (day, received) => day <= oneYearAfter(received)),
    "'EstimatedPaymentDueDt' in the IRS ES Payment Record must not be more than one year after the received date.",
  ),
  rule(
    "FPYMT-088-11",
    "reject",
    "incorrect_data",
    any(
      all(dateYearEqConst("EstimatedPaymentDueDt", 2026), dateMonthDayEq("EstimatedPaymentDueDt", 4, 15)),
      all(dateYearEqConst("EstimatedPaymentDueDt", 2026), dateMonthDayEq("EstimatedPaymentDueDt", 6, 15)),
      all(dateYearEqConst("EstimatedPaymentDueDt", 2026), dateMonthDayEq("EstimatedPaymentDueDt", 9, 15)),
      all(dateYearEqConst("EstimatedPaymentDueDt", 2027), dateMonthDayEq("EstimatedPaymentDueDt", 1, 15)),
    ),
    "'EstimatedPaymentDueDt' in the IRS ES Payment Record must be 04/15/2026 or 06/15/2026 or 09/15/2026 or 01/15/2027.",
  ),
  rule(
    "FPYMT-089",
    "reject",
    "incorrect_data",
    notGtPctOfField("PaymentAmt", "OwedAmt", 2.0),
    "'PaymentAmt' in the IRS Payment Record must not be more than 200% of 'OwedAmt'. If a value is not provided for 'OwedAmt', treat that value as zero.",
  ),
  rule(
    "FPYMT-097",
    "reject",
    "missing_document",
    ifThen(hasValue("IRS965PaymentRecord"), formPresent("form965A")),
    "If IRS 965 Payment Record is present in the return, then Form 965-A must also be present in the return.",
  ),
  rule(
    "FPYMT-099",
    "reject",
    "incorrect_data",
    notFiveDaysBeforeReceipt(PAYMENT_965_DATE),
    "'RequestedPaymentDt' in the IRS 965 Payment Record must not be more than 5 days prior to the received date.",
  ),
  rule(
    "FPYMT-100",
    "reject",
    "incorrect_data",
    byDueDateWhenTimely(PAYMENT_965_DATE),
    "If the return is received on or before the due date of the return, then the 'RequestedPaymentDt' in the IRS 965 Payment Record must be on the due date or before the due date.",
  ),
  rule(
    "FPYMT-101",
    "reject",
    "incorrect_data",
    byReceiptWhenLate(PAYMENT_965_DATE),
    "If the return is received after the due date of the return, then the 'RequestedPaymentDt' in the IRS 965 Payment Record must not be later than the date the return was received.",
  ),
];
