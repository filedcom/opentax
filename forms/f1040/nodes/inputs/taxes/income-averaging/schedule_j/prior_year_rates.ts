import { FilingStatus } from "../../../../types.ts";

// Schedule J lines 8, 12 and 16 use each base year's Tax Rate Schedules, not
// that year's Tax Table. The 2025 Schedule J instructions reproduce the 2022,
// 2023 and 2024 schedules. The 2025 schedules are the Rev. Proc. 2024-40
// §3.01 brackets; the 2025 Tax Computation Worksheet (2025 Form 1040
// instructions, p. 80) prints the same breakpoints from 22% up. QDCG,
// Schedule D, and Form 2555 branches need their separate worksheets and must
// not be routed through this function.
const rates = [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37] as const;

const thresholds: Readonly<
  Record<number, Record<FilingStatus, readonly number[]>>
> = {
  2022: {
    [FilingStatus.Single]: [0, 10_275, 41_775, 89_075, 170_050, 215_950, 539_900],
    [FilingStatus.MFS]: [0, 10_275, 41_775, 89_075, 170_050, 215_950, 323_925],
    [FilingStatus.MFJ]: [0, 20_550, 83_550, 178_150, 340_100, 431_900, 647_850],
    [FilingStatus.QSS]: [0, 20_550, 83_550, 178_150, 340_100, 431_900, 647_850],
    [FilingStatus.HOH]: [0, 14_650, 55_900, 89_050, 170_050, 215_950, 539_900],
  },
  2023: {
    [FilingStatus.Single]: [0, 11_000, 44_725, 95_375, 182_100, 231_250, 578_125],
    [FilingStatus.MFS]: [0, 11_000, 44_725, 95_375, 182_100, 231_250, 346_875],
    [FilingStatus.MFJ]: [0, 22_000, 89_450, 190_750, 364_200, 462_500, 693_750],
    [FilingStatus.QSS]: [0, 22_000, 89_450, 190_750, 364_200, 462_500, 693_750],
    [FilingStatus.HOH]: [0, 15_700, 59_850, 95_350, 182_100, 231_250, 578_100],
  },
  2024: {
    [FilingStatus.Single]: [0, 11_600, 47_150, 100_525, 191_950, 243_725, 609_350],
    [FilingStatus.MFS]: [0, 11_600, 47_150, 100_525, 191_950, 243_725, 365_600],
    [FilingStatus.MFJ]: [0, 23_200, 94_300, 201_050, 383_900, 487_450, 731_200],
    [FilingStatus.QSS]: [0, 23_200, 94_300, 201_050, 383_900, 487_450, 731_200],
    [FilingStatus.HOH]: [0, 16_550, 63_100, 100_500, 191_950, 243_700, 609_350],
  },
  2025: {
    [FilingStatus.Single]: [0, 11_925, 48_475, 103_350, 197_300, 250_525, 626_350],
    [FilingStatus.MFS]: [0, 11_925, 48_475, 103_350, 197_300, 250_525, 375_800],
    [FilingStatus.MFJ]: [0, 23_850, 96_950, 206_700, 394_600, 501_050, 751_600],
    [FilingStatus.QSS]: [0, 23_850, 96_950, 206_700, 394_600, 501_050, 751_600],
    [FilingStatus.HOH]: [0, 17_000, 64_850, 103_350, 197_300, 250_500, 626_350],
  },
};

export function scheduleJPriorYearRateTax(
  year: number,
  status: FilingStatus,
  income: number,
): number {
  if (!Number.isFinite(income) || income < 0) {
    throw new Error("Schedule J prior-year rate income must be nonnegative");
  }
  const starts = thresholds[year]?.[status];
  if (!starts || starts.length !== rates.length) {
    throw new Error("Schedule J prior-year rate schedule is unavailable");
  }
  const tax = rates.reduce((sum, rate, index) => {
    const taxedInBracket = Math.max(
      0,
      Math.min(income, starts[index + 1] ?? Infinity) - starts[index],
    );
    return sum + taxedInBracket * rate;
  }, 0);
  return Math.round(tax * 100) / 100;
}
