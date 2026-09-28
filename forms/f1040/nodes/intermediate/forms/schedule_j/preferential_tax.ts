import { FilingStatus } from "../../../types.ts";
import { scheduleJPriorYearRateTax } from "../../../inputs/schedule_j/prior_year_rates.ts";

export type ScheduleJBaseYear = 2022 | 2023 | 2024;

type CommonFacts = {
  year: ScheduleJBaseYear;
  filingStatus: FilingStatus;
  taxableIncomeWithAllocation: number;
  filedForm2555: boolean;
};

export type ScheduleJBaseYearPreferentialFacts = CommonFacts & (
  | {
    method: "qualified_dividends";
    qualifiedDividends: number;
    netCapitalGain: number;
    form4952Line4g: number;
    electedFarmNetCapitalGain: number;
  }
  | {
    method: "schedule_d";
    qualifiedDividends: number;
    scheduleDLine15: number;
    scheduleDLine16: number;
    scheduleDLine18: number;
    scheduleDLine19: number;
    form4952Line4g: number;
    form4952Line4e: number;
    allocatedElectedNetCapitalGain: number;
    allocatedElectedUnrecaptured1250Gain: number;
  }
);

const zeroCeiling: Record<ScheduleJBaseYear, Record<FilingStatus, number>> = {
  2022: { single: 41_675, mfs: 41_675, mfj: 83_350, qss: 83_350, hoh: 55_800 },
  2023: { single: 44_625, mfs: 44_625, mfj: 89_250, qss: 89_250, hoh: 59_750 },
  2024: { single: 47_025, mfs: 47_025, mfj: 94_050, qss: 94_050, hoh: 63_000 },
};

const twentyCeiling: Record<ScheduleJBaseYear, Record<FilingStatus, number>> = {
  2022: { single: 459_750, mfs: 258_600, mfj: 517_200, qss: 517_200, hoh: 488_500 },
  2023: { single: 492_300, mfs: 276_900, mfj: 553_850, qss: 553_850, hoh: 523_050 },
  2024: { single: 518_900, mfs: 291_850, mfj: 583_750, qss: 583_750, hoh: 551_350 },
};

const scheduleDOrdinaryCeiling: Record<ScheduleJBaseYear, number> = {
  2022: 170_050,
  2023: 182_100,
  2024: 191_950,
};

