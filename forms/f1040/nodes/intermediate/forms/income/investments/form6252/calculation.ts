export interface InstallmentSaleFacts {
  selling_price?: number;
  gross_profit?: number;
  contract_price?: number;
  payments_received?: number;
  depreciation_recapture?: number;
  property_description?: string;
  date_acquired?: string;
  date_sold?: string;
  sold_to_related_party?: boolean;
  selling_price_determinable?: boolean;
  mortgage_assumed?: number;
  cost_basis?: number;
  depreciation_allowed?: number;
  selling_expenses?: number;
  excluded_gain?: number;
  payments_received_prior_years?: number;
}

export interface InstallmentSaleLines {
  line5: number;
  line6: number;
  line7: number;
  line8: number;
  line9: number;
  line10: number;
  line11: number;
  line12: number;
  line13: number;
  line14: number;
  line15: number;
  line16: number;
  line17: number;
  line18: number;
  line19: number;
  line20: number;
  line21: number;
  line22: number;
  line23: number;
  line24: number;
  line25: number;
  line26: number;
}

export function installmentSaleDate(
  value: string | undefined,
  field: string,
): Date {
  if (!value) throw new Error(`Form 6252 needs ${field}`);
  const date = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`Form 6252 ${field} is not a valid date`);
  }
  return date;
}

export function isLongTermInstallmentSale(
  facts: InstallmentSaleFacts,
): boolean {
  const acquired = installmentSaleDate(facts.date_acquired, "acquisition date");
  const sold = installmentSaleDate(facts.date_sold, "sale date");
  const anniversary = new Date(acquired);
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
  return sold > anniversary;
}

/** Form 6252, Part I and Part II, for a determinable-price sale. */
export function calculateInstallmentSale(
  facts: InstallmentSaleFacts,
): InstallmentSaleLines {
  const required = [
    "selling_price",
    "cost_basis",
    "payments_received",
  ] as const;
  for (const key of required) {
    if (facts[key] === undefined) throw new Error(`Form 6252 needs ${key}`);
  }
  const money = [
    "selling_price",
    "mortgage_assumed",
    "cost_basis",
    "depreciation_allowed",
    "selling_expenses",
    "depreciation_recapture",
    "excluded_gain",
    "payments_received",
    "payments_received_prior_years",
  ] as const;
  for (const key of money) {
    const value = facts[key];
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
      throw new Error(`Form 6252 ${key} must be nonnegative whole dollars`);
    }
  }
  const sold = installmentSaleDate(facts.date_sold, "sale date");
  const acquired = installmentSaleDate(facts.date_acquired, "acquisition date");
  if (sold <= acquired || sold.getUTCFullYear() > 2025) {
    throw new Error(
      "Form 6252 sale must follow acquisition and occur by tax year 2025",
    );
  }
  const line5 = facts.selling_price!;
  const line6 = facts.mortgage_assumed ?? 0;
  const line7 = line5 - line6;
  const line8 = facts.cost_basis!;
  const line9 = facts.depreciation_allowed ?? 0;
  const line10 = line8 - line9;
  const line11 = facts.selling_expenses ?? 0;
  const line12 = facts.depreciation_recapture ?? 0;
  const line13 = line10 + line11 + line12;
  const line14 = line5 - line13;
  const line15 = facts.excluded_gain ?? 0;
  const line16 = line14 - line15;
  const line17 = Math.max(0, line6 - line13);
  const line18 = line7 + line17;
  if (
    line6 > line5 || line9 > line8 || line14 <= 0 || line16 <= 0 || line18 <= 0
  ) {
    throw new Error(
      "Form 6252 needs positive gross profit and contract price with valid basis and mortgage",
    );
  }
  if (line16 > line18) {
    throw new Error("Form 6252 gross profit cannot exceed contract price");
  }
  if (facts.gross_profit !== undefined && facts.gross_profit !== line16) {
    throw new Error(
      "Form 6252 gross_profit must match line 16 from sale facts",
    );
  }
  if (facts.contract_price !== undefined && facts.contract_price !== line18) {
    throw new Error(
      "Form 6252 contract_price must match line 18 from sale facts",
    );
  }
  const line19 = line16 / line18;
  const line20 = sold.getUTCFullYear() === 2025 ? line17 : 0;
  const line21 = facts.payments_received!;
  const line22 = line20 + line21;
  const line23 = facts.payments_received_prior_years ?? 0;
  // RatioType supports five decimal places. Use the same reported ratio for
  // the amount calculation so the XML lines reconcile.
  const reportedRatio = Math.round(line19 * 100_000) / 100_000;
  const line24 = Math.round(line22 * reportedRatio);
  const line25 = 0;
  const line26 = line24 - line25;
  if (line24 > line16 || line23 + line22 > line18) {
    throw new Error(
      "Form 6252 installment payments exceed the contract or remaining profit",
    );
  }
  return {
    line5,
    line6,
    line7,
    line8,
    line9,
    line10,
    line11,
    line12,
    line13,
    line14,
    line15,
    line16,
    line17,
    line18,
    line19: reportedRatio,
    line20,
    line21,
    line22,
    line23,
    line24,
    line25,
    line26,
  };
}
