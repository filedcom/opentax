import { z } from "zod";
import type { F1040Config } from "../../../../../config/index.ts";
import { FilingStatus } from "../../../../../types.ts";
import { qbiPhaseInRange, qbiThreshold } from "./thresholds.ts";

// One qualified trade or business on Form 8995-A Part I, line 1.
export const qbiBusinessRowSchema = z.object({
  business_name: z.string().trim().min(1),
  tin: z.string().regex(/^\d{9}$/).optional(),
  qbi: z.number().finite(),
  w2_wages: z.number().nonnegative(),
  ubia: z.number().nonnegative(),
  sstb: z.boolean(),
  // Net earnings from self-employment the business reports (K-1 box 14 A).
  se_earnings: z.number().optional(),
}).strict();

export type QbiBusinessRow = z.infer<typeof qbiBusinessRowSchema>;

export type MultiSourceQbiInput = {
  readonly businesses: readonly QbiBusinessRow[];
  readonly qbiLossCarryforward: number; // prior-year line 16/39, as a loss (<= 0)
  readonly reitPtp: number; // qualified REIT dividends and PTP income
  readonly reitPtpLossCarryforward: number; // <= 0
  readonly taxableIncome: number; // before the QBI deduction
  readonly netCapitalGain: number;
  readonly filingStatus: FilingStatus;
};

const QBI_RATE = 0.2;
const WAGE_RATE = 0.5;
const WAGE_UBIA_WAGE_RATE = 0.25;
const UBIA_RATE = 0.025;

const dollars = (value: number) => Math.round(value);

/**
 * Form 8995-A (2025) for any number of businesses, by the instructions:
 * Schedule A applicable percentage for specified service businesses inside
 * the phase-in range (excluded above it); Schedule C netting of current
 * losses and the prior-year carryforward against the positive businesses in
 * proportion to their QBI; Part II per-business 20% amount, W-2 wage/UBIA
 * limitation and Part III phase-in; Part IV REIT/PTP component and the 20%
 * taxable income limitation. Losses carry forward on lines 39 and 40.
 */
export function calculateMultiSource8995A(
  input: MultiSourceQbiInput,
  cfg: F1040Config,
) {
  const threshold = qbiThreshold(input.filingStatus, cfg);
  const range = qbiPhaseInRange(input.filingStatus, cfg);
  const over = Math.max(0, input.taxableIncome - threshold);
  const phaseIn = Math.min(1, over / range); // Part III line 24 percentage
  // Schedule A: SSTB applicable percentage.
  const applicable = 1 - phaseIn;
  const rows = input.businesses.map((row) => {
    const share = row.sstb ? applicable : 1;
    return {
      ...row,
      qbi: row.qbi * share,
      w2_wages: row.w2_wages * share,
      ubia: row.ubia * share,
    };
  });

  // Schedule C: losses (current and prior-year) reduce positive businesses
  // in proportion to their QBI; a net loss carries forward.
  const losses = rows.reduce((sum, row) => sum + Math.min(0, row.qbi), 0) +
    Math.min(0, input.qbiLossCarryforward);
  const positives = rows.reduce((sum, row) => sum + Math.max(0, row.qbi), 0);
  const netQbi = positives + losses;
  const qbiLossCarryforward = netQbi < 0 ? dollars(-netQbi) : 0;
  const adjusted = rows.map((row) => {
    if (row.qbi <= 0 || netQbi <= 0) return { ...row, qbi: 0 };
    return { ...row, qbi: row.qbi + losses * (row.qbi / positives) };
  });

  // Part II and III per business.
  const components = adjusted.map((row) => {
    const tentative = row.qbi * QBI_RATE;
    if (tentative <= 0) return 0;
    if (phaseIn === 0) return tentative;
    const limit = Math.max(
      row.w2_wages * WAGE_RATE,
      row.w2_wages * WAGE_UBIA_WAGE_RATE + row.ubia * UBIA_RATE,
    );
    if (limit >= tentative) return tentative;
    if (phaseIn === 1) return limit;
    return tentative - (tentative - limit) * phaseIn;
  });
  const line27 = dollars(components.reduce((sum, value) => sum + value, 0));

  // Part IV: REIT dividends and PTP income.
  const reitNet = input.reitPtp + Math.min(0, input.reitPtpLossCarryforward);
  const line31 = reitNet > 0 ? dollars(reitNet * QBI_RATE) : 0;
  const reitPtpLossCarryforward = reitNet < 0 ? dollars(-reitNet) : 0;

  const line32 = line27 + line31;
  const line35 = Math.max(0, input.taxableIncome - input.netCapitalGain);
  const line36 = dollars(line35 * QBI_RATE);
  const line39 = Math.min(line32, line36);
  return {
    phaseIn,
    businesses: adjusted.map((row, index) => ({
      business_name: row.business_name,
      qbi: dollars(row.qbi),
      component: dollars(components[index]),
    })),
    line27,
    line31,
    line32,
    line36,
    line39,
    qbiLossCarryforward,
    reitPtpLossCarryforward,
  };
}
