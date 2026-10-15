import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import { config2025 } from "../../nodes/config/2025.ts";
import { standardDeductionAmount } from "../../nodes/intermediate/worksheets/deductions/standard/standard_deduction/amount.ts";
import { f1099g } from "../../nodes/inputs/income/other/f1099g/index.ts";
import { investmentOwner2026 } from "./investment-source.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const money = z.number().finite().nonnegative().max(1_000_000_000).refine(
  (v) => Math.abs(v * 100 - Math.round(v * 100)) < .0001,
  "Money must be dollars and cents",
);
const whole = z.number().int().nonnegative().max(1_000_000_000);
const date = z.string().date().refine(
  (s) => s.startsWith("2026-"),
  "Payment must belong to 2026",
);
export const refundHistory2025Schema = z.object({
  record_reference: ref,
  return_reference: ref,
  tax_year: z.literal(2025),
  taxpayer_tin: tin,
  spouse_tin: tin.optional(),
  filing_status: z.nativeEnum(FilingStatus),
  deduction_method: z.enum([
    "standard",
    "itemized_income_tax",
    "itemized_sales_tax",
  ]),
  taxpayer_age_65_or_older: z.boolean(),
  taxpayer_blind: z.boolean(),
  spouse_age_65_or_older: z.boolean(),
  spouse_blind: z.boolean(),
  taxpayer_can_be_claimed_as_dependent: z.boolean(),
  dependent_earned_income: whole,
  standard_deduction_eligible: z.boolean(),
  // Actual prior filed lines and alternative sales-tax workpaper, not a taxable refund override.
  salt_magi: whole,
  state_local_income_taxes: whole,
  state_local_sales_taxes: whole,
  real_personal_property_taxes: whole,
  schedule_a_line5e: whole,
  total_itemized_deductions: whole,
  taxable_income: whole,
  all_2026_recoveries_of_2025_income_taxes_included: z.literal(true),
  no_other_itemized_recoveries_prior_credits_amt_niit_or_special_tax_benefit_cases:
    z.literal(true),
  no_tax_payments_deducted_in_other_years_or_refunded_previously: z.literal(
    true,
  ),
}).strict();
export const governmentCopy2026Schema = z.object({
  tax_year: z.literal(2026),
  source_document_reference: ref,
  payer_name: ref,
  payer_tin: tin,
  recipient_tin: tin,
  account_number: ref,
  corrected: z.boolean(),
  superseded_document_references: z.array(ref),
  box1_unemployment: money,
  box2_state_refund: money,
  box3_tax_year: z.number().int().min(1900).max(2026).optional(),
  box4_federal_withheld: money,
  box5_rtaa: money,
  box6_taxable_grants: money,
  box7_agriculture: z.literal(0),
  box8_trade_or_business: z.literal(false),
  box9_market_gain: z.literal(0),
  box10_family_leave: money,
  state_information: z.array(
    z.object({
      state: z.string().regex(/^[A-Z]{2}$/),
      payer_state_id: ref,
      box12_state_withheld: money,
    }).strict(),
  ).max(2),
  unemployment_review: z.object({
    record_reference: ref,
    program: z.enum(["state_or_federal_unemployment", "railroad_unemployment"]),
    no_aftertax_contributions_or_other_excludable_benefits: z.literal(true),
    all_2026_receipts_and_repayments_included: z.literal(true),
    box1_reporting: z.enum(["gross", "net_of_same_year_repayments"]),
    receipts: z.array(
      z.object({ record_reference: ref, date, amount: money }).strict(),
    ),
    repayments: z.array(
      z.object({
        record_reference: ref,
        date,
        benefit_year: z.number().int().min(1900).max(2026),
        amount: money,
      }).strict(),
    ),
  }).strict().optional(),
  refund_history_reference: ref.optional(),
  rtaa_review: z.object({
    record_reference: ref,
    program: z.literal("reemployment_trade_adjustment_assistance"),
    no_amount_reported_as_wages_or_unemployment: z.literal(true),
  }).strict().optional(),
  grant_review: z.object({
    record_reference: ref,
    program_name: ref,
    taxable_nonbusiness_noninvestment_grant: z.literal(true),
    no_compensation_disaster_recovery_or_exclusion: z.literal(true),
  }).strict().optional(),
  family_leave_review: z.object({
    record_reference: ref,
    state_program: ref,
    state_paid_family_leave_under_rev_rul_2025_4: z.literal(true),
    no_medical_leave_sick_pay_or_employer_paid_benefits: z.literal(true),
  }).strict().optional(),
}).strict();
export const governmentClaim2026Schema = z.object({
  claim: z.object({
    record_reference: ref,
    all_government_payment_copies_and_corrections_included: z.literal(true),
    copies: z.array(governmentCopy2026Schema).min(1).max(100),
    refund_histories: z.array(refundHistory2025Schema).max(20),
  }).strict(),
}).strict();
export const governmentSource2026Schema = investmentOwner2026.extend(
  governmentClaim2026Schema.shape,
).strict();
export type GovernmentSource2026 = z.input<typeof governmentSource2026Schema>;
const sum = (values: number[]) =>
  values.reduce((n, v) => n + Math.round(v * 100), 0) / 100;

