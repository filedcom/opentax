import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import { computeSsaTaxable } from "../../nodes/intermediate/aggregation/general/return-assembly/agi_aggregator/index.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";

const reference = z.string().trim().min(1);
const money = z.number().finite().min(-1e12).max(1e12).refine(
  (n) => Math.abs(n * 100 - Math.round(n * 100)) < .00001,
  "Lump-sum records need dollars and cents",
);
const nonnegative = money.refine((n) => n >= 0, "Amount must be nonnegative");
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const year = z.number().int().min(1984).max(2025);
const cents = (n: number) => Math.round(n * 100);
const sum = (values: number[]) => {
  const total = values.reduce((s, n) => s + cents(n), 0);
  if (!Number.isSafeInteger(total)) {
    throw new Error("Lump-sum total exceeds the supported cents range");
  }
  return total / 100;
};
const key = (s: string) => s.trim().toUpperCase();
const digits = (s: string) => s.replaceAll("-", "");

export const priorBenefitPayment2026Schema = z.object({
  benefit_year: year,
  amount_in_box3: nonnegative.refine((n) => n > 0, "Payment must be positive"),
  allocation_record_reference: reference,
  prior_return_id: reference,
}).strict();
export const priorBenefitReturn2026Schema = z.object({
  return_id: reference,
  tax_year: year,
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_tin: tin,
  spouse_tin: tin.optional(),
  mfs_lived_with_spouse: z.boolean().optional(),
  return_record_reference: reference,
  benefit_records_reference: reference,
  adjustments_record_reference: reference,
  adjusted_gross_income: money,
  net_benefits_received_in_year: money,
  taxable_benefits_reported_on_return: nonnegative,
  tax_exempt_interest: nonnegative,
  // These are reviewed prior-return amounts, not current-year claims.
  adjustments: z.object({
    savings_bond_interest_exclusion: nonnegative,
    adoption_benefits_exclusion: nonnegative,
    student_loan_interest_deduction: nonnegative,
    tuition_and_fees_deduction: nonnegative,
    domestic_production_deduction: nonnegative,
    foreign_earned_income_and_housing: nonnegative,
    territory_income_exclusion: nonnegative,
    unemployment_compensation_exclusion: nonnegative,
  }).strict(),
  previous_lump_sum_payments: z.array(
    z.object({
      received_in_year: year,
      amount: nonnegative.refine((n) => n > 0, "Payment must be positive"),
      source_record_reference: reference,
    }).strict(),
  ).max(100),
  // Worksheet 2 line 20 / Worksheet 3 line 13 from retained historical records.
  taxable_benefits_previously_reported_or_refigured: nonnegative,
  prior_lump_sum_history_review_reference: reference,
}).strict();
export const benefitElection2026Schema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("regular_method"),
    election_review_reference: reference,
  }).strict(),
  z.object({
    method: z.literal("use_if_lower"),
    election_review_reference: reference,
    prior_returns: z.array(priorBenefitReturn2026Schema).min(1).max(84),
  }).strict(),
]);
export type PriorBenefitReturn2026 = z.infer<
  typeof priorBenefitReturn2026Schema
>;
export type PriorBenefitAllocation2026 =
  & z.infer<typeof priorBenefitPayment2026Schema>
  & {
    recipient_tin: string;
    statement_reference: string;
  };

/** Internal source-to-AGI bridge. Current taxable benefits are derived only
 * after all current income has reached AGI; historical worksheets stay at source. */
export const benefitElectionBridge2026Schema = z.object({
  method: z.enum(["regular_method", "use_if_lower"]),
  election_review_reference: reference,
  net_benefits_before_rounding: nonnegative,
  lump_sum_payments: nonnegative,
  additional_taxable_benefits: nonnegative.optional(),
}).strict().superRefine((v, ctx) => {
  if (
    v.method === "use_if_lower" && v.additional_taxable_benefits === undefined
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Lump-sum comparison needs historical worksheet results",
    });
  }
});

