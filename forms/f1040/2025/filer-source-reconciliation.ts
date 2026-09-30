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
  const rawK =
    (pending.f1099k as { f1099ks?: Array<Record<string, unknown>> } | undefined)
      ?.f1099ks ?? [];
  const expectedK = rawK.filter((item) =>
    item.for_routing === "schedule_c" &&
    typeof item.box1a_gross_payments === "number" &&
    item.box1a_gross_payments > 0
  ).map((item) => {
    const review = item.schedule_c_receipts_review as Record<string, unknown>;
    return {
      business_reference: item.schedule_c_business_reference,
      pse_name: item.pse_name,
      pse_tin: tin(item.pse_tin, "1099-K PSE"),
      recipient_tin: tin(item.recipient_tin, "1099-K recipient"),
      box1a_gross_payments: item.box1a_gross_payments,
      amount: review?.included_in_schedule_c_gross_receipts,
      not_included_in_schedule_c_receipts: review
        ?.not_included_in_schedule_c_receipts,
      allocation_reference: review?.allocation_reference,
      no_overlap_with_other_1099s: review?.no_overlap_with_other_1099s,
      overlap_review_reference: review?.overlap_review_reference,
    };
  });
  const scheduleC = pending.schedule_c;
  if (!scheduleC || typeof scheduleC !== "object") {
    if (expectedK.length) {
      throw new Error(
        "1099-K Schedule C source differs from the filed business",
      );
    }
    return;
  }
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
  const kSources = fields.f1099k_receipt_sources;
  const sortRows = (rows: unknown[]) =>
    rows.map((row) =>
      JSON.stringify(
        Object.entries(row as Record<string, unknown>).sort(([a], [b]) =>
          a.localeCompare(b)
        ),
      )
    ).sort();
  if (
    !Array.isArray(kSources) ||
    JSON.stringify(sortRows(kSources)) !== JSON.stringify(sortRows(expectedK))
  ) {
    if (kSources !== undefined || expectedK.length) {
      throw new Error(
        "1099-K Schedule C source differs from the filed payer report",
      );
    }
  }
  if (
    attorneySources === undefined && receiptSources === undefined &&
    necSources === undefined && kSources === undefined
  ) return;
  if (
    (attorneySources !== undefined && !Array.isArray(attorneySources)) ||
    (receiptSources !== undefined && !Array.isArray(receiptSources)) ||
    (necSources !== undefined && !Array.isArray(necSources)) ||
    (kSources !== undefined && !Array.isArray(kSources))
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
    ...(kSources ?? []).map((source: unknown) => ({
      source,
      kind: "k" as const,
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
      (kind === "k" &&
        (typeof row.pse_name !== "string" || !row.pse_name.trim() ||
          !tin(row.pse_tin, "1099-K PSE") ||
          typeof row.box1a_gross_payments !== "number" ||
          typeof row.not_included_in_schedule_c_receipts !== "number" ||
          row.amount + row.not_included_in_schedule_c_receipts !==
            row.box1a_gross_payments ||
          row.no_overlap_with_other_1099s !== true ||
          typeof row.allocation_reference !== "string" ||
          !row.allocation_reference.trim() ||
          typeof row.overlap_review_reference !== "string" ||
          !row.overlap_review_reference.trim())) ||
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

export function assertSchedule1KSourceIdentity(
  pending: Record<string, unknown>,
  filer: FilerIdentity,
): void {
  const raw =
    (pending.f1099k as { f1099ks?: Array<Record<string, unknown>> } | undefined)
      ?.f1099ks ?? [];
  const hobby = raw.filter((item) =>
    item.for_routing === "schedule_1_line_8j" &&
    typeof item.box1a_gross_payments === "number" &&
    item.box1a_gross_payments > 0
  );
  const recipients = [tin(filer.primarySSN, "taxpayer")];
  if (filer.filingStatus === FilingStatus.MarriedFilingJointly) {
    recipients.push(tin(filer.spouse?.ssn, "spouse"));
  }
  let expected = 0;
  for (const item of hobby) {
    const review = item.nonbusiness_activity_review as
      | Record<string, unknown>
      | undefined;
    const recipient = tin(item.recipient_tin, "1099-K recipient");
    if (
      typeof item.pse_name !== "string" || !item.pse_name.trim() ||
      !tin(item.pse_tin, "1099-K PSE") ||
      !recipient || !recipients.includes(recipient) ||
      !review || typeof review.activity_description !== "string" ||
      !review.activity_description.trim() ||
      typeof review.included_in_line8j !== "number" ||
      !Number.isSafeInteger(review.included_in_line8j) ||
      review.included_in_line8j <= 0 ||
      review.included_in_line8j !== item.box1a_gross_payments ||
      typeof review.allocation_reference !== "string" ||
      !review.allocation_reference.trim() ||
      review.no_overlap_with_other_1099s !== true ||
      typeof review.overlap_review_reference !== "string" ||
      !review.overlap_review_reference.trim()
    ) {
      throw new Error(
        "1099-K nonbusiness source needs a matching filer and reviewed box 1a allocation",
      );
    }
    expected += review.included_in_line8j;
  }
  const schedule1 = pending.schedule1 as Record<string, unknown> | undefined;
  const actual = schedule1?.line8j_f1099k_hobby_income;
  if (expected !== (actual ?? 0)) {
    throw new Error(
      "1099-K nonbusiness income differs from Schedule 1 line 8j source",
    );
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
