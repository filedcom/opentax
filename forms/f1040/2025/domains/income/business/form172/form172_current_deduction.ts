import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { z } from "zod";
import { calculateForm172CarryHistory } from "./form172_carry_history.ts";
import { calculateForm172FarmingCarryHistory } from "./form172_farming_carry_history.ts";
import { calculateForm172CarryAbsorption } from "./form172_carry_absorption.ts";

const ref = z.string().trim().min(1);
const schema = z.object({
  reference: ref,
  history_kind: z.enum(["regular", "mixed_farming"]),
  annual_review: z.record(z.unknown()),
}).strict();

/** Instructions for Form 172 (Rev. December 2024) and IRC §172 are the
 * newest sources; no TY2026 revision is in irs/corpus/ty2026, so a later
 * year is refused rather than computed under the TY2025 review contract. */
export function assertForm172ReviewYear(context: NodeContext): void {
  if (context.taxYear >= 2026) {
    throw new Error(
      `Form 172 NOL workpaper for TY${context.taxYear} has no current-year Form 172 source; only the TY2025 review is supported`,
    );
  }
}

/** Origin -> complete history -> current-year deduction and carry closing workpaper.
 * Schedule1 line8a is a proposed arithmetic join only: source authenticity,
 * accepted carry, AGI-dependent refigures, AMT and filing admission remain open.
 */
export function calculateForm172CurrentDeduction(
  rawOrigin: unknown,
  rawHistory: unknown,
  rawCurrentReview: unknown,
  context: NodeContext,
  rawFarmingReview?: unknown,
) {
  assertForm172ReviewYear(context);
  const v = schema.parse(rawCurrentReview), annual = v.annual_review;
  if (
    annual.tax_year !== context.taxYear ||
    Object.hasOwn(annual, "prior_absorption_records")
  ) {
    throw new Error(
      "Current NOL review needs the return year and derives prior use from history",
    );
  }
  const sourceHistory = z.object({
    reference: ref,
    annual_reviews: z.array(
      z.object({ reference: ref, return_reference: ref }).passthrough(),
    ),
  }).passthrough().parse(rawHistory);
  const currentRefs = [
    v.reference,
    ref.parse(annual.reference),
    ref.parse(annual.return_reference),
  ];
  const historyRefs = new Set([
    sourceHistory.reference,
    ...sourceHistory.annual_reviews.flatMap(
      (a) => [a.reference, a.return_reference],
    ),
  ]);
  if (
    new Set(currentRefs).size !== 3 ||
    currentRefs.some((r) => historyRefs.has(r))
  ) {
    throw new Error(
      "Current NOL review needs distinct current and historical references",
    );
  }
  if (v.history_kind === "regular" && rawFarmingReview !== undefined) {
    throw new Error(
      "Regular current NOL review cannot ignore a farming review",
    );
  }
  const history = v.history_kind === "mixed_farming"
    ? calculateForm172FarmingCarryHistory(
      rawOrigin,
      rawFarmingReview,
      rawHistory,
    )
    : calculateForm172CarryHistory(rawOrigin, rawHistory);
  const current = calculateForm172CarryAbsorption(rawOrigin, {
    ...annual,
    prior_absorption_records: history.computedAbsorptionRecords,
  });
  if (current.openingLoss !== history.openingLoss) {
    throw new Error("Current NOL opening differs from recomputed history");
  }
  const mixed = "farmingOpeningLoss" in history;
  const nonfarmingDeduction = mixed
    ? Math.min(history.nonfarmingOpeningLoss, current.deductionCapacity)
    : current.currentDeduction;
  const farmingDeduction = mixed
    ? Math.min(
      history.farmingOpeningLoss,
      Math.max(0, current.deductionCapacity - nonfarmingDeduction),
    )
    : 0;
  const nonfarmingAbsorbed = mixed
    ? Math.min(history.nonfarmingOpeningLoss, current.absorptionCapacity)
    : current.absorbed;
  const farmingAbsorbed = mixed
    ? Math.min(
      history.farmingOpeningLoss,
      Math.max(0, current.absorptionCapacity - nonfarmingAbsorbed),
    )
    : 0;
  const deduction = nonfarmingDeduction + farmingDeduction;
  const closingLossBeforeExpiration = history.openingLoss - nonfarmingAbsorbed -
    farmingAbsorbed;
  const expiresNow = history.expiresAfterTaxYear === context.taxYear;
  return {
    originYear: history.originYear,
    taxYear: context.taxYear,
    historyOpeningLoss: history.openingLoss,
    history,
    currentAnnualCalculation: current,
    deduction,
    proposedSchedule1Line8a: deduction > 0 ? -deduction : 0,
    nonfarmingDeduction,
    farmingDeduction,
    nonfarmingAbsorbed,
    farmingAbsorbed,
    closingLossBeforeExpiration,
    expiredLoss: expiresNow ? closingLossBeforeExpiration : 0,
    carryToNextYear: expiresNow ? 0 : closingLossBeforeExpiration,
    currentDeductionWorkpaperArithmeticReconciled: true as const,
    publicForm1040JoinVerified: false as const,
    currentAgiDependentRefiguresVerified: false as const,
    sourceAuthenticityVerified: false as const,
    acceptedCarryImportVerified: false as const,
    amtNolReconciled: false as const,
    packetAdmissionVerified: false as const,
    filingReady: false as const,
  };
}
