/**
 * TY2025 Form 3800 Part II for individual, non-passive credits only.
 *
 * Source: https://www.irs.gov/pub/irs-pdf/f3800.pdf (2025, Part II lines 7-38)
 * The caller must separately classify Part III credits and exclude passive,
 * empowerment-zone, EPE, and other special-limit cases from this calculation.
 */
import { FilingStatus } from "../../types.ts";

type Form3800TaxContext = {
  /** Form 1040 line 16 plus Schedule 2 line 1z. */
  regularTax: number;
  /** Form 6251 line 11. */
  alternativeMinimumTax: number;
  /** Form 3800 line 10a. */
  foreignTaxCredit: number;
  /** Form 1040 line 19 and eligible Schedule 3 credits for line 10b. */
  priorAllowableCredits: number;
  /** Form 6251 line 9. */
  tentativeMinimumTax: number;
  /** Part I line 6: non-passive credits not allowed against TMT. */
  standardCredit: number;
  /** Part II line 36: non-passive specified credits. */
  specifiedCredit: number;
};

export type Form3800NonpassiveInput =
  & Form3800TaxContext
  & (
    | { filingStatus: FilingStatus.MFS; spouseHasBusinessCredit: boolean }
    | { filingStatus: Exclude<FilingStatus, FilingStatus.MFS> }
  );

export type Form3800NonpassiveLines = {
  line6: number;
  line7: number;
  line8: number;
  line9: number;
  line10a: number;
  line10b: number;
  line10c: number;
  line11: number;
  line12: number;
  line13: number;
  line14: number;
  line15: number;
  line16: number;
  line17: number;
  line27: number;
  line28: number;
  line29: number;
  line36: number;
  line37: number;
  line38: number;
  unusedStandardCredit: number;
  unusedSpecifiedCredit: number;
};

export function calculateForm3800Nonpassive(
  input: Form3800NonpassiveInput,
): Form3800NonpassiveLines {
  for (
    const [name, amount] of Object.entries({
      regularTax: input.regularTax,
      alternativeMinimumTax: input.alternativeMinimumTax,
      foreignTaxCredit: input.foreignTaxCredit,
      priorAllowableCredits: input.priorAllowableCredits,
      tentativeMinimumTax: input.tentativeMinimumTax,
      standardCredit: input.standardCredit,
      specifiedCredit: input.specifiedCredit,
    })
  ) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(`Form 3800 ${name} must be a nonnegative finite amount`);
    }
  }
  const line6 = input.standardCredit;
  const line7 = input.regularTax;
  const line8 = input.alternativeMinimumTax;
  const line9 = line7 + line8;
  const line10a = input.foreignTaxCredit;
  const line10b = input.priorAllowableCredits;
  const line10c = line10a + line10b;
  const line11 = Math.max(0, line9 - line10c);
  const line12 = Math.max(0, line7 - line10c);
  const threshold = input.filingStatus === FilingStatus.MFS &&
      input.spouseHasBusinessCredit
    ? 12_500
    : 25_000;
  const line13 = 0.25 * Math.max(0, line12 - threshold);
  const line14 = input.tentativeMinimumTax;
  const line15 = Math.max(line13, line14);
  const line16 = Math.max(0, line11 - line15);
  const line17 = Math.min(line6, line16);
  const line27 = Math.max(0, line11 - line13);
  const line28 = line17;
  const line29 = Math.max(0, line27 - line28);
  const line36 = input.specifiedCredit;
  const line37 = Math.min(line29, line36);
  return {
    line6,
    line7,
    line8,
    line9,
    line10a,
    line10b,
    line10c,
    line11,
    line12,
    line13,
    line14,
    line15,
    line16,
    line17,
    line27,
    line28,
    line29,
    line36,
    line37,
    line38: line28 + line37,
    unusedStandardCredit: line6 - line17,
    unusedSpecifiedCredit: line36 - line37,
  };
}
