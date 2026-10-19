import { z } from "zod";

// MACRS for property placed in service before the return year, by the
// percentage tables of Pub. 946 (2025), Appendix A. A row's rate is its
// recovery year's percentage of the unadjusted depreciable basis.

export enum PriorYearRecoveryPeriod {
  Year3 = "3",
  Year5 = "5",
  Year7 = "7",
  Year10 = "10",
  Year15 = "15",
  Year20 = "20",
  Residential = "27.5",
  Nonresidential = "39",
}

export enum PriorYearMethod {
  DoubleDeclining = "200 DB",
  Declining150 = "150 DB",
  StraightLine = "S/L",
}

export enum PriorYearConvention {
  HalfYear = "HY",
  MidQuarter = "MQ",
  MidMonth = "MM",
}

const dollars = z.number().int().nonnegative();

export const priorYearAssetSchema = z.object({
  asset_description: z.string().trim().min(1).max(100),
  placed_in_service_date: z.string().date(),
  cost_or_other_basis: dollars.positive(),
  business_use_pct: z.number().gt(50).max(100).default(100),
  section179_deduction: dollars.default(0),
  special_depreciation_allowance: dollars.default(0),
  recovery_period: z.nativeEnum(PriorYearRecoveryPeriod),
  method: z.nativeEnum(PriorYearMethod),
  convention: z.nativeEnum(PriorYearConvention),
  prior_depreciation: dollars,
  // A disposition-year deduction follows its own convention rules.
  not_disposed_in_tax_year_verified: z.literal(true),
}).strict();

export type PriorYearAsset = z.infer<typeof priorYearAssetSchema>;

export const priorYearDepreciationRowSchema = z.object({
  asset_description: z.string(),
  recovery_year: z.number().int().positive(),
  rate_pct: z.number().nonnegative(),
  depreciable_basis: dollars,
  deduction: dollars,
}).strict();

export type PriorYearDepreciationRow = z.infer<
  typeof priorYearDepreciationRowSchema
>;

type Table = ReadonlyMap<number, readonly number[]>;

// Table A-1: GDS 200% and 150% declining balance, half-year convention.
const HALF_YEAR: Table = new Map([
    [3, [33.33, 44.45, 14.81, 7.41]],
    [5, [20, 32, 19.2, 11.52, 11.52, 5.76]],
    [7, [14.29, 24.49, 17.49, 12.49, 8.93, 8.92, 8.93, 4.46]],
    [10, [10, 18, 14.4, 11.52, 9.22, 7.37, 6.55, 6.55, 6.56, 6.55, 3.28]],
    [15, [5, 9.5, 8.55, 7.7, 6.93, 6.23, 5.9, 5.9, 5.91, 5.9, 5.91, 5.9, 5.91, 5.9, 5.91, 2.95]],
    [20, [3.75, 7.219, 6.677, 6.177, 5.713, 5.285, 4.888, 4.522, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 4.462, 4.461, 2.231]],
]);