function nonnegativeWholeDollar(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a nonnegative whole-dollar amount`);
  }
}

function validate(facts: ScheduleJBaseYearPreferentialFacts): void {
  if (facts.filedForm2555) {
    throw new Error("Schedule J base-year Form 2555 needs the foreign-earned-income worksheet");
  }
  if (!zeroCeiling[facts.year]?.[facts.filingStatus]) {
    throw new Error("Schedule J preferential-rate base year or filing status is unavailable");
  }
  for (const [name, value] of Object.entries(facts)) {
    if (typeof value === "number" && name !== "year" &&
        name !== "scheduleDLine15" && name !== "scheduleDLine16") {
      nonnegativeWholeDollar(value, name);
    }
  }
  if (facts.method === "qualified_dividends") {
    if (facts.electedFarmNetCapitalGain !== 0) {
      throw new Error("Schedule J elected net capital gain requires the Schedule D worksheet");
    }
    if (facts.form4952Line4g > facts.qualifiedDividends + facts.netCapitalGain) {
      throw new Error("Form 4952 line 4g exceeds qualified dividends and net capital gain");
    }
    return;
  }
  if (facts.method !== "schedule_d") {
    throw new Error("Schedule J preferential-rate worksheet method is unavailable");
  }
  if (facts.year !== 2024) {
    throw new Error(
      `Schedule J ${facts.year} cites Schedule D worksheet tax lines that conflict with the archived ${facts.year} Schedule D instructions`,
    );
  }
  if (!Number.isSafeInteger(facts.scheduleDLine15) ||
      !Number.isSafeInteger(facts.scheduleDLine16)) {
    throw new Error("Schedule D lines 15 and 16 must be whole-dollar amounts");
  }
  if (facts.form4952Line4e > facts.form4952Line4g ||
      facts.allocatedElectedUnrecaptured1250Gain > facts.allocatedElectedNetCapitalGain) {
    throw new Error("Schedule D worksheet elections and allocated gains do not reconcile");
  }
}

function rateTax(facts: CommonFacts, income: number): number {
  return scheduleJPriorYearRateTax(facts.year, facts.filingStatus, income);
}

// 2025 Schedule J instructions reproduce a separate 27-line worksheet for
// each base year. This follows lines 1-27, using the base year's rates for
// ordinary tax on lines 24 and 26.
function qualifiedDividendsTax(
  facts: Extract<ScheduleJBaseYearPreferentialFacts, { method: "qualified_dividends" }>,
): number {
  const line1 = facts.taxableIncomeWithAllocation;
  const line2 = facts.qualifiedDividends;
  const line3 = facts.netCapitalGain;
  const line4 = line2 + line3;
  const line5 = facts.form4952Line4g;
  const line6 = Math.max(0, line4 - line5);
  const line7 = Math.max(0, line1 - line6);
  const line9 = Math.min(line1, zeroCeiling[facts.year][facts.filingStatus]);
  const line10 = Math.min(line7, line9);
  const line11 = line9 - line10;
  const line12 = Math.min(line1, line6);
  const line14 = line12 - line11;
  const line16 = Math.min(line1, twentyCeiling[facts.year][facts.filingStatus]);
  const line18 = Math.max(0, line16 - (line7 + line11));
  const line19 = Math.min(line14, line18);
  const line22 = line12 - (line11 + line19);
  const line25 = line19 * 0.15 + line22 * 0.20 + rateTax(facts, line7);
  return Math.round(Math.min(line25, rateTax(facts, line1)));
}

// The official 2024 Schedule D instructions publish this 47-line worksheet.
// Its line 7 and line 11 include the allocated elected gains required by the
// 2025 Schedule J line 16 instructions. Earlier years remain closed because
// the 2025 Schedule J line references conflict with the archived worksheets.
function scheduleDTax(
  facts: Extract<ScheduleJBaseYearPreferentialFacts, { method: "schedule_d" }>,
): number {
  const line1 = facts.taxableIncomeWithAllocation;
  const line5 = Math.max(0, facts.form4952Line4g - facts.form4952Line4e);
  const line6 = Math.max(0, facts.qualifiedDividends - line5);
  const line7 = Math.min(facts.scheduleDLine15, facts.scheduleDLine16) +
    facts.allocatedElectedNetCapitalGain;
  const line8 = Math.min(facts.form4952Line4g, facts.form4952Line4e);
  const line9 = Math.max(0, line7 - line8);
  const line10 = line6 + line9;
  const line11 = facts.scheduleDLine18 + facts.scheduleDLine19 +
    facts.allocatedElectedUnrecaptured1250Gain;
  const line12 = Math.min(line9, line11);
  const line13 = line10 - line12;
  const line14 = Math.max(0, line1 - line13);
  const line16 = Math.min(line1, zeroCeiling[facts.year][facts.filingStatus]);
  const line17 = Math.min(line14, line16);
  const line18 = Math.max(0, line1 - line10);
  const ordinaryCeiling = scheduleDOrdinaryCeiling[facts.year] *
    (facts.filingStatus === FilingStatus.MFJ || facts.filingStatus === FilingStatus.QSS ? 2 : 1);
  const line19 = Math.min(line1, ordinaryCeiling);
  const line20 = Math.min(line14, line19);
  const line21 = Math.max(line18, line20);
  const line22 = line16 - line17;
  // When line 1 equals line 16, the worksheet skips directly to lines 44-47.
  if (line1 === line16) return Math.round(Math.min(rateTax(facts, line21), rateTax(facts, line1)));
  const line23 = Math.min(line1, line13);
  const line25 = Math.max(0, line23 - line22);
  const line27 = Math.min(line1, twentyCeiling[facts.year][facts.filingStatus]);
  const line29 = Math.max(0, line27 - (line21 + line22));
  const line30 = Math.min(line25, line29);
  const line31 = line30 * 0.15;
  const line32 = line22 + line30;
  if (line1 === line32) return Math.round(Math.min(line31 + rateTax(facts, line21), rateTax(facts, line1)));
  const line33 = line23 - line32;
  const line34 = line33 * 0.20;
  const line35 = Math.min(line9, facts.scheduleDLine19 + facts.allocatedElectedUnrecaptured1250Gain);
  const line38 = Math.max(0, line10 + line21 - line1);
  const line39 = Math.max(0, line35 - line38);
  const line40 = line39 * 0.25;
  const line41 = line21 + line22 + line30 + line33 + line39;
  const line43 = facts.scheduleDLine18 > 0 ? (line1 - line41) * 0.28 : 0;
  const line45 = line31 + line34 + line40 + line43 + rateTax(facts, line21);
  return Math.round(Math.min(line45, rateTax(facts, line1)));
}

/**
 * Tax for 2025 Schedule J line 8, 12, or 16 before any Form 2555 refigure.
 * Pass the corresponding Schedule J line 7, 11, or 15 as taxable income.
 * The source amounts come from the filed base-year return; allocated elected
 * gains come from 2025 Schedule J lines 2b/2c, divided among three years.
 *
 * Sources: https://www.irs.gov/instructions/i1040sj and
 * https://www.irs.gov/pub/irs-prior/i1040sd--2022.pdf (likewise 2023/2024).
 */
export function calculateScheduleJBaseYearPreferentialTax(
  facts: ScheduleJBaseYearPreferentialFacts,
): number {
  validate(facts);
  if (facts.taxableIncomeWithAllocation === 0) return 0;
  return facts.method === "qualified_dividends"
    ? qualifiedDividendsTax(facts)
    : scheduleDTax(facts);
}
