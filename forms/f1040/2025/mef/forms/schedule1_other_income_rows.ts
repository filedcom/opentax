import { box11CodeJSourceSchema } from "../../../nodes/inputs/k1_partnership/box11_code_j.ts";
import { rtaaSourceSchema } from "../../../nodes/inputs/f1099g/rtaa-source.ts";

export interface Schedule1OtherIncomeRow {
  readonly label: string;
  readonly amount: number;
  readonly literalCode?: "FORM 8814";
}

const SOURCED_COMPONENTS = [
  ["line8z_form8814", "FORM 8814"],
  ["line8z_form8621_qef", "Form 8621 QEF ordinary income"],
  ["line8z_form8621_mtm", "Form 8621 mark-to-market gain or loss"],
  ["line8z_form8621_section1291", "Form 8621 section 1291 current-year income"],
  ["line8z_f1098_interest_recovery", "Form 1098 mortgage interest refund"],
  [
    "line8z_k1_s_corp_tax_benefit_recovery",
    "S corporation tax-benefit recovery",
  ],
  ["line8z_hsa_excess_earnings", "HSA excess earnings"],
  ["line8z_hsa_excess_employer", "HSA excess employer contributions"],
  ["line8z_taxable_grants", "Taxable grants"],
  ["line8z_golden_parachute", "Excess golden parachute"],
  ["at_risk_disallowed_add_back", "At-risk loss add-back"],
  ["at_risk_recapture", "At-risk recapture"],
  ["biz_interest_disallowed_add_back", "Disallowed business interest"],
] as const;

/**
 * TY2025 line 8z needs one stated type and amount per source. A generic
 * numeric total cannot establish the type that the IRS statement requires.
 */
export function schedule1OtherIncomeRows(
  fields: object,
): readonly Schedule1OtherIncomeRow[] {
  const source = fields as Readonly<Record<string, unknown>>;
  if (
    source.line8z_f1099nec_nonbusiness !== undefined &&
    source.line8z_f1099nec_nonbusiness !== null &&
    source.line8z_f1099nec_nonbusiness !== 0
  ) {
    throw new Error(
      "Form 1099-NEC nonbusiness income needs Schedule 1 line 8j source rows",
    );
  }
  if (
    ["line8z_other", "line8z_other_income"].some((key) => {
      const value = source[key];
      return value !== undefined && value !== null && value !== 0;
    })
  ) {
    throw new Error(
      "Schedule 1 line 8z generic income needs identified source types before filing",
    );
  }
  const componentRows: Schedule1OtherIncomeRow[] = SOURCED_COMPONENTS.flatMap(
    ([key, label]) => {
      const amount = source[key];
      if (amount === undefined || amount === null || amount === 0) return [];
      if (typeof amount !== "number" || !Number.isSafeInteger(amount)) {
        throw new Error(
          `Schedule 1 line 8z ${key} needs a whole-dollar amount`,
        );
      }
      return [{
        label,
        amount,
        ...(label === "FORM 8814" ? { literalCode: "FORM 8814" as const } : {}),
      }];
    },
  );
  const partnershipSources = source.k1_partnership_box11_code_j_sources;
  if (partnershipSources !== undefined && !Array.isArray(partnershipSources)) {
    throw new Error("Schedule 1 partnership K-1 code J sources must be rows");
  }
  const partnershipRows: Schedule1OtherIncomeRow[] = (
    (partnershipSources ?? []) as unknown[]
  ).map((value) => {
    const row = box11CodeJSourceSchema.parse(value);
    return {
      label: `Partnership K-1 code J recovery ${row.partnership_ein}`,
      amount: row.taxable_amount,
    };
  });
  const substituteSources = source.f1099m_box8_substitute_sources;
  if (
    substituteSources !== undefined && !Array.isArray(substituteSources)
  ) {
    throw new Error("Schedule 1 1099-MISC box 8 sources must be rows");
  }
  const substituteRows: Schedule1OtherIncomeRow[] = (
    (substituteSources ?? []) as unknown[]
  ).map((value) => {
    if (!value || typeof value !== "object") {
      throw new Error("Schedule 1 1099-MISC box 8 source is invalid");
    }
    const row = value as Record<string, unknown>;
    if (
      typeof row.payer_name !== "string" || !row.payer_name.trim() ||
      typeof row.payer_tin !== "string" || !/^\d{9}$/.test(row.payer_tin) ||
      typeof row.recipient_tin !== "string" ||
      !/^\d{9}$/.test(row.recipient_tin) ||
      typeof row.amount !== "number" ||
      !Number.isSafeInteger(row.amount) || row.amount <= 0
    ) {
      throw new Error("Schedule 1 1099-MISC box 8 source is invalid");
    }
    return {
      label: `Substitute payments ${row.payer_tin}`,
      amount: row.amount as number,
    };
  });
  const substituteTotal = substituteRows.reduce(
    (sum, row) => sum + row.amount,
    0,
  );
  if (source.line8z_substitute_payments !== substituteTotal) {
    if (
      source.line8z_substitute_payments !== undefined || substituteTotal > 0
    ) {
      throw new Error(
        "Schedule 1 substitute payments differ from 1099-MISC box 8 sources",
      );
    }
  }
  const rtaaSources = source.f1099g_rtaa_sources;
  if (rtaaSources !== undefined && !Array.isArray(rtaaSources)) {
    throw new Error("Schedule 1 RTAA sources must be rows");
  }
  const rtaaRows: Schedule1OtherIncomeRow[] = (rtaaSources ?? []).map(
    (value: unknown) => {
      const row = rtaaSourceSchema.parse(value);
      return {
        label: `RTAA payments ${row.payer_tin}`,
        amount: row.amount,
      };
    },
  );
  const rtaaTotal = rtaaRows.reduce((sum, row) => sum + row.amount, 0);
  if (source.line8z_rtaa !== rtaaTotal) {
    if (source.line8z_rtaa !== undefined || rtaaTotal > 0) {
      throw new Error(
        "Schedule 1 RTAA total differs from Form 1099-G box 5 rows",
      );
    }
  }
  const rows = source.f1099m_box3_other_income_sources;
  if (rows === undefined) {
    return [
      ...componentRows,
      ...partnershipRows,
      ...substituteRows,
      ...rtaaRows,
    ];
  }
  if (!Array.isArray(rows)) {
    throw new Error("Schedule 1 1099-MISC box 3 sources must be rows");
  }
  const box3Rows: Schedule1OtherIncomeRow[] = rows.map((value: unknown) => {
    if (!value || typeof value !== "object") {
      throw new Error("Schedule 1 1099-MISC box 3 source is invalid");
    }
    const row = value as Record<string, unknown>;
    if (
      typeof row.description !== "string" || !row.description.trim() ||
      typeof row.amount !== "number" || !Number.isSafeInteger(row.amount) ||
      row.amount <= 0 || typeof row.payer_name !== "string" ||
      !row.payer_name.trim() ||
      typeof row.payer_tin !== "string" ||
      !/^\d{9}$/.test(row.payer_tin) ||
      typeof row.recipient_tin !== "string" ||
      !/^\d{9}$/.test(row.recipient_tin)
    ) {
      throw new Error("Schedule 1 1099-MISC box 3 source is invalid");
    }
    return { label: row.description, amount: row.amount };
  });
  return [
    ...componentRows,
    ...partnershipRows,
    ...substituteRows,
    ...rtaaRows,
    ...box3Rows,
  ];
}

export function schedule1OtherIncomeTotal(
  fields: object,
): number {
  return schedule1OtherIncomeRows(fields).reduce(
    (sum, row) => sum + row.amount,
    0,
  );
}
