// TY2025 IRS Form8853 instructions, Section A and Line3 chart (pp.1–5).
// This source worksheet covers one holder and an actual small-employer HDHP/W-2.
// Personal deposit/payment sources and employer codeR sources retain their raw cents.
import { z } from "zod";

const reference = z.string().trim().min(1);
const amount = z.number().finite().nonnegative();
export const archerContributionLedgerSchema = z.object({
  owner: z.enum(["taxpayer", "spouse"]),
  filing_status: z.enum(["single", "mfj", "mfs", "hoh", "qss"]),
  holder_ssn: z.string().regex(/^\d{9}$/),
  identity_source_reference: reference,
  sole_archer_msa_holder_on_return_confirmed: z.literal(true),
  eligibility: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("active_before_2008"),
      active_tax_year: z.number().int().min(1997).max(2007),
      source_reference: reference,
    }).strict(),
    z.object({
      kind: z.literal("participating_employer"),
      employer_ein: z.string().regex(/^\d{9}$/),
      source_reference: reference,
    }).strict(),
  ]),
  employer_ein: z.string().regex(/^\d{9}$/),
  small_employer: z.object({
    calendar_year: z.union([z.literal(2023), z.literal(2024)]),
    average_employee_count: amount.max(50),
    source_reference: reference,
  }).strict(),
  months: z.array(
    z.object({
      month: z.number().int().min(1).max(12),
      source_reference: reference,
      all_holder_and_spouse_hdhps_on_first_day_identified_confirmed: z.literal(
        true,
      ),
      other_coverage_holder_and_spouse_review_reference: reference,
      medicare_enrolled: z.boolean(),
      dependent_of_another: z.boolean(),
      nonpermitted_other_health_coverage: z.boolean(),
      employer_hdhp_coverage: z.boolean(),
      plans: z.array(
        z.object({
          coverage: z.enum(["self_only", "family"]),
          deductible: amount,
          maximum_out_of_pocket: amount,
          policy_source_reference: reference,
        }).strict(),
      ),
    }).strict(),
  ).length(12),
  medicare_enrollment_date: z.string().date().optional(),
  medicare_enrollment_source_reference: reference.optional(),
  personal_contributions: z.array(
    z.object({
      amount,
      payer_ssn: z.string().regex(/^\d{9}$/),
      payment_source_reference: reference,
      personal_cash_not_employer_rollover_or_transfer_confirmed: z.literal(
        true,
      ),
      deposit_date: z.string().date(),
      source_reference: reference,
      designated_tax_year: z.literal(2025),
    }).strict(),
  ),
  compensation: z.object({
    w2_source_reference: reference,
    service_wages: amount,
    payroll_source_reference: reference,
    all_box1_other_than_reported_employer_excess_is_current_service_compensation_confirmed:
      z.literal(true),
    employer_excess_already_in_box1: amount,
    employer_excess_box1_review_reference: reference,
  }).strict(),
  no_spouse_archer_contributions_or_other_archer_accounts_review_reference:
    reference,
  no_hsa_contributions_review_reference: reference,
  no_2026_employer_contributions_for_2025_review_reference: reference,
  no_other_form8853_activity_review_reference: reference.optional(),
  ltc_activity_review: z.object({
    source_reference: reference,
    no_msa_distributions_confirmed: z.literal(true),
    all_other_form8853_activity_in_ltc_ledger_confirmed: z.literal(true),
  }).strict().optional(),
  no_prior_excess_or_withdrawals_review_reference: reference,
  december_31: z.object({
    value: amount,
    source_reference: reference,
    all_holder_archer_accounts_included_confirmed: z.literal(true),
  }).strict().optional(),
}).strict().refine(
  (ledger) =>
    !!ledger.no_other_form8853_activity_review_reference !==
      !!ledger.ltc_activity_review,
  "Archer contributions require exactly one absence-of-other-activity or combined LTC review",
);
export const codeREntrySchema = z.object({
  employee_ssn: z.string(),
  employer_ein: z.string(),
  source_document_reference: reference,
  amount,
});
export type ArcherContributionLedger = z.infer<
  typeof archerContributionLedgerSchema
>;
export type CodeREntry = z.infer<typeof codeREntrySchema>;

