import { z } from "zod";
import {
  isSourceMoney,
  sumSourceMoney,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
const ref = z.string().trim().min(1);
const date = z.string().date();
const money = z.number().finite().nonnegative().max(1_000_000_000).refine(
  isSourceMoney,
  "Retirement money needs exact cents",
);
export const retirementPayment2026Schema = z.object({
  record_reference: ref,
  payment_date: date,
  gross: money,
  taxable: money,
}).strict();
export const disabilityIncomeReview2026Schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ordinary_distribution"),
    record_reference: ref,
    not_employer_disability_pension_verified: z.literal(true),
  }).strict(),
  z.object({
    kind: z.literal("employer_disability_pension"),
    record_reference: ref,
    owner_tin: z.string().regex(/^\d{9}$/),
    account_number: ref,
    plan_record_reference: ref,
    disability_retirement_date: date,
    minimum_retirement_age_date: date,
    earliest_non_disability_pension_eligibility_verified: z.literal(true),
    employer_paid_disability_pension_verified: z.literal(true),
    no_special_military_service_or_terrorism_exclusion_verified: z.literal(
      true,
    ),
    complete_payment_inventory_verified: z.literal(true),
    payments: z.array(retirementPayment2026Schema).min(1).max(1000),
  }).strict(),
]);
type Payment = z.output<typeof retirementPayment2026Schema>;
export function splitDisabilityIncome2026(facts: {
  review: z.output<typeof disabilityIncomeReview2026Schema> | undefined;
  owner_tin: string;
  account_number: string;
  owner_dob: string;
  ira: boolean;
  code: string;
  has_disability_exception: boolean;
  gross: number;
  taxable: number;
  early_payments: Payment[] | undefined;
}) {
  const r = facts.review;
  if (
    !facts.ira && (facts.code === "3" || facts.has_disability_exception) && !r
  ) {
    throw new Error(
      "Disability distribution needs a separate pension-versus-withdrawal income review",
    );
  }
  if (r && !["1", "2", "3", "7", "S"].includes(facts.code)) {
    throw new Error(
      "Disability income review conflicts with the issued distribution code",
    );
  }
  if (r?.kind !== "employer_disability_pension") {
    return { wage_payments: [] as Payment[], pension_payments: undefined };
  }
  if (facts.ira || !["1", "2", "3", "7"].includes(facts.code)) {
    throw new Error(
      "Employer disability pension wages cannot come from an IRA or unrelated distribution code",
    );
  }
  if (
    r.owner_tin !== facts.owner_tin ||
    r.account_number !== facts.account_number ||
    r.disability_retirement_date < facts.owner_dob ||
    r.minimum_retirement_age_date < facts.owner_dob ||
    r.payments.some((p) =>
      !p.payment_date.startsWith("2026-") ||
      p.payment_date < r.disability_retirement_date || p.taxable > p.gross
    )
  ) {
    throw new Error(
      "Disability pension owner, account, retirement date or payments conflict with source records",
    );
  }
  if (
    new Set(r.payments.map((p) => p.record_reference)).size !==
      r.payments.length ||
    sumSourceMoney(r.payments.map((p) => p.gross)) !== facts.gross ||
    sumSourceMoney(r.payments.map((p) => p.taxable)) !== facts.taxable
  ) {
    throw new Error(
      "Disability pension payment inventory must be distinct and reconcile issued gross and taxable amounts",
    );
  }
  const early = facts.early_payments;
  if (
    early &&
    (early.length !== r.payments.length ||
      r.payments.some((p) =>
        !early.some((e) =>
          e.record_reference === p.record_reference &&
          e.payment_date === p.payment_date && e.gross === p.gross &&
          e.taxable === p.taxable
        )
      ))
  ) {
    throw new Error(
      "Disability pension and early-tax reviews must use the same dated payments and amounts",
    );
  }
  // Publication 575: pension treatment starts the day AFTER minimum retirement age.
  return {
    wage_payments: r.payments.filter((p) =>
      p.payment_date <= r.minimum_retirement_age_date
    ),
    pension_payments: r.payments.filter((p) =>
      p.payment_date > r.minimum_retirement_age_date
    ),
  };
}
