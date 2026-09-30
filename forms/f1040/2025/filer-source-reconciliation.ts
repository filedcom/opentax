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

export function assertAttorneyFeeSourceIdentity(
  pending: Record<string, unknown>,
  filer: FilerIdentity,
): void {
  const scheduleC = pending.schedule_c;
  if (!scheduleC || typeof scheduleC !== "object") return;
  const fields = scheduleC as Record<string, unknown>;
  const sources = fields.attorney_fee_sources;
  if (sources === undefined) return;
  if (!Array.isArray(sources)) {
    throw new Error("1099-MISC box 10 attorney fee sources must be an array");
  }
  const businesses = fields.schedule_cs;
  if (!Array.isArray(businesses)) {
    throw new Error("1099-MISC box 10 needs a Schedule C business");
  }
  const feeTotals = new Map<string, number>();
  for (const source of sources) {
    if (!source || typeof source !== "object") {
      throw new Error("1099-MISC box 10 attorney fee source is invalid");
    }
    const row = source as Record<string, unknown>;
    const matches = businesses.filter((business) =>
      business && typeof business === "object" &&
      business.business_reference === row.business_reference
    );
    if (matches.length !== 1) {
      throw new Error(
        "1099-MISC box 10 needs one matching Schedule C business",
      );
    }
    if (
      typeof row.amount !== "number" || !Number.isFinite(row.amount) ||
      row.amount <= 0 ||
      typeof row.allocation_review_reference !== "string" ||
      !row.allocation_review_reference.trim() ||
      typeof matches[0].line_1_gross_receipts !== "number" ||
      matches[0].line_1_gross_receipts < row.amount
    ) {
      throw new Error(
        "1099-MISC box 10 retained fees must be included in Schedule C gross receipts",
      );
    }
    const businessReference = row.business_reference as string;
    const total = (feeTotals.get(businessReference) ?? 0) + row.amount;
    if (total > matches[0].line_1_gross_receipts) {
      throw new Error(
        "1099-MISC box 10 retained fees exceed Schedule C gross receipts",
      );
    }
    feeTotals.set(businessReference, total);
    const proprietor = matches[0].proprietor_recipient;
    if (matches[0].line_f_accounting_method !== "cash") {
      throw new Error(
        "1099-MISC box 10 retained fees need a cash-basis Schedule C business",
      );
    }
    const expected = proprietor === "T"
      ? tin(filer.primarySSN, "taxpayer")
      : proprietor === "S"
      ? tin(filer.spouse?.ssn, "spouse")
      : undefined;
    if (
      !expected ||
      tin(row.recipient_tin, "1099-MISC box 10 recipient") !== expected
    ) {
      throw new Error(
        "1099-MISC box 10 recipient differs from the Schedule C proprietor",
      );
    }
  }
}

export function assertF1040FinalHeader(
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): void {
  if (fields.dual_status_return_2025 === true) {
    throw new Error("TY2025 dual-status return cannot use Form 1040 e-file");
  }
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
