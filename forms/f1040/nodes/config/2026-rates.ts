/** TY2026 federal rate tables and standard deductions.
 * IRS Rev. Proc. 2025-32 §§4.01 and 4.14, pinned in
 * docs/ty2026/corpus/manifest.json.
 */
import { FilingStatus } from "../types.ts";
import type { Bracket } from "./types.ts";

export const BRACKETS_MFJ_2026: ReadonlyArray<Bracket> = [
  { over: 0, upTo: 24_800, rate: 0.10, base: 0 },
  { over: 24_800, upTo: 100_800, rate: 0.12, base: 2_480 },
  { over: 100_800, upTo: 211_400, rate: 0.22, base: 11_600 },
  { over: 211_400, upTo: 403_550, rate: 0.24, base: 35_932 },
  { over: 403_550, upTo: 512_450, rate: 0.32, base: 82_048 },
  { over: 512_450, upTo: 768_700, rate: 0.35, base: 116_896 },
  { over: 768_700, upTo: Infinity, rate: 0.37, base: 206_583.50 },
] as const;

export const BRACKETS_HOH_2026: ReadonlyArray<Bracket> = [
  { over: 0, upTo: 17_700, rate: 0.10, base: 0 },
  { over: 17_700, upTo: 67_450, rate: 0.12, base: 1_770 },
  { over: 67_450, upTo: 105_700, rate: 0.22, base: 7_740 },
  { over: 105_700, upTo: 201_750, rate: 0.24, base: 16_155 },
  { over: 201_750, upTo: 256_200, rate: 0.32, base: 39_207 },
  { over: 256_200, upTo: 640_600, rate: 0.35, base: 56_631 },
  { over: 640_600, upTo: Infinity, rate: 0.37, base: 191_171 },
] as const;

export const BRACKETS_SINGLE_2026: ReadonlyArray<Bracket> = [
  { over: 0, upTo: 12_400, rate: 0.10, base: 0 },
  { over: 12_400, upTo: 50_400, rate: 0.12, base: 1_240 },
  { over: 50_400, upTo: 105_700, rate: 0.22, base: 5_800 },
  { over: 105_700, upTo: 201_775, rate: 0.24, base: 17_966 },
  { over: 201_775, upTo: 256_225, rate: 0.32, base: 41_024 },
  { over: 256_225, upTo: 640_600, rate: 0.35, base: 58_448 },
  { over: 640_600, upTo: Infinity, rate: 0.37, base: 192_979.25 },
] as const;

export const BRACKETS_MFS_2026: ReadonlyArray<Bracket> = [
  { over: 0, upTo: 12_400, rate: 0.10, base: 0 },
  { over: 12_400, upTo: 50_400, rate: 0.12, base: 1_240 },
  { over: 50_400, upTo: 105_700, rate: 0.22, base: 5_800 },
  { over: 105_700, upTo: 201_775, rate: 0.24, base: 17_966 },
  { over: 201_775, upTo: 256_225, rate: 0.32, base: 41_024 },
  { over: 256_225, upTo: 384_350, rate: 0.35, base: 58_448 },
  { over: 384_350, upTo: Infinity, rate: 0.37, base: 103_291.75 },
] as const;

export const STANDARD_DEDUCTION_BASE_2026: Record<FilingStatus, number> = {
  [FilingStatus.Single]: 16_100,
  [FilingStatus.MFJ]: 32_200,
  [FilingStatus.MFS]: 16_100,
  [FilingStatus.HOH]: 24_150,
  [FilingStatus.QSS]: 32_200,
};

export const STANDARD_DEDUCTION_ADDITIONAL_2026: Record<FilingStatus, number> =
  {
    [FilingStatus.Single]: 2_050,
    [FilingStatus.MFJ]: 1_650,
    [FilingStatus.MFS]: 1_650,
    [FilingStatus.HOH]: 2_050,
    [FilingStatus.QSS]: 1_650,
  };
