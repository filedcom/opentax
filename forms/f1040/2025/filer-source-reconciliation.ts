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

export function assertScheduleCReceiptSourceIdentity(
  pending: Record<string, unknown>,
  filer: FilerIdentity,
): void {
  const scheduleC = pending.schedule_c;
  if (!scheduleC || typeof scheduleC !== "object") return;
  const fields = scheduleC as Record<string, unknown>;
  if (
    typeof fields.line1_gross_receipts === "number" &&
    fields.line1_gross_receipts > 0
  ) {
    throw new Error(
      "Schedule C top-level gross receipts need business-linked source rows",
    );
  }
  const attorneySources = fields.attorney_fee_sources;
  const receiptSources = fields.f1099m_receipt_sources;
  const necSources = fields.f1099nec_receipt_sources;
  if (
    attorneySources === undefined && receiptSources === undefined &&
    necSources === undefined
  ) return;
  if (
    (attorneySources !== undefined && !Array.isArray(attorneySources)) ||
    (receiptSources !== undefined && !Array.isArray(receiptSources)) ||
    (necSources !== undefined && !Array.isArray(necSources))
  ) {
    throw new Error("1099 Schedule C sources must be arrays");
  }
  const businesses = fields.schedule_cs;
  if (!Array.isArray(businesses)) {
    throw new Error("1099 receipts need a Schedule C business");
  }
  const rows = [
    ...(attorneySources ?? []).map((source: unknown) => ({
      source,
      kind: "attorney" as const,
    })),
    ...(receiptSources ?? []).map((source: unknown) => ({
      source,
      kind: "misc" as const,
    })),
    ...(necSources ?? []).map((source: unknown) => ({
      source,
      kind: "nec" as const,
    })),
  ];
  const totals = new Map<string, number>();
  for (const { source, kind } of rows) {
    if (!source || typeof source !== "object") {
      throw new Error("1099 Schedule C source is invalid");
    }
    const row = source as Record<string, unknown>;
    const matches = businesses.filter((business) =>
      business && typeof business === "object" &&
      business.business_reference === row.business_reference
    );
    if (matches.length !== 1) {
      throw new Error(
        "1099 receipts need one matching Schedule C business",
      );
    }
    if (
      typeof row.amount !== "number" || !Number.isFinite(row.amount) ||
      row.amount <= 0 ||
      (kind === "attorney" &&
        (typeof row.allocation_review_reference !== "string" ||
          !row.allocation_review_reference.trim())) ||
      (kind === "misc" &&
        ![
          "box1_rents",
          "box2_royalties",
          "box3_other_income",
          "box5_fishing_boat",
          "box6_medical_payments",
          "box11_fish_purchased",
        ].includes(row.box as string)) ||
      (kind === "nec" &&
        (typeof row.payer_name !== "string" || !row.payer_name.trim() ||
          !tin(row.payer_tin, "1099-NEC payer"))) ||
      typeof matches[0].line_1_gross_receipts !== "number" ||
      matches[0].line_1_gross_receipts < row.amount
    ) {
      throw new Error(
        "1099 source amount must be included in Schedule C gross receipts",
      );
    }
    const businessReference = row.business_reference as string;
    const total = (totals.get(businessReference) ?? 0) + row.amount;
    if (total > matches[0].line_1_gross_receipts) {
      throw new Error(
        "1099 sources exceed Schedule C gross receipts",
      );
    }
    totals.set(businessReference, total);
    const proprietor = matches[0].proprietor_recipient;
    if (matches[0].line_f_accounting_method !== "cash") {
      throw new Error(
        "1099 receipts need a cash-basis Schedule C business",
      );
    }
    const expected = proprietor === "T"
      ? tin(filer.primarySSN, "taxpayer")
      : proprietor === "S"
      ? tin(filer.spouse?.ssn, "spouse")
      : undefined;
    if (
      !expected ||
      tin(row.recipient_tin, "1099 recipient") !== expected
    ) {
      throw new Error(
        "1099 recipient differs from the Schedule C proprietor",
      );
    }
  }
}

