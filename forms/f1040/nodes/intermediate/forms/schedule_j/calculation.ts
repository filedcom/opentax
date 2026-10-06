import {
  scheduleJBaseYearSourceTax,
  scheduleJCurrentYearTax,
  scheduleJTaxSourceSchema,
} from "./tax-source.ts";
import { z } from "zod";
import { FilingStatus } from "../../../types.ts";
import {
  baseYearSourceSchema,
  selectScheduleJBaseYearLines,
} from "../../../inputs/schedule_j/base_years.ts";
import { scheduleJPriorYearRateTax } from "../../../inputs/schedule_j/prior_year_rates.ts";
import { ordinaryTax2025 } from "../../worksheets/tax_table_2025.ts";

// Each year uses its own sourced tax-method determination and worksheet.
// Preferential inputs are distinct from elected farm gain; foreign exclusion
// and still-unverified historical Schedule D rules retain their own guards.
export const ordinaryYearFactsSchema = z.object({
  has_qualified_dividends: z.boolean(),
  has_net_capital_gain: z.boolean(),
  has_unrecaptured_section1250_gain: z.boolean(),
  has_28_percent_rate_gain: z.boolean(),
  filed_form2555: z.boolean(),
}).strict();

const dollar = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

export const scheduleJOrdinaryIncomeInputSchema = z.object({
  current_year_tax_source: scheduleJTaxSourceSchema.optional(),
  taxable_income_2025: dollar,
  filing_status_2025: z.nativeEnum(FilingStatus),
  elected_farm_income: dollar.positive(),
  elected_farm_income_net_capital_gain: dollar,
  base_year_source: baseYearSourceSchema,
  tax_treatment: z.object({
    year2025: ordinaryYearFactsSchema,
    year2022: ordinaryYearFactsSchema,
    year2023: ordinaryYearFactsSchema,
    year2024: ordinaryYearFactsSchema,
  }).strict(),
}).strict();

export type ScheduleJOrdinaryIncomeInput = z.infer<
  typeof scheduleJOrdinaryIncomeInputSchema
>;

const signedLine = z.number().int().min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);
export const scheduleJLinesSchema = z.object({
  line1: dollar,
  line2a: dollar,
  line2b: dollar,
  line2c: dollar,
  line3: dollar,
  line4: dollar,
  line5: signedLine,
  line6: dollar,
  line7: dollar,
  line8: dollar,
  line9: signedLine,
  line10: dollar,
  line11: signedLine,
  line12: dollar,
  line13: signedLine,
  line14: dollar,
  line15: signedLine,
  line16: dollar,
  line17: dollar,
  line18: dollar,
  line19: dollar,
  line20: dollar,
  line21: dollar,
  line22: dollar,
  line23: dollar,
}).strict();

export type ScheduleJLines = z.infer<typeof scheduleJLinesSchema>;

function wholeDollarTax(tax: number): number {
  return Math.round(tax);
}

/**
 * 2025 Schedule J with sourced current/base tax worksheets. Inputs and tax
 * lines use whole dollars. Line 6 is the rounded one-third amount, reused
 * unchanged on lines 10 and 14 and in each base-year tax calculation.
 *
 * The caller must establish and source taxable farm/fishing income before
 * passing the elected amount. The selected base-year lines come only from
 * filed returns and the most recent filed Schedule J, as the form directs.
 *
 * Sources: https://www.irs.gov/pub/irs-pdf/f1040sj.pdf and
 * https://www.irs.gov/instructions/i1040sj
 */