// Tables A-2 to A-5: mid-quarter convention, by quarter placed in service.
const MID_QUARTER: readonly Table[] = [
  new Map([
    [3, [58.33, 27.78, 12.35, 1.54]],
    [5, [35, 26, 15.6, 11.01, 11.01, 1.38]],
    [7, [25, 21.43, 15.31, 10.93, 8.75, 8.74, 8.75, 1.09]],
    [10, [17.5, 16.5, 13.2, 10.56, 8.45, 6.76, 6.55, 6.55, 6.56, 6.55, 0.82]],
    [15, [8.75, 9.13, 8.21, 7.39, 6.65, 5.99, 5.9, 5.91, 5.9, 5.91, 5.9, 5.91, 5.9, 5.91, 5.9, 0.74]],
    [20, [6.563, 7, 6.482, 5.996, 5.546, 5.13, 4.746, 4.459, 4.459, 4.459, 4.459, 4.46, 4.459, 4.46, 4.459, 4.46, 4.459, 4.46, 4.459, 4.46, 0.565]],
  ]),
  new Map([
    [3, [41.67, 38.89, 14.14, 5.3]],
    [5, [25, 30, 18, 11.37, 11.37, 4.26]],
    [7, [17.85, 23.47, 16.76, 11.97, 8.87, 8.87, 8.87, 3.34]],
    [10, [12.5, 17.5, 14, 11.2, 8.96, 7.17, 6.55, 6.55, 6.56, 6.55, 2.46]],
    [15, [6.25, 9.38, 8.44, 7.59, 6.83, 6.15, 5.91, 5.9, 5.91, 5.9, 5.91, 5.9, 5.91, 5.9, 5.91, 2.21]],
    [20, [4.688, 7.148, 6.612, 6.116, 5.658, 5.233, 4.841, 4.478, 4.463, 4.463, 4.463, 4.463, 4.463, 4.463, 4.462, 4.463, 4.462, 4.463, 4.462, 4.463, 1.673]],
  ]),
  new Map([
    [3, [25, 50, 16.67, 8.33]],
    [5, [15, 34, 20.4, 12.24, 11.3, 7.06]],
    [7, [10.71, 25.51, 18.22, 13.02, 9.3, 8.85, 8.86, 5.53]],
    [10, [7.5, 18.5, 14.8, 11.84, 9.47, 7.58, 6.55, 6.55, 6.56, 6.55, 4.1]],
    [15, [3.75, 9.63, 8.66, 7.8, 7.02, 6.31, 5.9, 5.9, 5.91, 5.9, 5.91, 5.9, 5.91, 5.9, 5.91, 3.69]],
    [20, [2.813, 7.289, 6.742, 6.237, 5.769, 5.336, 4.936, 4.566, 4.46, 4.46, 4.46, 4.46, 4.461, 4.46, 4.461, 4.46, 4.461, 4.46, 4.461, 4.46, 2.788]],
  ]),
  new Map([
    [3, [8.33, 61.11, 20.37, 10.19]],
    [5, [5, 38, 22.8, 13.68, 10.94, 9.58]],
    [7, [3.57, 27.55, 19.68, 14.06, 10.04, 8.73, 8.73, 7.64]],
    [10, [2.5, 19.5, 15.6, 12.48, 9.98, 7.99, 6.55, 6.55, 6.56, 6.55, 5.74]],
    [15, [1.25, 9.88, 8.89, 8, 7.2, 6.48, 5.9, 5.9, 5.9, 5.91, 5.9, 5.91, 5.9, 5.91, 5.9, 5.17]],
    [20, [0.938, 7.43, 6.872, 6.357, 5.88, 5.439, 5.031, 4.654, 4.458, 4.458, 4.458, 4.458, 4.458, 4.458, 4.458, 4.458, 4.458, 4.459, 4.458, 4.459, 3.901]],
  ]),
];

// Tables A-6 and A-7a, straight line, mid-month convention. Table A-6
// alternates 3.637% and 3.636% from year 10, January-June columns taking
// 3.637% in even years and July-December in odd years; the last years take
// the remainder of 100%. Table A-7a is 2.564% for years 2-39.
function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

// First-year rates by month placed in service, as printed.
const RESIDENTIAL_FIRST_YEAR = [
  3.485, 3.182, 2.879, 2.576, 2.273, 1.97, 1.667, 1.364, 1.061, 0.758, 0.455,
  0.152,
] as const;
const NONRESIDENTIAL_FIRST_YEAR = [
  2.461, 2.247, 2.033, 1.819, 1.605, 1.391, 1.177, 0.963, 0.749, 0.535, 0.321,
  0.107,
] as const;

function residentialRates(month: number): number[] {
  const first = RESIDENTIAL_FIRST_YEAR[month - 1];
  const middle = Array.from({ length: 26 }, (_, index) => {
    const year = index + 2;
    if (year <= 9) return 3.636;
    const high = month <= 6 ? year % 2 === 0 : year % 2 === 1;
    return high ? 3.637 : 3.636;
  });
  const remaining = round3(100 - first - middle.reduce((a, b) => a + b, 0));
  const year28 = month <= 6 ? 3.637 : 3.636;
  return remaining > year28
    ? [first, ...middle, year28, round3(remaining - year28)]
    : [first, ...middle, remaining];
}

