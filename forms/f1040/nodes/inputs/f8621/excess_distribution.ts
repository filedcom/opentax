import { z } from "zod";

// Each Part V event has its own holding period. The source provides dates and
// supported charges, while the year allocation is calculated from elapsed days.
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const yearChargeSchema = z.object({
  tax_year: z.number().int().min(1987).max(2024),
  foreign_tax_credit: z.number().nonnegative().optional(),
  // Interest under section 6621 is sourced for each prior PFIC year until
  // historical interest-rate periods and payment dates are modeled here.
  interest_charge: z.number().nonnegative().optional(),
}).strict();

export enum ExcessEventKind {
  Distribution = "distribution",
  Disposition = "disposition",
}

export const excessEventSchema = z.object({
  kind: z.nativeEnum(ExcessEventKind),
  amount_usd: z.number().positive(),
  holding_period_start: dateSchema,
  event_date: dateSchema,
  first_pfic_tax_year: z.number().int().min(1987).max(2025),
  year_charges: z.array(yearChargeSchema),
}).strict();

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

function allocateByHoldingDays(event: ExcessEvent): ExcessYearAllocation[] {
  const start = parseDate(event.holding_period_start);
  const end = parseDate(event.event_date);
  const startYear = new Date(start).getUTCFullYear();
  if (end < start || new Date(end).getUTCFullYear() !== 2025) {
    throw new Error(
      "Form 8621 Part V needs a valid holding period ending on a 2025 event date",
    );
  }
  if (event.kind === ExcessEventKind.Distribution && startYear === 2025) {
    throw new Error(
      "Form 8621 cannot have an excess distribution in the first tax year of the holding period",
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

export function calculateExcessEvent(rawEvent: ExcessEvent): ExcessEventResult {
  const event = excessEventSchema.parse(rawEvent);
  const allocations = allocateByHoldingDays(event);
  const charges = new Map<number, ExcessEvent["year_charges"][number]>();
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
    allocations,
    line16b_current_and_pre_pfic_income: Math.round(currentAndPrePfic),
    line16c_prior_year_tax_before_credit: line16c,
    line16d_prior_year_foreign_tax_credit: line16d,
    line16e_additional_tax: Math.max(0, line16c - line16d),
    line16f_interest: Math.round(interest),
  };
}