export function calculateScheduleJOrdinaryIncome(
  raw: ScheduleJOrdinaryIncomeInput,
): ScheduleJLines {
  const input = scheduleJOrdinaryIncomeInputSchema.parse(raw);
  if (input.elected_farm_income > input.taxable_income_2025) {
    throw new Error("Schedule J line 2a cannot exceed line 1");
  }
  if (input.elected_farm_income_net_capital_gain > 0) {
    throw new Error(
      "Schedule J elected net capital gain needs the Schedule D tax worksheets",
    );
  }
  for (const [year, facts] of Object.entries(input.tax_treatment)) {
    if (facts.filed_form2555) {
      throw new Error(
        `Schedule J ${year} needs its foreign-earned-income worksheet`,
      );
    }
    const source = year === "year2025"
      ? input.current_year_tax_source
      : input.base_year_source
        .base_returns[year as "year2022" | "year2023" | "year2024"]
        .preferential_tax_source;
    const flags = [
      facts.has_qualified_dividends,
      facts.has_net_capital_gain,
      facts.has_unrecaptured_section1250_gain,
      facts.has_28_percent_rate_gain,
    ];
    const amounts = source
      ? [
        source.qualified_dividends,
        source.net_capital_gain,
        source.unrecaptured_1250_gain,
        source.rate_28_gain,
      ]
      : [0, 0, 0, 0];
    if (flags.some((flag, i) => flag !== (amounts[i] > 0))) {
      throw new Error(
        `Schedule J ${year} tax treatment differs from its source worksheet amounts`,
      );
    }
  }

  const base = selectScheduleJBaseYearLines(input.base_year_source);
  const line1 = input.taxable_income_2025;
  const line2a = input.elected_farm_income;
  const line2b = 0;
  const line2c = 0;
  const line3 = line1 - line2a;
  const line4 = input.current_year_tax_source
    ? scheduleJCurrentYearTax(
      line3,
      input.filing_status_2025,
      input.current_year_tax_source,
    )
    : ordinaryTax2025(line3, input.filing_status_2025);
  const line5 = base.line5;
  // Whole-dollar filing rounds the division once; every copy and combined
  // base-year line uses that same reported amount.
  const line6 = Math.round(line2a / 3);
  const line7 = Math.max(0, line5 + line6);
  const line8 = line7 === 0 ? 0 : wholeDollarTax(
    input.base_year_source.base_returns.year2022.preferential_tax_source
      ? scheduleJBaseYearSourceTax(
        2022,
        line7,
        input.base_year_source.base_returns.year2022.filing_status,
        input.base_year_source.base_returns.year2022.preferential_tax_source!,
      )
      : scheduleJPriorYearRateTax(
        2022,
        input.base_year_source.base_returns.year2022.filing_status,
        line7,
      ),
  );
  const line9 = base.line9;
  const line10 = line6;
  const line11 = line9 + line10;
  const line12 = line11 <= 0 ? 0 : wholeDollarTax(
    input.base_year_source.base_returns.year2023.preferential_tax_source
      ? scheduleJBaseYearSourceTax(
        2023,
        line11,
        input.base_year_source.base_returns.year2023.filing_status,
        input.base_year_source.base_returns.year2023.preferential_tax_source!,
      )
      : scheduleJPriorYearRateTax(
        2023,
        input.base_year_source.base_returns.year2023.filing_status,
        line11,
      ),
  );
  const line13 = base.line13;
  const line14 = line6;
  const line15 = line13 + line14;
  const line16 = line15 <= 0 ? 0 : wholeDollarTax(
    input.base_year_source.base_returns.year2024.preferential_tax_source
      ? scheduleJBaseYearSourceTax(
        2024,
        line15,
        input.base_year_source.base_returns.year2024.filing_status,
        input.base_year_source.base_returns.year2024.preferential_tax_source!,
      )
      : scheduleJPriorYearRateTax(
        2024,
        input.base_year_source.base_returns.year2024.filing_status,
        line15,
      ),
  );
  const line17 = line4 + line8 + line12 + line16;
  const line18 = line17;
  const line19 = base.line19;
  const line20 = base.line20;
  const line21 = base.line21;
  const line22 = line19 + line20 + line21;
  const line23 = line18 - line22;
  if (
    line23 < 0 || Object.values({
      line6,
      line7,
      line8,
      line11,
      line12,
      line15,
      line16,
      line17,
      line22,
      line23,
    }).some((value) => !Number.isSafeInteger(value))
  ) {
    throw new Error(
      "Schedule J line 23 does not reconcile to a nonnegative whole-dollar tax",
    );
  }
  return {
    line1,
    line2a,
    line2b,
    line2c,
    line3,
    line4,
    line5,
    line6,
    line7,
    line8,
    line9,
    line10,
    line11,
    line12,
    line13,
    line14,
    line15,
    line16,
    line17,
    line18,
    line19,
    line20,
    line21,
    line22,
    line23,
  };
}
