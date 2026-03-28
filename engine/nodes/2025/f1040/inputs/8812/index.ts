import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";

export const itemSchema = z.object({
  qualifying_children_count: z.number().int().min(0).optional(),
  other_dependents_count: z.number().int().min(0).optional(),
  agi: z.number().nonnegative().optional(),
  earned_income: z.number().nonnegative().optional(),
  filing_status: z.enum(["single", "mfs", "mfj", "hoh", "qss"]).optional(),
  income_tax_liability: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f8812s: z.array(itemSchema).min(1),
});

// TY2025 constants
const CTC_PER_CHILD = 2000;
const ODC_PER_DEPENDENT = 500;
const ACTC_PER_CHILD = 1700;
const PHASE_OUT_STEP = 50;
const PHASE_OUT_INCREMENT = 1000;
const ACTC_EARNED_INCOME_RATE = 0.15;
const ACTC_EARNED_INCOME_THRESHOLD = 2500;
const PHASE_OUT_THRESHOLD_MFJ = 400000;
const PHASE_OUT_THRESHOLD_OTHER = 200000;

type F8812Item = z.infer<typeof itemSchema>;

function computePhaseOutReduction(agi: number, filingStatus: string): number {
  const phaseOutThreshold = filingStatus === "mfj"
    ? PHASE_OUT_THRESHOLD_MFJ
    : PHASE_OUT_THRESHOLD_OTHER;
  const excessAgi = Math.max(0, agi - phaseOutThreshold);
  const phaseOutSteps = Math.ceil(excessAgi / PHASE_OUT_INCREMENT);
  return phaseOutSteps * PHASE_OUT_STEP;
}

function computeNonrefundableCTC(
  ctcAfterPhaseOut: number,
  incomeTaxLiability: number | undefined,
): number {
  return incomeTaxLiability !== undefined
    ? Math.min(ctcAfterPhaseOut, incomeTaxLiability)
    : ctcAfterPhaseOut;
}

function computeACTC(
  qualifyingChildren: number,
  earnedIncome: number,
  ctcAfterPhaseOut: number,
  nonrefundableCTC: number,
): number {
  const earnedIncomeBased = Math.max(
    0,
    earnedIncome * ACTC_EARNED_INCOME_RATE - ACTC_EARNED_INCOME_THRESHOLD,
  );
  const maxPerChild = qualifyingChildren * ACTC_PER_CHILD;
  const ctcUnused = Math.max(0, ctcAfterPhaseOut - nonrefundableCTC);
  return Math.max(0, Math.min(ctcUnused, earnedIncomeBased, maxPerChild));
}

function f8812ItemOutputs(item: F8812Item): NodeOutput[] {
  const filingStatus = item.filing_status ?? "single";
  const qualifyingChildren = item.qualifying_children_count ?? 0;
  const otherDependents = item.other_dependents_count ?? 0;
  const agi = item.agi ?? 0;
  const earnedIncome = item.earned_income ?? 0;
  const ctcBeforePhaseOut = qualifyingChildren * CTC_PER_CHILD + otherDependents * ODC_PER_DEPENDENT;
  const ctcAfterPhaseOut = Math.max(0, ctcBeforePhaseOut - computePhaseOutReduction(agi, filingStatus));
  const nonrefundableCTC = computeNonrefundableCTC(ctcAfterPhaseOut, item.income_tax_liability);
  const actc = computeACTC(qualifyingChildren, earnedIncome, ctcAfterPhaseOut, nonrefundableCTC);
  return [
    ...(nonrefundableCTC > 0 ? [{ nodeType: schedule3.nodeType, input: { line6b_child_tax_credit: nonrefundableCTC } }] : []),
    ...(actc > 0 ? [{ nodeType: f1040.nodeType, input: { line28_actc: actc } }] : []),
  ];
}

class F8812Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8812";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, f1040]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    return { outputs: input.f8812s.flatMap(f8812ItemOutputs) };
  }
}

export const f8812 = new F8812Node();
