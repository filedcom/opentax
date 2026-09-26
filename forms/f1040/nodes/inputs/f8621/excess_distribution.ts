import { z } from "zod";

// Form 8621 Part V is completed separately for each excess distribution or
// disposition. The year allocation is a source fact supported by the required
// holding-period statement, not a flat current-year tax estimate.
export const allocationSchema = z.object({
  tax_year: z.number().int().min(1987).max(2025),
  allocated_amount: z.number().nonnegative(),
  pfic_year: z.boolean(),
  // Only the creditable amount allocated to a prior PFIC year is used here.
  foreign_tax_credit: z.number().nonnegative().optional(),
  // Interest on this year's net increase in tax under section 6621. This
  // requires historical rates and due dates and must be supported separately.
  interest_charge: z.number().nonnegative().optional(),
});

export enum ExcessEventKind {
  Distribution = "distribution",
  Disposition = "disposition",
}

export const excessEventSchema = z.object({
  kind: z.nativeEnum(ExcessEventKind),
  amount_usd: z.number().positive(),
  allocations: z.array(allocationSchema).min(1),
  holding_period_explanation: z.string().trim().min(1),
});

export type ExcessEvent = z.infer<typeof excessEventSchema>;

export interface ExcessEventResult {
  line16b_current_and_pre_pfic_income: number;
  line16c_prior_year_tax_before_credit: number;
  line16d_prior_year_foreign_tax_credit: number;
  line16e_additional_tax: number;
  line16f_interest: number;
}

function highestIndividualRate(year: number): number {
  if (year >= 2018 && year <= 2025) return 0.37;
  if (year >= 2013 && year <= 2017) return 0.396;
  if (year >= 2003 && year <= 2012) return 0.35;
  if (year === 2002) return 0.386;
  if (year === 2001) return 0.391;
  if (year >= 1993 && year <= 2000) return 0.396;
  if (year >= 1991 && year <= 1992) return 0.31;
  if (year >= 1988 && year <= 1990) return 0.28;
  if (year === 1987) return 0.385;
  throw new Error(
    `Form 8621 lacks a published highest individual rate for ${year}`,
  );
}

export function calculateExcessEvent(rawEvent: ExcessEvent): ExcessEventResult {
  const event = excessEventSchema.parse(rawEvent);
  const allocatedTotal = event.allocations.reduce(
    (sum, year) => sum + year.allocated_amount,
    0,
  );
  if (Math.abs(allocatedTotal - event.amount_usd) > 0.01) {
    throw new Error(
      "Form 8621 year allocations must equal the excess distribution or disposition gain",
    );
  }
  const years = new Set<number>();
  let currentAndPrePfic = 0;
  let priorYearTax = 0;
  let priorYearCredit = 0;
  let interest = 0;
  for (const year of event.allocations) {
    if (years.has(year.tax_year)) {
      throw new Error("Form 8621 has duplicate allocations for a tax year");
    }
    years.add(year.tax_year);
    if (year.tax_year === 2025 || !year.pfic_year) {
      if (
        (year.foreign_tax_credit ?? 0) > 0 || (year.interest_charge ?? 0) > 0
      ) {
        throw new Error(
          "Form 8621 current and pre-PFIC year credits and interest cannot be applied to line 16d or 16f",
        );
      }
      currentAndPrePfic += year.allocated_amount;
      continue;
    }
    if (
      event.kind === ExcessEventKind.Disposition &&
      (year.foreign_tax_credit ?? 0) > 0
    ) {
      throw new Error(
        "Form 8621 disposition foreign tax credit needs section 1248 dividend attribution",
      );
    }
    const tax = year.allocated_amount * highestIndividualRate(year.tax_year);
    const credit = year.foreign_tax_credit ?? 0;
    if (credit > tax + 0.01) {
      throw new Error(
        "Form 8621 foreign tax credit exceeds this prior PFIC year's increase in tax",
      );
    }
    if (tax > credit && year.interest_charge === undefined) {
      throw new Error(
        "Form 8621 prior PFIC year needs a supported section 6621 interest charge",
      );
    }
    priorYearTax += tax;
    priorYearCredit += credit;
    interest += year.interest_charge ?? 0;
  }
  const line16c = Math.round(priorYearTax);
  const line16d = Math.round(priorYearCredit);
  return {
    line16b_current_and_pre_pfic_income: Math.round(currentAndPrePfic),
    line16c_prior_year_tax_before_credit: line16c,
    line16d_prior_year_foreign_tax_credit: line16d,
    line16e_additional_tax: Math.max(0, line16c - line16d),
    line16f_interest: Math.round(interest),
  };
}
