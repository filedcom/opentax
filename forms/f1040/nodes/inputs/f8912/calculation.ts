/**
 * Form 8912 (Rev. December 2024) Parts I and II for an individual with no
 * pass-through CREB credit. Part III/IV source amounts must be reconciled
 * separately to Forms 1097-BTC and bond-level rows.
 * https://www.irs.gov/pub/irs-pdf/f8912.pdf
 */
export type Form8912IndividualLimitInput = {
  readonly line1Form1097BtcCredit: number;
  readonly line2PartIVCredit: number;
  readonly line3QualifiedBondCarryforward: number;
  readonly form1040Line16: number;
  readonly schedule2Line1z: number;
  readonly form6251Line11: number;
  readonly foreignTaxCredit: number;
  readonly priorAllowableCredits: number;
  readonly form3800AllowedCredit: number;
  readonly priorYearMinimumTaxCredit: number;
  readonly hasPassThroughCrebCredit: boolean;
};

export type Form8912IndividualLimitLines = {
  readonly line4: number;
  readonly line7: number;
  readonly line8: number;
  readonly line9: number;
  readonly line10a: number;
  readonly line10b: number;
  readonly line10c: number;
  readonly line10d: number;
  readonly line10e: number;
  readonly line11: number;
  readonly line12: number;
  readonly unusedCredit: number;
};

export function calculateForm8912IndividualLimit(
  input: Form8912IndividualLimitInput,
): Form8912IndividualLimitLines {
  for (const [name, value] of Object.entries(input)) {
    if (typeof value === "number" && (!Number.isFinite(value) || value < 0)) {
      throw new Error(`Form 8912 ${name} must be a nonnegative finite amount`);
    }
  }
  if (input.hasPassThroughCrebCredit) {
    throw new Error(
      "Form 8912 pass-through CREB credit needs its separate taxable-income limit",
    );
  }
  const line4 = input.line1Form1097BtcCredit + input.line2PartIVCredit +
    input.line3QualifiedBondCarryforward;
  const line7 = input.form1040Line16 + input.schedule2Line1z;
  const line8 = input.form6251Line11;
  const line9 = line7 + line8;
  const line10a = input.foreignTaxCredit;
  const line10b = input.priorAllowableCredits;
  const line10c = input.form3800AllowedCredit;
  const line10d = input.priorYearMinimumTaxCredit;
  const line10e = line10a + line10b + line10c + line10d;
  const line11 = Math.max(0, line9 - line10e);
  const line12 = Math.min(line4, line11);
  return {
    line4,
    line7,
    line8,
    line9,
    line10a,
    line10b,
    line10c,
    line10d,
    line10e,
    line11,
    line12,
    unusedCredit: line4 - line12,
  };
}
