import { z } from "zod";
import {
  calculateArcherLedger,
  deathTransferSourceSchema,
} from "./archer_distributions.ts";

const reference = z.string().trim().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}, "must be a calendar date");
const amount = z.number().finite().nonnegative();
const normal = z.object({
  kind: z.literal("normal"),
  holder_ssn: z.string().regex(/^\d{9}$/),
  holder_identity_source_reference: reference,
  medicare_enrollment_and_eligible_hdhp_confirmed: z.literal(true),
  enrollment_and_hdhp_source_reference: reference,
  disability: z.object({
    onset_date: date,
    source_reference: reference,
    unable_to_engage_in_substantial_gainful_activity_confirmed: z.literal(true),
    condition_expected_to_result_in_death_or_continue_indefinitely_confirmed: z
      .literal(true),
  }).optional(),
  distributions: z.array(
    z.object({
      distribution_reference: reference,
      account_source_reference: reference,
      distribution_date: date,
      distribution_date_source_reference: reference,
      gross_amount: amount,
      form1099sa_distribution_code: z.enum(["1", "3"]),
      form1099sa_source_reference: reference,
      unreimbursed_holder_qualified_expenses: amount,
      qualified_expense_source_references: z.array(reference),
      holder_only_medical_eligibility_and_no_schedule_a_double_deduction_confirmed:
        z.literal(true),
    }).strict(),
  ).min(1),
}).strict();
// The death FMV/medical source facts are the same as Section A; Section B
// applies its own reporting lines and 50% exception rather than an age test.
const death = deathTransferSourceSchema;
const priorYear = z.discriminatedUnion("had_account_at_end_2024", [
  z.object({
    had_account_at_end_2024: z.literal(false),
    year_end_account_review_source_reference: reference,
  }).strict(),
  z.object({
    had_account_at_end_2024: z.literal(true),
    balance_on_2024_12_31: amount,
    balance_source_reference: reference,
    balance_includes_all_holder_medicare_msas_confirmed: z.literal(true),
    annual_hdhp_deductible_on_2025_01_01: amount,
    deductible_policy_source_reference: reference,
  }).strict(),
]);
export const medicareDistributionLedgerSchema = z.object({
  owner: z.enum(["taxpayer", "spouse"]),
  sole_medicare_msa_holder_on_return_confirmed: z.literal(true),
  source: z.discriminatedUnion("kind", [normal, death]),
  prior_year: priorYear.optional(),
  all_distributions_identified_confirmed: z.literal(true),
  erroneous_medicare_contributions_and_earnings_and_trustee_transfers_excluded_confirmed:
    z.literal(true),
  no_other_form8853_activity_confirmed: z.literal(true),
}).strict();
export type MedicareDistributionLedger = z.infer<
  typeof medicareDistributionLedgerSchema
>;

export function calculateMedicareLedger(
  raw: MedicareDistributionLedger,
  taxYear = 2025,
) {
  const ledger = medicareDistributionLedgerSchema.parse(raw);
  const source = ledger.source;
  let gross = 0, qualified = 0, excepted = 0;
  if (source.kind === "death_transfer") {
    const deathLines = calculateArcherLedger({
      source,
      all_distributions_identified_confirmed: true,
      no_rollover_or_excess_contribution_withdrawal_confirmed: true,
      no_other_form8853_activity_confirmed: true,
    }, taxYear);
    gross = deathLines.rawGross;
    qualified = deathLines.rawQualified;
    excepted = gross - qualified;
  } else {
    const seen = new Set<string>();
    for (const row of source.distributions) {
      if (seen.has(row.distribution_reference)) {
        throw new Error("Form8853 duplicate Medicare distribution reference");
      }
      seen.add(row.distribution_reference);
      if (!row.distribution_date.startsWith(`${taxYear}-`)) {
        throw new Error(
          "Form8853 Medicare distribution date must be in filing year",
        );
      }
      if (
        row.unreimbursed_holder_qualified_expenses > row.gross_amount ||
        (row.unreimbursed_holder_qualified_expenses > 0 &&
          row.qualified_expense_source_references.length === 0)
      ) {
        throw new Error(
          "Form8853 Medicare qualified expenses need holder medical sources no greater than distribution",
        );
      }
      if (row.form1099sa_distribution_code === "3" && !source.disability) {
        throw new Error(
          "Form8853 Medicare disability code needs sourced disability facts",
        );
      }
      gross += row.gross_amount;
      qualified += row.unreimbursed_holder_qualified_expenses;
      // Medicare exception includes the event date (i8853 lines13a/13b).
      if (
        source.disability &&
        row.distribution_date >= source.disability.onset_date
      ) {
        excepted += row.gross_amount -
          row.unreimbursed_holder_qualified_expenses;
      }
    }
  }
  const line10 = Math.round(gross), line11 = Math.round(qualified);
  const line12 = Math.max(0, line10 - line11);
  const worksheetLine1 = excepted === 0
    ? line12
    : Math.min(line12, Math.max(0, Math.round(gross - qualified - excepted)));
  const line13a = excepted > 0 && line12 > 0;
  if (worksheetLine1 === 0) {
    return {
      rawGross: gross,
      rawQualified: qualified,
      line10,
      line11,
      line12,
      line13a,
      line13b: 0,
      deathTransfer: source.kind === "death_transfer",
      worksheet: { line1: 0, line7: 0 },
    };
  }
  if (!ledger.prior_year) {
    throw new Error(
      "Form8853 Medicare additional-tax worksheet needs 2024 account review",
    );
  }
  if (!ledger.prior_year.had_account_at_end_2024) {
    const line13b = Math.round(worksheetLine1 * 0.5);
    return {
      rawGross: gross,
      rawQualified: qualified,
      line10,
      line11,
      line12,
      line13a,
      line13b,
      deathTransfer: false,
      worksheet: {
        line1: worksheetLine1,
        hadAccountAtEnd2024: false,
        line7: line13b,
      },
    };
  }
  const line2 = Math.round(ledger.prior_year.balance_on_2024_12_31);
  const line3 = Math.round(
    ledger.prior_year.annual_hdhp_deductible_on_2025_01_01,
  );
  const line4 = Math.round(line3 * 0.6);
  const line5 = Math.max(0, line2 - line4);
  const line6 = Math.max(0, worksheetLine1 - line5);
  const line13b = Math.round(line6 * 0.5);
  return {
    rawGross: gross,
    rawQualified: qualified,
    line10,
    line11,
    line12,
    line13a,
    line13b,
    deathTransfer: false,
    worksheet: {
      line1: worksheetLine1,
      hadAccountAtEnd2024: true,
      line2,
      line3,
      line4,
      line5,
      line6,
      line7: line13b,
    },
  };
}
