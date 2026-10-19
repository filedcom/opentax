import { scheduleJTaxSourceSchema } from "../../../../intermediate/forms/taxes/income-averaging/schedule_j/tax-source.ts";
import { z } from "zod";
import { FilingStatus } from "../../../../types.ts";
import { CONFIG_BY_YEAR } from "../../../../config/index.ts";

const reference = z.string().trim().min(1);
const amount = z.number().int().min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);
const tax = amount.nonnegative();

// The prior-year worksheets in the Schedule J instructions recover the
// taxable income hidden by Form 1040 line 15's zero floor. All amounts here
// are dollars, with losses represented as positive magnitudes.
const zeroIncomeWorksheetSchema = z.object({
  unfloored_taxable_income: amount.nonpositive(),
  unfloored_income_workpaper_reference: reference,
  schedule_d_line21_loss: tax,
  schedule_d_line16_loss: tax,
  capital_loss_carryover_to_next_year: tax,
  schedule_d_and_carryover_reference: reference,
  nol_remaining_after_base_year: tax,
  nol_reference: reference,
}).strict().superRefine((source, context) => {
  if (
    source.schedule_d_line21_loss === 0 &&
    (source.schedule_d_line16_loss !== 0 ||
      source.capital_loss_carryover_to_next_year !== 0)
  ) {
    context.addIssue({
      code: "custom",
      message: "Schedule J worksheet line 2 needs a Schedule D line 21 loss",
    });
  }
  const line2 = source.schedule_d_line21_loss === 0
    ? 0
    : source.schedule_d_line21_loss +
      source.capital_loss_carryover_to_next_year -
      source.schedule_d_line16_loss;
  if (
    line2 < 0 || line2 + source.nol_remaining_after_base_year >
      -source.unfloored_taxable_income
  ) {
    context.addIssue({
      code: "custom",
      message: "Schedule J negative-income worksheet amounts do not reconcile",
    });
  }
});

const filedReturnSchema = z.object({
  filing_status: z.nativeEnum(FilingStatus),
  preferential_tax_source: scheduleJTaxSourceSchema.optional(),
  taxable_income_line15: amount.nonnegative(),
  adjusted_taxable_income: amount.optional(),
  adjustment_reference: reference.optional(),
  filed_line16_tax: tax,
  section1_tax_from_line16: tax,
  filed_return_reference: reference,
  section1_tax_workpaper_reference: reference,
  zero_income_worksheet: zeroIncomeWorksheetSchema.optional(),
}).strict().refine(
  (source) => source.section1_tax_from_line16 <= source.filed_line16_tax,
  {
    message:
      "Schedule J base-year section 1 tax exceeds filed Form 1040 line 16",
  },
).refine((source) =>
  (source.adjusted_taxable_income === undefined) ===
    (source.adjustment_reference === undefined), {
  message:
    "Schedule J adjusted taxable income requires its filed adjustment reference",
}).refine(
  (source) =>
    ((source.adjusted_taxable_income ?? source.taxable_income_line15) <= 0) ===
      (source.zero_income_worksheet !== undefined),
  {
    message:
      "Schedule J zero or negative adjusted taxable income requires its sourced worksheet; positive income must not provide one",
  },
);

type FiledReturnSchema = typeof filedReturnSchema;
export type ScheduleJYearKey = `year${number}`;

export function scheduleJYearKey(year: number): ScheduleJYearKey {
  return `year${year}`;
}

/** Lines 5-16 average over the three years before the return year. */
export function scheduleJBaseYears(
  taxYear: number,
): readonly [number, number, number] {
  return [taxYear - 3, taxYear - 2, taxYear - 1];
}

/** A strict object keyed `year<YYYY>` for exactly the given years. */
export function yearKeyedSchema<T extends z.ZodTypeAny>(
  years: readonly number[],
  item: T,
) {
  const shape: Record<ScheduleJYearKey, T> = Object.fromEntries(
    years.map((year) => [scheduleJYearKey(year), item]),
  );
  return z.object(shape).strict();
}

const firstYearScheduleJ = z.object({
  line3: amount,
  line4: tax,
  filed_schedule_j_reference: reference,
}).strict();
const secondYearScheduleJ = z.object({
  line15: amount,
  line3: amount,
  line16: tax,
  line4: tax,
  filed_schedule_j_reference: reference,
}).strict();
const thirdYearScheduleJ = z.object({
  line11: amount,
  line15: amount,
  line3: amount,
  line12: tax,
  line16: tax,
  line4: tax,
  filed_schedule_j_reference: reference,
}).strict();

/**
 * The latest filed Schedule J controls all six base-year selections. Do not
 * mix its columns with direct 1040 values from another route. Its lines
 * depend on how far before the return year it was filed: the draft 2026
 * Schedule J (Created 4/30/26) lines 5, 9, 13 and 19-21 read the 2025
 * Schedule J lines 11/15/3 and 12/16/4, the 2024 lines 15/3 and 16/4, and the
 * 2023 lines 3 and 4, as the 2025 form reads its 2024, 2023 and 2022 forms.
 */
