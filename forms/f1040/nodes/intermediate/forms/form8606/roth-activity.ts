import { z } from "zod";
import { roundWholeDollars } from "../../../../whole-dollars.ts";

const date = z.string().date().refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value;
});
const reference = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{9}$/);
const money = z.number().nonnegative().refine((value) =>
  Number.isSafeInteger(Math.round(value * 100)) &&
  Math.abs(value * 100 - Math.round(value * 100)) < .000001
);
const account = z.object({ custodian_ein: ssn, account_number: reference })
  .strict();

/** Complete regular-contribution history; conversion/recapture records remain separate. */
export const rothActivityReviewSchema = z.object({
  owner_identity: z.object({
    source_document_reference: reference,
    owner_ssn: ssn,
    date_of_birth: date,
  }).strict(),
  inventory: z.object({
    source_document_reference: reference,
    owner_ssn: ssn,
    accounts: z.array(account).min(1),
    all_owned_roth_iras_and_activity_included: z.literal(true),
    no_contributions_before_listed_inventory: z.literal(true),
    no_prior_distributions_or_returned_contributions: z.literal(true),
    no_conversions_or_qualified_plan_rollovers: z.literal(true),
    no_inherited_accounts_or_transferred_basis: z.literal(true),
    all_regular_contributions_eligible_no_excess_confirmed: z.literal(true),
    no_other_current_roth_distribution: z.literal(true),
    no_homebuyer_disaster_repayment_qcd_hsa_or_rollover: z.literal(true),
  }).strict(),
  contributions: z.array(
    z.object({
      form5498: z.object({
        source_document_reference: reference,
        tax_year: z.number().int().min(1998).max(2025),
        owner_ssn: ssn,
        custodian_ein: ssn,
        account_number: reference,
        roth_ira_confirmed: z.literal(true),
        box10_roth_contributions: money.refine((value) => value > 0),
        box2_rollover_contributions: z.literal(0),
        box3_roth_conversion_amount: z.literal(0),
      }).strict(),
      receipts: z.array(
        z.object({
          source_document_reference: reference,
          owner_ssn: ssn,
          custodian_ein: ssn,
          account_number: reference,
          designated_tax_year: z.number().int().min(1998).max(2025),
          received_on: date,
          amount: money.refine((value) => value > 0),
        }).strict(),
      ).min(1),
    }).strict(),
  ).min(1),
  payment: z.object({
    source_document_reference: reference,
    owner_ssn: ssn,
    custodian_ein: ssn,
    account_number: reference,
    distribution_reference: reference,
    distributed_on: date,
    gross_distribution: money.refine((value) => value > 0),
    distribution_code: z.enum(["J", "T"]),
  }).strict(),
  form1099r_source_document_reference: reference,
}).strict();

export type RothActivityReview = z.infer<typeof rothActivityReviewSchema>;

function sumMoney(values: readonly number[]) {
  return values.reduce((sum, value) => sum + Math.round(value * 100), 0) / 100;
}

