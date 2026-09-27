import { z } from "zod";

// IRC 45D(g)(2) recaptures the decrease in Section 38 credit actually allowed,
// plus Section 6621 interest. A Form 8874-B notice is evidence of the event,
// not a taxpayer-specific computation of that decrease.
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
});
const dollars = z.number().finite().nonnegative().refine(Number.isSafeInteger);

export const recaptureSchema = z.object({
  notice_reference: z.string().trim().min(1),
  investment_reference: z.string().trim().min(1),
  cde_name: z.string().trim().min(1),
  cde_ein: z.string().regex(/^\d{9}$/),
  notice_taxpayer_tin: z.string().regex(/^\d{9}$/),
  initial_investment_date: dateSchema,
  qualified_equity_investment_amount: dollars.refine((amount) => amount > 0),
  notice_credit_amount: dollars,
  recapture_event_date: dateSchema,
  recapture_event: z.enum([
    "cde_certification_revoked",
    "substantially_all_requirement_failed",
    "cde_redeemed_investment",
  ]),
  prior_years: z.array(z.object({
    tax_year: z.number().int().min(2018).max(2024),
    original_return_due_date: dateSchema,
    section38_credit_allowed_as_filed: dollars,
    section38_credit_allowed_without_this_qei: dollars,
    original_unused_qei_credit: dollars,
    recomputed_unused_qei_credit: dollars,
    recomputation_reference: z.string().trim().min(1),
  })).min(1),
}).strict().superRefine((input, ctx) => {
  if (input.recapture_event_date.slice(0, 4) !== "2025") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recapture_event_date"],
      message: "TY2025 recapture needs an event in 2025",
    });
  }
  if (input.initial_investment_date >= input.recapture_event_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["initial_investment_date"],
      message: "Investment must precede its recapture event",
    });
  }
  const initialDate = new Date(`${input.initial_investment_date}T00:00:00Z`);
  const endOfSevenYears = new Date(initialDate);
  endOfSevenYears.setUTCFullYear(endOfSevenYears.getUTCFullYear() + 7);
  if (
    Date.parse(`${input.recapture_event_date}T00:00:00Z`) >=
      endOfSevenYears.getTime()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recapture_event_date"],
      message:
        "New Markets recapture event must occur in the seven-year credit period",
    });
  }
  const seen = new Set<number>();
  input.prior_years.forEach((year, index) => {
    if (seen.has(year.tax_year)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prior_years", index, "tax_year"],
        message: "Duplicate prior tax year in QEI recapture",
      });
    }
    seen.add(year.tax_year);
    if (year.tax_year < initialDate.getUTCFullYear()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prior_years", index, "tax_year"],
        message: "Credit-use year cannot precede the investment year",
      });
    }
    if (
      Number(year.original_return_due_date.slice(0, 4)) !==
        year.tax_year + 1 ||
      year.original_return_due_date >= "2026-04-15"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prior_years", index, "original_return_due_date"],
        message:
          "Prior return due date must be in the next calendar year and precede the 2025 return due date",
      });
    }
    if (
      year.section38_credit_allowed_without_this_qei >
        year.section38_credit_allowed_as_filed
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [
          "prior_years",
          index,
          "section38_credit_allowed_without_this_qei",
        ],
        message: "Recomputed allowed credit cannot exceed filed allowed credit",
      });
    }
    if (year.recomputed_unused_qei_credit > year.original_unused_qei_credit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prior_years", index, "recomputed_unused_qei_credit"],
        message: "Removing this QEI cannot increase its unused credit",
      });
    }
  });
});

export type NewMarketsRecaptureInput = z.infer<typeof recaptureSchema>;

// Underpayment percentages, Q1 through Q4. Source:
// https://www.irs.gov/payments/quarterly-interest-rates (read 2026-09-27).
// Keep the 2026 rates because TY2025 recapture interest ends
// on the unextended 2025 return due date, April 15, 2026.
const UNDERPAYMENT_RATES: Readonly<Record<number, readonly number[]>> = {
  2018: [4, 5, 5, 5],
  2019: [6, 6, 5, 5],
  2020: [5, 5, 3, 3],
  2021: [3, 3, 3, 3],
  2022: [3, 4, 5, 6],
  2023: [7, 7, 7, 8],
  2024: [8, 8, 8, 8],
  2025: [7, 7, 7, 7],
  2026: [7, 6, 7, 7],
};

const DAY_MS = 24 * 60 * 60 * 1000;
const RECAPTURE_RETURN_DUE_DATE = Date.UTC(2026, 3, 15);

function interestOnAllowedCredit(principal: number, from: string): number {
  if (principal === 0) return 0;
  let balance = principal;
  for (
    let day = Date.parse(`${from}T00:00:00Z`);
    day < RECAPTURE_RETURN_DUE_DATE;
    day += DAY_MS
  ) {
    const date = new Date(day);
    const year = date.getUTCFullYear();
    const quarter = Math.floor(date.getUTCMonth() / 3);
    const rate = UNDERPAYMENT_RATES[year]?.[quarter];
    if (rate === undefined) {
      throw new Error(
        `Missing IRS underpayment rate for ${year} Q${quarter + 1}`,
      );
    }
    const daysInYear = Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1);
    balance *= 1 + rate / 100 / (daysInYear / DAY_MS);
  }
  return Math.round(balance - principal);
}

export function calculateNewMarketsRecapture(raw: NewMarketsRecaptureInput) {
  const input = recaptureSchema.parse(raw);
  const years = input.prior_years.map((year) => {
    const allowedCreditDecrease = year.section38_credit_allowed_as_filed -
      year.section38_credit_allowed_without_this_qei;
    const interest = interestOnAllowedCredit(
      allowedCreditDecrease,
      year.original_return_due_date,
    );
    return {
      taxYear: year.tax_year,
      allowedCreditDecrease,
      interest,
      carryforwardAdjustment: year.original_unused_qei_credit -
        year.recomputed_unused_qei_credit,
      recomputationReference: year.recomputation_reference,
    };
  });
  const creditDecrease = years.reduce(
    (sum, year) => sum + year.allowedCreditDecrease,
    0,
  );
  const interest = years.reduce((sum, year) => sum + year.interest, 0);
  if (!Number.isSafeInteger(creditDecrease + interest)) {
    throw new Error("New Markets recapture exceeds safe whole dollars");
  }
  return {
    years,
    creditDecrease,
    interest,
    schedule2Line17a: creditDecrease + interest,
  };
}
