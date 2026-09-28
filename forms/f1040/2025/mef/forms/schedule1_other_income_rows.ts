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
  ["line8z_f1099nec_nonbusiness", "Form 1099-NEC nonbusiness services"],
  ["line8z_f1098_interest_recovery", "Form 1098 mortgage interest refund"],
  ["line8z_k1_s_corp_tax_benefit_recovery", "S corporation tax-benefit recovery"],
  ["line8z_hsa_excess_earnings", "HSA excess earnings"],
  ["line8z_hsa_excess_employer", "HSA excess employer contributions"],
  ["line8z_rtaa", "Trade adjustment assistance"],
  ["line8z_taxable_grants", "Taxable grants"],
  ["line8z_substitute_payments", "Substitute payments"],
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
    ["line8z_other", "line8z_other_income"].some((key) => {
      const value = source[key];
      return value !== undefined && value !== null && value !== 0;
    })
  ) {
    throw new Error(
      "Schedule 1 line 8z generic income needs identified source types before filing",
    );
  }
  return SOURCED_COMPONENTS.flatMap(([key, label]) => {
    const amount = source[key];
    if (amount === undefined || amount === null || amount === 0) return [];
    if (typeof amount !== "number" || !Number.isSafeInteger(amount)) {
      throw new Error(`Schedule 1 line 8z ${key} needs a whole-dollar amount`);
    }
    return [{
      label,
      amount,
      ...(label === "FORM 8814" ? { literalCode: "FORM 8814" as const } : {}),
    }];
  });
}

export function schedule1OtherIncomeTotal(
  fields: object,
): number {
  return schedule1OtherIncomeRows(fields).reduce(
    (sum, row) => sum + row.amount,
    0,
  );
}
