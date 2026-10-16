import { z } from "zod";
import { investmentOwner2026 } from "./investment-source.ts";
import {
  businessSources2026Schema,
  calculateBusinessSources2026,
} from "./business-source.ts";
import {
  calculateCapitalAmounts2026,
  calculateCapitalGains2026,
  capitalGainInput2026Schema,
} from "../nodes/capital-gains.ts";
import { businessLossLimitLines } from "../../nodes/intermediate/forms/income/business/form461/calculation.ts";
import { FilingStatus } from "../../nodes/types.ts";
const ref = z.string().trim().min(1);

export const businessLossReview2026Schema = z.object({
  record_reference: ref,
  all_business_sources_included: z.literal(true),
  no_schedule_e_f_k1_or_other_business_sources: z.literal(true),
  no_other_business_adjustments_or_released_suspended_losses: z.literal(true),
  basis_at_risk_and_passive_limits_resolved: z.literal(true),
  // Investment claims and business-land sources retain their own tax review.
  // Employee-service income/expense is excluded even when reported on C.
  employee_service_classification_reviewed: z.literal(true),
}).strict();

/** Internal return-wide workpaper. No public Form 461 line or loss override. */
export const businessLossSource2026Schema = investmentOwner2026.extend({
  record_reference: ref,
  business_sources: businessSources2026Schema.optional(),
  capital_sources: capitalGainInput2026Schema,
  review: businessLossReview2026Schema,
}).strict();
export type BusinessLossSource2026 = z.input<
  typeof businessLossSource2026Schema
>;

export function calculateBusinessLoss2026(raw: BusinessLossSource2026) {
  return calculateBusinessLossWithCapital2026(raw, calculateCapitalGains2026);
}

/** Calculate Form 461 before the disposition owner's loss history is finalized. */
export function calculateBusinessLossAmounts2026(raw: BusinessLossSource2026) {
  return calculateBusinessLossWithCapital2026(raw, calculateCapitalAmounts2026);
}

function calculateBusinessLossWithCapital2026<
  C extends
    | ReturnType<typeof calculateCapitalGains2026>
    | ReturnType<typeof calculateCapitalAmounts2026>,
>(
  raw: BusinessLossSource2026,
  calculateCapital: (raw: z.input<typeof capitalGainInput2026Schema>) => C,
) {
  const source = businessLossSource2026Schema.parse(raw);
  const c = calculateCapital(source.capital_sources);
  const b = source.business_sources
    ? calculateBusinessSources2026(source.business_sources)
    : undefined;
  if (
    c.source_input.filing_status !== source.filing_status ||
    c.source_input.taxpayer_ssn !== source.taxpayer_ssn ||
    c.source_input.spouse_ssn !== source.spouse_ssn ||
    b && (b.source_input.filing_status !== source.filing_status ||
        b.source_input.taxpayer_tin !== source.taxpayer_ssn ||
        b.source_input.spouse_tin !==
          (source.filing_status === FilingStatus.MFJ
            ? source.spouse_ssn
            : undefined))
  ) {
    throw new Error(
      "Form 461 source inventories must have identical filing owners",
    );
  }
  const businessRows = b?.businesses.map((row) => ({
    activity_reference: row.source.business_reference,
    owner_tin: row.source.owner_tin,
    source_form: "schedule_c" as const,
    amount: row.lines.line31,
    employee_service: row.source.kind === "statutory_employee",
  })) ?? [];
  const cActivities = new Set(
    businessRows.map((r) => `${r.owner_tin}:${r.activity_reference}`),
  );
  if (
    c.land?.calculation.rows.some((r) =>
      cActivities.has(`${r.source.owner_tin}:${r.source.activity_reference}`)
    )
  ) {
    throw new Error(
      "Schedule C's no-dispositions review conflicts with the linked land activity",
    );
  }
  const employeeIncome = businessRows.filter((r) => r.employee_service)
    .reduce((n, r) => n + Math.max(0, r.amount), 0);
  const employeeLoss = businessRows.filter((r) => r.employee_service)
    .reduce((n, r) => n + Math.max(0, -r.amount), 0);
  // No capital losses enter the EBL deduction. Only the smaller of business
  // capital-gain net income and overall capital-gain net income may offset it.
  const businessCapital = Math.min(c.line11_form4797, Math.max(0, c.line16));
  const nonbusinessCapitalIncome = Math.max(0, c.return_gain) - businessCapital;
  const nonbusinessCapitalLoss = Math.max(0, -c.return_gain);
  const lines = businessLossLimitLines({
    line2: b?.schedule1_line3 ?? 0,
    line3: c.return_gain,
    line4: c.ordinary_disposition_gain_loss,
    line5: 0,
    line6: 0,
    // The deductible half-SE tax is a business deduction, not employee wages
    // and not a second Schedule C deduction. It appears once in this workpaper.
    line8: -(b?.schedule1_line15 ?? 0),
    line10: nonbusinessCapitalIncome + employeeIncome,
    line11: nonbusinessCapitalLoss + employeeLoss,
  }, {
    threshold: source.filing_status === FilingStatus.MFJ ? 512000 : 256000,
    individualLineFilingTrigger: 128000,
  });
  const ordinaryBusiness = businessRows.filter((r) => !r.employee_service)
    .reduce((n, r) => n + r.amount, 0);
  const expected = ordinaryBusiness + c.ordinary_disposition_gain_loss +
    businessCapital - (b?.schedule1_line15 ?? 0);
  if (lines.line14 !== expected) {
    throw new Error(
      "Form 461 classifications do not reconcile to the business ledger",
    );
  }
  return {
    source_input: source,
    business: b,
    capital: c,
    business_rows: businessRows,
    capital_classification: {
      business_capital_gain_net_income: c.line11_form4797,
      overall_capital_gain_net_income: Math.max(0, c.line16),
      included_business_capital_gain: businessCapital,
      excluded_capital_income: nonbusinessCapitalIncome,
      excluded_capital_loss: nonbusinessCapitalLoss,
    },
    employee_classification: {
      excluded_income: employeeIncome,
      excluded_loss: employeeLoss,
    },
    lines,
    schedule1_line8p: lines.excess_business_loss,
    carryforward: lines.excess_business_loss > 0
      ? {
        origin_tax_year: 2026,
        first_carryforward_tax_year: 2027,
        amount: lines.excess_business_loss,
        source_reference: source.record_reference,
        kind: "section461l_nol_origin" as const,
        // This origin is not the complete Form 172 NOL and does not invent farm
        // carryback, QBI qualification or section 1231 loss-vintage allocations.
        attribution_pending: true as const,
      }
      : undefined,
    file_form461: lines.must_file,
    filing_ready: false as const,
  };
}