export function calculateGovernmentPayments2026(raw: GovernmentSource2026) {
  const input = governmentSource2026Schema.parse(raw), claim = input.claim;
  const owners = [
    input.taxpayer_ssn,
    ...(input.filing_status === FilingStatus.MFJ && input.spouse_ssn
      ? [input.spouse_ssn]
      : []),
  ];
  const active = new Set<string>(),
    retired = new Set<string>(),
    records = new Set<string>();
  const unique = (set: Set<string>, key: string) => {
    if (set.has(key)) {
      throw new Error("Government payment records and copies must be distinct");
    }
    set.add(key);
  };
  for (const c of claim.copies) unique(active, c.source_document_reference);
  for (const c of claim.copies) {
    if (!owners.includes(c.recipient_tin)) {
      throw new Error(
        "Government payment recipient must be a filer or joint spouse",
      );
    }
    if (c.corrected !== (c.superseded_document_references.length > 0)) {
      throw new Error(
        "Corrected government copy needs its superseded references",
      );
    }
    for (const old of c.superseded_document_references) {
      if (active.has(old)) {
        throw new Error("Superseded government copy cannot remain active");
      }
      unique(retired, old);
    }
  }
  const histories = new Map(
    claim.refund_histories.map((h) => [h.record_reference, h]),
  );
  if (
    histories.size !== claim.refund_histories.length ||
    new Set(claim.refund_histories.map((h) => h.return_reference)).size !==
      histories.size
  ) {
    throw new Error(
      "Prior refund histories must identify distinct filed returns",
    );
  }
  const recoveries = [...histories.values()].map((h) => {
    const copies = claim.copies.filter((c) =>
      c.refund_history_reference === h.record_reference
    );
    if (
      !copies.length ||
      copies.some((c) =>
        c.box3_tax_year !== 2025 || c.box2_state_refund <= 0 ||
        ![h.taxpayer_tin, h.spouse_tin].includes(c.recipient_tin)
      )
    ) {
      throw new Error(
        "State refund must bind its positive copy, original year and prior return owner",
      );
    }
    if (
      (h.filing_status === FilingStatus.MFJ) !== Boolean(h.spouse_tin) ||
      h.taxpayer_tin === h.spouse_tin
    ) throw new Error("Prior return joint owners must reconcile");
    if (
      ![h.taxpayer_tin, ...(h.spouse_tin ? [h.spouse_tin] : [])].every((t) =>
        owners.includes(t)
      )
    ) {
      throw new Error(
        "Changed filing units need allocation of the prior refund tax benefit",
      );
    }
    if (
      h.deduction_method === "standard" &&
      (!h.standard_deduction_eligible || h.schedule_a_line5e !== 0 ||
        h.total_itemized_deductions !== 0)
    ) {
      throw new Error(
        "Prior standard deduction cannot also report filed Schedule A deductions",
      );
    }
    const refund = sum(copies.map((c) => c.box2_state_refund));
    const standard = h.standard_deduction_eligible
      ? standardDeductionAmount(h, {
        ...config2025,
        dependentMinimum: 1350,
        dependentEarnedIncomeAddition: 450,
      })
      : 0;
    const mfs = h.filing_status === FilingStatus.MFS;
    const cap = Math.max(
      mfs ? 5000 : 10000,
      (mfs ? 20000 : 40000) -
        .3 * Math.max(0, h.salt_magi - (mfs ? 250000 : 500000)),
    );
    const chosenTaxes = (h.deduction_method === "itemized_sales_tax"
      ? h.state_local_sales_taxes
      : h.state_local_income_taxes) + h.real_personal_property_taxes;
    if (
      h.deduction_method !== "standard" &&
      (h.schedule_a_line5e !== roundWholeDollars(Math.min(cap, chosenTaxes)) ||
        h.total_itemized_deductions < h.schedule_a_line5e)
    ) {
      throw new Error(
        "Prior Schedule A taxes must reconcile to the 2025 SALT cap and itemized total",
      );
    }
    if (refund > h.state_local_income_taxes) {
      throw new Error("Refund exceeds reviewed prior-year income tax payments");
    }
    const deductionReduction = Math.max(
      0,
      Math.min(
        cap,
        h.state_local_income_taxes + h.real_personal_property_taxes,
      ) -
        Math.min(
          cap,
          Math.max(
            h.state_local_sales_taxes,
            h.state_local_income_taxes - refund,
          ) + h.real_personal_property_taxes,
        ),
    );
    const taxable = h.deduction_method !== "itemized_income_tax" ? 0 : Math.min(
      refund,
      deductionReduction,
      Math.max(0, h.total_itemized_deductions - standard),
    );
    if (taxable > 0 && h.taxable_income === 0) {
      throw new Error(
        "Zero-taxable-income recovery needs the prior tax-benefit recomputation",
      );
    }
    return {
      history: h,
      refund,
      standard_deduction: standard,
      salt_cap: cap,
      deduction_reduction: deductionReduction,
      taxable_refund: taxable,
    };
  });
  const rows = claim.copies.map((c) => {
    if (
      (c.box2_state_refund > 0) !== Boolean(c.refund_history_reference) ||
      c.refund_history_reference && !histories.has(c.refund_history_reference)
    ) throw new Error("State refund needs its actual prior-return history");
    if (c.box2_state_refund === 0 && c.box3_tax_year !== undefined) {
      throw new Error("Refund tax year needs a positive refund");
    }
    const u = c.unemployment_review;
    if (c.box1_unemployment > 0 && !u) {
      throw new Error("Unemployment needs receipt and repayment records");
    }
    let received = 0, repaid = 0;
    if (u) {
      for (const p of [...u.receipts, ...u.repayments]) {
        unique(records, p.record_reference);
      }
      if (u.repayments.some((r) => r.benefit_year !== 2026)) {
        throw new Error(
          "Prior-year unemployment repayment needs its separate claim-of-right review",
        );
      }
      received = sum(u.receipts.map((r) => r.amount));
      repaid = sum(u.repayments.map((r) => r.amount));
      if (
        repaid > received ||
        c.box1_unemployment !==
          (u.box1_reporting === "gross" ? received : sum([received, -repaid]))
      ) {
        throw new Error(
          "Unemployment copy must reconcile its own receipts and repayments",
        );
      }
    }
    for (
      const [amount, review] of [[c.box5_rtaa, c.rtaa_review], [
        c.box6_taxable_grants,
        c.grant_review,
      ], [c.box10_family_leave, c.family_leave_review]] as const
    ) {
      if ((amount > 0) !== Boolean(review)) {
        throw new Error(
          "Government payment box needs its matching program classification",
        );
      }
    }
    if (
      new Set(c.state_information.map((s) => s.state)).size !==
        c.state_information.length
    ) throw new Error("Government state withholding rows must be distinct");
    return {
      copy: c,
      unemployment_received: received,
      unemployment_repaid: repaid,
      unemployment_net: sum([received, -repaid]),
    };
  });
  // Reuse the 2025 node for ordinary unemployment, taxable refund and federal
  // withholding. Its aggregate taxable-refund input is private and derived here.
  const projected = rows.map((r, i) => ({
    source_document_reference: r.copy.source_document_reference,
    payer_name: r.copy.payer_name,
    payer_tin: r.copy.payer_tin,
    recipient_tin: r.copy.recipient_tin,
    account_number: r.copy.account_number,
    box_1_unemployment: r.unemployment_received,
    box_1_repaid: r.unemployment_repaid,
    box_2_state_refund: i === 0 ? sum(recoveries.map((r) => r.refund)) : 0,
    box_2_taxable_recovery_verified_amount: i === 0
      ? sum(recoveries.map((r) => r.taxable_refund))
      : 0,
    box_2_recovery_workpaper_reference: claim.record_reference,
    box_4_federal_withheld: r.copy.box4_federal_withheld,
  }));
  const shared = f1099g.compute({ taxYear: 2026, formType: "f1040" }, {
    f1099gs: projected,
  });
  const amount = (node: string, key: string) =>
    sum(
      shared.outputs.filter((o) => o.nodeType === node).map((o) =>
        Number(o.fields[key] ?? 0)
      ),
    );
  const cents = {
    unemployment: amount("agi_aggregator", "line7_unemployment"),
    repaid: sum(rows.map((r) => r.unemployment_repaid)),
    state_refund: amount("agi_aggregator", "line1_state_refund"),
    federal_withheld: amount("f1040", "line25b_withheld_1099"),
    rtaa: sum(rows.map((r) => r.copy.box5_rtaa)),
    grants: sum(rows.map((r) => r.copy.box6_taxable_grants)),
    family_leave: sum(rows.map((r) => r.copy.box10_family_leave)),
  };
  return {
    source_input: input,
    rows,
    recoveries,
    cents,
    lines: Object.fromEntries(
      Object.entries(cents).map(([k, v]) => [k, roundWholeDollars(v)]),
    ) as Record<keyof typeof cents, number>,
  };
}
