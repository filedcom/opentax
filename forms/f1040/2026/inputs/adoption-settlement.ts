import { z } from "zod";
import { adoption2026 as rules } from "../../nodes/config/2026-adoption.ts";
import {
  adoptionAmountAfterPhaseout,
  adoptionPhaseoutFraction,
} from "../../nodes/intermediate/forms/credits/individual/form8839/amounts.ts";
import {
  type FinalizedReturnCreditContext,
  finalizedReturnCreditContextSchema,
} from "../../nodes/intermediate/forms/credits/individual/form8839/index.ts";
import {
  type AdoptionSource2026,
  adoptionSource2026Schema,
  prepareAdoptionSources2026,
} from "./adoption-source.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
const signed = z.number().int().min(-1e9).max(1e9),
  whole = signed.nonnegative();
/** Internal printed MAGI worksheet operands, to be bound by the pre-credit
 * return stage. These are deliberately absent from the public source claim. */
export const adoptionExclusionIncome2026Schema = z.object({
  wages_if_all_line23_benefits_excluded: signed,
  taxable_interest: signed,
  ordinary_dividends: signed,
  taxable_ira: signed,
  taxable_pensions: signed,
  taxable_social_security: whole,
  capital_gain_or_loss: signed,
  schedule1_line10: signed,
  schedule1_adjustments_excluding_student_loan_interest: whole,
  magi_additions: finalizedReturnCreditContextSchema.shape.magi_additions
    .refine(
      (a) => Object.values(a).every((v) => Number.isSafeInteger(v) && v <= 1e9),
      "Adoption exclusion requires whole-dollar return addbacks",
    ),
}).strict();
const additions = (a: FinalizedReturnCreditContext["magi_additions"]) =>
  a.puerto_rico_excluded_income + a.form2555_line45 + a.form2555_line50 +
  a.form4563_line15;
export function calculateAdoptionExclusion2026(
  raw: AdoptionSource2026,
  facts: z.input<typeof adoptionExclusionIncome2026Schema>,
) {
  const source = prepareAdoptionSources2026(raw),
    income = adoptionExclusionIncome2026Schema.parse(facts);
  const line23 = source.partIII_line23;
  const otherIncome = income.taxable_interest + income.ordinary_dividends +
    income.taxable_ira + income.taxable_pensions +
    income.taxable_social_security + income.capital_gain_or_loss +
    income.schedule1_line10;
  const line25 = income.wages_if_all_line23_benefits_excluded + line23 +
    otherIncome - income.schedule1_adjustments_excluding_student_loan_interest +
    additions(income.magi_additions);
  const line26 = Math.max(0, line25 - rules.phaseoutStart),
    line27 = adoptionPhaseoutFraction(
      line25,
      rules.phaseoutStart,
      rules.phaseoutRange,
    );
  const children = source.children.map((r) => {
    const { reduction: line28, allowed: line29 } = adoptionAmountAfterPhaseout(
      r.partIII.line24,
      line27,
      roundWholeDollars,
    );
    return {
      child_reference: r.source.record_reference,
      ...r.partIII,
      line28,
      line29,
    };
  });
  const line30 = children.reduce((n, r) => n + r.line29, 0);
  const foreign = source.prior_foreign_benefits > 0;
  const currentReported = source.partIII_line23 - source.prior_foreign_benefits;
  const priorBenefitWorksheet = foreign
    ? {
      line4: Math.max(0, line23 - line30),
      line5: source.prior_foreign_benefits,
      line6: Math.max(0, line23 - line30 - source.prior_foreign_benefits),
      line7: line30,
      line8: currentReported,
      line9: Math.max(0, line30 - currentReported),
    }
    : undefined;
  const line31 = priorBenefitWorksheet
    ? priorBenefitWorksheet.line6
    : line23 - line30;
  return {
    source_input: source.source_input,
    income,
    source,
    children,
    lines: { line23, line25, line26, line27, line30, line31 },
    prior_benefit_worksheet: priorBenefitWorksheet,
    requires_prior_benefit_recovery_reconciliation:
      (priorBenefitWorksheet?.line9 ?? 0) > 0,
    line1f_taxable_adoption_benefits: line31 +
      source.taxable_benefits_outside_partIII,
  };
}
/** Late credit settlement. Return graph/credit ordering and the separate Part
 * III exclusion must precede this stage; no caller-entered capacity shortcut. */
