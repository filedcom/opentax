import { z } from "zod";

// Each Part V event has its own holding period. The source provides dates and
// supported charges, while the year allocation is calculated from elapsed days.
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const yearChargeSchema = z.object({
  tax_year: z.number().int().min(1987).max(2024),
  foreign_tax_credit: z.number().nonnegative().optional(),
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
  first_pfic_tax_year: z.number().int().min(1987).max(2025),
  year_charges: z.array(yearChargeSchema),
}).strict();

const foreignDispositionSchema = dispositionSchema.omit({ amount_usd: true })
  .extend({
    currency_code: z.string().regex(/^[A-Z]{3}$/).refine((code) =>
      code !== "USD"
    ),
    net_proceeds_foreign: z.number().positive(),
    spot_usd_per_unit: z.number().positive().finite(),
    spot_rate_source: z.string().trim().min(1),
    adjusted_basis_usd: z.number().nonnegative(),
  }).strict();

const distributionBaseSchema = z.object({
  kind: z.literal(ExcessEventKind.Distribution),
  holding_period_start: dateSchema,
  first_pfic_tax_year: z.number().int().min(1987).max(2025),
  shares_in_block: z.number().positive(),
  // Section 301 classification is a separate corporate earnings-and-profits
  // fact. It cannot exceed the calculated nonexcess portion in USD.
  taxable_nonexcess_dividend_usd: z.number().nonnegative(),
});

