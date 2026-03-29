import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";
import { filingStatusSchema } from "../../types.ts";

export const itemSchema = z.object({
  qualifying_children_count: z.number().int().nonnegative().optional(),
  other_dependents_count: z.number().int().nonnegative().optional(),
  agi: z.number().nonnegative().optional(),
  filing_status: filingStatusSchema.optional(),
  earned_income: z.number().nonnegative().optional(),
  income_tax_liability: z.number().nonnegative().optional(),
  // Modified AGI add-backs (Lines 2a-2c of Schedule 8812)
  puerto_rico_excluded_income: z.number().nonnegative().optional(),
  form_2555_amounts: z.number().nonnegative().optional(),
  form_4563_amount: z.number().nonnegative().optional(),
  // ACTC earned income
  nontaxable_combat_pay: z.number().nonnegative().optional(),
  // Flags
  do_not_claim_actc: z.boolean().optional(),
  has_form_2555: z.boolean().optional(),
  bona_fide_pr_resident: z.boolean().optional(),
  odc_only_override: z.boolean().optional(),
  not_eligible_override: z.boolean().optional(),
  form_8332_override: z.boolean().optional(),
});

export const inputSchema = z.object({
  f8812s: z.array(itemSchema),
});

// TY2025 constants — One Big Beautiful Bill Act (PL 119-21, enacted July 4 2025)
const CTC_PER_CHILD = 2200;
const ODC_PER_DEPENDENT = 500;
const ACTC_MAX_PER_CHILD = 1700;
const PHASE_OUT_STEP = 50;
const PHASE_OUT_INCREMENT = 1000;
const ACTC_EARNED_INCOME_RATE = 0.15;
const ACTC_EARNED_INCOME_FLOOR = 2500;
const PHASE_OUT_THRESHOLD_MFJ = 400000;
const PHASE_OUT_THRESHOLD_OTHER = 200000;

type F8812Item = z.infer<typeof itemSchema>;
type F8812Input = z.infer<typeof inputSchema>;

// Line 9: phase-out threshold based on filing status
function phaseOutThreshold(filingStatus: string): number {
  return filingStatus === "mfj" ? PHASE_OUT_THRESHOLD_MFJ : PHASE_OUT_THRESHOLD_OTHER;
}

// Lines 10-11: phase-out reduction uses ceiling rounding per IRS instructions
// "round UP to next $1,000" — ceiling, not standard rounding
function computePhaseOutReduction(modifiedAgi: number, filingStatus: string): number {
  const excess = Math.max(0, modifiedAgi - phaseOutThreshold(filingStatus));
  if (excess === 0) return 0;
  const steps = Math.ceil(excess / PHASE_OUT_INCREMENT);
  return steps * PHASE_OUT_STEP;
}

// Lines 1-3: modified AGI = AGI + PR excluded income + Form 2555 amounts + Form 4563 amount
function computeModifiedAgi(item: F8812Item): number {
  return (item.agi ?? 0) +
    (item.puerto_rico_excluded_income ?? 0) +
    (item.form_2555_amounts ?? 0) +
    (item.form_4563_amount ?? 0);
}

// Line 18a effective earned income includes nontaxable combat pay (Line 18b)
function computeEffectiveEarnedIncome(item: F8812Item): number {
  return (item.earned_income ?? 0) + (item.nontaxable_combat_pay ?? 0);
}

// Lines 19-20: ACTC via 15% earned income method
function computeActcEarnedIncomeBased(effectiveEarnedIncome: number): number {
  const excess = Math.max(0, effectiveEarnedIncome - ACTC_EARNED_INCOME_FLOOR);
  return excess * ACTC_EARNED_INCOME_RATE;
}

