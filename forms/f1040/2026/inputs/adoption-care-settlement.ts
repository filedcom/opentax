import {
  calculateDependentCareBenefits2026,
  type DependentCareInput2026,
} from "./dependent-care.ts";
import type { calculateAdoptionExclusion2026 } from "./adoption-settlement.ts";

/** Solve printed whole-dollar care/adoption worksheets before emitting income.
 * More taxable care increases adoption MAGI, reduces its exclusion and increases
 * care earnings; consequently calculated taxable care is nonincreasing. Monthly
 * allocations are reviewed source facts, then checked against the final derived
 * owner adjustment. Candidate probes never become an executed return.
 */
export function settleAdoptionCare2026<T>(
  care: DependentCareInput2026,
  incomeAt: (
    taxableCare: number,
    decimalPlaces: number,
  ) => {
    result: T;
    adoption: ReturnType<typeof calculateAdoptionExclusion2026>;
  },
) {
  if (!care.claim?.adoption_inventory_reference || care.adoption_income_2026) {
    throw Error(
      "Coordinated care needs source-only records and the actual adoption inventory",
    );
  }
  const attempts: {
    decimal_places: number;
    taxable_care: number;
    calculated_care: number;
    adoption_exclusion: number;
    taxable_social_security: number;
  }[] = [];
  const evaluate = (amount: number, decimalPlaces: number) => {
    const income = incomeAt(amount, decimalPlaces), adoption = income.adoption;
    const source = {
      ...care,
      adoption_income_2026: {
        source: adoption.source_input,
        income: adoption.income,
      },
    };
    const benefit = calculateDependentCareBenefits2026(
      source,
      "benefits_probe",
    );
    if (!benefit.lines) {
      throw Error("Coordinated care needs a current benefit workpaper");
    }
    attempts.push({
      decimal_places: decimalPlaces,
      taxable_care: amount,
      calculated_care: benefit.lines.line26,
      adoption_exclusion: adoption.lines.line30,
      taxable_social_security: adoption.income.taxable_social_security,
    });
    return { ...income, source, benefit, amount };
  };
  const finish = (candidate: ReturnType<typeof evaluate>) => {
    // Re-run all monthly and credit-stage checks only with the settled income.
    const benefit = calculateDependentCareBenefits2026(candidate.source);
    if (benefit.lines?.line26 !== candidate.amount) {
      throw Error("Final care replay differs from coordinated income");
    }
    return {
      result: candidate.result,
      adoption: candidate.adoption,
      benefit,
      attempts,
    };
  };
  // Form 8839 permits at least three decimal places. Retain the first
  // precision that reconciles every printed whole-dollar destination.
  for (const places of [3, 4, 5, 6]) {
    const first = evaluate(0, places);
    if (first.benefit.lines.line26 === 0) return finish(first);
    const upper = first.benefit.lines.line15;
    if (!Number.isSafeInteger(upper) || upper < 0) {
      throw Error("Care benefits need a finite whole-dollar settlement bound");
    }
    let lo = 1, hi = upper;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2),
        candidate = evaluate(mid, places),
        actual = candidate.benefit.lines.line26;
      if (actual === mid) return finish(candidate);
      if (actual > mid) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  throw Error(
    "Care/adoption worksheets have no consistent whole-dollar settlement; rounding reconciliation is required",
  );
}
