import {
  hsaExcessReturns2026Schema,
  reconcileHsaExcessReturns2026,
} from "./hsa-excess-returns.ts";
import { z } from "zod";
import {
  hsaDistributionSources2026Schema,
  reconcileHsaDistributions2026,
} from "./hsa-distribution-source.ts";
import {
  calculateItemizedExpenseSources2026,
  medicalPayment2026Schema,
} from "./itemized-expense-source.ts";
import { addCalendarMonths } from "./retirement-statement.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import {
  isSourceMoney,
  sourceCents,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
import {
  hsaDistributionAdditionalTax,
  hsaTaxableDistributions,
} from "../../nodes/intermediate/forms/adjustments/health/form8889/distribution-amounts.ts";
const ref = z.string().trim().min(1), date = z.string().date();
const tin = z.string().regex(/^\d{9}$/);
const money = z.number().finite().nonnegative().max(10_000_000).refine(
  isSourceMoney,
);
const disability = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("none"),
    review_reference: ref,
    no_disability_exception_claimed: z.literal(true),
  }).strict(),
  z.object({
    kind: z.literal("permanent_total"),
    review_reference: ref,
    patient_tin: tin,
    physician_record_reference: ref,
    physician_determination_signed_on: date,
    disability_onset_date: date,
    unable_to_perform_any_substantial_gainful_activity_verified: z.literal(
      true,
    ),
    disability_caused_by_physical_or_mental_condition_verified: z.literal(true),
    physician_expected_duration: z.enum(["death", "long_continued_indefinite"]),
    medical_evidence_covers_all_post_onset_payments_verified: z.literal(true),
  }).strict(),
]);
export const hsaMedicalDistributions2026Schema =
  hsaDistributionSources2026Schema.extend({
    excess_returns: hsaExcessReturns2026Schema.optional(),
    treatment_review: z.object({
      record_reference: ref,
      current_schedule_a_medical_inventory_complete_verified: z.literal(true),
      owners: z.array(
        z.object({
          owner_tin: tin,
          review_reference: ref,
          no_rollover_excess_return_or_mistaken_distribution_in_payments_verified:
            z.literal(true).optional(),
          no_rollover_or_mistaken_distribution_in_payments_verified: z.literal(
            true,
          ).optional(),
          no_mistaken_distribution_in_payments_verified: z.literal(true)
            .optional(),
          disability,
        }).strict(),
      ).min(1).max(2),
    }).strict(),
    // Supplied by the executed Schedule A source inventory. Its actual bill
    // facts and excluded amounts must reconcile.
    schedule_a_medical_sources: z.array(medicalPayment2026Schema).max(10000),
    medical_expenses: z.array(
      z.object({
        payment_reference: ref,
        source_document_reference: ref,
        provider_name: ref,
        provider_invoice_identifier: ref,
        patient_tin: tin,
        payer_tin: tin,
        hsa_owner_tin: tin,
        relationship: z.enum(["owner", "spouse", "dependent_under_223d2"]),
        relationship_review_reference: ref,
        relationship_at_time_expense_incurred_verified: z.literal(true),
        dependent_qualification_review: z.object({
          record_reference: ref,
          section152_qualification_except_joint_return_gross_income_or_filer_dependency_verified:
            z.literal(true),
          divorced_or_separated_parent_rule_reviewed: z.literal(true),
        }).strict().optional(),
        incurred_on: date,
        paid_on: date,
        amount_paid: money,
        category: z.enum([
          "medical_or_dental_care",
          "medicine_or_insulin",
          "menstrual_care_product",
        ]),
        qualification_record_reference: ref,
        qualifying_medical_care_under_223d2_verified: z.literal(true),
        no_insurance_dpc_ltc_capital_or_travel_special_limit_verified: z
          .literal(true),
        not_deducted_on_prior_returns_verified: z.literal(true),
        insurance_or_other_non_hsa_reimbursement: money,
        other_hsa_msa_fsa_reimbursement: money,
        nonmedical_amount: money,
        all_prior_and_other_account_reimbursements_reviewed: z.literal(true),
        allocations: z.array(
          z.object({
            distribution_payment_reference: ref,
            amount: money.refine((v) => v > 0),
            reimbursement_trace_reference: ref,
          }).strict(),
        ).min(1).max(1000),
      }).strict(),
    ).max(10000),
  }).strict();
