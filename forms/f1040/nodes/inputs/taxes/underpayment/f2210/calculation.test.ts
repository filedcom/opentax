import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import {
  computeRegularMethodPenalty,
  EstimatedTaxQuarter,
  type RegularMethodPenaltyInput,
} from "./calculation.ts";
import { config2025 } from "../../../../config/2025.ts";
import { FilingStatus } from "../../../../types.ts";

const terms2025 = config2025.form2210RegularMethod;
const penalty2025 = (input: RegularMethodPenaltyInput) =>
  computeRegularMethodPenalty(input, terms2025);

test("regular method: four unpaid installments accrue through filing day", () => {
  assertEquals(
    penalty2025({
      current_year_tax: 37_067,
      prior_year_tax: 30_000,
      prior_year_agi: 180_000,
    }),
    1_536,
  );
});

test("regular method: timely quarterly payments avoid a penalty", () => {
  assertEquals(
    penalty2025({
      current_year_tax: 10_000,
      q1_estimated_payment: 2_250,
      q2_estimated_payment: 2_250,
      q3_estimated_payment: 2_250,
      q4_estimated_payment: 2_250,
    }),
    0,
  );
});

test("regular method: a late catch-up payment still leaves an earlier penalty", () => {
  assertEquals(
    penalty2025({
      current_year_tax: 10_000,
      q4_estimated_payment: 9_000,
    }),
    264,
  );
});

test("regular method: withholding is treated evenly across installments", () => {
  assertEquals(
    penalty2025({
      current_year_tax: 10_000,
      withholding: 9_000,
    }),
    0,
  );
});

test("regular method: less than $1,000 due after withholding has no penalty", () => {
  assertEquals(
    penalty2025({
      current_year_tax: 10_000,
      withholding: 9_001,
    }),
    0,
  );
});

test("regular method: explicit penalty remains authoritative", () => {
  assertEquals(
    penalty2025({
      current_year_tax: 10_000,
      underpayment_penalty: 321,
    }),
    321,
  );
});

test("regular method: waiver suppresses an explicit penalty", () => {
  assertEquals(
    penalty2025({
      current_year_tax: 10_000,
      underpayment_penalty: 321,
      waiver_requested: true,
    }),
    0,
  );
});

// Synthetic MFJ return worked by hand from the 2025 Instructions for Form 2210:
// line 4 tax 9,402, no withholding; line 8 = 2024 tax 9,343 (AGI 115,177 is not
// over 150,000, so 100%); line 9 = min(90% x 9,402 = 8,461.80, 9,343) =
// 8,461.80; line 10 = 2,115.45 per column. Payments of 2,400 apply first to
// the earliest unpaid installment, the excess carrying with the same date
// (Part III Section A; penalty worksheet line 1b):
//   (a) 2,115.45 due 4/15/25, paid 4/19/25: 4 days x 7% / 365 = 1.62
//   (b) 284.55 from 4/19 is timely; 1,830.90 paid 6/17/25, 2 days
//       after the 6/15/25 column date = 0.70
//   (c) 569.10 from 6/17 is timely; 1,546.35 paid 9/22/25, 7 days = 2.08
//   (d) 853.65 from 9/22 and 1,261.80 of the 1/15/26 payment are timely.
// Line 14/19 = 4.40, entered as $4.
test("regular method: late dated estimated payments accrue the 2025 penalty", () => {
  const payment = (quarter: EstimatedTaxQuarter, date: string) => ({
    quarter,
    amount: 2_400,
    date,
  });
  assertEquals(
    penalty2025({
      current_year_tax: 9_402,
      withholding: 0,
      prior_year_tax: 9_343,
      prior_year_agi: 115_177,
      filing_status: FilingStatus.MFJ,
      estimated_payments: [
        payment(EstimatedTaxQuarter.Q1, "2025-04-19"),
        payment(EstimatedTaxQuarter.Q2, "2025-06-17"),
        payment(EstimatedTaxQuarter.Q3, "2025-09-22"),
        payment(EstimatedTaxQuarter.Q4, "2026-01-15"),
      ],
    }),
    4,
  );
});

test("regular method: a payment on Monday June 16, 2025 is timely", () => {
  const payments = [
    { quarter: EstimatedTaxQuarter.Q1, amount: 2_500, date: "2025-04-15" },
    { quarter: EstimatedTaxQuarter.Q2, amount: 2_500, date: "2025-06-16" },
    { quarter: EstimatedTaxQuarter.Q3, amount: 2_500, date: "2025-09-15" },
    { quarter: EstimatedTaxQuarter.Q4, amount: 2_500, date: "2026-01-15" },
  ];
  assertEquals(
    penalty2025({ current_year_tax: 10_000, estimated_payments: payments }),
    0,
  );
});

test("regular method: 110% prior-year rule uses $75,000 AGI for MFS", () => {
  // 90% x 20,000 = 18,000 exceeds 110% x 10,000 = 11,000; nothing paid,
  // so each 2,750 installment accrues to 4/15/26 (365, 304, 212, 90 days).
  assertEquals(
    penalty2025({
      current_year_tax: 20_000,
      prior_year_tax: 10_000,
      prior_year_agi: 80_000,
      filing_status: FilingStatus.MFS,
    }),
    Math.round(2_750 * 0.07 * (365 + 304 + 212 + 90) / 365),
  );
});

test("regular method: a year without published terms is refused", () => {
  assertThrows(() =>
    computeRegularMethodPenalty({ current_year_tax: 10_000 }, null)
  );
});
