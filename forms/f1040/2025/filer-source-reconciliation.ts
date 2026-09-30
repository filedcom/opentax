import { type FilerIdentity, FilingStatus } from "../mef/header.ts";

function tin(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new Error(`Form 1040 ${label} source TIN must have nine digits`);
  }
  const digits = value.replaceAll("-", "");
  if (!/^\d{9}$/.test(digits)) {
    throw new Error(`Form 1040 ${label} source TIN must have nine digits`);
  }
  return digits;
}

export function assertF1040SourceIdentity(
  fields: Record<string, unknown>,
  filer: FilerIdentity,
): void {
  const taxpayer = tin(fields.taxpayer_ssn, "taxpayer");
  if (taxpayer !== undefined && taxpayer !== tin(filer.primarySSN, "filer")) {
    throw new Error("Form 1040 taxpayer source TIN differs from the filer");
  }
  const spouse = tin(fields.spouse_ssn, "spouse");
  if (
    spouse !== undefined &&
    spouse !== tin(filer.spouse?.ssn, "filer spouse")
  ) {
    throw new Error("Form 1040 spouse source TIN differs from the filer");
  }
}

export function assertF1040FinalHeader(
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): void {
  if (
    !filer || !/^\d{9}$/.test(filer.primarySSN) ||
    !filer.firstNameWithInitial?.trim() || !filer.lastName?.trim()
  ) {
    throw new Error(
      "Form 1040 export needs the identified taxpayer's SSN, first-name field, and last name",
    );
  }
  assertF1040SourceIdentity(fields, filer);
  const statusCodes: Readonly<Record<string, FilingStatus>> = {
    single: FilingStatus.Single,
    mfj: FilingStatus.MarriedFilingJointly,
    mfs: FilingStatus.MarriedFilingSeparately,
    hoh: FilingStatus.HeadOfHousehold,
    qss: FilingStatus.QualifyingSurvivingSpouse,
  };
  const status = fields.filing_status;
  if (
    typeof status !== "string" || statusCodes[status] === undefined ||
    statusCodes[status] !== filer.filingStatus
  ) {
    throw new Error(
      "Form 1040 export filing status must match the identified filer",
    );
  }
  if (typeof fields.digital_assets !== "boolean") {
    throw new Error("Form 1040 export needs the digital-assets answer");
  }
}
