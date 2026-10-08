/** Replay only the lines supported by the TY2025 Schedule 3 graph. */
export function assertSchedule3PrintedTotals(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (!pending || !("f1040" in pending)) return;
  const cents = (key: string): number => {
    const value = fields[key];
    if (value === undefined || value === null) return 0;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new Error(`Schedule 3 ${key} needs a nonnegative amount`);
    }
    const rounded = Math.round(value * 100);
    if (
      !Number.isSafeInteger(rounded) ||
      Math.abs(rounded - value * 100) > 0.000001
    ) {
      throw new Error(`Schedule 3 ${key} needs cent precision`);
    }
    return rounded;
  };
  const sum = (...keys: string[]): number =>
    keys.reduce((total, key) => total + cents(key), 0);
  const foreignTax1099 = fields.line1_foreign_tax_1099;
  const foreignTax1099Cents = Array.isArray(foreignTax1099)
    ? foreignTax1099.reduce((total: number, value: unknown) => {
      const rounded = Math.round(Number(value) * 100);
      if (
        typeof value !== "number" || !Number.isFinite(value) || value < 0 ||
        !Number.isSafeInteger(rounded) ||
        Math.abs(rounded - value * 100) > 0.000001
      ) {
        throw new Error("Schedule 3 foreign tax source needs cent precision");
      }
      return total + rounded;
    }, 0)
    : cents("line1_foreign_tax_1099");
  if (
    cents("line1_total") !==
      cents("line1_foreign_tax_credit") + foreignTax1099Cents
  ) {
    throw new Error("Schedule 3 line 1 must equal its foreign tax deposits");
  }
  const line7 = sum(
    "line6a_total",
    "line6b_prior_year_min_tax_credit",
    "line6c_adoption_credit",
    "line6d_elderly_disabled_credit",
    "line6f_total",
    "line6g_mortgage_interest_credit",
    "line6h_dc_homebuyer_credit",
    "line6i_qualified_electric_vehicle_credit",
    "line6j_alt_fuel_vehicle_refueling",
    "line6k_tax_credit_bonds",
    "line6l_form8978_credit",
    "line6m_total",
  );
  if (cents("line7_total") !== line7) {
    throw new Error("Schedule 3 line 7 must equal its supported credits");
  }
  if (
    cents("line8_total") !==
      line7 + sum(
          "line1_total",
          "line2_childcare_credit",
          "line3_education_credit",
          "line4_retirement_savings_credit",
          "line5a_residential_clean_energy",
          "line5b_energy_efficient_home",
        )
  ) {
    throw new Error("Schedule 3 line 8 must equal lines 1 through 7");
  }
  if (cents("line14_total") !== cents("line13a_total")) {
    throw new Error("Schedule 3 line 14 must equal supported line 13a");
  }
  if (
    cents("line15_total") !==
      cents("line14_total") + sum(
          "line9_premium_tax_credit",
          "line10_amount_paid_extension",
          "line11_excess_ss",
          "line12_fuel_tax_credit",
        )
  ) {
    throw new Error("Schedule 3 line 15 must equal lines 9 through 14");
  }
}