export type HsaMedicalDistributions2026 = z.input<
  typeof hsaMedicalDistributions2026Schema
>;

/** Ordinary owned HSA distributions, including dated age/disability exceptions.
 * Contribution eligibility is deliberately independent: an ineligible owner
 * may still receive tax-free qualified medical reimbursements. */
export function calculateHsaMedicalDistributions2026(
  raw: HsaMedicalDistributions2026,
) {
  const input = hsaMedicalDistributions2026Schema.parse(raw);
  const {
    treatment_review: review,
    medical_expenses: expenses,
    schedule_a_medical_sources: scheduleA,
    excess_returns: excessReview,
    ...source
  } = input;
  const excess = excessReview
    ? reconcileHsaExcessReturns2026(excessReview, source)
    : undefined;
  const r = excess?.distribution_sources ??
    reconcileHsaDistributions2026(source);
  const rollovers = excess?.contribution_sources.rollovers ?? [];
  if (!excess && r.accounts.some((a) => a.nonreportable_payments?.length)) {
    throw Error(
      "HSA nonreportable payments require the linked annual funding workpaper",
    );
  }
  for (const o of review.owners) {
    const hasRollovers = rollovers.some((r) => r.owner_tin === o.owner_tin);
    if (
      hasRollovers
        ? !o.no_mistaken_distribution_in_payments_verified ||
          o.no_rollover_or_mistaken_distribution_in_payments_verified ||
          o.no_rollover_excess_return_or_mistaken_distribution_in_payments_verified
        : o.no_mistaken_distribution_in_payments_verified || (excess
          ? o
            .no_rollover_excess_return_or_mistaken_distribution_in_payments_verified ||
            !o.no_rollover_or_mistaken_distribution_in_payments_verified
          : !o
            .no_rollover_excess_return_or_mistaken_distribution_in_payments_verified ||
            o.no_rollover_or_mistaken_distribution_in_payments_verified)
    ) {
      throw Error(
        "HSA distribution absence declarations must match the actual excess-return source route",
      );
    }
  }
  calculateItemizedExpenseSources2026({
    filing_status: input.filing_status,
    taxpayer_ssn: input.taxpayer_ssn,
    spouse_ssn: input.spouse_ssn,
    medical_payments: scheduleA,
    tax_election: "income",
  });
  if (
    review.owners.length !== r.owners.length ||
    new Set(review.owners.map((o) => o.owner_tin)).size !==
      review.owners.length ||
    review.owners.some((o) =>
      !r.owners.some((v) => v.owner_tin === o.owner_tin)
    )
  ) {
    throw Error(
      "HSA distribution treatment reviews must identify every actual account owner once",
    );
  }
  if (
    r.current_copies.some((f) =>
      f.box5_account_type !== "hsa" ||
      !(excess ? ["1", "2", "3"] : ["1", "3"]).includes(
        f.box3_distribution_code,
      ) ||
      f.box4_fmv_on_death !== 0
    )
  ) {
    throw Error(
      "HSA excess, death, prohibited-transaction and MSA distributions need separate source settlement",
    );
  }
  const payments = new Map(
    r.accounts.flatMap((a) =>
      a.payments.map((p) => {
        const value = { ...p, account: a, medical_cents: 0 };
        return [p.record_reference, value] as const;
      })
    ),
  );
  const refs = new Set<string>(),
    invoices = new Set<string>(),
    docs = new Set<string>();
  const traceRefs = new Set<string>();
  const medical = expenses.map((e) => {
    const invoice = JSON.stringify([
      e.provider_name,
      e.provider_invoice_identifier,
    ]);
    if (
      refs.has(e.payment_reference) || docs.has(e.source_document_reference) ||
      invoices.has(invoice)
    ) throw Error("HSA medical inventory repeats a bill or expense payment");
    refs.add(e.payment_reference);
    docs.add(e.source_document_reference);
    invoices.add(invoice);
    const owner = r.owners.find((o) => o.owner_tin === e.hsa_owner_tin);
    const spouse = e.hsa_owner_tin === input.taxpayer_ssn
      ? input.spouse_ssn
      : input.taxpayer_ssn;
    if (
      !owner || e.payer_tin !== e.hsa_owner_tin ||
      (e.relationship === "owner" && e.patient_tin !== owner.owner_tin) ||
      (e.relationship === "spouse" &&
        (!spouse || spouse === e.hsa_owner_tin || spouse !== e.patient_tin)) ||
      (e.relationship === "dependent_under_223d2"
        ? !e.dependent_qualification_review ||
          e.patient_tin === owner.owner_tin || e.patient_tin === spouse
        : !!e.dependent_qualification_review)
    ) {
      throw Error(
        "HSA medical patient needs the actual owner, spouse or sourced dependent qualification",
      );
    }
    if (
      e.incurred_on > e.paid_on || e.paid_on > "2026-12-31" ||
      e.incurred_on < owner.owner_dob && e.relationship === "owner"
    ) {
      throw Error(
        "HSA medical expense needs actual ordered service and payment dates",
      );
    }
    const available = sourceCents(e.amount_paid) -
      sourceCents(e.insurance_or_other_non_hsa_reimbursement) -
      sourceCents(e.other_hsa_msa_fsa_reimbursement) -
      sourceCents(e.nonmedical_amount);
    const allocated = e.allocations.reduce(
      (n, a) => n + sourceCents(a.amount),
      0,
    );
    if (available < allocated) {
      throw Error(
        "HSA medical reimbursements exceed the unreimbursed qualified expense",
      );
    }
    const used = new Set<string>();
    for (const a of e.allocations) {
      const p = payments.get(a.distribution_payment_reference);
      if (
        !p || p.account.owner_tin !== e.hsa_owner_tin ||
        used.has(a.distribution_payment_reference) ||
        traceRefs.has(a.reimbursement_trace_reference)
      ) {
        throw Error(
          "HSA medical allocation needs distinct actual same-owner payments and reimbursement traces",
        );
      }
      if (e.incurred_on < p.account.hsa_established_on) {
        throw Error(
          "HSA medical expense predates the evidenced HSA establishment",
        );
      }
      used.add(a.distribution_payment_reference);
      traceRefs.add(a.reimbursement_trace_reference);
      p.medical_cents += sourceCents(a.amount);
    }
    const matching = scheduleA.filter((v) =>
      v.payment_reference === e.payment_reference ||
      v.source_document_reference === e.source_document_reference ||
      (v.provider_name === e.provider_name &&
        v.patient_ssn.replaceAll("-", "") === e.patient_tin &&
        v.payment_date === e.paid_on && v.amount_paid === e.amount_paid)
    );
    if (matching.length > 1) {
      throw Error("HSA medical bill has duplicate Schedule A sources");
    }
    for (const a of matching) {
      if (
        a.source_document_reference !== e.source_document_reference ||
        a.payment_reference !== e.payment_reference ||
        a.patient_ssn.replaceAll("-", "") !== e.patient_tin ||
        a.payer_ssn.replaceAll("-", "") !== e.payer_tin ||
        a.payment_date !== e.paid_on || a.amount_paid !== e.amount_paid ||
        a.provider_name !== e.provider_name ||
        a.nonmedical_amount !== e.nonmedical_amount ||
        sourceCents(a.reimbursed_amount) <
          sourceCents(e.insurance_or_other_non_hsa_reimbursement) ||
        sourceCents(a.tax_free_funding_amount) <
          allocated + sourceCents(e.other_hsa_msa_fsa_reimbursement)
      ) {
        throw Error(
          "Schedule A must identify the same medical payment and exclude all HSA-funded amounts",
        );
      }
    }
    return {
      ...e,
      qualified_reimbursement: allocated / 100,
      unallocated_qualified_expense: (available - allocated) / 100,
    };
  });
  const owners = r.owners.map((o) => {
    const d = review.owners.find((v) =>
      v.owner_tin === o.owner_tin
    )!.disability;
    if (
      d.kind === "permanent_total" &&
      (d.patient_tin !== o.owner_tin || d.disability_onset_date < o.owner_dob ||
        d.disability_onset_date > "2026-12-31" ||
        d.physician_determination_signed_on > input.claim.reviewed_on ||
        d.physician_determination_signed_on < d.disability_onset_date)
    ) {
      throw Error(
        "HSA disability exception needs the owner's dated physician determination",
      );
    }
    const age65 = addCalendarMonths(o.owner_dob, 65 * 12);
    const rows = [...payments.values()].filter((p) =>
      p.account.owner_tin === o.owner_tin
    ).map((p) => {
      const form = p.account.current_copies.find((f) =>
        f.source_document_reference === p.form1099sa_source_reference
      )!;
      const disabled = d.kind === "permanent_total" &&
        p.distributed_on >= d.disability_onset_date;
      if (form.box3_distribution_code === "3" && !disabled) {
        throw Error(
          "HSA disability-coded payment must follow the sourced disability onset",
        );
      }
      const returned = excess?.withdrawals.find((w) =>
        w.income_tax_year === 2026 && w.payment_reference === p.record_reference
      );
      const rolled = rollovers.filter((r) =>
        r.distribution_payment_reference === p.record_reference
      )
        .reduce((n, r) => n + sourceCents(r.amount), 0);
      if (returned && rolled > 0) {
        throw Error(
          "HSA payment cannot be both an excess return and a rollover",
        );
      }
      const excluded = (returned ? sourceCents(returned.gross_amount) : 0) +
        rolled;
      if (
        rolled > 0 && excluded + p.medical_cents > sourceCents(p.gross_amount)
      ) {
        throw Error(
          "HSA rollover and medical allocations cannot reuse the same distribution dollars",
        );
      }
      const taxable = hsaTaxableDistributions(
        sourceCents(p.gross_amount),
        excluded,
        p.medical_cents,
      );
      const exception = p.distributed_on >= age65
        ? "age_65"
        : disabled
        ? "disability"
        : undefined;
      return {
        payment_reference: p.record_reference,
        form1099sa_source_reference: p.form1099sa_source_reference,
        distributed_on: p.distributed_on,
        gross_amount: p.gross_amount,
        excluded_excess_return:
          (returned ? sourceCents(returned.gross_amount) : 0) / 100,
        excluded_rollover: rolled / 100,
        qualified_medical_amount: p.medical_cents / 100,
        taxable_amount: taxable / 100,
        exception,
        excepted_taxable_amount: exception ? taxable / 100 : 0,
      };
    });
    const qualified = rows.reduce(
      (n, p) => n + sourceCents(p.qualified_medical_amount),
      0,
    );
    const excluded = rows.reduce(
      (n, p) =>
        n + sourceCents(p.excluded_excess_return) +
        sourceCents(p.excluded_rollover),
      0,
    );
    const taxable = hsaTaxableDistributions(
      o.gross_distribution_cents,
      excluded,
      qualified,
    );
    const excepted = rows.reduce(
      (n, p) => n + sourceCents(p.excepted_taxable_amount),
      0,
    );
    const tax = hsaDistributionAdditionalTax(taxable, excepted, .20) / 100;
    const line14a = roundWholeDollars(o.gross_distributions),
      line15 = roundWholeDollars(qualified / 100);
    const line14b = roundWholeDollars(excluded / 100);
    // Source amounts have already been reconciled above. Independent filed
    // line rounding can make line 15 exceed 14c by a dollar; the printed form
    // explicitly floors line 16 at zero in that case.
    const line16 = Math.max(0, line14a - line14b - line15);
    const filedExcepted = Math.min(line16, roundWholeDollars(excepted / 100));
    return {
      ...o,
      payments: rows,
      excess_return_settlement: excess?.owners.find((v) =>
        v.owner_tin === o.owner_tin
      ),
      qualified_medical_amount: qualified / 100,
      taxable_distributions: taxable / 100,
      excepted_taxable_distributions: excepted / 100,
      additional_tax: tax,
      filed_excepted_taxable_amount: filedExcepted,
      filed_part_ii: {
        line14a,
        line14b,
        line14c: line14a - line14b,
        line15,
        line16,
        line17a: excepted > 0,
        line17b: roundWholeDollars(
          hsaDistributionAdditionalTax(line16, filedExcepted, .20),
        ),
      },
    };
  });
  return {
    source_input: input,
    distribution_sources: r,
    excess_return_sources: excess,
    medical_expenses: medical,
    owners,
  };
}
