import { z } from "zod";

// Each Part V event has its own holding period. The source provides dates and
// supported charges, while the year allocation is calculated from elapsed days.
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const yearChargeSchema = z.object({
  tax_year: z.number().int().min(1987).max(2025),
  foreign_tax_credit: z.number().nonnegative().optional(),
  // Interest under section 6621 is sourced for each prior PFIC year until
  // historical interest-rate periods and payment dates are modeled here.
  interest_charge: z.number().nonnegative().optional(),
}).strict();

export enum ExcessEventKind {
  Distribution = "distribution",
  Disposition = "disposition",
}

const dispositionSchema = z.object({
  kind: z.literal(ExcessEventKind.Disposition),
  amount_usd: z.number().positive(),
  holding_period_start: dateSchema,
  event_date: dateSchema,
  first_pfic_tax_year: z.number().int().min(1987).max(2026),
  year_charges: z.array(yearChargeSchema),
}).strict();

const distributionSchema = z.object({
  kind: z.literal(ExcessEventKind.Distribution),
  holding_period_start: dateSchema,
  first_pfic_tax_year: z.number().int().min(1987).max(2026),
  shares_in_block: z.number().positive(),
  prior_year_distributions: z.array(
    z.object({
      tax_year: z.number().int().min(2022).max(2025),
      amount_usd: z.number().nonnegative(),
    }).strict(),
  ),
  current_year_distributions: z.array(
    z.object({
      date: dateSchema,
      amount_usd: z.number().positive(),
      year_charges: z.array(yearChargeSchema),
    }).strict(),
  ).min(1),
  // Section 301 classification is a separate corporate earnings-and-profits
  // fact. It cannot exceed the calculated nonexcess portion.
  taxable_nonexcess_dividend_usd: z.number().nonnegative(),
}).strict();

export const excessEventSchema = z.discriminatedUnion("kind", [
  distributionSchema,
  dispositionSchema,
]);

export type ExcessEvent = z.infer<typeof excessEventSchema>;

export interface ExcessYearAllocation {
  tax_year: number;
  allocated_amount: number;
  pfic_year: boolean;
  foreign_tax_credit: number;
  interest_charge: number;
  holding_days: number;
}

export interface ExcessEventResult {
  kind: ExcessEventKind;
  holding_period_start: string;
  event_date: string;
  first_pfic_tax_year: number;
  amount_usd: number;
  first_holding_year?: boolean;
  line15a_current_distributions?: number;
  line15b_prior_distributions?: number;
  line15c_prior_average?: number;
  line15d_threshold?: number;
  nonexcess_distribution?: number;
  allocations: ExcessYearAllocation[];
  line16b_current_and_pre_pfic_income: number;
  line16c_prior_year_tax_before_credit: number;
  line16d_prior_year_foreign_tax_credit: number;
  line16e_additional_tax: number;
  line16f_interest: number;
}

function parseDate(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  const date = Date.UTC(year, month - 1, day);
  const normalized = new Date(date);
  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() + 1 !== month ||
    normalized.getUTCDate() !== day
  ) {
    throw new Error(`Form 8621 has an invalid holding-period date: ${value}`);
  }
  return date;
}

const millisecondsPerDay = 86_400_000;

function holdingDays(start: number, end: number): number {
  return Math.round((end - start) / millisecondsPerDay) + 1;
}

