import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

export const inputSchema = z.object({
  credit_type: z.enum(["aoc", "llc"]),
  student_name: z.string(),
  qualified_expenses: z.number().nonnegative(),
  agi: z.number().nonnegative().optional(),
  filing_status: z.enum(["single", "mfs", "mfj", "hoh", "qss"]).optional(),
});

type F8863Input = z.infer<typeof inputSchema>;

// TY2025 phase-out ranges
const AOC_PHASE_OUT_MFJ_START = 160000;
const AOC_PHASE_OUT_MFJ_END = 180000;
const AOC_PHASE_OUT_OTHER_START = 80000;
const AOC_PHASE_OUT_OTHER_END = 90000;

const LLC_PHASE_OUT_MFJ_START = 160000;
const LLC_PHASE_OUT_MFJ_END = 180000;
const LLC_PHASE_OUT_OTHER_START = 80000;
const LLC_PHASE_OUT_OTHER_END = 90000;

function computePhaseOutFraction(
  agi: number,
  phaseOutStart: number,
  phaseOutEnd: number,
): number {
  return Math.min(1, Math.max(0, (agi - phaseOutStart) / (phaseOutEnd - phaseOutStart)));
}

function computeAOC(qualifiedExpenses: number, agi: number, isMFJ: boolean): {
  nonrefundable: number;
  refundable: number;
} {
  // AOC base: 100% of first $2,000 + 25% of next $2,000 = max $2,500
  const firstTier = Math.min(qualifiedExpenses, 2000);
  const secondTier = 0.25 * Math.min(Math.max(0, qualifiedExpenses - 2000), 2000);
  const aocBase = firstTier + secondTier;

  // Phase-out
  const phaseOutStart = isMFJ ? AOC_PHASE_OUT_MFJ_START : AOC_PHASE_OUT_OTHER_START;
  const phaseOutEnd = isMFJ ? AOC_PHASE_OUT_MFJ_END : AOC_PHASE_OUT_OTHER_END;
  const phaseOutFraction = computePhaseOutFraction(agi, phaseOutStart, phaseOutEnd);
  const aocAllowed = aocBase * (1 - phaseOutFraction);

  return {
    refundable: aocAllowed * 0.40,
    nonrefundable: aocAllowed * 0.60,
  };
}

function computeLLC(qualifiedExpenses: number, agi: number, isMFJ: boolean): number {
  // LLC base: 20% of up to $10,000 = max $2,000
  const llcBase = 0.20 * Math.min(qualifiedExpenses, 10000);

  // Phase-out
  const phaseOutStart = isMFJ ? LLC_PHASE_OUT_MFJ_START : LLC_PHASE_OUT_OTHER_START;
  const phaseOutEnd = isMFJ ? LLC_PHASE_OUT_MFJ_END : LLC_PHASE_OUT_OTHER_END;
  const phaseOutFraction = computePhaseOutFraction(agi, phaseOutStart, phaseOutEnd);

  return llcBase * (1 - phaseOutFraction);
}

class F8863Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8863";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = ["schedule3", "f1040"] as const;

  compute(input: F8863Input): NodeResult {
    const outputs: NodeOutput[] = [];

    const agi = input.agi ?? 0;
    const isMFJ = input.filing_status === "mfj";

    if (input.credit_type === "aoc") {
      const { nonrefundable, refundable } = computeAOC(
        input.qualified_expenses,
        agi,
        isMFJ,
      );

      if (nonrefundable > 0) {
        outputs.push({
          nodeType: "schedule3",
          input: { line3_education_credit: nonrefundable },
        });
      }

      if (refundable > 0) {
        outputs.push({
          nodeType: "f1040",
          input: { line29_refundable_aoc: refundable },
        });
      }
    } else {
      // LLC
      const llcAllowed = computeLLC(input.qualified_expenses, agi, isMFJ);

      if (llcAllowed > 0) {
        outputs.push({
          nodeType: "schedule3",
          input: { line3_education_credit: llcAllowed },
        });
      }
    }

    return { outputs };
  }
}

export const f8863 = new F8863Node();