/** Pub. 915 Worksheets 2/3. Original AGI already includes original taxable
 * benefits; subtract that original amount, not the later refigured amount. */
export function calculatePriorBenefitWorksheet2026(
  raw: PriorBenefitReturn2026,
  currentPayment: number,
) {
  const r = priorBenefitReturn2026Schema.parse(raw);
  nonnegative.parse(currentPayment);
  if (
    r.filing_status === FilingStatus.MFS &&
    r.mfs_lived_with_spouse === undefined
  ) {
    throw new Error(
      "Prior MFS return needs the full-year spouse residence answer",
    );
  }
  if (r.filing_status === FilingStatus.MFJ && !r.spouse_tin) {
    throw new Error("Prior joint return needs both filer identities");
  }
  if (r.spouse_tin && digits(r.spouse_tin) === digits(r.taxpayer_tin)) {
    throw new Error("Prior return cannot repeat the taxpayer as spouse");
  }
  const a = r.adjustments;
  if (
    (r.tax_year < 1997 && a.adoption_benefits_exclusion > 0) ||
    (r.tax_year < 1998 && a.student_loan_interest_deduction > 0) ||
    ((r.tax_year < 2002 || r.tax_year > 2020) &&
      a.tuition_and_fees_deduction > 0) ||
    ((r.tax_year < 2005 || r.tax_year > 2017) &&
      a.domestic_production_deduction > 0) ||
    (r.tax_year !== 2020 && a.unemployment_compensation_exclusion > 0) ||
    (r.tax_year < 1990 && a.savings_bond_interest_exclusion > 0)
  ) {
    throw new Error(
      "Prior benefit worksheet adjustment is not valid for that tax year",
    );
  }
  const seen = new Set<string>();
  for (const p of r.previous_lump_sum_payments) {
    if (
      p.received_in_year <= r.tax_year ||
      seen.has(key(p.source_record_reference))
    ) {
      throw new Error(
        "Prior lump-sum history must contain distinct later-year receipts before 2026",
      );
    }
    seen.add(key(p.source_record_reference));
  }
  const previousPayments = sum(
    r.previous_lump_sum_payments.map((p) => p.amount),
  );
  const previousTaxable = roundWholeDollars(
    r.taxable_benefits_previously_reported_or_refigured,
  );
  const originalTaxable = roundWholeDollars(
    r.taxable_benefits_reported_on_return,
  );
  const cap = r.tax_year < 1994 ? .5 : .85;
  if (
    originalTaxable >
      roundWholeDollars(
        cap * Math.max(0, roundWholeDollars(r.net_benefits_received_in_year)),
      ) ||
    previousTaxable < originalTaxable ||
    previousTaxable >
      roundWholeDollars(
        cap *
          Math.max(
            0,
            roundWholeDollars(
              sum([r.net_benefits_received_in_year, previousPayments]),
            ),
          ),
      ) ||
    (previousPayments === 0 && previousTaxable !== originalTaxable)
  ) {
    throw new Error(
      "Previously taxed benefits do not reconcile with original and later benefit records",
    );
  }
  const benefits = roundWholeDollars(
    sum([r.net_benefits_received_in_year, previousPayments, currentPayment]),
  );
  const adjustments = roundWholeDollars(sum(Object.values(a)));
  const otherIncome = roundWholeDollars(r.adjusted_gross_income) + adjustments -
    originalTaxable;
  const exemptInterest = roundWholeDollars(r.tax_exempt_interest);
  const livedTogether = r.filing_status === FilingStatus.MFS &&
    r.mfs_lived_with_spouse === true;
  const joint = r.filing_status === FilingStatus.MFJ;
  const provisional = otherIncome + exemptInterest + .5 * benefits;
  const base = livedTogether ? 0 : joint ? 32000 : 25000;
  const refigured = roundWholeDollars(
    r.tax_year >= 1994
      ? computeSsaTaxable(
        benefits,
        otherIncome,
        exemptInterest,
        joint,
        livedTogether,
      )
      : Math.min(
        .5 * Math.max(0, benefits),
        .5 * Math.max(0, provisional - base),
      ),
  );
  return {
    return_id: r.return_id,
    tax_year: r.tax_year,
    worksheet: r.tax_year >= 1994 ? 2 : 3,
    current_lump_sum_payment: currentPayment,
    previous_lump_sum_payments: previousPayments,
    net_benefits_with_lump_sums: benefits,
    original_adjusted_gross_income: roundWholeDollars(r.adjusted_gross_income),
    original_taxable_benefits: originalTaxable,
    restored_adjustments: adjustments,
    tax_exempt_interest: exemptInterest,
    provisional_income: provisional,
    refigured_taxable_benefits: refigured,
    previously_reported_or_refigured_taxable_benefits: previousTaxable,
    // IRC 86(e) limits the inclusion to an increase, never a negative benefit.
    additional_taxable_benefits: Math.max(0, refigured - previousTaxable),
  };
}

