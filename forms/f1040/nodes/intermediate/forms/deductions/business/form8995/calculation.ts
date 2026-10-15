/** Shared simplified Form 8995 arithmetic, after eligibility and source review.
 * Year-specific owners select the form, supply the taxable-income base and add
 * the 2026 active-business minimum; no year-specific threshold lives here. */
export function simplifiedQbiLines(input: {
  businessIncome: number;
  businessLossCarryforward: number;
  reitAndPtpIncome: number;
  reitLossCarryforward: number;
  taxableIncomeBeforeQbi: number;
  netCapitalGainAndQualifiedDividends: number;
}) {
  for (const [key, amount] of Object.entries(input)) {
    if (
      !Number.isSafeInteger(amount) ||
      (key !== "businessIncome" && key !== "reitAndPtpIncome" && amount < 0)
    ) {
      throw new Error(`Simplified QBI needs valid whole-dollar ${key}`);
    }
  }
  const line2 = input.businessIncome;
  const line3 = input.businessLossCarryforward;
  const line4 = Math.max(0, line2 - line3);
  const line5 = Math.round(line4 * .2);
  const line6 = input.reitAndPtpIncome;
  const line7 = input.reitLossCarryforward;
  const line8 = Math.max(0, line6 - line7);
  const line9 = Math.round(line8 * .2);
  const line10 = line5 + line9;
  const line11 = input.taxableIncomeBeforeQbi;
  const line12 = input.netCapitalGainAndQualifiedDividends;
  const line13 = Math.max(0, line11 - line12);
  const line14 = Math.round(line13 * .2);
  return {
    line2,
    line3,
    line4,
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
    line15: Math.min(line10, line14),
    businessLossCarryforward: Math.max(0, line3 - line2),
    reitLossCarryforward: Math.max(0, line7 - line6),
  };
}
