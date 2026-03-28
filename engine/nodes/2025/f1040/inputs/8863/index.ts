import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";

export const itemSchema = z.object({
  credit_type: z.enum(["aoc", "llc"]),
  student_name: z.string(),
  qualified_expenses: z.number().nonnegative(),
  agi: z.number().nonnegative().optional(),
  filing_status: z.enum(["single", "mfs", "mfj", "hoh", "qss"]).optional(),
});

export const inputSchema = z.object({
  f8863s: z.array(itemSchema).min(1),
});

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
  return Math.min(
    1,
    Math.max(0, (agi - phaseOutStart) / (phaseOutEnd - phaseOutStart)),
  );
}

function computeAOC(
  qualifiedExpenses: number,
  agi: number,
  isMFJ: boolean,
): { nonrefundable: number; refundable: number } {
  const firstTier = Math.min(qualifiedExpenses, 2000);
  const secondTier = 0.25 *
    Math.min(Math.max(0, qualifiedExpenses - 2000), 2000);
  const aocBase = firstTier + secondTier;

  const phaseOutStart = isMFJ
    ? AOC_PHASE_OUT_MFJ_START
    : AOC_PHASE_OUT_OTHER_START;
  const phaseOutEnd = isMFJ ? AOC_PHASE_OUT_MFJ_END : AOC_PHASE_OUT_OTHER_END;
  const phaseOutFraction = computePhaseOutFraction(
    agi,
    phaseOutStart,
    phaseOutEnd,
  );
  const aocAllowed = aocBase * (1 - phaseOutFraction);

  return { refundable: aocAllowed * 0.40, nonrefundable: aocAllowed * 0.60 };
}

function computeLLC(
  qualifiedExpenses: number,
  agi: number,
  isMFJ: boolean,
): number {
  const llcBase = 0.20 * Math.min(qualifiedExpenses, 10000);

  const phaseOutStart = isMFJ
    ? LLC_PHASE_OUT_MFJ_START
    : LLC_PHASE_OUT_OTHER_START;
  const phaseOutEnd = isMFJ ? LLC_PHASE_OUT_MFJ_END : LLC_PHASE_OUT_OTHER_END;
  const phaseOutFraction = computePhaseOutFraction(
    agi,
    phaseOutStart,
    phaseOutEnd,
  );

  return llcBase * (1 - phaseOutFraction);
}

class F8863Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8863";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, f1040]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const out = this.outputNodes.builder();

    for (const item of input.f8863s) {
      const agi = item.agi ?? 0;
      const isMFJ = item.filing_status === "mfj";

      if (item.credit_type === "aoc") {
        const { nonrefundable, refundable } = computeAOC(
          item.qualified_expenses,
          agi,
          isMFJ,
        );

        if (nonrefundable > 0) {
          out.add(schedule3, { line3_education_credit: nonrefundable });
        }
        if (refundable > 0) {
          out.add(f1040, { line29_refundable_aoc: refundable });
        }
      } else {
        const llcAllowed = computeLLC(item.qualified_expenses, agi, isMFJ);
        if (llcAllowed > 0) {
          out.add(schedule3, { line3_education_credit: llcAllowed });
        }
      }
    }

    return out.build();
  }
}

export const f8863 = new F8863Node();