function highestIndividualRate(year: number): number {
  if (year >= 2018 && year <= 2026) return 0.37;
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

type TaxableExcess = Omit<z.infer<typeof dispositionSchema>, "kind"> & {
  kind: ExcessEventKind;
};

function allocateByHoldingDays(event: TaxableExcess, taxYear: number): ExcessYearAllocation[] {
  const start = parseDate(event.holding_period_start);
  const end = parseDate(event.event_date);
  const startYear = new Date(start).getUTCFullYear();
  if (end < start || new Date(end).getUTCFullYear() !== taxYear) {
    throw new Error(
      `Form 8621 Part V needs a valid holding period ending on a ${taxYear} event date`,
    );
  }
  const totalDays = holdingDays(start, end);
  const totalCents = Math.round(event.amount_usd * 100);
  if (totalCents === 0) {
    throw new Error("Form 8621 Part V amount must be at least one cent");
  }
  const yearDays: {
    year: number;
    days: number;
    cents: number;
    remainder: number;
  }[] = [];
  for (let year = startYear; year <= taxYear; year++) {
    const yearStart = Math.max(start, Date.UTC(year, 0, 1));
    const yearEnd = Math.min(end, Date.UTC(year, 11, 31));
    const days = holdingDays(yearStart, yearEnd);
    const exactCents = totalCents * days / totalDays;
    yearDays.push({
      year,
      days,
      cents: Math.floor(exactCents),
      remainder: exactCents - Math.floor(exactCents),
    });
  }
  const unallocated = totalCents - yearDays.reduce(
    (sum, year) => sum + year.cents,
    0,
  );
  const byRemainder = [...yearDays].sort((a, b) =>
    b.remainder - a.remainder || a.year - b.year
  );
  for (let index = 0; index < unallocated; index++) {
    byRemainder[index].cents++;
  }
  return yearDays.map(({ year, days, cents }) => ({
    tax_year: year,
    allocated_amount: cents / 100,
    pfic_year: year >= event.first_pfic_tax_year,
    foreign_tax_credit: 0,
    interest_charge: 0,
    holding_days: days,
  }));
}

function calculateTaxableExcess(event: TaxableExcess, taxYear: number): ExcessEventResult {
  const allocations = allocateByHoldingDays(event, taxYear);
  const charges = new Map<number, z.infer<typeof yearChargeSchema>>();
  for (const charge of event.year_charges) {
    if (charges.has(charge.tax_year)) {
      throw new Error("Form 8621 has duplicate charges for a tax year");
    }
    charges.set(charge.tax_year, charge);
  }
  let currentAndPrePfic = 0;
  let priorYearTax = 0;
  let priorYearCredit = 0;
  let interest = 0;
  for (const year of allocations) {
    const charge = charges.get(year.tax_year);
    if (year.tax_year === taxYear || !year.pfic_year) {
      if (charge) {
        throw new Error(
          "Form 8621 charges apply only to prior PFIC tax years",
        );
      }
      currentAndPrePfic += year.allocated_amount;
      continue;
    }
    if (
      event.kind === ExcessEventKind.Disposition &&
      (charge?.foreign_tax_credit ?? 0) > 0
    ) {
      throw new Error(
        "Form 8621 disposition foreign tax credit needs section 1248 dividend attribution",
      );
    }
    const tax = year.allocated_amount * highestIndividualRate(year.tax_year);
    const credit = charge?.foreign_tax_credit ?? 0;
    if (credit > tax + 0.01) {
      throw new Error(
        "Form 8621 foreign tax credit exceeds this prior PFIC year's increase in tax",
      );
    }
    if (tax > credit && charge?.interest_charge === undefined) {
      throw new Error(
        "Form 8621 prior PFIC year needs a supported section 6621 interest charge",
      );
    }
    year.foreign_tax_credit = credit;
    year.interest_charge = charge?.interest_charge ?? 0;
    priorYearTax += tax;
    priorYearCredit += credit;
    interest += year.interest_charge;
    charges.delete(year.tax_year);
  }
  if (charges.size > 0) {
    throw new Error(
      "Form 8621 charges include a year outside the holding period",
    );
  }
  const line16c = Math.round(priorYearTax);
  const line16d = Math.round(priorYearCredit);
  return {
    kind: event.kind,
    holding_period_start: event.holding_period_start,
    event_date: event.event_date,
    first_pfic_tax_year: event.first_pfic_tax_year,
    amount_usd: event.amount_usd,
    allocations,
    line16b_current_and_pre_pfic_income: Math.round(currentAndPrePfic),
    line16c_prior_year_tax_before_credit: line16c,
    line16d_prior_year_foreign_tax_credit: line16d,
    line16e_additional_tax: Math.max(0, line16c - line16d),
    line16f_interest: Math.round(interest),
  };
}

function validatePriorHistory(
  event: z.infer<typeof distributionSchema>,
  taxYear: number,
): number {
  const startYear = new Date(parseDate(event.holding_period_start))
    .getUTCFullYear();
  if (startYear > taxYear) {
    throw new Error(
      `Form 8621 holding period cannot begin after tax year ${taxYear}`,
    );
  }
  const requiredYears = Array.from(
    { length: Math.min(3, taxYear - startYear) },
    (_, index) => taxYear - 1 - index,
  );
  const suppliedYears = event.prior_year_distributions.map((year) =>
    year.tax_year
  );
  if (
    requiredYears.length !== suppliedYears.length ||
    new Set(suppliedYears).size !== suppliedYears.length ||
    requiredYears.some((year) => !suppliedYears.includes(year))
  ) {
    throw new Error(
      "Form 8621 needs the distribution history for every prior holding year, up to three years, including zero-distribution years",
    );
  }
  return requiredYears.length;
}

function distributeCents(totalCents: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const amounts = weights.map((weight, index) => {
    const exact = totalCents * weight / totalWeight;
    return { index, cents: Math.floor(exact), remainder: exact % 1 };
  });
  const unallocated = totalCents - amounts.reduce(
    (sum, amount) => sum + amount.cents,
    0,
  );
  const byRemainder = [...amounts].sort((a, b) =>
    b.remainder - a.remainder || a.index - b.index
  );
  for (let index = 0; index < unallocated; index++) {
    byRemainder[index].cents++;
  }
  return amounts.map((amount) => amount.cents);
}

function calculateDistributionBlock(
  event: z.infer<typeof distributionSchema>,
  taxYear: number,
): ExcessEventResult[] {
  const priorYears = validatePriorHistory(event, taxYear);
  const start = parseDate(event.holding_period_start);
  const dates = event.current_year_distributions.map((distribution) => {
    const date = parseDate(distribution.date);
    if (date < start || new Date(date).getUTCFullYear() !== taxYear) {
      throw new Error(
        `Form 8621 distribution must occur during the ${taxYear} holding period`,
      );
    }
    return date;
  });
  if (new Set(dates).size !== dates.length) {
    throw new Error(
      "Form 8621 stock block must combine same-day distributions",
    );
  }
  const currentTotal = event.current_year_distributions.reduce(
    (sum, distribution) => sum + distribution.amount_usd,
    0,
  );
  const priorTotal = event.prior_year_distributions.reduce(
    (sum, distribution) => sum + distribution.amount_usd,
    0,
  );
  const priorPerShare = priorTotal / event.shares_in_block;
  const averagePerShare = priorYears === 0 ? 0 : priorPerShare / priorYears;
  const average = averagePerShare * event.shares_in_block;
  const threshold = averagePerShare * 1.25 * event.shares_in_block;
  const totalExcess = priorYears === 0
    ? 0
    : Math.round(Math.max(0, currentTotal - threshold) * 100) / 100;
  const nonexcess = currentTotal - totalExcess;
  if (event.taxable_nonexcess_dividend_usd > nonexcess + 0.01) {
    throw new Error(
      "Form 8621 taxable section 301 dividend exceeds nonexcess distributions",
    );
  }
  const cents = distributeCents(
    Math.round(totalExcess * 100),
    event.current_year_distributions.map((distribution) =>
      distribution.amount_usd
    ),
  );
  const results = event.current_year_distributions.map(
    (distribution, index) => {
      const amount = cents[index] / 100;
      if (amount === 0) {
        if (distribution.year_charges.length > 0) {
          throw new Error(
            "Form 8621 cannot apply charges when a distribution has no excess",
          );
        }
        return {
          kind: ExcessEventKind.Distribution,
          holding_period_start: event.holding_period_start,
          event_date: distribution.date,
          first_pfic_tax_year: event.first_pfic_tax_year,
          amount_usd: 0,
          first_holding_year: priorYears === 0,
          line15a_current_distributions: currentTotal,
          line15b_prior_distributions: priorTotal,
          line15c_prior_average: average,
          line15d_threshold: threshold,
          nonexcess_distribution: nonexcess,
          allocations: [],
          line16b_current_and_pre_pfic_income: 0,
          line16c_prior_year_tax_before_credit: 0,
          line16d_prior_year_foreign_tax_credit: 0,
          line16e_additional_tax: 0,
          line16f_interest: 0,
        };
      }
      const calculated = calculateTaxableExcess({
        kind: ExcessEventKind.Distribution,
        amount_usd: amount,
        holding_period_start: event.holding_period_start,
        event_date: distribution.date,
        first_pfic_tax_year: event.first_pfic_tax_year,
        year_charges: distribution.year_charges,
      }, taxYear);
      return {
        ...calculated,
        kind: ExcessEventKind.Distribution,
        first_holding_year: false,
        line15a_current_distributions: currentTotal,
        line15b_prior_distributions: priorTotal,
        line15c_prior_average: average,
        line15d_threshold: threshold,
        nonexcess_distribution: nonexcess,
      };
    },
  );
  return totalExcess === 0 ? [results[0]] : results;
}

export function calculateExcessEvents(
  rawEvent: ExcessEvent,
  taxYear: number,
): ExcessEventResult[] {
  if (taxYear !== 2025 && taxYear !== 2026) {
    throw new Error(`Form 8621 excess distributions are unsupported for tax year ${taxYear}`);
  }
  const event = excessEventSchema.parse(rawEvent);
  if (event.first_pfic_tax_year > taxYear) {
    throw new Error("Form 8621 first PFIC tax year cannot follow the return year");
  }
  if (event.kind === ExcessEventKind.Distribution) {
    return calculateDistributionBlock(event, taxYear);
  }
  return [calculateTaxableExcess(event, taxYear)];
}
