import { FilingStatus } from "../types.ts";
import type { Form2441Rules } from "../intermediate/forms/credits/individual/form2441/calculation.ts";

/** 2026 draft Form 2441 instructions, August 21, pages 5–6.
 * https://www.irs.gov/pub/irs-dft/i2441--dft.pdf
 * SHA-256 7fdecfe193df435542bb452ba108bee011bef7032fda8abe972d6fbd5de233e7
 */
export const dependentCare2026: Form2441Rules = {
  creditRate(agi, status) {
    const firstReduction = Math.min(
      15,
      Math.max(0, Math.ceil((agi - 15000) / 2000)),
    );
    const joint = status === FilingStatus.MFJ;
    const secondReduction = Math.min(
      15,
      Math.max(
        0,
        Math.ceil((agi - (joint ? 150000 : 75000)) / (joint ? 4000 : 2000)),
      ),
    );
    return (50 - firstReduction - secondReduction) / 100;
  },
  benefitLimit(details) {
    return details.filing_status === FilingStatus.MFS &&
        !details.mfs_eligibility_met
      ? 3750
      : 7500;
  },
};