function nonresidentialRates(month: number): number[] {
  const first = NONRESIDENTIAL_FIRST_YEAR[month - 1];
  const middle = Array.from({ length: 38 }, () => 2.564);
  return [first, ...middle, round3(100 - first - 38 * 2.564)];
}

const PERSONAL_METHOD: ReadonlyMap<number, PriorYearMethod> = new Map([
  [3, PriorYearMethod.DoubleDeclining],
  [5, PriorYearMethod.DoubleDeclining],
  [7, PriorYearMethod.DoubleDeclining],
  [10, PriorYearMethod.DoubleDeclining],
  [15, PriorYearMethod.Declining150],
  [20, PriorYearMethod.Declining150],
]);

function tableRates(asset: PriorYearAsset): readonly number[] {
  const month = Number(asset.placed_in_service_date.slice(5, 7));
  if (
    asset.recovery_period === PriorYearRecoveryPeriod.Residential ||
    asset.recovery_period === PriorYearRecoveryPeriod.Nonresidential
  ) {
    if (
      asset.method !== PriorYearMethod.StraightLine ||
      asset.convention !== PriorYearConvention.MidMonth
    ) {
      throw new Error(
        "Real property MACRS uses straight line and the mid-month convention",
      );
    }
    if (
      asset.recovery_period === PriorYearRecoveryPeriod.Nonresidential &&
      asset.placed_in_service_date < "1993-05-13"
    ) {
      throw new Error(
        "Nonresidential real property placed in service before May 13, 1993 uses Table A-7",
      );
    }
    return asset.recovery_period === PriorYearRecoveryPeriod.Residential
      ? residentialRates(month)
      : nonresidentialRates(month);
  }
  const period = Number(asset.recovery_period);
  if (asset.method !== PERSONAL_METHOD.get(period)) {
    throw new Error(
      "Prior-year MACRS supports the GDS declining-balance tables A-1 to A-5",
    );
  }
  if (asset.convention === PriorYearConvention.MidMonth) {
    throw new Error("Personal property uses the half-year or mid-quarter convention");
  }
  const table = asset.convention === PriorYearConvention.HalfYear
    ? HALF_YEAR
    : MID_QUARTER[Math.ceil(month / 3) - 1];
  return table.get(period)!;
}

/** The return year's deduction for one asset placed in service earlier. */
export function priorYearDepreciation(
  raw: PriorYearAsset,
  taxYear: number,
): PriorYearDepreciationRow {
  const asset = priorYearAssetSchema.parse(raw);
  const placedYear = Number(asset.placed_in_service_date.slice(0, 4));
  if (placedYear >= taxYear) {
    throw new Error(
      "Prior-year MACRS needs property placed in service before the return year",
    );
  }
  if (asset.placed_in_service_date < "1987-01-01") {
    throw new Error("Prior-year MACRS covers property placed in service after 1986");
  }
  const businessBasis = Math.round(
    asset.cost_or_other_basis * asset.business_use_pct / 100,
  );
  const depreciableBasis = businessBasis - asset.section179_deduction -
    asset.special_depreciation_allowance;
  if (depreciableBasis < 0 || asset.prior_depreciation > depreciableBasis) {
    throw new Error(
      "Prior-year MACRS basis is less than section 179, special allowance or prior depreciation",
    );
  }
  const rates = tableRates(asset);
  const recoveryYear = taxYear - placedYear + 1;
  const rate = rates[recoveryYear - 1] ?? 0;
  const deduction = Math.min(
    Math.round(depreciableBasis * rate / 100),
    depreciableBasis - asset.prior_depreciation,
  );
  return priorYearDepreciationRowSchema.parse({
    asset_description: asset.asset_description,
    recovery_year: recoveryYear,
    rate_pct: rate,
    depreciable_basis: depreciableBasis,
    deduction,
  });
}

/** An activity's prior-year asset rows and their total deduction. */
export function priorYearDepreciationTotal(
  assets: readonly PriorYearAsset[],
  taxYear: number,
): { rows: PriorYearDepreciationRow[]; total: number } {
  const rows = assets.map((asset) => priorYearDepreciation(asset, taxYear));
  return { rows, total: rows.reduce((sum, row) => sum + row.deduction, 0) };
}