class F8812Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8812";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, f1040]);

  compute(rawInput: F8812Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (input.f8812s.length === 0) return { outputs: [] };

    // Aggregate counts and flags across all items
    let totalQualifyingChildren = 0;
    let totalOtherDependents = 0;
    let combinedAgi = 0;
    let combinedModifiedAgi = 0;
    let combinedEarnedIncome = 0;
    let combinedTaxLiability: number | undefined = undefined;
    let hasFEIE = false;
    let doNotClaimActc = false;
    let filingStatus = "single";

    for (const item of input.f8812s) {
      totalQualifyingChildren += item.qualifying_children_count ?? 0;
      totalOtherDependents += item.other_dependents_count ?? 0;
      combinedAgi += item.agi ?? 0;
      combinedModifiedAgi += computeModifiedAgi(item);
      combinedEarnedIncome += computeEffectiveEarnedIncome(item);

      if (item.income_tax_liability !== undefined) {
        combinedTaxLiability = (combinedTaxLiability ?? 0) + item.income_tax_liability;
      }
      if (item.has_form_2555 === true || (item.form_2555_amounts ?? 0) > 0) {
        hasFEIE = true;
      }
      if (item.do_not_claim_actc === true) doNotClaimActc = true;
      if (item.filing_status) filingStatus = item.filing_status;
    }

    // Line 5: tentative CTC = children × $2,200
    const tentativeCTC = totalQualifyingChildren * CTC_PER_CHILD;
    // Line 7: tentative ODC = other dependents × $500
    const tentativeODC = totalOtherDependents * ODC_PER_DEPENDENT;
    // Line 8: total tentative credit
    const tentativeTotal = tentativeCTC + tentativeODC;

    if (tentativeTotal === 0) return { outputs: [] };

    // Lines 10-12: apply phase-out using modified AGI
    const phaseOutReduction = computePhaseOutReduction(combinedModifiedAgi, filingStatus);
    const creditAfterPhaseOut = Math.max(0, tentativeTotal - phaseOutReduction);

    if (creditAfterPhaseOut === 0) return { outputs: [] };

    // Line 14: non-refundable CTC+ODC limited by income tax liability
    const nonrefundableCTC = combinedTaxLiability !== undefined
      ? Math.min(creditAfterPhaseOut, combinedTaxLiability)
      : creditAfterPhaseOut;

    const outputs: NodeOutput[] = [];

    // Non-refundable portion → Schedule 3 Line 6b (→ Form 1040 Line 19)
    if (nonrefundableCTC > 0) {
      outputs.push(this.outputNodes.output(schedule3, { line6b_child_tax_credit: nonrefundableCTC }));
    }

    // ACTC (refundable) → Form 1040 Line 28
    // Conditions: must have qualifying children, must not opt out, must not file Form 2555
    const canClaimActc = totalQualifyingChildren > 0 && !doNotClaimActc && !hasFEIE;

    if (canClaimActc) {
      // Line 16a: unabsorbed CTC (potential ACTC)
      const ctcUnused = Math.max(0, creditAfterPhaseOut - nonrefundableCTC);
      // Line 16b: ACTC cap = qualifying children × $1,700
      const actcCap = totalQualifyingChildren * ACTC_MAX_PER_CHILD;

      if (ctcUnused > 0 && actcCap > 0) {
        // Line 17: tentative ACTC = min(Line 16a, Line 16b)
        const tentativeActc = Math.min(ctcUnused, actcCap);
        // Line 20: earned income based ACTC = (earned income − $2,500) × 15%
        const earnedIncomeBased = computeActcEarnedIncomeBased(combinedEarnedIncome);
        // Line 27: final ACTC = min(tentativeActc, earnedIncomeBased)
        // For Part II-A (non-PR, < 3 qualifying children): min(Line 17, Line 20)
        // For Part II-B (3+ children or PR resident): Line 26 may be higher via payroll tax method
        // Without ss/medicare withheld inputs, we use the Part II-A result
        const actc = Math.min(tentativeActc, earnedIncomeBased);

        if (actc > 0) {
          outputs.push(this.outputNodes.output(f1040, { line28_actc: actc }));
        }
      }
    }

    return { outputs };
  }
}

export const f8812 = new F8812Node();
