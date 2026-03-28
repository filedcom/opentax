import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

export const inputSchema = z.object({
  qualifying_children_count: z.number().int().min(0).optional(),
  other_dependents_count: z.number().int().min(0).optional(),
  agi: z.number().nonnegative().optional(),
  earned_income: z.number().nonnegative().optional(),
  filing_status: z.enum(["single", "mfs", "mfj", "hoh", "qss"]).optional(),
  income_tax_liability: z.number().nonnegative().optional(),
});

type F8812Input = z.infer<typeof inputSchema>;

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

class F8812Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8812";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = ["schedule3", "f1040"] as const;

  compute(input: F8812Input): NodeResult {
    const outputs: NodeOutput[] = [];

    const filingStatus = input.filing_status ?? "single";
    const qualifyingChildren = input.qualifying_children_count ?? 0;
    const otherDependents = input.other_dependents_count ?? 0;
    const agi = input.agi ?? 0;
    const earnedIncome = input.earned_income ?? 0;

    // Step 1: Phase-out threshold by filing status
    const phaseOutThreshold =
      filingStatus === "mfj" ? PHASE_OUT_THRESHOLD_MFJ : PHASE_OUT_THRESHOLD_OTHER;

    // Step 2: CTC before phase-out
    const ctcBeforePhaseOut =
      qualifyingChildren * CTC_PER_CHILD + otherDependents * ODC_PER_DEPENDENT;

    // Step 3: Phase-out reduction ($50 per $1,000 over threshold, ceiling division)
    const excessAgi = Math.max(0, agi - phaseOutThreshold);
    const phaseOutSteps = Math.ceil(excessAgi / PHASE_OUT_INCREMENT);
    const phaseOutReduction = phaseOutSteps * PHASE_OUT_STEP;

    // Step 4: CTC after phase-out
    const ctcAfterPhaseOut = Math.max(0, ctcBeforePhaseOut - phaseOutReduction);

    // Step 5: Nonrefundable CTC (limited by income tax liability)
    const nonrefundableCTC =
      input.income_tax_liability !== undefined
        ? Math.min(ctcAfterPhaseOut, input.income_tax_liability)
        : ctcAfterPhaseOut;

    // Step 6: ACTC (refundable portion)
    const actcEarnedIncomeBased = Math.max(
      0,
      earnedIncome * ACTC_EARNED_INCOME_RATE - ACTC_EARNED_INCOME_THRESHOLD,
    );
    const actcMaxPerChild = qualifyingChildren * ACTC_PER_CHILD;
    const ctcUnused = Math.max(0, ctcAfterPhaseOut - nonrefundableCTC);
    const actc = Math.max(
      0,
      Math.min(ctcUnused, actcEarnedIncomeBased, actcMaxPerChild),
    );

    // Routing: nonrefundable CTC → schedule3 line6b
    if (nonrefundableCTC > 0) {
      outputs.push({
        nodeType: "schedule3",
        input: { line6b_child_tax_credit: nonrefundableCTC },
      });
    }

    // Routing: ACTC → f1040 line28
    if (actc > 0) {
      outputs.push({
        nodeType: "f1040",
        input: { line28_actc: actc },
      });
    }

    return { outputs };
  }
}

export const f8812 = new F8812Node();
