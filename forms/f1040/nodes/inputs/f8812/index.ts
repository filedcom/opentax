import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { filingStatusSchema } from "../../types.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import {
  CTC_PER_CHILD_2025,
  ODC_PER_DEPENDENT_2025,
  ACTC_MAX_PER_CHILD_2025,
  CTC_PHASE_OUT_THRESHOLD_MFJ_2025,
  CTC_PHASE_OUT_THRESHOLD_OTHER_2025,
  ACTC_EARNED_INCOME_FLOOR_2025,
} from "../../config/2025.ts";

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
  // Part II-B payroll tax method inputs (Lines 22-26)
  ss_taxes_withheld: z.number().nonnegative().optional(),
  medicare_taxes_withheld: z.number().nonnegative().optional(),
  se_tax: z.number().nonnegative().optional(),
  eic_amount: z.number().nonnegative().optional(),
  // Flags
  do_not_claim_actc: z.boolean().optional(),
  has_form_2555: z.boolean().optional(),
  bona_fide_pr_resident: z.boolean().optional(),
  odc_only_override: z.boolean().optional(),
  not_eligible_override: z.boolean().optional(),
  form_8332_override: z.boolean().optional(),
});

export const inputSchema = z.object({
  f8812s: z.array(itemSchema).optional(),
  // Set by Form 8862 when prior-year CTC/ACTC disallowance has been cleared
  form8862_filed: z.boolean().optional(),
  // ── Auto-populated fields (used when f8812s is empty) ──────────────────────
  // Number of qualifying children for CTC (from general node)
  auto_qualifying_children: z.number().int().nonnegative().optional(),
  // Filing status (from general node)
  auto_filing_status: z.string().optional(),
  // AGI (from agi_aggregator)
  auto_agi: z.number().nonnegative().optional(),
  // Income tax liability (from income_tax_calculation)
  auto_income_tax_liability: z.number().nonnegative().optional(),
  // Earned income (from w2 node)
  auto_earned_income: z.number().nonnegative().optional(),
});

// TY2025 constants — One Big Beautiful Bill Act (PL 119-21, enacted July 4 2025)
const CTC_PER_CHILD = CTC_PER_CHILD_2025;
const ODC_PER_DEPENDENT = ODC_PER_DEPENDENT_2025;
const ACTC_MAX_PER_CHILD = ACTC_MAX_PER_CHILD_2025;
const PHASE_OUT_STEP = 50;
const PHASE_OUT_INCREMENT = 1000;
const ACTC_EARNED_INCOME_RATE = 0.15;
const ACTC_EARNED_INCOME_FLOOR = ACTC_EARNED_INCOME_FLOOR_2025;
const PHASE_OUT_THRESHOLD_MFJ = CTC_PHASE_OUT_THRESHOLD_MFJ_2025;
const PHASE_OUT_THRESHOLD_OTHER = CTC_PHASE_OUT_THRESHOLD_OTHER_2025;

type F8812Item = z.infer<typeof itemSchema>;
type F8812Input = z.infer<typeof inputSchema>;

// Build a synthetic f8812 item from auto-populated fields (engine-computed inputs).
function buildAutoItem(input: F8812Input): F8812Item | null {
  const children = input.auto_qualifying_children ?? 0;
  if (children === 0) return null;
  return {
    qualifying_children_count: children,
    filing_status: (input.auto_filing_status ?? "single") as F8812Item["filing_status"],
    agi: input.auto_agi,
    income_tax_liability: input.auto_income_tax_liability,
    earned_income: input.auto_earned_income,
  };
}

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

// Lines 19-20: ACTC via 15% earned income method (Part II-A)
function computeActcEarnedIncomeBased(effectiveEarnedIncome: number): number {
  const excess = Math.max(0, effectiveEarnedIncome - ACTC_EARNED_INCOME_FLOOR);
  return excess * ACTC_EARNED_INCOME_RATE;
}

