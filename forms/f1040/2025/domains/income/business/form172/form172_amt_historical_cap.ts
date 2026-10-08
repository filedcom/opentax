import { z } from "zod";
import { calculateForm172AmtAnnualLimit } from "./form172_amt_annual_limit.ts";

const dollars = z.number().int().nonnegative().max(1_000_000_000);
const reference = z.string().trim().min(1);
const schema = z.object({
  reference,
  all_application_year_amt_vintages_included: z.literal(true),
  annual_review: z.unknown(),
  losses: z.array(
    z.object({
      reference,
      regular_origin: z.unknown(),
      amt_origin: z.unknown(),
      reviewed_opening_amt_nol: dollars,
      category: z.enum(["ordinary", "whbaa"]),
      whbaa_election_reference: reference.optional(),
      whbaa_carryback_period: z.union([
        z.literal(3),
        z.literal(4),
        z.literal(5),
      ]).optional(),
    }).strict(),
  ).min(1).max(13),
}).strict();

/** Historical section56(d)(1)(A) aggregate cap workpaper. Category subtotals
 * are NOT chronological consumption or next-year carry balances. Loss origins
 * are independently recomputed; opening balances/elections remain reviewed
 * assertions. Post-TCJA coordination and other disaster categories stay open. */
export function calculateForm172HistoricalAmtCap(raw: unknown) {
  const v = schema.parse(raw);
  const seenYears = new Set<number>();
  const seenReferences = new Set<string>([v.reference]);
  const losses = v.losses.map((row) => {
    if (seenReferences.has(row.reference)) {
      throw new Error("AMT cap needs distinct loss review references");
    }
    seenReferences.add(row.reference);
    const annual = calculateForm172AmtAnnualLimit(
      row.regular_origin,
      row.amt_origin,
      v.annual_review,
    );
    if (
      annual.applicationYear < 2003 || annual.applicationYear > 2017 ||
      annual.originYear >= 2018
    ) {
      throw new Error(
        "Historical AMT cap needs pre-2018 application and origins",
      );
    }
    if (seenYears.has(annual.originYear)) {
      throw new Error("AMT cap needs each origin year exactly once");
    }
    seenYears.add(annual.originYear);
    if (row.reviewed_opening_amt_nol > annual.originAmtNol) {
      throw new Error(
        "AMT opening balance exceeds its independent loss origin",
      );
    }
    if (row.category === "whbaa") {
      if (
        ![2008, 2009].includes(annual.originYear) ||
        !row.whbaa_election_reference ||
        seenReferences.has(row.whbaa_election_reference)
      ) {
        throw new Error(
          "WHBAA category needs an applicable origin and separate election review",
        );
      }
      seenReferences.add(row.whbaa_election_reference);
      if (
        annual.applicationYear < annual.originYear &&
        (!row.whbaa_carryback_period ||
          annual.applicationYear <
            annual.originYear - row.whbaa_carryback_period)
      ) {
        throw new Error("WHBAA carryback needs its reviewed elected period");
      }
    } else if (
      row.whbaa_election_reference !== undefined ||
      row.whbaa_carryback_period !== undefined
    ) {
      throw new Error("Ordinary AMT loss cannot carry a WHBAA election claim");
    }
    return {
      reference: row.reference,
      originYear: annual.originYear,
      category: row.category,
      opening: row.reviewed_opening_amt_nol,
      whbaaFifthYear: row.category === "whbaa" &&
        row.whbaa_carryback_period === 5 &&
        annual.applicationYear === annual.originYear - 5,
      annual,
    };
  }).sort((a, b) => a.originYear - b.originYear);
  const first = losses[0].annual;
  const base = Math.max(0, first.ordinaryLimitBase);
  const ordinaryOpening = losses.filter((r) => r.category === "ordinary")
    .reduce((n, r) => n + r.opening, 0);
  const whbaaOpening = losses.filter((r) => r.category === "whbaa").reduce(
    (n, r) => n + r.opening,
    0,
  );
  const ordinaryCapComponent = Math.min(
    ordinaryOpening,
    first.ordinary90PercentLimit,
  );
  const whbaaCapComponent = Math.min(whbaaOpening, base - ordinaryCapComponent);
  const preFifthYearAggregateCap = ordinaryCapComponent + whbaaCapComponent;
  let remainingCap = preFifthYearAggregateCap;
  let ordinaryCapacity = ordinaryCapComponent;
  let earlierAllocated = 0;
  const chronologicalDeductionAllocations = losses.map((loss) => {
    const fifthYearLimit = loss.whbaaFifthYear
      ? Number((BigInt(Math.max(0, base - earlierAllocated)) + 1n) / 2n)
      : remainingCap;
    const allocatedDeduction = Math.min(
      loss.opening,
      remainingCap,
      loss.category === "ordinary" ? ordinaryCapacity : remainingCap,
      fifthYearLimit,
    );
    remainingCap -= allocatedDeduction;
    earlierAllocated += allocatedDeduction;
    if (loss.category === "ordinary") ordinaryCapacity -= allocatedDeduction;
    return {
      reference: loss.reference,
      originYear: loss.originYear,
      category: loss.category,
      reviewedOpening: loss.opening,
      whbaaFifthYear: loss.whbaaFifthYear,
      allocatedDeduction,
    };
  });
  return {
    applicationYear: first.applicationYear,
    tentativeAmtiBeforeAtnold: first.tentativeAmtiBeforeAtnold,
    section199Addback: first.section199Addback,
    capBase: base,
    ordinaryOpening,
    whbaaOpening,
    ordinaryCapComponent,
    whbaaCapComponent,
    preFifthYearAggregateCap,
    aggregateHistoricalCap: earlierAllocated,
    chronologicalDeductionAllocations,
    chronologicalReviewedOrigins: losses.map(({ annual: _, ...row }) => row),
    historicalAggregateCapArithmeticReconciled: true as const,
    openingAmtCarryAvailabilityVerified: false as const,
    whbaaElectionEligibilityVerified: false as const,
    chronologicalAbsorptionReconciled: false as const,
    finalAtnoldReconciled: false as const,
    sourceAuthenticityVerified: false as const,
    priorAcceptanceVerified: false as const,
    filingReady: false as const,
  };
}

/** Allocate the historical annual deduction cap in origin-year order. The
 * ordinary category cannot offset the final ten percent, but an eligible
 * reviewed WHBAA vintage can. Category cap components are not allocations:
 * an earlier WHBAA vintage can consume the entire aggregate cap. This is
 * deduction-allocation arithmetic only, not section172(b)(2) modified-income
 * absorption, surviving carry, election eligibility or a filing payload. */
export function calculateForm172HistoricalAmtDeductionAllocation(raw: unknown) {
  const cap = calculateForm172HistoricalAmtCap(raw);
  return {
    ...cap,
    chronologicalDeductionAllocations: cap.chronologicalDeductionAllocations,
    historicalDeductionAllocationArithmeticReconciled: true as const,
    // The separate cap, modified-income absorption and legal availability
    // questions retain their existing qualification flags above.
  };
}
