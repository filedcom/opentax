import {
  assertBoundedProvisionalATI,
  type BoundedProvisionalATI,
} from "./provisional-ati.ts";

const calculatedLimitBrand = Symbol("Form8990CalculatedBoundedLimit");

export interface CalculatedBoundedForm8990Limit {
  readonly [calculatedLimitBrand]: true;
  readonly businessReference: string;
  readonly line1: number;
  readonly line2: 0;
  readonly line4: 0;
  readonly line5: number;
  readonly line6: number;
  readonly line7: number;
  readonly line8: number;
  readonly line9: 0;
  readonly line10: number;
  readonly line11: number;
  readonly line16: number;
  readonly line18: number;
  readonly line21: number;
  readonly line22: number;
  readonly line23: number;
  readonly line25: number;
  readonly line26: number;
  readonly line29: number;
  readonly line30: number;
  readonly line31: number;
}

/** Printed whole-dollar Form 8990 Part I for the one-business bounded slice. */
export function calculateBoundedForm8990Limit(
  ati: BoundedProvisionalATI,
): CalculatedBoundedForm8990Limit {
  assertBoundedProvisionalATI(ati);
  const line1 = ati.line1BusinessInterestExpense;
  const line6 = Math.round(ati.line6SignedTentativeTaxableIncome);
  const line7 = Math.round(ati.line7NonbusinessDeduction);
  const line8 = Math.round(ati.line8BusinessInterestExpense);
  const line10 = Math.round(ati.line10QbiDeduction);
  const line11 = Math.round(ati.line11DepreciationDepletion);
  const line18 = Math.round(ati.line18BusinessInterestIncome);
  const line23 = Math.round(ati.line23CurrentYearBusinessInterestIncome);
  if (
    !Number.isSafeInteger(line1) || line1 <= 0 || line8 !== line1 ||
    line18 !== line23
  ) {
    throw new Error("Form 8990 bounded limitation source amounts disagree");
  }
  const line16 = line7 + line8 + line10 + line11;
  const line21 = line18;
  const line22 = Math.max(0, line6 + line16 - line21);
  const line25 = line23;
  const line26 = Math.round(line22 * 0.30);
  const line29 = line25 + line26;
  const line30 = Math.min(line1, line29);
  const line31 = Math.max(0, line1 - line29);
  return {
    [calculatedLimitBrand]: true,
    businessReference: ati.businessReference,
    line1,
    line2: 0,
    line4: 0,
    line5: line1,
    line6,
    line7,
    line8,
    line9: 0,
    line10,
    line11,
    line16,
    line18,
    line21,
    line22,
    line23,
    line25,
    line26,
    line29,
    line30,
    line31,
  };
}

export function assertCalculatedLimitForBusiness(
  limit: CalculatedBoundedForm8990Limit,
  businessReference: string,
  originalInterestExpense: number,
): void {
  if (
    limit[calculatedLimitBrand] !== true ||
    limit.businessReference !== businessReference ||
    limit.line1 !== originalInterestExpense
  ) {
    throw new Error("Form 8990 allowance is not calculated for this Schedule C business");
  }
}
