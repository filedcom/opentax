import { z } from "zod";

const reference = z.string().trim().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}, "must be a calendar date");
const ssn = z.string().regex(/^\d{9}$/);
const amount = z.number().finite().nonnegative();
const normal = z.object({
  kind: z.literal("normal"),
  holder_ssn: ssn,
  holder_date_of_birth: date,
  holder_identity_source_reference: reference,
  age65_attainment: z.object({ date, source_reference: reference }).optional(),
  disability: z.object({
    onset_date: date,
    source_reference: reference,
    unable_to_engage_in_substantial_gainful_activity_confirmed: z.literal(true),
    condition_expected_to_result_in_death_or_continue_indefinitely_confirmed: z
      .literal(true),
  }).optional(),
  distributions: z.array(z.object({
    distribution_reference: reference,
    distribution_date: date,
    gross_amount: amount,
    form1099sa_distribution_code: z.enum(["1", "3"]),
    form1099sa_source_reference: reference,
    distribution_date_source_reference: reference,
    unreimbursed_qualified_expenses: amount,
    qualified_expense_source_references: z.array(reference),
    qualified_expense_eligibility_and_no_schedule_a_double_deduction_confirmed:
      z.literal(true),
  })).min(1),
}).strict();
const death = z.object({
  kind: z.literal("death_transfer"),
  beneficiary_kind: z.enum(["nonspouse_individual", "estate_final_return"]),
  recipient_ssn: ssn,
  deceased_holder_name: reference,
  deceased_holder_ssn: ssn,
  death_date: date,
  death_source_reference: reference,
  beneficiary_source_reference: reference,
  fair_market_value_at_death: amount,
  valuation_source_reference: reference,
  expenses: z.array(z.object({
    amount,
    incurred_date: date,
    paid_date: date,
    source_reference: reference,
    qualified_unreimbursed_confirmed: z.literal(true),
  })),
  no_postdeath_earnings_in_transfer_confirmed: z.literal(true),
  no_other_inherited_or_owned_msa_confirmed: z.literal(true),
}).strict();

export const archerDistributionLedgerSchema = z.object({
  source: z.discriminatedUnion("kind", [normal, death]),
  all_distributions_identified_confirmed: z.literal(true),
  no_rollover_or_excess_contribution_withdrawal_confirmed: z.literal(true),
  no_other_form8853_activity_confirmed: z.literal(true),
}).strict();
export type ArcherDistributionLedger = z.infer<
  typeof archerDistributionLedgerSchema
>;

/** IRS 2025 i8853: Archer exceptions begin AFTER the event date, not on it. */
export function calculateArcherLedger(
  raw: ArcherDistributionLedger,
  taxYear = 2025,
) {
  const ledger = archerDistributionLedgerSchema.parse(raw);
  const source = ledger.source;
  let gross = 0, qualified = 0, exceptedTaxable = 0;
  if (source.kind === "normal") {
    let sixtyFifthBirthday = `${
      Number(source.holder_date_of_birth.slice(0, 4)) + 65
    }${source.holder_date_of_birth.slice(4)}`;
    if (source.age65_attainment) {
      const event = source.age65_attainment.date;
      const leapBirth = source.holder_date_of_birth.endsWith("-02-29");
      if (
        (!leapBirth && event !== sixtyFifthBirthday) ||
        (leapBirth &&
          ![
            `${sixtyFifthBirthday.slice(0, 4)}-02-28`,
            `${sixtyFifthBirthday.slice(0, 4)}-03-01`,
            sixtyFifthBirthday,
          ].includes(event))
      ) {
        throw new Error(
          "Form 8853 age65 attainment must agree with sourced date of birth",
        );
      }
      sixtyFifthBirthday = event;
    } else if (
      source.holder_date_of_birth.endsWith("-02-29") &&
      !date.safeParse(sixtyFifthBirthday).success
    ) {
      throw new Error(
        "Form 8853 leap-day birth needs sourced age65 attainment date",
      );
    }
    if (
      source.disability &&
      source.disability.onset_date < source.holder_date_of_birth
    ) {
      throw new Error("Form 8853 disability onset precedes holder birth");
    }
    const references = new Set<string>();
    for (const row of source.distributions) {
      if (references.has(row.distribution_reference)) {
        throw new Error("Form 8853 duplicate distribution reference");
      }
      references.add(row.distribution_reference);
      if (
        !row.distribution_date.startsWith(`${taxYear}-`) ||
        row.distribution_date < source.holder_date_of_birth
      ) {
        throw new Error(
          "Form 8853 distribution date must be in the filing year after birth",
        );
      }
      if (
        row.unreimbursed_qualified_expenses > row.gross_amount ||
        (row.unreimbursed_qualified_expenses > 0 &&
          row.qualified_expense_source_references.length === 0)
      ) {
        throw new Error(
          "Form 8853 distribution medical allocation needs source expenses no greater than gross",
        );
      }
      if (row.form1099sa_distribution_code === "3" && !source.disability) {
        throw new Error(
          "Form 8853 disability distribution code needs sourced disability facts",
        );
      }
      gross += row.gross_amount;
      qualified += row.unreimbursed_qualified_expenses;
      if (
        row.distribution_date > sixtyFifthBirthday ||
        (source.disability &&
          row.distribution_date > source.disability.onset_date)
      ) {
        exceptedTaxable += row.gross_amount -
          row.unreimbursed_qualified_expenses;
      }
    }
  } else {
    if (!source.death_date.startsWith(`${taxYear}-`)) {
      throw new Error(
        "Form 8853 death transfer must belong to the filing year",
      );
    }
    if (
      source.beneficiary_kind === "estate_final_return" &&
      (source.recipient_ssn !== source.deceased_holder_ssn ||
        source.expenses.length > 0)
    ) {
      throw new Error(
        "Form 8853 estate beneficiary transfer belongs to deceased final return without medical offset",
      );
    }
    if (
      source.beneficiary_kind === "nonspouse_individual" &&
      source.recipient_ssn === source.deceased_holder_ssn
    ) {
      throw new Error(
        "Form 8853 nonspouse beneficiary must differ from deceased holder",
      );
    }
    const anniversary = `${Number(source.death_date.slice(0, 4)) + 1}${
      source.death_date.slice(4)
    }`;
    gross = source.fair_market_value_at_death;
    for (const expense of source.expenses) {
      if (
        expense.incurred_date >= source.death_date ||
        expense.paid_date < source.death_date || expense.paid_date > anniversary
      ) {
        throw new Error(
          "Form 8853 death-transfer medical expense must be incurred before death and paid within one year",
        );
      }
      qualified += expense.amount;
    }
    if (qualified > gross) {
      throw new Error("Form 8853 death-transfer medical expenses exceed value");
    }
    exceptedTaxable = gross - qualified;
  }
  return {
    line6a: gross,
    line6b: 0,
    line6c: gross,
    line7: qualified,
    line8: gross - qualified,
    line9a: exceptedTaxable > 0,
    line9b: (gross - qualified - exceptedTaxable) * 0.2,
    exceptedTaxable,
    deathTransfer: source.kind === "death_transfer",
  };
}