export function assertSchedule1Box3SourceIdentity(
  pending: Record<string, unknown>,
  filer: FilerIdentity,
): void {
  const schedule1 = pending.schedule1;
  if (!schedule1 || typeof schedule1 !== "object") return;
  const rows = (schedule1 as Record<string, unknown>)
    .f1099m_box3_other_income_sources;
  if (rows === undefined) return;
  if (!Array.isArray(rows)) {
    throw new Error("Schedule 1 1099-MISC box 3 sources must be rows");
  }
  const recipients = [
    tin(filer.primarySSN, "taxpayer"),
    tin(filer.spouse?.ssn, "spouse"),
  ];
  for (const value of rows) {
    if (!value || typeof value !== "object") {
      throw new Error("Schedule 1 1099-MISC box 3 source is invalid");
    }
    const row = value as Record<string, unknown>;
    if (!recipients.includes(tin(row.recipient_tin, "1099-MISC recipient"))) {
      throw new Error("1099-MISC box 3 recipient differs from the filer");
    }
  }
}

export function assertSchedule1NecSourceIdentity(
  pending: Record<string, unknown>,
  filer: FilerIdentity,
): void {
  const schedule1 = pending.schedule1;
  if (!schedule1 || typeof schedule1 !== "object") return;
  const rows = (schedule1 as Record<string, unknown>)
    .f1099nec_nonbusiness_sources;
  if (rows === undefined) return;
  if (!Array.isArray(rows)) {
    throw new Error("Schedule 1 1099-NEC nonbusiness sources must be rows");
  }
  const recipients = [
    tin(filer.primarySSN, "taxpayer"),
    tin(filer.spouse?.ssn, "spouse"),
  ];
  for (const value of rows) {
    if (!value || typeof value !== "object") {
      throw new Error("Schedule 1 1099-NEC nonbusiness source is invalid");
    }
    const row = value as Record<string, unknown>;
    if (!recipients.includes(tin(row.recipient_tin, "1099-NEC recipient"))) {
      throw new Error("1099-NEC nonbusiness recipient differs from the filer");
    }
  }
}

export function assertScheduleFFarmSourceIdentity(
  pending: Record<string, unknown>,
  filer: FilerIdentity,
): void {
  const scheduleF = pending.schedule_f;
  if (!scheduleF || typeof scheduleF !== "object") return;
  const sources = (scheduleF as Record<string, unknown>).farm_sources;
  if (sources === undefined) return;
  if (!Array.isArray(sources)) {
    throw new Error("Schedule F farm sources must be rows");
  }
  const farms = (scheduleF as Record<string, unknown>).schedule_fs;
  if (!Array.isArray(farms)) {
    throw new Error("Schedule F sources need named farms");
  }
  for (const value of sources) {
    if (!value || typeof value !== "object") {
      throw new Error("Schedule F farm source is invalid");
    }
    const row = value as Record<string, unknown>;
    if (
      row.kind !== "1099m_box3_other_income" &&
      row.kind !== "1099nec_farm_income"
    ) continue;
    const matches = farms.filter((farm) =>
      farm && typeof farm === "object" &&
      farm.farm_id === row.farm_id
    );
    if (matches.length !== 1) {
      throw new Error("1099 farm source needs one matching Schedule F farm");
    }
    const proprietor = matches[0].proprietor_recipient;
    const expected = proprietor === "T"
      ? tin(filer.primarySSN, "taxpayer")
      : proprietor === "S"
      ? tin(filer.spouse?.ssn, "spouse")
      : undefined;
    if (
      typeof row.payer_name !== "string" || !row.payer_name.trim() ||
      !tin(row.payer_tin, "1099 payer") ||
      !expected ||
      tin(row.recipient_tin, "1099 recipient") !== expected
    ) {
      throw new Error(
        "1099 farm recipient differs from the Schedule F proprietor",
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
