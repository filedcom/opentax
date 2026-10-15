import { FilingStatus } from "../types.ts";
import { incomeTax2026 } from "./2026-income.ts";
import type { IncomeWorksheetConfig } from "../intermediate/worksheets/taxes/calculation/tax_worksheets.ts";

/** Rev. Proc. 2025-32 §§4.01/4.03; 2026 draft Pub. 1040 and i1116 page 27.
 * Worksheet structure remains subject to final 2026 i1040gi/i1040sd review.
 */
export const incomeWorksheet2026: IncomeWorksheetConfig = {
  ...incomeTax2026,
  qdcgtZeroCeiling: {
    [FilingStatus.Single]: 49450,
    [FilingStatus.MFJ]: 98900,
    [FilingStatus.MFS]: 49450,
    [FilingStatus.HOH]: 66200,
    [FilingStatus.QSS]: 98900,
  },
  qdcgtTwentyFloor: {
    [FilingStatus.Single]: 545500,
    [FilingStatus.MFJ]: 613700,
    [FilingStatus.MFS]: 306850,
    [FilingStatus.HOH]: 579600,
    [FilingStatus.QSS]: 613700,
  },
  scheduleDLine19Limit: {
    [FilingStatus.Single]: 201775,
    [FilingStatus.MFJ]: 403550,
    [FilingStatus.MFS]: 201775,
    [FilingStatus.HOH]: 201750,
    [FilingStatus.QSS]: 403550,
  },
};
