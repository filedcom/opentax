import { z } from "zod";
import { FilingStatus } from "../../types.ts";

const reference = z.string().trim().min(1);
const amount = z.number().int().min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);
const tax = amount.nonnegative();

// The prior-year worksheets on the 2025 Schedule J instructions recover the
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
  if (source.schedule_d_line21_loss === 0 &&
    (source.schedule_d_line16_loss !== 0 ||
      source.capital_loss_carryover_to_next_year !== 0)) {
    context.addIssue({ code: "custom", message: "Schedule J worksheet line 2 needs a Schedule D line 21 loss" });
  }
  const line2 = source.schedule_d_line21_loss === 0 ? 0 :
    source.schedule_d_line21_loss +
    source.capital_loss_carryover_to_next_year -
    source.schedule_d_line16_loss;
  if (line2 < 0 || line2 + source.nol_remaining_after_base_year >
      -source.unfloored_taxable_income) {
    context.addIssue({ code: "custom", message: "Schedule J negative-income worksheet amounts do not reconcile" });
  }
});

const filedReturnSchema = z.object({
  filing_status: z.nativeEnum(FilingStatus),
  taxable_income_line15: amount.nonnegative(),
  adjusted_taxable_income: amount.optional(),
  adjustment_reference: reference.optional(),
  filed_line16_tax: tax,
  section1_tax_from_line16: tax,
  filed_return_reference: reference,
  section1_tax_workpaper_reference: reference,
  zero_income_worksheet: zeroIncomeWorksheetSchema.optional(),
}).strict().refine((source) =>
  source.section1_tax_from_line16 <= source.filed_line16_tax, {
  message: "Schedule J base-year section 1 tax exceeds filed Form 1040 line 16",
}).refine((source) =>
  (source.adjusted_taxable_income === undefined) ===
    (source.adjustment_reference === undefined), {
  message: "Schedule J adjusted taxable income requires its filed adjustment reference",
}).refine((source) =>
  ((source.adjusted_taxable_income ?? source.taxable_income_line15) <= 0) ===
    (source.zero_income_worksheet !== undefined), {
  message: "Schedule J zero or negative adjusted taxable income requires its sourced worksheet; positive income must not provide one",
});

const baseReturnsSchema = z.object({
  year2022: filedReturnSchema,
  year2023: filedReturnSchema,
  year2024: filedReturnSchema,
}).strict();

const prior2022ScheduleJ = z.object({
  line3: amount,
  line4: tax,
  filed_schedule_j_reference: reference,
}).strict();
const prior2023ScheduleJ = z.object({
  line15: amount,
  line3: amount,
  line16: tax,
  line4: tax,
  filed_schedule_j_reference: reference,
}).strict();
const prior2024ScheduleJ = z.object({
  line11: amount,
  line15: amount,
  line3: amount,
  line12: tax,
  line16: tax,
  line4: tax,
  filed_schedule_j_reference: reference,
}).strict();

// The latest filed Schedule J controls all six base-year selections on the
// 2025 form. Do not mix its columns with direct 1040 values from another route.
export const baseYearSourceSchema = z.discriminatedUnion("latest_averaging_year", [
  z.object({
    latest_averaging_year: z.literal("none"),
    base_returns: baseReturnsSchema,
  }).strict(),
  z.object({
    latest_averaging_year: z.literal(2022),
    base_returns: baseReturnsSchema,
    latest_filed_schedule_j: prior2022ScheduleJ,
  }).strict(),
  z.object({
    latest_averaging_year: z.literal(2023),
    base_returns: baseReturnsSchema,
    latest_filed_schedule_j: prior2023ScheduleJ,
  }).strict(),
  z.object({
    latest_averaging_year: z.literal(2024),
    base_returns: baseReturnsSchema,
    latest_filed_schedule_j: prior2024ScheduleJ,
  }).strict(),
]);

export type BaseYearSource = z.infer<typeof baseYearSourceSchema>;

function directBaseIncome(
  filedReturn: z.infer<typeof filedReturnSchema>,
): number {
  const effectiveIncome = filedReturn.adjusted_taxable_income ??
    filedReturn.taxable_income_line15;
  if (effectiveIncome > 0) {
    return effectiveIncome;
  }
  const worksheet = filedReturn.zero_income_worksheet!;
  const line1 = -worksheet.unfloored_taxable_income;
  const line2 = worksheet.schedule_d_line21_loss === 0 ? 0 :
    worksheet.schedule_d_line21_loss +
    worksheet.capital_loss_carryover_to_next_year -
    worksheet.schedule_d_line16_loss;
  return -(line1 - line2 - worksheet.nol_remaining_after_base_year);
}

export function selectScheduleJBaseYearLines(raw: BaseYearSource): {
  line5: number;
  line9: number;
  line13: number;
  line19: number;
  line20: number;
  line21: number;
} {
  const source = baseYearSourceSchema.parse(raw);
  const base = source.base_returns;
  if (source.latest_averaging_year === 2024) {
    const prior = source.latest_filed_schedule_j;
    return {
      line5: prior.line11,
      line9: prior.line15,
      line13: prior.line3,
      line19: prior.line12,
      line20: prior.line16,
      line21: prior.line4,
    };
  }
  if (source.latest_averaging_year === 2023) {
    const prior = source.latest_filed_schedule_j;
    return {
      line5: prior.line15,
      line9: prior.line3,
      line13: directBaseIncome(base.year2024),
      line19: prior.line16,
      line20: prior.line4,
      line21: base.year2024.section1_tax_from_line16,
    };
  }
  if (source.latest_averaging_year === 2022) {
    const prior = source.latest_filed_schedule_j;
    return {
      line5: prior.line3,
      line9: directBaseIncome(base.year2023),
      line13: directBaseIncome(base.year2024),
      line19: prior.line4,
      line20: base.year2023.section1_tax_from_line16,
      line21: base.year2024.section1_tax_from_line16,
    };
  }
  return {
    line5: directBaseIncome(base.year2022),
    line9: directBaseIncome(base.year2023),
    line13: directBaseIncome(base.year2024),
    line19: base.year2022.section1_tax_from_line16,
    line20: base.year2023.section1_tax_from_line16,
    line21: base.year2024.section1_tax_from_line16,
  };
}