export function settleAdoptionCredit2026(
  raw: AdoptionSource2026,
  contextRaw: FinalizedReturnCreditContext,
) {
  const source = prepareAdoptionSources2026(raw),
    context = finalizedReturnCreditContextSchema.parse(contextRaw);
  // The filed 2026 return stage supplies dollars, not unrounded draft subtotals.
  const values = [
    context.form1040_line11b_agi,
    context.form1040_line18_tax_before_credits,
    context.child_credit_priority.amount,
    ...Object.values(context.schedule3_priority),
    ...Object.values(context.magi_additions),
  ];
  if (values.some((v) => !Number.isSafeInteger(v) || Math.abs(v) > 1e9)) {
    throw Error(
      "Adoption credit settlement needs whole-dollar finalized return operands",
    );
  }
  const line7 = context.form1040_line11b_agi +
      additions(context.magi_additions),
    line8 = Math.max(0, line7 - rules.phaseoutStart),
    line9 = adoptionPhaseoutFraction(
      line7,
      rules.phaseoutStart,
      rules.phaseoutRange,
    );
  const children = source.children.map((r) => {
    const { reduction: line10, allowed: line11a } = adoptionAmountAfterPhaseout(
      r.partII.line6,
      line9,
      roundWholeDollars,
    );
    return {
      child_reference: r.source.record_reference,
      ...r.partII,
      line10,
      line11a,
      line11b: Math.min(line11a, rules.refundablePerChild),
    };
  });
  const line11c = children.reduce((n, r) => n + r.line11b, 0),
    line12 = children.reduce((n, r) => n + r.line11a, 0),
    line13 = line11c,
    line14 = line12 - line13;
  const line15 = source.carryforward_origins.reduce((n, r) => n + r.amount, 0),
    line16 = line14 + line15;
  const priority = context.child_credit_priority.amount +
    Object.values(context.schedule3_priority).reduce((n, v) => n + v, 0);
  const capacity = Math.max(
      0,
      context.form1040_line18_tax_before_credits - priority,
    ),
    line17 = Math.min(line16, capacity),
    line18a = line17;
  let available = line18a;
  const allocations = [
    ...source.carryforward_origins.map((r) => ({
      origin_tax_year: r.tax_year,
      amount: r.amount,
    })),
    { origin_tax_year: 2026, amount: line14 },
  ].sort((a, b) => a.origin_tax_year - b.origin_tax_year).map((r) => {
    const used = Math.min(available, r.amount);
    available -= used;
    const left = r.amount - used,
      expired = r.origin_tax_year + rules.carryforwardYears === 2026 ? left : 0;
    return {
      ...r,
      used,
      expired,
      carryforward_2027: left - expired,
      last_usable_year: r.origin_tax_year + rules.carryforwardYears,
    };
  });
  const line18b = allocations.reduce((n, r) => n + r.carryforward_2027, 0);
  return {
    source_input: source.source_input,
    finalized_return: context,
    source,
    children,
    lines: {
      line7,
      line8,
      line9,
      line11c,
      line12,
      line13,
      line14,
      line15,
      line16,
      line17,
      line18a,
      line18b,
    },
    credit_limit_worksheet: {
      line1: line16,
      line2: context.form1040_line18_tax_before_credits,
      line3: priority,
      line4: capacity,
      line5: line17,
    },
    carryforward_allocations: allocations,
  };
}

/** Retained internal operands, emitted only by AGI after source reconciliation. */
export const adoptionIncomeBridge2026Schema = z.object({
  source: adoptionSource2026Schema,
  income: adoptionExclusionIncome2026Schema,
}).strict();
export function replayAdoptionIncome2026(
  raw: z.input<typeof adoptionIncomeBridge2026Schema>,
  owners: { filing_status: string; taxpayer_ssn: string; spouse_ssn?: string },
) {
  const bridge = adoptionIncomeBridge2026Schema.parse(raw), s = bridge.source;
  if (
    s.filing_status !== owners.filing_status ||
    s.taxpayer_ssn !== owners.taxpayer_ssn.replaceAll("-", "") ||
    s.spouse_ssn !== owners.spouse_ssn?.replaceAll("-", "")
  ) {
    throw Error(
      "Adoption income bridge must belong to the actual return owners",
    );
  }
  const r = calculateAdoptionExclusion2026(s, bridge.income);
  if (r.source.prior_foreign_benefits > 0) {
    throw Error("Prior foreign adoption income needs recovery reconciliation");
  }
  return r;
}
