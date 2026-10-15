import type { F1040Config } from "./types.ts";

/**
 * W-2 source validation only, not full F1040Config registration.
 * 2026 General Instructions W-2/W-3 boxes 3/4; Notice 2025-67.
 * https://www.irs.gov/pub/irs-pdf/iw2w3.pdf
 * https://www.irs.gov/pub/irs-drop/n-25-67.pdf
 * Checked October 15, 2026. Enhanced/SIMPLE-specific plan evidence remains
 * the responsibility of the retirement calculation, not this validation table.
 */
export const wages2026: Pick<
  F1040Config,
  "ssWageBase" | "ssTaxPerEmployer" | "retirementLimits"
> = {
  ssWageBase: 184_500,
  ssTaxPerEmployer: 11_439,
  retirementLimits: {
    "401k": { 49: 24_500, 59: 32_500, 63: 35_750, [Infinity]: 32_500 },
    "403b": { 49: 24_500, 59: 32_500, 63: 35_750, [Infinity]: 32_500 },
    "457b": { 49: 24_500, 59: 32_500, 63: 35_750, [Infinity]: 32_500 },
    "simple": { 49: 17_000, 59: 21_000, 63: 22_250, [Infinity]: 21_000 },
  },
};