export function calculateArcherContributions(
  raw: ArcherContributionLedger,
  codeR: CodeREntry[] = [],
) {
  const ledger = archerContributionLedgerSchema.parse(raw);
  if (new Set(ledger.months.map((m) => m.dependent_of_another)).size !== 1) {
    throw new Error("Archer dependency status applies to entire tax year");
  }
  if (new Set(ledger.months.map((m) => m.month)).size !== 12) {
    throw new Error(
      "Archer contribution worksheet requires each month exactly once",
    );
  }
  if (
    new Set(ledger.personal_contributions.map((c) => c.source_reference))
      .size !== ledger.personal_contributions.length
  ) throw new Error("Archer personal contribution source cannot be reused");
  if (
    ledger.eligibility.kind === "participating_employer" &&
    ledger.eligibility.employer_ein !== ledger.employer_ein
  ) {
    throw new Error(
      "Archer participating employer must maintain the sourced HDHP",
    );
  }
  if (
    !!ledger.medicare_enrollment_date !==
      !!ledger.medicare_enrollment_source_reference
  ) throw new Error("Archer Medicare enrollment requires date and source");
  if (
    ledger.months.some((m) => m.medicare_enrolled) &&
    !ledger.medicare_enrollment_date
  ) throw new Error("Archer Medicare month requires sourced enrollment date");
  if (
    ledger.medicare_enrollment_date &&
    ledger.medicare_enrollment_date > "2025-12-31"
  ) {
    throw new Error(
      "Archer Medicare enrollment must precede worksheet year end",
    );
  }
  const monthly = ledger.months.slice().sort((a, b) => a.month - b.month).map(
    (m) => {
      const first = `2025-${String(m.month).padStart(2, "0")}-01`;
      if (
        ledger.medicare_enrollment_date &&
        m.medicare_enrolled !==
          (first.slice(0, 7) >= ledger.medicare_enrollment_date.slice(0, 7))
      ) {
        throw new Error(
          "Archer monthly Medicare status conflicts with enrollment date",
        );
      }
      for (const p of m.plans) {
        const limits = p.coverage === "self_only"
          ? [2850, 4300, 5700]
          : [5700, 8550, 10500];
        if (
          p.deductible < limits[0] || p.deductible > limits[1] ||
          p.maximum_out_of_pocket > limits[2] ||
          p.maximum_out_of_pocket < p.deductible
        ) {
          throw new Error(
            "Archer HDHP policy does not meet 2025 deductible/out-of-pocket limits",
          );
        }
      }
      if (m.employer_hdhp_coverage !== (m.plans.length > 0)) {
        throw new Error("Archer coverage requires its actual HDHP policy");
      }
      const eligible = m.employer_hdhp_coverage && !m.medicare_enrolled &&
        !m.dependent_of_another && !m.nonpermitted_other_health_coverage;
      const family = m.plans.filter((p) => p.coverage === "family");
      const plans = family.length ? family : m.plans;
      return {
        month: m.month,
        eligible,
        amount: eligible
          ? Math.min(...plans.map((p) => p.deductible)) *
            (family.length ? ledger.filing_status === "mfs" ? .375 : .75 : .65)
          : 0,
      };
    },
  );
  for (const c of ledger.personal_contributions) {
    if (c.deposit_date < "2025-01-01" || c.deposit_date > "2026-04-15") {
      throw new Error("Archer deposit must be timely and designated for 2025");
    }
  }
  for (const c of codeR) {
    if (
      c.employee_ssn.replace(/\D/g, "") !== ledger.holder_ssn ||
      c.employer_ein.replace(/\D/g, "") !== ledger.employer_ein ||
      c.source_document_reference !== ledger.compensation.w2_source_reference
    ) {
      throw new Error(
        "Archer code R source must belong to holder and HDHP employer W-2",
      );
    }
  }
  if (codeR.length > 1) {
    throw new Error(
      "Archer contribution route requires one issued employer W-2 code R source",
    );
  }
  const rawEmployer = codeR.reduce((s, c) => s + c.amount, 0);
  const rawPersonal = ledger.personal_contributions.reduce(
    (s, c) => s + c.amount,
    0,
  );
  if (
    new Set(
        ledger.personal_contributions.map((c) => c.payment_source_reference),
      ).size !== ledger.personal_contributions.length ||
    ledger.personal_contributions.some((c) =>
      c.payer_ssn !== ledger.holder_ssn ||
      c.source_reference === ledger.compensation.w2_source_reference ||
      c.payment_source_reference === ledger.compensation.w2_source_reference
    )
  ) {
    throw new Error(
      "Archer personal deposits require distinct holder cash-payment sources",
    );
  }
  const cashReferences = ledger.personal_contributions.flatMap((
    c,
  ) => [...new Set([c.source_reference, c.payment_source_reference])]);
  if (new Set(cashReferences).size !== cashReferences.length) {
    throw new Error(
      "Archer cash event source cannot be allocated twice across deposit/payment rows",
    );
  }
  const deductiblePersonal = ledger.personal_contributions.filter((c) =>
    !ledger.medicare_enrollment_date ||
    c.deposit_date < ledger.medicare_enrollment_date
  ).reduce((s, c) => s + c.amount, 0);
  // Round the filed totals once; every deduction/income/excise join uses these lines.
  const line1 = Math.round(rawEmployer), line2 = Math.round(rawPersonal);
  const line3 = Math.round(monthly.reduce((s, m) => s + m.amount, 0) / 12);
  const line4 = Math.round(ledger.compensation.service_wages);
  const cap = Math.min(line3, line4);
  const line5 = rawEmployer > 0
    ? 0
    : Math.min(line2, cap, Math.round(deductiblePersonal));
  const employerExcess = Math.max(0, line1 - cap);
  const alreadyIncluded = Math.round(
    ledger.compensation.employer_excess_already_in_box1,
  );
  if (alreadyIncluded > employerExcess) {
    throw new Error(
      "Archer employer excess already in wages exceeds actual excess",
    );
  }
  const currentExcess = line2 - line5 + employerExcess;
  if (currentExcess > 0 && !ledger.december_31) {
    throw new Error(
      "Archer current excess requires sourced December 31 all-account value",
    );
  }
  // Form5329 line41 includes contributions for 2025 deposited in 2026.
  const december31Value = Math.round(
    (ledger.december_31?.value ?? 0) +
      ledger.personal_contributions.filter((c) =>
        c.deposit_date.startsWith("2026-")
      ).reduce((sum, c) => sum + c.amount, 0),
  );
  return {
    rawEmployer,
    rawPersonal,
    monthly,
    line1,
    line2,
    line3,
    line4,
    line5,
    cap,
    employerExcess,
    employerExcessIncome: employerExcess - alreadyIncluded,
    currentExcess,
    december31Value,
    tax: Math.round(.06 * Math.min(currentExcess, december31Value)),
  };
}