export function calculateBenefitElectionSources2026(
  raw: z.infer<typeof benefitElection2026Schema>,
  allocations: PriorBenefitAllocation2026[],
  netBenefits: number,
) {
  const input = benefitElection2026Schema.parse(raw);
  const total = sum(allocations.map((p) => p.amount_in_box3));
  if (total <= 0) {
    throw new Error("Lump-sum election needs a prior-year payment");
  }
  const bridge = {
    method: input.method,
    election_review_reference: input.election_review_reference,
    net_benefits_before_rounding: netBenefits,
    lump_sum_payments: total,
  };
  if (input.method === "regular_method") {
    return { bridge, prior_year_worksheets: [] };
  }
  const returns = new Map<string, PriorBenefitReturn2026>();
  const seenOwnerYears = new Set<string>();
  for (const r of input.prior_returns) {
    if (returns.has(key(r.return_id))) {
      throw new Error("Prior benefit return is repeated");
    }
    returns.set(key(r.return_id), r);
    const owners = r.filing_status === FilingStatus.MFJ
      ? [r.taxpayer_tin, r.spouse_tin]
      : [r.taxpayer_tin];
    for (const owner of owners) {
      if (!owner) {
        throw new Error("Prior joint return needs both filer identities");
      }
      const ownerYear = `${r.tax_year}:${digits(owner)}`;
      if (seenOwnerYears.has(ownerYear)) {
        throw new Error("Prior benefit year repeats a filer across returns");
      }
      seenOwnerYears.add(ownerYear);
    }
  }
  const payments = new Map<string, number[]>();
  for (const p of allocations) {
    const r = returns.get(key(p.prior_return_id));
    if (!r || r.tax_year !== p.benefit_year) {
      throw new Error("Prior payment needs its matching benefit-year return");
    }
    const owners = r.filing_status === FilingStatus.MFJ
      ? [r.taxpayer_tin, r.spouse_tin]
      : [r.taxpayer_tin];
    if (!owners.some((o) => o && digits(o) === digits(p.recipient_tin))) {
      throw new Error(
        "Prior benefit return does not include the payment recipient",
      );
    }
    const amounts = payments.get(key(r.return_id)) ?? [];
    amounts.push(p.amount_in_box3);
    payments.set(key(r.return_id), amounts);
  }
  const worksheets = input.prior_returns.map((r) => {
    const amounts = payments.get(key(r.return_id));
    if (!amounts) {
      throw new Error(
        "Unused prior benefit return has no current lump-sum allocation",
      );
    }
    return calculatePriorBenefitWorksheet2026(r, sum(amounts));
  });
  return {
    bridge: {
      ...bridge,
      additional_taxable_benefits: sum(
        worksheets.map((w) => w.additional_taxable_benefits),
      ),
    },
    prior_year_worksheets: worksheets,
  };
}
