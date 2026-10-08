import { calculateForm172HistoricalAmtCap } from "./form172_amt_historical_cap.ts";
import { calculateForm172HistoricalAmtVintageModifiedIncome } from "./form172_amt_vintage_modified_income.ts";

const positive = (amount: number) => Math.max(0, amount);
const ninetyPercent = (amount: number) =>
  Number((BigInt(amount) * 90n + 50n) / 100n);

/** Historical ordinary/WHBAA absorption workpaper, using each vintage's
 * independently reviewed modified-income context. Capacity is not the filed
 * deduction cap, nor ninety percent of the base AFTER earlier deductions.
 * Earlier consumed losses spend the cumulative modified-income capacity once;
 * an earlier WHBAA loss can consume more than the WHBAA cap component.
 * Reviewed opening availability, refigure eligibility, elections and complete
 * intervening-year/accepted-return history remain separate unverified facts.
 */
export function calculateForm172HistoricalAmtAbsorption(
  rawCap: unknown,
  rawVintageReviews: unknown,
) {
  const cap = calculateForm172HistoricalAmtCap(rawCap);
  const contexts = calculateForm172HistoricalAmtVintageModifiedIncome(
    rawCap,
    rawVintageReviews,
  );
  let earlierAbsorbed = 0;
  let earlierOrdinaryAbsorbed = 0;
  const applications = contexts.chronologicalVintageModifiedIncome.map(
    (row) => {
      const modifiedBase = positive(
        row.signedModifiedAmtiBeforeDirectEarlierAtnold,
      );
      const ordinary90PercentLimit = ninetyPercent(modifiedBase);
      const ordinaryComponent = Math.min(
        cap.ordinaryOpening,
        ordinary90PercentLimit,
      );
      const whbaaComponent = Math.min(
        cap.whbaaOpening,
        modifiedBase - ordinaryComponent,
      );
      const aggregateModifiedCapacity = ordinaryComponent + whbaaComponent;
      const remainingAggregateCapacity = positive(
        aggregateModifiedCapacity - earlierAbsorbed,
      );
      const remainingOrdinaryCapacity = positive(
        ordinaryComponent - earlierOrdinaryAbsorbed,
      );
      const whbaaFifthYearLimit = row.whbaaFifthYear
        ? Number((BigInt(row.modifiedAmtiAfterEarlierAtnold) + 1n) / 2n)
        : remainingAggregateCapacity;
      const absorbed = Math.min(
        row.reviewedOpening,
        remainingAggregateCapacity,
        whbaaFifthYearLimit,
        row.category === "ordinary"
          ? remainingOrdinaryCapacity
          : remainingAggregateCapacity,
      );
      const result = {
        originYear: row.originYear,
        lossReference: row.lossReference,
        modifiedReviewReference: row.modifiedReviewReference,
        category: row.category,
        whbaaFifthYear: row.whbaaFifthYear,
        whbaaFifthYearLimit,
        reviewedOpening: row.reviewedOpening,
        actualAllocatedDeduction: row.actualAllocatedDeduction,
        earlierActualDeduction: row.earlierActualDeduction,
        modifiedBase,
        ordinary90PercentLimit,
        ordinaryComponent,
        whbaaComponent,
        aggregateModifiedCapacity,
        earlierAbsorbed,
        earlierOrdinaryAbsorbed,
        remainingAggregateCapacity,
        remainingOrdinaryCapacity,
        absorbed,
        reviewedRemaining: row.reviewedOpening - absorbed,
      };
      earlierAbsorbed += absorbed;
      if (row.category === "ordinary") earlierOrdinaryAbsorbed += absorbed;
      if (!Number.isSafeInteger(earlierAbsorbed)) {
        throw new Error("Historical AMT absorption exceeds exact dollars");
      }
      return result;
    },
  );
  return {
    applicationYear: cap.applicationYear,
    originalDeductionCap: cap.aggregateHistoricalCap,
    chronologicalReviewedApplications: applications,
    totalReviewedAbsorbed: earlierAbsorbed,
    totalReviewedRemaining: applications.reduce(
      (sum, row) => sum + row.reviewedRemaining,
      0,
    ),
    historicalAbsorptionWorkpaperArithmeticReconciled: true as const,
    openingAmtCarryAvailabilityVerified: false as const,
    refiguredOperandEligibilityVerified: false as const,
    whbaaElectionEligibilityVerified: false as const,
    completeCarryHistoryVerified: false as const,
    survivingAcceptedCarryVerified: false as const,
    sourceAuthenticityVerified: false as const,
    priorAcceptanceVerified: false as const,
    filingReady: false as const,
  };
}
