import { z } from "zod";
import { calculateForm172FarmingLossSplit } from "./form172_farming_loss_split.ts";
import { calculateForm172CarryAbsorption } from "./form172_carry_absorption.ts";

const ref = z.string().trim().min(1);
const schema = z.object({
  reference: ref,
  opening_tax_year: z.literal(2025),
  carry_policy: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("reviewed_waiver"),
      reference: ref,
      waiver_timeliness_reviewed: z.literal(true),
    }).strict(),
    z.object({
      kind: z.literal("reviewed_mixed_carryback"),
      reference: ref,
      farming_carryback_eligibility_reviewed: z.literal(true),
      section965_years_absent_reviewed: z.literal(true),
      legacy_general_nonfarm_two_year_rule_reviewed: z.literal(true).optional(),
    }).strict(),
  ]),
  annual_reviews: z.array(z.record(z.unknown())),
}).strict();

/** Recompute split and every annual capacity, then allocate nonfarm before farm.
 * Deduction and modified-income absorption are allocated separately. Every
 * applicable calendar year is required, including years after exhaustion.
 * Reviewed carry policies are not authentic elections or accepted carry proof.
 */
export function calculateForm172FarmingCarryHistory(
  rawOrigin: unknown,
  rawFarmingReview: unknown,
  rawHistory: unknown,
) {
  const split = calculateForm172FarmingLossSplit(rawOrigin, rawFarmingReview);
  const h = schema.parse(rawHistory), originYear = split.originYear;
  if (originYear >= h.opening_tax_year) {
    throw new Error(
      "Farming carry history origin must precede the opening year",
    );
  }
  if (
    originYear < 2018 && h.carry_policy.kind === "reviewed_mixed_carryback" &&
    !h.carry_policy.legacy_general_nonfarm_two_year_rule_reviewed
  ) {
    throw new Error(
      "Legacy mixed carryback needs reviewed general nonfarm eligibility",
    );
  }
  const farmYears = new Set<number>(), nonfarmYears = new Set<number>();
  if (h.carry_policy.kind === "reviewed_mixed_carryback") {
    const farmPeriod = originYear <= 2020 ? 5 : 2;
    const nonfarmPeriod = originYear < 2018 ? 2 : originYear <= 2020 ? 5 : 0;
    if (split.farmingLoss > 0) {
      for (let y = originYear - farmPeriod; y < originYear; y++) {
        farmYears.add(y);
      }
    }
    if (split.nonfarmingLoss > 0) {
      for (let y = originYear - nonfarmPeriod; y < originYear; y++) {
        nonfarmYears.add(y);
      }
    }
  }
  for (let y = originYear + 1; y < h.opening_tax_year; y++) {
    if (split.farmingLoss > 0) farmYears.add(y);
    if (split.nonfarmingLoss > 0) nonfarmYears.add(y);
  }
  const expectedYears = [...new Set([...farmYears, ...nonfarmYears])].sort((
    a,
    b,
  ) => a - b);
  if (h.annual_reviews.length !== expectedYears.length) {
    throw new Error("Mixed carry history needs every applicable annual return");
  }
  const refs = new Set([h.reference, h.carry_policy.reference]);
  if (refs.size !== 2) {
    throw new Error("Mixed history and policy references must differ");
  }
  let farmRemaining = split.farmingLoss,
    nonfarmRemaining = split.nonfarmingLoss;
  const prior: {
    item_id: string;
    reference: string;
    tax_year: number;
    absorbed: number;
  }[] = [];
  const annualResults = h.annual_reviews.map((annual, i) => {
    if (
      Object.hasOwn(annual, "prior_absorption_records") ||
      annual.tax_year !== expectedYears[i]
    ) {
      throw new Error(
        "Mixed history derives prior use and requires chronological source years",
      );
    }
    for (const field of ["reference", "return_reference"]) {
      const value = ref.parse(annual[field]);
      if (refs.has(value)) {
        throw new Error("Mixed history needs distinct annual sources");
      }
      refs.add(value);
    }
    const capacity = calculateForm172CarryAbsorption(rawOrigin, {
      ...annual,
      prior_absorption_records: [...prior],
    });
    const year = capacity.applicationYear;
    const nonfarmOpening = nonfarmRemaining, farmOpening = farmRemaining;
    const nonfarmDeduction = nonfarmYears.has(year)
      ? Math.min(nonfarmOpening, capacity.deductionCapacity)
      : 0;
    const nonfarmAbsorbed = nonfarmYears.has(year)
      ? Math.min(nonfarmOpening, capacity.absorptionCapacity)
      : 0;
    const farmDeduction = farmYears.has(year)
      ? Math.min(
        farmOpening,
        Math.max(0, capacity.deductionCapacity - nonfarmDeduction),
      )
      : 0;
    const farmAbsorbed = farmYears.has(year)
      ? Math.min(
        farmOpening,
        Math.max(0, capacity.absorptionCapacity - nonfarmAbsorbed),
      )
      : 0;
    nonfarmRemaining -= nonfarmAbsorbed;
    farmRemaining -= farmAbsorbed;
    prior.push({
      item_id: `computed-mixed-absorption-${year}`,
      reference: String(annual.reference).trim(),
      tax_year: year,
      absorbed: nonfarmAbsorbed + farmAbsorbed,
    });
    return {
      applicationYear: year,
      capacity,
      nonfarmOpening,
      farmOpening,
      nonfarmDeduction,
      farmDeduction,
      nonfarmAbsorbed,
      farmAbsorbed,
      nonfarmRemaining,
      farmRemaining,
    };
  });
  return {
    ...split,
    expectedYears,
    farmingApplicationYears: [...farmYears].sort((a, b) => a - b),
    nonfarmingApplicationYears: [...nonfarmYears].sort((a, b) => a - b),
    annualResults,
    computedAbsorptionRecords: prior,
    openingTaxYear: h.opening_tax_year,
    farmingOpeningLoss: farmRemaining,
    nonfarmingOpeningLoss: nonfarmRemaining,
    openingLoss: farmRemaining + nonfarmRemaining,
    expiresAfterTaxYear: originYear < 2018 ? originYear + 20 : undefined,
    portionCarryHistoryArithmeticReconciled: true as const,
    portionCarryHistoriesReconciled: false as const,
    carryPolicyAuthenticityVerified: false as const,
    acceptedCarryImportVerified: false as const,
    filingReady: false as const,
  };
}