// Lines 22-26: ACTC via payroll tax method (Part II-B)
// Applies when taxpayer has 3+ qualifying children or is a bona fide Puerto Rico resident.
// Returns 0 when the taxpayer does not qualify for Part II-B.
function computePartIIB(
  qualifyingChildren: number,
  isPrResident: boolean,
  ssTaxesWithheld: number,
  medicareTaxesWithheld: number,
  seTax: number,
  eicAmount: number,
): number {
  const qualifies = qualifyingChildren >= 3 || isPrResident;
  if (!qualifies) return 0;
  const payrollTaxes = ssTaxesWithheld + medicareTaxesWithheld + seTax;
  return Math.max(0, payrollTaxes - eicAmount);
}

class F8812Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8812";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, f1040]);

  compute(_ctx: NodeContext, rawInput: F8812Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    // Build item list: use explicit f8812s when provided; otherwise fall back to auto-populated fields.
    const explicitItems = input.f8812s ?? [];
    let items: F8812Item[];
    if (explicitItems.length > 0) {
      items = explicitItems;
    } else {
      const autoItem = buildAutoItem(input);
      if (autoItem === null) return { outputs: [] };
      items = [autoItem];
    }

    if (items.length === 0) return { outputs: [] };

    // Aggregate counts and flags across all items
    let totalQualifyingChildren = 0;
    let totalOtherDependents = 0;
    let combinedAgi = 0;
    let combinedModifiedAgi = 0;
    let combinedEarnedIncome = 0;
    let combinedTaxLiability: number | undefined = undefined;
    let combinedSsWithheld = 0;
    let combinedMedicareWithheld = 0;
    let combinedSeTax = 0;
    let combinedEicAmount = 0;
    let hasFEIE = false;
    let doNotClaimActc = false;
    let isPrResident = false;
    let filingStatus = "single";

    for (const item of items) {
      totalQualifyingChildren += item.qualifying_children_count ?? 0;
      totalOtherDependents += item.other_dependents_count ?? 0;
      combinedAgi += item.agi ?? 0;
      combinedModifiedAgi += computeModifiedAgi(item);
      combinedEarnedIncome += computeEffectiveEarnedIncome(item);
      combinedSsWithheld += item.ss_taxes_withheld ?? 0;
      combinedMedicareWithheld += item.medicare_taxes_withheld ?? 0;
      combinedSeTax += item.se_tax ?? 0;
      combinedEicAmount += item.eic_amount ?? 0;

      if (item.income_tax_liability !== undefined) {
        combinedTaxLiability = (combinedTaxLiability ?? 0) + item.income_tax_liability;
      }
      if (item.has_form_2555 === true || (item.form_2555_amounts ?? 0) > 0) {
        hasFEIE = true;
      }
      if (item.do_not_claim_actc === true) doNotClaimActc = true;
      if (item.bona_fide_pr_resident === true) isPrResident = true;
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
        // Line 20: Part II-A — earned income based ACTC = (earned income − $2,500) × 15%
        const earnedIncomeBased = computeActcEarnedIncomeBased(combinedEarnedIncome);
        const partIIA = Math.min(tentativeActc, earnedIncomeBased);
        // Lines 22-26: Part II-B — payroll tax method (3+ children or PR resident)
        const partIIB = computePartIIB(
          totalQualifyingChildren,
          isPrResident,
          combinedSsWithheld,
          combinedMedicareWithheld,
          combinedSeTax,
          combinedEicAmount,
        );
        // Line 27: final ACTC = min(tentativeActc, max(Part II-A, Part II-B))
        const actc = Math.min(tentativeActc, Math.max(partIIA, partIIB));

        if (actc > 0) {
          outputs.push(this.outputNodes.output(f1040, { line28_actc: actc }));
        }
      }
    }

    return { outputs };
  }
}

export const f8812 = new F8812Node();
