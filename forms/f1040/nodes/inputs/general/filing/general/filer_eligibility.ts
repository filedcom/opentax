import { FilingStatus } from "../../../../types.ts";

export interface FilerCreditFacts {
  filing_status: FilingStatus;
  taxpayer_ssn?: string;
  taxpayer_ssn_valid_for_employment?: boolean;
  taxpayer_ssn_issued_before_due_date?: boolean;
  taxpayer_tin_issued_by_due_date?: boolean;
  spouse_ssn?: string;
  spouse_ssn_valid_for_employment?: boolean;
  spouse_ssn_issued_before_due_date?: boolean;
  spouse_tin_issued_by_due_date?: boolean;
}

export interface FilerCreditEligibility {
  taxpayerValidSsn: boolean;
  spouseValidSsn: boolean;
  ctc: boolean;
  odc: boolean;
  eitc: boolean;
}

export function filerCreditEligibility(
  facts: FilerCreditFacts,
): FilerCreditEligibility {
  const taxpayerTimelyTin = Boolean(facts.taxpayer_ssn) &&
    facts.taxpayer_tin_issued_by_due_date === true;
  const spouseTimelyTin = Boolean(facts.spouse_ssn) &&
    facts.spouse_tin_issued_by_due_date === true;
  const taxpayerEitcSsn = taxpayerTimelyTin &&
    facts.taxpayer_ssn_valid_for_employment === true;
  const spouseEitcSsn = spouseTimelyTin &&
    facts.spouse_ssn_valid_for_employment === true;
  const taxpayerCtcSsn = taxpayerEitcSsn &&
    facts.taxpayer_ssn_issued_before_due_date === true;
  const spouseCtcSsn = spouseEitcSsn &&
    facts.spouse_ssn_issued_before_due_date === true;
  const joint = facts.filing_status === FilingStatus.MFJ;
  return {
    taxpayerValidSsn: taxpayerCtcSsn,
    spouseValidSsn: spouseCtcSsn,
    ctc: joint
      ? (taxpayerCtcSsn && spouseTimelyTin) ||
        (spouseCtcSsn && taxpayerTimelyTin)
      : taxpayerCtcSsn,
    odc: taxpayerTimelyTin && (!joint || spouseTimelyTin),
    eitc: taxpayerEitcSsn && (!joint || spouseEitcSsn),
  };
}

export function isAge65ByEndOfTaxYear(
  dob: string | undefined,
  taxYear: number,
  owner: "taxpayer" | "spouse",
): boolean | undefined {
  if (dob === undefined) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (match === null) {
    throw new Error(`${owner} date of birth must be a valid YYYY-MM-DD date`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birthDate = Date.UTC(
    year,
    month - 1,
    day,
  );
  const parsed = new Date(birthDate);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`${owner} date of birth must be a valid YYYY-MM-DD date`);
  }
  if (birthDate > Date.UTC(taxYear, 11, 31)) {
    throw new Error(`${owner} date of birth is after the tax year`);
  }
  const cutoff = Date.UTC(taxYear - 64, 0, 2);
  return birthDate < cutoff;
}