const distributionSchema = distributionBaseSchema.extend({
  prior_year_distributions: z.array(
    z.object({
      tax_year: z.number().int().min(2022).max(2024),
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
}).strict();

// Form 8621 line 15 requires the excess threshold to be determined in the
// common foreign currency when every relevant distribution uses that currency.
// Each 2025 excess portion is then translated at its own distribution-date
// spot rate. Prior-year rates are not needed for this same-currency threshold.
const foreignDistributionSchema = distributionBaseSchema.extend({
  currency_code: z.string().regex(/^[A-Z]{3}$/).refine((code) =>
    code !== "USD"
  ),
  prior_year_distributions: z.array(
    z.object({
      tax_year: z.number().int().min(2022).max(2024),
      amount_foreign: z.number().nonnegative(),
    }).strict(),
  ),
  current_year_distributions: z.array(
    z.object({
      date: dateSchema,
      amount_foreign: z.number().positive(),
      spot_usd_per_unit: z.number().positive().finite(),
      spot_rate_source: z.string().trim().min(1),
      year_charges: z.array(yearChargeSchema),
    }).strict(),
  ).min(1),
}).strict();

export const excessEventSchema = z.union([
  distributionSchema,
  foreignDistributionSchema,
  dispositionSchema,
  foreignDispositionSchema,
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
  currency_code: string;
  amount_form_currency: number;
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

// IRS 2025 Form 8621 instructions, line 16f: each prior PFIC year's net tax
// bears interest from that return's statutory due date through the 2025
// return's statutory due date. Section 1291(c)(3) uses the section 6621
// underpayment rate; 26 CFR 301.6622-1 compounds daily with a 365/366 divisor.
// Section 7503 lets a return be filed on the next workday but does not change
// the interest due date. Taxpayer-specific relief is not captured or checked.
// TY2019 and TY2020 are excluded because the nationwide COVID postponements
// need a separate section 1291 due-date analysis. Fiscal years are not modeled.
// https://www.irs.gov/instructions/i8621 (Part V, line 16f)
// https://www.irs.gov/pub/irs-drop/rr-24-18.pdf (rate tables, pp. 6-10)
// https://www.irs.gov/payments/quarterly-interest-rates (2025-26)
// https://www.ecfr.gov/current/title-26/section-301.6622-1
// https://www.irs.gov/irm/part20/irm_20-002-005r (IRM 20.2.5.5)
// https://www.irs.gov/filing/individuals/how-to-file (TY2025 Apr. 15)
const section6621QuarterlyUnderpaymentRates: Record<number, readonly number[]> =
  {
    1988: [11, 10, 10, 11],
    1989: [11, 12, 12, 11],
    1990: [11, 11, 11, 11],
    1991: [11, 10, 10, 10],
    1992: [9, 8, 8, 7],
    1993: [7, 7, 7, 7],
    1994: [7, 7, 8, 9],
    1995: [9, 10, 9, 9],
    1996: [9, 8, 9, 9],
    1997: [9, 9, 9, 9],
    1998: [9, 8, 8, 8],
    1999: [7, 8, 8, 8],
    2000: [8, 9, 9, 9],
    2001: [9, 8, 7, 7],
    2002: [6, 6, 6, 6],
    2003: [5, 5, 5, 4],
    2004: [4, 5, 4, 5],
    2005: [5, 6, 6, 7],
    2006: [7, 7, 8, 8],
    2007: [8, 8, 8, 8],
    2008: [7, 6, 5, 6],
    2009: [5, 4, 4, 4],
    2010: [4, 4, 4, 4],
    2011: [3, 4, 4, 3],
    2012: [3, 3, 3, 3],
    2013: [3, 3, 3, 3],
    2014: [3, 3, 3, 3],
    2015: [3, 3, 3, 3],
    2016: [3, 4, 4, 4],
    2017: [4, 4, 4, 4],
    2018: [4, 5, 5, 5],
    2019: [6, 6, 5, 5],
    2020: [5, 5, 3, 3],
    2021: [3, 3, 3, 3],
    2022: [3, 4, 5, 6],
    2023: [7, 7, 7, 8],
    2024: [8, 8, 8, 8],
    2025: [7, 7, 7, 7],
    // Interest for a TY2025 excess distribution stops on April 15, 2026.
    2026: [7, 6],
  };

function section1291StatutoryCalendarDueDate(taxYear: number): string {
  if (!Number.isInteger(taxYear) || taxYear < 1987 || taxYear > 2025) {
    throw new Error(
      `Form 8621 lacks a statutory Form 1040 due date for ${taxYear}`,
    );
  }
  if (taxYear === 2019 || taxYear === 2020) {
    throw new Error(
      `Form 8621 section 1291 due date for TY${taxYear} needs COVID-postponement analysis`,
    );
  }
  return `${taxYear + 1}-04-15`;
}

export function calculateSection1291Interest(
  priorTaxYear: number,
  netIncreaseInTax: number,
): number {
  if (!Number.isFinite(netIncreaseInTax) || netIncreaseInTax < 0) {
    throw new Error("Form 8621 section 1291 net increase in tax is invalid");
  }
  if (netIncreaseInTax === 0) return 0;
  const end = parseDate(section1291StatutoryCalendarDueDate(2025));
  let day = parseDate(section1291StatutoryCalendarDueDate(priorTaxYear));
  let balance = netIncreaseInTax;
  while (day < end) {
    const date = new Date(day);
    const year = date.getUTCFullYear();
    const quarter = Math.floor(date.getUTCMonth() / 3);
    const annualRatePercent = section6621QuarterlyUnderpaymentRates[year]?.[
      quarter
    ];
    if (annualRatePercent === undefined) {
      throw new Error(
        `Form 8621 section 1291 lacks verified section 6621 rate for ${
          date.toISOString().slice(0, 10)
        }`,
      );
    }
    const leapYear = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;
    balance *= 1 + annualRatePercent / 100 / (leapYear ? 366 : 365);
    day += millisecondsPerDay;
  }
  return Math.round((balance - netIncreaseInTax) * 100) / 100;
}

function holdingDays(start: number, end: number): number {
  return Math.round((end - start) / millisecondsPerDay) + 1;
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

type TaxableExcess = Omit<z.infer<typeof dispositionSchema>, "kind"> & {
  kind: ExcessEventKind;
};

function allocateByHoldingDays(event: TaxableExcess): ExcessYearAllocation[] {
  const start = parseDate(event.holding_period_start);
  const end = parseDate(event.event_date);
  const startYear = new Date(start).getUTCFullYear();
  if (end < start || new Date(end).getUTCFullYear() !== 2025) {
    throw new Error(
      "Form 8621 Part V needs a valid holding period ending on a 2025 event date",
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
  for (let year = startYear; year <= 2025; year++) {
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

function calculateTaxableExcess(event: TaxableExcess): ExcessEventResult {
  const allocations = allocateByHoldingDays(event);
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
    if (year.tax_year === 2025 || !year.pfic_year) {
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
    year.foreign_tax_credit = credit;
    year.interest_charge = calculateSection1291Interest(
      year.tax_year,
      Math.max(0, tax - credit),
    );
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
    currency_code: "USD",
    amount_form_currency: event.amount_usd,
    amount_usd: event.amount_usd,
    allocations,
    line16b_current_and_pre_pfic_income: Math.round(currentAndPrePfic),
    line16c_prior_year_tax_before_credit: line16c,
    line16d_prior_year_foreign_tax_credit: line16d,
    line16e_additional_tax: Math.max(0, line16c - line16d),
    line16f_interest: Math.round(interest),
  };
}

type DistributionBlock =
  | z.infer<typeof distributionSchema>
  | z.infer<typeof foreignDistributionSchema>;

function validatePriorHistory(event: DistributionBlock): number {
  const startYear = new Date(parseDate(event.holding_period_start))
    .getUTCFullYear();
  if (startYear > 2025) {
    throw new Error(
      "Form 8621 holding period cannot begin after tax year 2025",
    );
  }
  const requiredYears = Array.from(
    { length: Math.min(3, 2025 - startYear) },
    (_, index) => 2024 - index,
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
  event: DistributionBlock,
): ExcessEventResult[] {
  const foreign = "currency_code" in event;
  const currencyCode = foreign ? event.currency_code : "USD";
  const priorYears = validatePriorHistory(event);
  const start = parseDate(event.holding_period_start);
  const dates = event.current_year_distributions.map((distribution) => {
    const date = parseDate(distribution.date);
    if (date < start || new Date(date).getUTCFullYear() !== 2025) {
      throw new Error(
        "Form 8621 distribution must occur during the 2025 holding period",
      );
    }
    return date;
  });
  if (new Set(dates).size !== dates.length) {
    throw new Error(
      "Form 8621 stock block must combine same-day distributions",
    );
  }
  const currentAmounts = event.current_year_distributions.map((distribution) =>
    "amount_foreign" in distribution
      ? distribution.amount_foreign
      : distribution.amount_usd
  );
  const currentUsd = event.current_year_distributions.map((distribution) =>
    "amount_foreign" in distribution
      ? Math.round(
        distribution.amount_foreign * distribution.spot_usd_per_unit * 100,
      )
      : Math.round(distribution.amount_usd * 100)
  );
  const currentTotal = currentAmounts.reduce((sum, amount) => sum + amount, 0);
  const priorTotal = event.prior_year_distributions.reduce(
    (sum, distribution) =>
      sum +
      ("amount_foreign" in distribution
        ? distribution.amount_foreign
        : distribution.amount_usd),
    0,
  );
  const priorPerShare = priorTotal / event.shares_in_block;
  const averagePerShare = priorYears === 0 ? 0 : priorPerShare / priorYears;
  const average = averagePerShare * event.shares_in_block;
  const threshold = averagePerShare * 1.25 * event.shares_in_block;
  const totalExcess = priorYears === 0
    ? 0
    : Math.round(Math.max(0, currentTotal - threshold) * 100) / 100;
  const cents = distributeCents(
    Math.round(totalExcess * 100),
    currentAmounts,
  );
  const excessUsd = cents.map((amount, index) => {
    const distribution = event.current_year_distributions[index];
    return "amount_foreign" in distribution
      ? Math.round(amount * distribution.spot_usd_per_unit)
      : amount;
  });
  const nonexcessUsdCents = currentUsd.reduce(
    (sum, amount, index) => sum + amount - excessUsd[index],
    0,
  );
  const nonexcessUsd = nonexcessUsdCents / 100;
  if (event.taxable_nonexcess_dividend_usd > nonexcessUsd + 0.01) {
    throw new Error(
      "Form 8621 taxable section 301 dividend exceeds nonexcess distributions",
    );
  }
  const results = event.current_year_distributions.map(
    (distribution, index) => {
      const amountFormCurrency = cents[index] / 100;
      const amount = excessUsd[index] / 100;
      if (amountFormCurrency > 0 && amount === 0) {
        throw new Error(
          "Form 8621 foreign excess converts to less than one USD cent",
        );
      }
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
          currency_code: currencyCode,
          amount_form_currency: 0,
          amount_usd: 0,
          first_holding_year: priorYears === 0,
          line15a_current_distributions: currentTotal,
          line15b_prior_distributions: priorTotal,
          line15c_prior_average: average,
          line15d_threshold: threshold,
          nonexcess_distribution: nonexcessUsd,
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
      });
      return {
        ...calculated,
        kind: ExcessEventKind.Distribution,
        currency_code: currencyCode,
        amount_form_currency: amountFormCurrency,
        first_holding_year: false,
        line15a_current_distributions: currentTotal,
        line15b_prior_distributions: priorTotal,
        line15c_prior_average: average,
        line15d_threshold: threshold,
        nonexcess_distribution: nonexcessUsd,
      };
    },
  );
  return totalExcess === 0 ? [results[0]] : results;
}

export function calculateExcessEvents(
  rawEvent: ExcessEvent,
): ExcessEventResult[] {
  const event = excessEventSchema.parse(rawEvent);
  if (event.kind === ExcessEventKind.Distribution) {
    return calculateDistributionBlock(event);
  }
  if ("net_proceeds_foreign" in event) {
    const netProceedsUsd = Math.round(
      event.net_proceeds_foreign * event.spot_usd_per_unit * 100,
    ) / 100;
    const gainUsd = Math.round(
      (netProceedsUsd - event.adjusted_basis_usd) * 100,
    ) / 100;
    if (gainUsd <= 0) {
      throw new Error(
        "Form 8621 section 1291 disposition needs a positive USD gain; report a loss under its applicable return provision",
      );
    }
    return [calculateTaxableExcess({
      kind: event.kind,
      amount_usd: gainUsd,
      holding_period_start: event.holding_period_start,
      event_date: event.event_date,
      first_pfic_tax_year: event.first_pfic_tax_year,
      year_charges: event.year_charges,
    })];
  }
  return [calculateTaxableExcess(event)];
}
