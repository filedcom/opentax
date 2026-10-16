import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import { simplifiedQbiLines } from "../../nodes/intermediate/forms/deductions/business/form8995/calculation.ts";
import type { QbiCalculator2026 } from "../deduction-resolution.ts";
const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const whole = z.number().int().safe().nonnegative();
export const qbiPriorLoss2026Schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("none"),
    record_reference: ref,
    no_prior_qbi_or_reit_ptp_loss_carryover: z.literal(true),
  }).strict(),
  z.object({
    kind: z.literal("form8995_2025"),
    tax_year: z.literal(2025),
    return_reference: ref,
    taxpayer_tin: tin,
    spouse_tin: tin.optional(),
    filing_status: z.nativeEnum(FilingStatus),
    ownership_and_filing_unit_unchanged: z.literal(true),
    line16_business_loss_carryforward: whole,
    line17_reit_ptp_loss_carryforward: whole,
  }).strict(),
]);
export function resolveQbiPriorLoss2026(
  raw: z.input<typeof qbiPriorLoss2026Schema>,
  owner: {
    filing_status: FilingStatus;
    taxpayer_tin: string;
    spouse_tin?: string;
  },
) {
  const prior = qbiPriorLoss2026Schema.parse(raw);
  if (
    prior.kind !== "none" && (prior.taxpayer_tin !== owner.taxpayer_tin ||
      prior.spouse_tin !== owner.spouse_tin ||
      prior.filing_status !== owner.filing_status)
  ) {
    throw new Error(
      "Prior QBI carryovers require unchanged ownership and filing unit",
    );
  }
  return {
    prior_business_loss: prior.kind === "none"
      ? 0
      : prior.line16_business_loss_carryforward,
    prior_reit_ptp_loss: prior.kind === "none"
      ? 0
      : prior.line17_reit_ptp_loss_carryforward,
  };
}
export type QbiPrintRow2026 = {
  business_name: string;
  identification_number: string;
  qbi: number;
};
export type QbiWorkpaper2026 = {
  source_input: unknown;
  rows: QbiPrintRow2026[];
  loss_attribution?: unknown;
  qbi: number;
  active_qbi_before_rounding: number;
  minimum_deduction: number;
  prior_business_loss: number;
  prior_reit_ptp_loss: number;
};
/** Shared 2026 candidate evaluation; the caller must reconcile all source records first. */
export function simplifiedQbiCalculator2026(
  r: QbiWorkpaper2026,
  filingStatus: FilingStatus,
  netCapitalGainAndQualifiedDividends: number,
): QbiCalculator2026 {
  if (
    !Number.isSafeInteger(netCapitalGainAndQualifiedDividends) ||
    netCapitalGainAndQualifiedDividends < 0
  ) {
    throw new Error(
      "QBI needs finalized net capital gain plus qualified dividends",
    );
  }
  const limit = filingStatus === FilingStatus.MFJ
    ? 403500
    : filingStatus === FilingStatus.MFS
    ? 201775
    : 201750;
  const maximumDeduction = Math.max(
    r.minimum_deduction,
    Math.round(Math.max(0, r.qbi - r.prior_business_loss) * .2),
  );
  return {
    maximumDeduction,
    evaluate(preQbiTaxableIncome) {
      if (preQbiTaxableIncome > limit) {
        throw new Error(
          "2026 business income above the simplified QBI threshold needs Form 8995-A",
        );
      }
      const { businessLossCarryforward, reitLossCarryforward, ...lines } =
        simplifiedQbiLines({
          businessIncome: r.qbi,
          businessLossCarryforward: r.prior_business_loss,
          reitAndPtpIncome: 0,
          reitLossCarryforward: r.prior_reit_ptp_loss,
          taxableIncomeBeforeQbi: preQbiTaxableIncome,
          netCapitalGainAndQualifiedDividends,
        });
      const line17 = Math.max(lines.line15, r.minimum_deduction);
      return {
        deduction: line17,
        forms: {
          form8995: {
            source_input: r.source_input,
            rows: r.rows,
            loss_attribution: r.loss_attribution,
            active_qbi_before_rounding: r.active_qbi_before_rounding,
            lines: {
              ...lines,
              line16: r.minimum_deduction,
              line17,
              line18: businessLossCarryforward,
              line19: reitLossCarryforward,
            },
          },
        },
      };
    },
  };
}
