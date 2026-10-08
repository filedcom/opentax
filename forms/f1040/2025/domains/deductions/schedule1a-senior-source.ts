import { z } from "zod";
import { FilingStatus } from "../../../nodes/types.ts";
import {
  filerCreditEligibility,
  isAge65ByEndOfTaxYear,
} from "../../../nodes/inputs/general/filer-eligibility.ts";
const factsSchema = z.object({
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_dob: z.string().optional(),
  spouse_dob: z.string().optional(),
  taxpayer_age_65_or_older: z.boolean().optional(),
  spouse_age_65_or_older: z.boolean().optional(),
  taxpayer_ssn: z.string().optional(),
  spouse_ssn: z.string().optional(),
  taxpayer_ssn_valid_for_employment: z.boolean().optional(),
  spouse_ssn_valid_for_employment: z.boolean().optional(),
  taxpayer_ssn_issued_before_due_date: z.boolean().optional(),
  spouse_ssn_issued_before_due_date: z.boolean().optional(),
  taxpayer_tin_issued_by_due_date: z.boolean().optional(),
  spouse_tin_issued_by_due_date: z.boolean().optional(),
});
/** Replay retained general age and SSN eligibility facts for each claimed senior. */
export function assertSchedule1ASeniorGeneralSource(
  raw: unknown,
  input: {
    filing_status?: FilingStatus;
    taxpayer_ssn?: string;
    spouse_ssn?: string;
    taxpayer_age_65_or_older?: boolean;
    spouse_age_65_or_older?: boolean;
    taxpayer_has_valid_ssn?: boolean;
    spouse_has_valid_ssn?: boolean;
  },
  taxpayerClaim: number,
  spouseClaim: number,
): void {
  // Descriptor-only callers have no public general packet. Actual independent health requires it in its core binder.
  if (raw === undefined) return;
  const source = factsSchema.parse(raw), ssn = filerCreditEligibility(source);
  if (source.filing_status !== input.filing_status) {
    throw new Error(
      "Schedule1A senior filing status differs from retained general source",
    );
  }
  for (
    const [owner, claim, valid] of [[
      "taxpayer",
      taxpayerClaim,
      ssn.taxpayerValidSsn,
    ], ["spouse", spouseClaim, ssn.spouseValidSsn]] as const
  ) {
    if (claim === 0) continue;
    const dobAge = isAge65ByEndOfTaxYear(source[`${owner}_dob`], 2025, owner);
    const flag = source[`${owner}_age_65_or_older`];
    if (dobAge !== undefined && flag !== undefined && dobAge !== flag) {
      throw new Error(
        "Schedule1A senior source age answer conflicts with actual date of birth",
      );
    }
    const sourceSsn = source[`${owner}_ssn`],
      claimedSsn = input[`${owner}_ssn`];
    if (
      (flag ?? dobAge) !== true || input[`${owner}_age_65_or_older`] !== true ||
      !valid || input[`${owner}_has_valid_ssn`] !== true || !sourceSsn ||
      !claimedSsn ||
      sourceSsn.replace(/-/g, "") !== claimedSsn.replace(/-/g, "")
    ) {
      throw new Error(
        "Schedule1A senior age and timely valid SSN must match retained general source",
      );
    }
  }
}
