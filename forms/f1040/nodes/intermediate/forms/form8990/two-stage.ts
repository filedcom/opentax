import {
  calculateScheduleCAtRiskNet,
  inputSchema as scheduleCInputSchema,
  itemSchema as scheduleCItemSchema,
  wotcReductionsByBusiness,
} from "../../../inputs/schedule_c/model.ts";
import {
  type ScheduleCInterestStage,
  stageScheduleCInterest,
} from "./schedule-c-source.ts";
import type { z } from "zod";

type ScheduleCSource = z.output<typeof scheduleCInputSchema>;
const provisionalBrand = Symbol("Form8990ProvisionalScheduleC");
const finalizedBrand = Symbol("Form8990FinalizedScheduleC");

function sameValue(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameValue(value, right[index]));
  }
  if (
    left !== null && right !== null && typeof left === "object" &&
    typeof right === "object"
  ) {
    const a = left as Record<string, unknown>;
    const b = right as Record<string, unknown>;
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    return aKeys.length === bKeys.length &&
      aKeys.every((key, index) => key === bKeys[index] && sameValue(a[key], b[key]));
  }
  return Object.is(left, right);
}

/** Parsed, order-independent equality that also rejects stripped raw fields. */
export function sameStagedScheduleCSource(
  raw: unknown,
  expected: ScheduleCSource,
): boolean {
  const parsed = scheduleCInputSchema.parse(raw);
  return sameValue(raw, parsed) && sameValue(parsed, expected);
}

export interface ProvisionalScheduleCInterestPass {
  readonly phase: "provisional";
  readonly source: ScheduleCSource;
  readonly interest: ScheduleCInterestStage;
  readonly [provisionalBrand]: true;
}

export interface FinalizedScheduleCInterestPass {
  readonly phase: "finalized";
  readonly source: ScheduleCSource;
  readonly businessReference: string;
  readonly originalInterestExpense: number;
  readonly allowedInterestExpense: number;
  readonly disallowedInterestExpense: number;
  readonly provisionalAtRiskNet: number;
  readonly finalizedAtRiskNet: number;
  readonly [finalizedBrand]: true;
}

/**
 * First pass for a single Schedule C with business interest only on line 16b.
 * A return-wide provisional taxable-income pass is still required separately.
 */
export function stageProvisionalScheduleCInterest(
  raw: unknown,
): ProvisionalScheduleCInterestPass {
  const source = scheduleCInputSchema.parse(raw);
  const unsupportedKeys = Object.keys(raw as Record<string, unknown>).filter((
    key,
  ) =>
    key !== "schedule_cs" && key !== "wotc_wage_reductions" &&
    key !== "filing_status"
  );
  if (unsupportedKeys.length > 0) {
    throw new Error(
      `Form 8990 two-stage Schedule C source has unmodeled top-level fields: ${
        unsupportedKeys.join(", ")
      }`,
    );
  }
  const interest = stageScheduleCInterest(source);
  const rawBusiness = (raw as { schedule_cs: Record<string, unknown>[] })
    .schedule_cs[0];
  const supportedBusinessKeys = new Set(Object.keys(scheduleCItemSchema.shape));
  const unsupportedBusinessKeys = Object.keys(rawBusiness).filter((key) =>
    !supportedBusinessKeys.has(key)
  );
  if (unsupportedBusinessKeys.length > 0) {
    throw new Error(
      `Form 8990 two-stage Schedule C business has unmodeled fields: ${
        unsupportedBusinessKeys.join(", ")
      }`,
    );
  }
  if (interest.line16aMortgageInterest !== 0) {
    throw new Error(
      "Form 8990 two-stage Schedule C route needs line 16b interest only",
    );
  }
  if (!Number.isSafeInteger(interest.currentYearBusinessInterestExpense)) {
    throw new Error(
      "Form 8990 two-stage Schedule C interest needs whole-dollar source amounts",
    );
  }
  return { phase: "provisional", source, interest, [provisionalBrand]: true };
}

/**
 * Pure feedback calculation. The allowed amount must ultimately come from a
 * return-reconciled Form 8990 calculation; this function does not authorize a
 * filing route or change the Schedule C node's nonexempt-interest gate.
 */
export function applyCalculatedInterestAllowance(
  provisional: ProvisionalScheduleCInterestPass,
  allowedInterestExpense: number,
): FinalizedScheduleCInterestPass {
  if (provisional[provisionalBrand] !== true) {
    throw new Error("Form 8990 final pass needs a staged Schedule C source");
  }
  const originalInterestExpense =
    provisional.interest.currentYearBusinessInterestExpense;
  if (
    !Number.isSafeInteger(allowedInterestExpense) ||
    allowedInterestExpense < 0 ||
    allowedInterestExpense > originalInterestExpense
  ) {
    throw new Error(
      "Form 8990 allowed interest is outside source-backed expense",
    );
  }
  const business = provisional.source.schedule_cs[0];
  const source: ScheduleCSource = {
    ...provisional.source,
    schedule_cs: [{
      ...business,
      line_16b_interest_other: allowedInterestExpense,
    }],
  };
  const wotcReduction = wotcReductionsByBusiness(source).get(
    provisional.interest.businessReference,
  ) ?? 0;
  const finalizedAtRiskNet = calculateScheduleCAtRiskNet(
    source.schedule_cs[0],
    wotcReduction,
  ).atRiskNet;
  return {
    phase: "finalized",
    source,
    businessReference: provisional.interest.businessReference,
    originalInterestExpense,
    allowedInterestExpense,
    disallowedInterestExpense: originalInterestExpense - allowedInterestExpense,
    provisionalAtRiskNet:
      provisional.interest.tentativeScheduleCAtRiskNetWithFullInterest,
    finalizedAtRiskNet,
    [finalizedBrand]: true,
  };
}
