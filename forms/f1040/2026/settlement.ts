/**
 * TY2026 Form 1040 payment and balance assembly.
 * Source: IRS draft Form 1040 (2026), page 2, lines 24a–c and 25–37;
 * draft Schedule 3-A (2026), Part I lines 1–7 and Part II line 8.
 * Source hashes are pinned in docs/ty2026/corpus/manifest.json.
 */

export interface Settlement2026Input {
  readonly line22TaxAfterCredits: number;
  readonly line23OtherTaxes: number;
  readonly form1062Line15: number;
  readonly line25dWithholding: number;
  readonly line26EstimatedPayments: number;
  readonly line27aEic: number;
  readonly line28Actc: number;
  readonly line29RefundableAotc: number;
  readonly line30RefundableAdoption: number;
  readonly line31OtherPayments: number;
  /** Schedule 2 line 20 is excluded from the Schedule 3-A tax offset. */
  readonly schedule2Line20: number;
  /** Answer to Schedule 3-A line 7, required only when line 6 is positive. */
  readonly wantsFederalPublicBenefit?: boolean;
  /** Schedule 3-A line 8 eligibility, required when line 7 is Yes. */
  readonly eligibleForFederalPublicBenefit?: boolean;
}

export interface Settlement2026 {
  readonly line24aTotalTax: number;
  readonly line24bForm1062: number;
  readonly line24cTaxIncludingForm1062: number;
  readonly line32aRefundableCredits: number;
  readonly schedule3a?: {
    readonly line1a: number;
    readonly line1b: number;
    readonly line2: number;
    readonly line3: number;
    readonly line4: number;
    readonly line5: number;
    readonly line6FederalPublicBenefit: number;
    readonly line8DisallowedBenefit?: number;
  };
  readonly line32bFederalPublicBenefitReduction: number;
  readonly line32cNetRefundableCredits: number;
  readonly line33TotalPayments: number;
  readonly line34Overpayment: number;
  readonly line37AmountOwed: number;
}

function amount(name: string, value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite nonnegative amount`);
  }
  return value;
}

export function calculateSettlement2026(
  input: Settlement2026Input,
): Settlement2026 {
  for (
    const name of [
      "line22TaxAfterCredits",
      "line23OtherTaxes",
      "form1062Line15",
      "line25dWithholding",
      "line26EstimatedPayments",
      "line27aEic",
      "line28Actc",
      "line29RefundableAotc",
      "line30RefundableAdoption",
      "line31OtherPayments",
      "schedule2Line20",
    ] as const
  ) {
    amount(name, input[name]);
  }

  const line24aTotalTax = input.line22TaxAfterCredits + input.line23OtherTaxes;
  const line24bForm1062 = input.form1062Line15;
  const line24cTaxIncludingForm1062 = line24aTotalTax + line24bForm1062;
  if (input.schedule2Line20 > line24aTotalTax) {
    throw new RangeError("Schedule 2 line 20 cannot exceed Form 1040 line 24a");
  }
  const line32aRefundableCredits = input.line27aEic + input.line28Actc +
    input.line29RefundableAotc + input.line30RefundableAdoption +
    input.line31OtherPayments;

  const claimsRelevantCredit = input.line27aEic > 0 || input.line28Actc > 0 ||
    input.line29RefundableAotc > 0 || input.line30RefundableAdoption > 0;
  let schedule3a: Settlement2026["schedule3a"];
  let line32bFederalPublicBenefitReduction = 0;
  let line8DisallowedBenefit: number | undefined;

  if (claimsRelevantCredit) {
    const line2 = line32aRefundableCredits - input.line31OtherPayments;
    const line5 = line24aTotalTax - input.schedule2Line20;
    const line6FederalPublicBenefit = Math.max(0, line2 - line5);
    if (line6FederalPublicBenefit > 0) {
      if (input.wantsFederalPublicBenefit === undefined) {
        throw new Error("Schedule 3-A line 7 election is required");
      }
      if (input.wantsFederalPublicBenefit) {
        if (input.eligibleForFederalPublicBenefit === undefined) {
          throw new Error("Schedule 3-A line 8 eligibility is required");
        }
        if (!input.eligibleForFederalPublicBenefit) {
          line32bFederalPublicBenefitReduction = line6FederalPublicBenefit;
          line8DisallowedBenefit = line6FederalPublicBenefit;
        } else {
          line8DisallowedBenefit = 0;
        }
      } else {
        line32bFederalPublicBenefitReduction = line6FederalPublicBenefit;
      }
    }
    schedule3a = {
      line1a: line32aRefundableCredits,
      line1b: input.line31OtherPayments,
      line2,
      line3: line24aTotalTax,
      line4: input.schedule2Line20,
      line5,
      line6FederalPublicBenefit,
      line8DisallowedBenefit,
    };
  }

  const line32cNetRefundableCredits = line32aRefundableCredits -
    line32bFederalPublicBenefitReduction;
  const line33TotalPayments = input.line25dWithholding +
    input.line26EstimatedPayments + line32cNetRefundableCredits;

  return {
    line24aTotalTax,
    line24bForm1062,
    line24cTaxIncludingForm1062,
    line32aRefundableCredits,
    schedule3a,
    line32bFederalPublicBenefitReduction,
    line32cNetRefundableCredits,
    line33TotalPayments,
    line34Overpayment: Math.max(
      0,
      line33TotalPayments - line24cTaxIncludingForm1062,
    ),
    line37AmountOwed: Math.max(
      0,
      line24cTaxIncludingForm1062 - line33TotalPayments,
    ),
  };
}
