import { k1PassiveIncomeSourceSchema } from "../../../inputs/k1_passive_source.ts";
import {
  firstYearPassiveSCorpLossStages,
  passiveSCorpLossBundleSchema,
} from "../../../inputs/k1_s_corp_passive_loss_source.ts";

/** Current sole qualified S-corp loss and non-QBI passive rental K1 income.
 * No other losses, rental special allowance or qualified income admitted here. */
export function passiveSCorpLossQbiLines(
  raw: unknown,
  rawIncome: readonly unknown[],
  taxableIncome: number,
) {
  const { source, k1 } = passiveSCorpLossBundleSchema.parse(raw);
  const s = firstYearPassiveSCorpLossStages(source, k1);
  const incomes = rawIncome.map((row) =>
    k1PassiveIncomeSourceSchema.parse(row)
  );
  if (
    incomes.some((row) => row.activities.some((a) => a.income_box === "box1"))
  ) {
    throw Error(
      "Passive S-corp QBI loss needs separately reviewed positive ordinary QBI sources",
    );
  }
  const income = incomes.flatMap((row) => row.activities).reduce(
    (n, a) => n + a.current_income,
    0,
  );
  if (
    !Number.isSafeInteger(income) || !Number.isFinite(taxableIncome) ||
    taxableIncome < 0
  ) {
    throw Error(
      "Passive S-corp QBI inputs need exact income and finalized taxable income",
    );
  }
  const allowed = Math.min(s.passiveLossBefore8582, income);
  return {
    line1_business_name: source.corporation_name,
    line1_business_reference: source.issued_k1.section199a_statement_reference,
    line1_ein: source.corporation_ein,
    line1_qbi: -allowed || 0,
    line2: -allowed || 0,
    line3: 0,
    line4: 0,
    line5: 0,
    line6: 0,
    line7: 0,
    line8: 0,
    line9: 0,
    line10: 0,
    line11: Math.round(taxableIncome),
    line12: 0,
    line13: Math.round(taxableIncome),
    line14: Math.round(taxableIncome * 0.2),
    line15: 0,
    line16: allowed,
    line17: 0,
    qualifiedPassiveSuspended: s.passiveLossBefore8582 - allowed,
  };
}
