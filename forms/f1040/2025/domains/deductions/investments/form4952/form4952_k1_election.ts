import { z } from "zod";
import { inputSchema as taxCalculationSchema } from "../../../../../nodes/intermediate/worksheets/taxes/calculation/income_tax_calculation/index.ts";
import { preferentialTax } from "../../../../../nodes/intermediate/worksheets/taxes/calculation/income_tax_calculation/preferential_tax.ts";
import { CONFIG_BY_YEAR } from "../../../../../nodes/config/index.ts";
const finalSchema = z.object({
  filing_status: taxCalculationSchema.shape.filing_status,
  line15_taxable_income: z.number().nonnegative(),
  line16_income_tax: z.number().nonnegative(),
});
const amtSchema = z.object({
  form4952_regular_election: z.number().nonnegative(),
  form4952_amt_election: z.number().nonnegative(),
  form4952_regular_elected_capital_gain: z.literal(0),
  form4952_amt_elected_capital_gain: z.literal(0),
  line2c_investment_interest: z.number().optional(),
});
/** Reconcile an explicitly entered qualified-dividend election through final tax. */
export function reconcileK1QualifiedDividendElection(
  election: number,
  qualifiedTotal: number,
  pending: Readonly<Record<string, unknown>>,
): void {
  if (election === 0) return;
  const form1040 = finalSchema.safeParse(pending.f1040);
  const amt = amtSchema.safeParse(pending.form6251);
  if (
    !Number.isSafeInteger(election) || election > qualifiedTotal ||
    !form1040.success || !amt.success ||
    amt.data.form4952_regular_election !== election ||
    amt.data.form4952_amt_election !== election ||
    (amt.data.line2c_investment_interest ?? 0) !== 0
  ) {
    throw new Error(
      "Form 4952 K-1 dividend election needs matching regular/AMT source and final tax amounts",
    );
  }
  const tax = taxCalculationSchema.safeParse(pending.income_tax_calculation);
  const cfg = CONFIG_BY_YEAR[2025];
  const qualified = tax.success
    ? Array.isArray(tax.data.qualified_dividends)
      ? tax.data.qualified_dividends.reduce((sum, amount) => sum + amount, 0)
      : tax.data.qualified_dividends ?? 0
    : 0;
  if (
    !tax.success || !cfg ||
    tax.data.filing_status !== form1040.data.filing_status ||
    tax.data.form4952_election !== election ||
    tax.data.form4952_elected_capital_gain !== 0 ||
    tax.data.form4952_amt_election !== election ||
    tax.data.form4952_amt_elected_capital_gain !== 0 ||
    qualified !== qualifiedTotal ||
    (tax.data.net_capital_gain ?? 0) !== 0 ||
    (tax.data.unrecaptured_1250_gain ?? 0) !== 0 ||
    (tax.data.rate_28_gain ?? 0) !== 0 ||
    (tax.data.foreign_earned_income_exclusion ?? 0) !== 0 ||
    tax.data.schedule_j_calculated_tax !== undefined ||
    tax.data.form8615_source !== undefined ||
    (tax.data.form8814_tax ?? 0) !== 0 ||
    tax.data.form4972_tax !== undefined ||
    tax.data.form8978_tax !== undefined ||
    tax.data.form8621_tax !== undefined ||
    form1040.data.line15_taxable_income !== tax.data.taxable_income ||
    form1040.data.line16_income_tax !== preferentialTax({
        taxableIncome: tax.data.taxable_income,
        qualifiedDividends: qualifiedTotal,
        netCapitalGain: 0,
        filingStatus: tax.data.filing_status,
        zeroCeiling: cfg.qdcgtZeroCeiling,
        twentyFloor: cfg.qdcgtTwentyFloor,
        form4952Election: election,
        electedCapitalGain: 0,
      })
  ) {
    throw new Error(
      "Form 4952 elected qualified dividends need the same source, Schedule D Tax Worksheet, and finalized Form 1040 line 16",
    );
  }
}