export function baseYearSourceSchemaFor(taxYear: number) {
  const [first, second, third] = scheduleJBaseYears(taxYear);
  const base_returns = yearKeyedSchema<FiledReturnSchema>(
    [first, second, third],
    filedReturnSchema,
  );
  return z.discriminatedUnion("latest_averaging_year", [
    z.object({
      latest_averaging_year: z.literal("none"),
      base_returns,
    }).strict(),
    z.object({
      latest_averaging_year: z.literal(first),
      base_returns,
      latest_filed_schedule_j: firstYearScheduleJ,
    }).strict(),
    z.object({
      latest_averaging_year: z.literal(second),
      base_returns,
      latest_filed_schedule_j: secondYearScheduleJ,
    }).strict(),
    z.object({
      latest_averaging_year: z.literal(third),
      base_returns,
      latest_filed_schedule_j: thirdYearScheduleJ,
    }).strict(),
  ]);
}

/** Return years the engine serves, each with its own base years. */
const RETURN_YEARS = Object.keys(CONFIG_BY_YEAR).map(Number);

function anyReturnYear<T extends z.ZodTypeAny>(
  schemaFor: (taxYear: number) => T,
): z.ZodType<z.infer<T>> {
  const [first, second, ...rest] = RETURN_YEARS.map(schemaFor);
  if (!first) throw new Error("Schedule J needs at least one return year");
  return second ? z.union([first, second, ...rest]) : first;
}

/** Any served return year's source; compute re-parses it for ctx.taxYear. */
export const baseYearSourceSchema = anyReturnYear(baseYearSourceSchemaFor);

/** Ordinary-rate facts for the return year and each of its base years. */
export function taxTreatmentSchemaFor<T extends z.ZodTypeAny>(
  taxYear: number,
  facts: T,
) {
  return yearKeyedSchema<T>([...scheduleJBaseYears(taxYear), taxYear], facts);
}

export function anyTaxTreatmentSchema<T extends z.ZodTypeAny>(facts: T) {
  return anyReturnYear((taxYear) => taxTreatmentSchemaFor(taxYear, facts));
}

export type BaseYearSource = z.infer<ReturnType<typeof baseYearSourceSchemaFor>>;
type FiledReturn = z.infer<FiledReturnSchema>;

function directBaseIncome(filedReturn: FiledReturn): number {
  const effectiveIncome = filedReturn.adjusted_taxable_income ??
    filedReturn.taxable_income_line15;
  if (effectiveIncome > 0) {
    return effectiveIncome;
  }
  const worksheet = filedReturn.zero_income_worksheet!;
  const line1 = -worksheet.unfloored_taxable_income;
  const line2 = worksheet.schedule_d_line21_loss === 0
    ? 0
    : worksheet.schedule_d_line21_loss +
      worksheet.capital_loss_carryover_to_next_year -
      worksheet.schedule_d_line16_loss;
  return -(line1 - line2 - worksheet.nol_remaining_after_base_year);
}

/** The filed base-year return for one of the return year's base years. */
export function scheduleJBaseReturn(
  source: BaseYearSource,
  year: number,
): FiledReturn {
  const filed = source.base_returns[scheduleJYearKey(year)];
  if (!filed) throw new Error(`Schedule J has no filed ${year} base return`);
  return filed;
}

export function selectScheduleJBaseYearLines(
  raw: BaseYearSource,
  taxYear: number,
): {
  line5: number;
  line9: number;
  line13: number;
  line19: number;
  line20: number;
  line21: number;
} {
  const source = baseYearSourceSchemaFor(taxYear).parse(raw);
  const years = scheduleJBaseYears(taxYear);
  const [first, second, third] = years.map((year) =>
    scheduleJBaseReturn(source, year)
  );
  if (source.latest_averaging_year === "none") {
    return {
      line5: directBaseIncome(first),
      line9: directBaseIncome(second),
      line13: directBaseIncome(third),
      line19: first.section1_tax_from_line16,
      line20: second.section1_tax_from_line16,
      line21: third.section1_tax_from_line16,
    };
  }
  if (source.latest_averaging_year === years[2]) {
    const prior = thirdYearScheduleJ.parse(source.latest_filed_schedule_j);
    return {
      line5: prior.line11,
      line9: prior.line15,
      line13: prior.line3,
      line19: prior.line12,
      line20: prior.line16,
      line21: prior.line4,
    };
  }
  if (source.latest_averaging_year === years[1]) {
    const prior = secondYearScheduleJ.parse(source.latest_filed_schedule_j);
    return {
      line5: prior.line15,
      line9: prior.line3,
      line13: directBaseIncome(third),
      line19: prior.line16,
      line20: prior.line4,
      line21: third.section1_tax_from_line16,
    };
  }
  const prior = firstYearScheduleJ.parse(source.latest_filed_schedule_j);
  return {
    line5: prior.line3,
    line9: directBaseIncome(second),
    line13: directBaseIncome(third),
    line19: prior.line4,
    line20: second.section1_tax_from_line16,
    line21: third.section1_tax_from_line16,
  };
}