export function reviewedRothActivity(raw: unknown) {
  const review = rothActivityReviewSchema.parse(raw);
  const owner = review.owner_identity;
  const inventory = review.inventory;
  const payment = review.payment;
  const references = [
    owner.source_document_reference,
    inventory.source_document_reference,
    payment.source_document_reference,
    review.form1099r_source_document_reference,
  ];
  const accounts = inventory.accounts.map((row) =>
    JSON.stringify([row.custodian_ein, row.account_number])
  );
  const years = new Set<string>();
  const receiptDates: string[] = [];
  const ownerFacts = [inventory.owner_ssn, payment.owner_ssn];
  if (
    new Set(accounts).size !== accounts.length ||
    !accounts.includes(
      JSON.stringify([payment.custodian_ein, payment.account_number]),
    )
  ) {
    throw new Error(
      "Roth activity needs distinct complete owned account inventory and matched payment account",
    );
  }
  for (const row of review.contributions) {
    const form = row.form5498;
    const key = JSON.stringify([
      form.tax_year,
      form.custodian_ein,
      form.account_number,
    ]);
    if (
      years.has(key) ||
      !accounts.includes(
        JSON.stringify([form.custodian_ein, form.account_number]),
      )
    ) {
      throw new Error(
        "Roth contribution year/account is repeated or absent from complete inventory",
      );
    }
    years.add(key);
    references.push(form.source_document_reference);
    ownerFacts.push(form.owner_ssn);
    if (
      sumMoney(row.receipts.map((receipt) => receipt.amount)) !==
        form.box10_roth_contributions
    ) {
      throw new Error(
        "Roth issued Form5498 and actual contribution receipts differ",
      );
    }
    for (const receipt of row.receipts) {
      references.push(receipt.source_document_reference);
      ownerFacts.push(receipt.owner_ssn);
      receiptDates.push(receipt.received_on);
      if (
        receipt.custodian_ein !== form.custodian_ein ||
        receipt.account_number !== form.account_number ||
        receipt.designated_tax_year !== form.tax_year ||
        receipt.received_on < owner.date_of_birth ||
        receipt.received_on < `${form.tax_year}-01-01` ||
        receipt.received_on > `${form.tax_year + 1}-04-15`
      ) {
        throw new Error(
          "Roth receipt owner/account/tax-year designation and actual date must match issued contribution",
        );
      }
    }
  }
  if (
    ownerFacts.some((value) => value !== owner.owner_ssn) ||
    new Set(references).size !== references.length ||
    !payment.distributed_on.startsWith("2025-") ||
    payment.distributed_on < owner.date_of_birth ||
    receiptDates.every((value) => value > payment.distributed_on)
  ) {
    throw new Error(
      "Roth activity requires distinct reviewed documents, one actual owner and a contribution before payment",
    );
  }
  const firstContributionTaxYear = Math.min(
    ...review.contributions.map((row) => row.form5498.tax_year),
  );
  const { ageException, qualified } = rothPaymentAgeFacts(
    owner,
    payment,
    firstContributionTaxYear,
  );
  const rawBasis = sumMoney(
    review.contributions.map((row) => row.form5498.box10_roth_contributions),
  );
  const basis = roundWholeDollars(rawBasis);
  const gross = roundWholeDollars(payment.gross_distribution);
  const earnings = Math.max(0, gross - basis);
  return {
    review,
    rawBasis,
    basis,
    gross,
    earnings,
    taxable: qualified ? 0 : earnings,
    firstContributionTaxYear,
    qualified,
    ageException,
    earlyTaxable: ageException ? 0 : earnings,
    print: {
      print_roth_line19_distributions: gross,
      print_roth_line20_homebuyer: 0,
      print_roth_line21_after_homebuyer: gross,
      print_roth_line22_contribution_basis: basis,
      print_roth_line23_after_contribution_basis: earnings,
      print_roth_line24_conversion_basis: 0,
      print_roth_line25a_earnings: earnings,
      print_roth_line25b_disaster: 0,
      print_roth_line25c_taxable: qualified ? 0 : earnings,
    },
  };
}

export function rothActivityDocuments(review: RothActivityReview) {
  return [
    review.owner_identity,
    review.inventory,
    ...review.contributions.flatMap((row) => [row.form5498, ...row.receipts]),
    review.payment,
  ];
}

export function rothPaymentAgeFacts(
  owner: { date_of_birth: string },
  payment: { distributed_on: string; distribution_code: string },
  firstContributionTaxYear: number,
) {
  const born = new Date(`${owner.date_of_birth}T00:00:00Z`);
  const ageMonth = new Date(
    Date.UTC(born.getUTCFullYear() + 59, born.getUTCMonth() + 6, 1),
  );
  const lastDay = new Date(
    Date.UTC(ageMonth.getUTCFullYear(), ageMonth.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const ageDate = new Date(
    Date.UTC(
      ageMonth.getUTCFullYear(),
      ageMonth.getUTCMonth(),
      Math.min(born.getUTCDate(), lastDay),
    ),
  );
  const ageException =
    payment.distributed_on >= ageDate.toISOString().slice(0, 10);
  if ((payment.distribution_code === "T") !== ageException) {
    throw new Error(
      "Reviewed Roth J/T age-based code conflicts with actual owner birth and distribution dates",
    );
  }
  return {
    ageException,
    qualified: ageException && firstContributionTaxYear <= 2020,
  };
}
