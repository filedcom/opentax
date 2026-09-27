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
  // The six-month exception applies only to a substantially-all failure.
  // A signed notice does not replace review of whether the CDE cured it.
  substantially_all_cure_exception_applies: z.boolean().optional(),
  substantially_all_cure_review_reference: z.string().trim().min(1).optional(),
  prior_years: z.array(z.object({
    tax_year: z.number().int().min(2018).max(2024),
    original_return_due_date: dateSchema,
    section38_credit_allowed_as_filed: dollars,
    section38_credit_allowed_without_this_qei: dollars,
    recomputation_reference: z.string().trim().min(1),
  })).min(1),
  carryover_ledger_reference: z.string().trim().min(1),
  carryover_vintages: z.array(
    z.object({
      originating_tax_year: z.number().int().min(2018).max(2024),
      credit_generated_as_filed: dollars.refine((amount) => amount > 0),
      credit_carried_to_2025_before_recapture: dollars.refine((amount) =>
        amount > 0
      ),
      source_document_reference: z.string().trim().min(1),
      historical_uses: z.array(
        z.object({
          tax_year: z.number().int().min(2018).max(2024),
          credit_allowed: dollars.refine((amount) => amount > 0),
          return_reference: z.string().trim().min(1),
        }).strict(),
      ),
    }).strict(),
  ),
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
  if (input.recapture_event === "substantially_all_requirement_failed") {
    if (
      input.substantially_all_cure_exception_applies !== false ||
      !input.substantially_all_cure_review_reference
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["substantially_all_cure_exception_applies"],
        message:
          "Substantially-all recapture needs documented review that the six-month cure exception does not apply",
      });
    }
  } else if (
    input.substantially_all_cure_exception_applies !== undefined ||
    input.substantially_all_cure_review_reference !== undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["substantially_all_cure_exception_applies"],
      message:
        "The substantially-all cure exception belongs only to that event",
    });
  }
  const initialDate = new Date(`${input.initial_investment_date}T00:00:00Z`);
  const maximumSevenYearCredit =
    3 * Math.round(input.qualified_equity_investment_amount * 0.05) +
    4 * Math.round(input.qualified_equity_investment_amount * 0.06);
  if (input.notice_credit_amount > maximumSevenYearCredit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["notice_credit_amount"],
      message: "Form 8874-B credit exceeds 39% of the qualified investment",
    });
  }
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
  });
  const carryoverYears = new Set<number>();
  const historicalUseByTaxYear = new Map<number, number>();
  input.carryover_vintages.forEach((vintage, index) => {
    if (carryoverYears.has(vintage.originating_tax_year)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["carryover_vintages", index, "originating_tax_year"],
        message: "Duplicate QEI carryover originating tax year",
      });
    }
    carryoverYears.add(vintage.originating_tax_year);
    const creditYear = vintage.originating_tax_year -
      initialDate.getUTCFullYear() + 1;
    const annualRate = creditYear <= 3 ? 0.05 : 0.06;
    const annualCredit = Math.round(
      input.qualified_equity_investment_amount * annualRate,
    );
    if (
      creditYear < 1 || creditYear > 7 ||
      vintage.credit_generated_as_filed > annualCredit ||
      vintage.credit_carried_to_2025_before_recapture >
        vintage.credit_generated_as_filed
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["carryover_vintages", index],
        message: "QEI carryover vintage exceeds its originating-year credit",
      });
    }
    const useYears = new Set<number>();
    let historicalUse = 0;
    vintage.historical_uses.forEach((use, useIndex) => {
      if (useYears.has(use.tax_year)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["carryover_vintages", index, "historical_uses", useIndex],
          message: "QEI carryover has duplicate use in one tax year",
        });
      }
      useYears.add(use.tax_year);
      if (
        use.tax_year <
          Math.max(
            initialDate.getUTCFullYear(),
            vintage.originating_tax_year - 1,
          ) ||
        use.tax_year > 2024
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [
            "carryover_vintages",
            index,
            "historical_uses",
            useIndex,
            "tax_year",
          ],
          message: "QEI credit use is outside its carryback/carryforward years",
        });
      }
      historicalUse += use.credit_allowed;
      historicalUseByTaxYear.set(
        use.tax_year,
        (historicalUseByTaxYear.get(use.tax_year) ?? 0) + use.credit_allowed,
      );
    });
    if (
      !Number.isSafeInteger(historicalUse) ||
      historicalUse + vintage.credit_carried_to_2025_before_recapture !==
        vintage.credit_generated_as_filed
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["carryover_vintages", index, "historical_uses"],
        message: "QEI historical credit use and 2025 balance must reconcile",
      });
    }
  });
  for (const [taxYear, used] of historicalUseByTaxYear) {
    const priorReturn = input.prior_years.find((year) =>
      year.tax_year === taxYear
    );
    if (!priorReturn || used > priorReturn.section38_credit_allowed_as_filed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prior_years"],
        message:
          `QEI credit used in ${taxYear} needs a matching prior Section 38 return`,
      });
    }
  }
  const priorAllowedCreditDecrease = input.prior_years.reduce(
    (sum, year) =>
      sum + year.section38_credit_allowed_as_filed -
      year.section38_credit_allowed_without_this_qei,
    0,
  );
  if (
    !Number.isSafeInteger(priorAllowedCreditDecrease) ||
    priorAllowedCreditDecrease > maximumSevenYearCredit
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["prior_years"],
      message: "Recaptured allowed credit exceeds the QEI's seven-year maximum",
    });
  }
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
    carryforwardAdjustments: input.carryover_vintages.map((vintage) => ({
      originatingTaxYear: vintage.originating_tax_year,
      investmentReference: input.investment_reference,
      sourceDocumentReference: vintage.source_document_reference,
      creditGeneratedAsFiled: vintage.credit_generated_as_filed,
      historicalUses: vintage.historical_uses.map((use) => ({
        taxYear: use.tax_year,
        creditAllowed: use.credit_allowed,
        returnReference: use.return_reference,
      })),
      beforeRecapture: vintage.credit_carried_to_2025_before_recapture,
      removedFromQeiLedger: vintage.credit_carried_to_2025_before_recapture,
      availableAfterRecapture: 0,
    })),
    creditDecrease,
    interest,
    schedule2Line17a: creditDecrease + interest,
  };
}
