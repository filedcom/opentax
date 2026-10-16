import {
  adoptionCarryforward2026Schema,
  reconcileAdoptionCarryforward2026,
} from "./adoption-carryforward.ts";
import { z } from "zod";
import { investmentOwner2026 } from "./investment-source.ts";
import { w2Item2026Schema } from "./w2-source.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { adoption2026 as rules } from "../../nodes/config/2026-adoption.ts";
import { addCalendarMonths } from "./retirement-statement.ts";
import {
  isSourceMoney,
  sourceCents,
  sumSourceMoney,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
const ref = z.string().trim().min(1),
  tin = z.string().regex(/^\d{9}$/),
  date = z.string().date();
const money = z.number().finite().nonnegative().max(1e9).refine(isSourceMoney);
const whole = z.number().int().nonnegative().max(1e9);
const program = z.object({
  record_reference: ref,
  wage_source_reference: ref,
  owner_tin: tin,
  effective_from: date,
  effective_through: date,
  written_qualified_adoption_assistance_program_verified: z.literal(true),
  not_more_than_two_percent_s_corporation_owner_verified: z.literal(true),
  personal_services_review: z.object({
    record_reference: ref,
    benefits_are_reasonable_compensation_for_personal_services_verified: z
      .literal(true),
    not_distribution_of_earnings_or_profits_verified: z.literal(true),
  }).strict().optional(),
}).strict();
const benefit = z.object({
  record_reference: ref,
  paid_on: date,
  amount: money.refine((v) => v > 0),
  program_reference: ref,
  expense_allocations: z.array(
    z.object({ expense_reference: ref, amount: money.refine((v) => v > 0) })
      .strict(),
  ).max(1000),
}).strict();
/** Source preparation only. Executed return income/tax and the exclusion stage
 * must be bound separately before this workpaper can enter the public graph. */
export const adoptionSource2026Schema = investmentOwner2026.extend({
  wage_sources: z.array(w2Item2026Schema).max(100),
  claim: z.object({
    tax_year: z.literal(2026),
    record_reference: ref,
    reviewed_on: date,
    complete_child_expense_benefit_and_prior_claim_inventory_verified: z
      .literal(true),
    no_other_taxpayer_limit_allocation_or_unrelated_adoption_attempt_combination:
      z.literal(true),
    no_current_claim_expense_previously_used_for_credit_verified: z.literal(
      true,
    ),
    no_reimbursement_of_previously_credited_expenses_verified: z.literal(true),
    programs: z.array(program).max(100),
    separate_return_review: z.object({
      record_reference: ref,
      lived_apart_since: date,
      annual_home_cost: money,
      taxpayer_paid_home_cost: money,
      child_residence: z.array(
        z.object({
          child_reference: ref,
          days_in_home: z.number().int().min(0).max(365),
        }).strict(),
      ).max(100),
    }).strict().optional(),
    children: z.array(
      z.object({
        record_reference: ref,
        first_name: ref,
        last_name: ref,
        date_of_birth: date,
        identifying_number: tin,
        identifying_number_type: z.enum(["SSN", "ATIN", "ITIN"]),
        identity_document_reference: ref,
        origin: z.enum(["domestic", "foreign"]),
        effort_started_on: date,
        not_spouses_child_and_legal_nonsurrogacy_adoption_verified: z.literal(
          true,
        ),
        finalization: z.discriminatedUnion("kind", [
          z.object({
            kind: z.literal("not_final"),
            status_record_reference: ref,
          }).strict(),
          z.object({
            kind: z.literal("final"),
            finalized_on: date,
            decree_reference: ref,
            actual_return_parent_named_in_decree_verified: z.literal(true),
            foreign_finality_election_reference: ref.optional(),
          }).strict(),
        ]),
        disability: z.object({
          record_reference: ref,
          unable_to_care_for_self_since: date,
          physical_or_mental_incapacity_verified: z.literal(true),
        }).strict().optional(),
        special_needs: z.object({
          record_reference: ref,
          authority: z.enum(["state", "indian_tribal_government"]),
          determined_on: date,
          cannot_or_should_not_return_to_birth_parents_verified: z.literal(
            true,
          ),
          cannot_be_placed_without_assistance_verified: z.literal(true),
        }).strict().optional(),
        prior_form8839: z.object({
          source_document_reference: ref,
          form_copy_number: z.number().int().min(1).max(100),
          child_column: z.number().int().min(1).max(3),
          tax_year: z.number().int().min(1997).max(2025),
          parent_tin: tin,
          child_tin: tin,
          latest_filed_current_copy_and_no_intervening_claim_verified: z
            .literal(true),
          line3: whole,
          line6: whole,
          line20: whole,
          line24: whole,
        }).strict().optional(),
        no_prior_form8839_claim_verified: z.literal(true).optional(),
        expenses: z.array(
          z.object({
            record_reference: ref,
            receipt_reference: ref,
            payment_reference: ref,
            incurred_on: date,
            paid_on: date,
            amount: money.refine((v) => v > 0),
            paid_by: z.enum(["filer", "employer"]),
            owner_tin: tin,
            category: z.enum([
              "adoption_fee",
              "attorney_fee",
              "court_cost",
              "travel",
              "readoption",
            ]),
            directly_related_reasonable_necessary_and_no_other_federal_tax_use_verified:
              z.literal(true),
            other_reimbursements: z.array(
              z.object({
                record_reference: ref,
                paid_on: date,
                amount: money.refine((v) => v > 0),
                kind: z.enum(["public_funds", "other"]),
              }).strict(),
            ).max(100),
          }).strict(),
        ).max(1000),
        current_benefits: z.array(benefit).max(1000),
        prior_foreign_benefits: z.array(
          benefit.omit({ program_reference: true }).extend({
            tax_year: z.number().int().min(1997).max(2025),
            filed_return_reference: ref,
            wage_statement_reference: ref,
            actual_return_owner_tin: tin,
            benefits_previously_included_in_taxable_wages_and_not_excluded_verified:
              z.literal(true),
            qualified_employer_program_verified: z.literal(true),
          }),
        ).max(100),
        special_needs_program_reference: ref.optional(),
      }).strict(),
    ).max(100),
    carryforward: adoptionCarryforward2026Schema.optional(),
  }).strict(),
}).strict();
export type AdoptionSource2026 = z.input<typeof adoptionSource2026Schema>;
export function prepareAdoptionSources2026(raw: AdoptionSource2026) {
  const input = adoptionSource2026Schema.parse(raw), c = input.claim;
  if (c.reviewed_on < "2027-01-01") {
    throw Error("Adoption inventory needs a completed-year review");
  }
  const owners = new Set([
    input.taxpayer_ssn,
    ...(input.filing_status === FilingStatus.MFJ && input.spouse_ssn
      ? [input.spouse_ssn]
      : []),
  ]);
  if (
    input.filing_status === FilingStatus.MFJ &&
    (!input.spouse_ssn || input.spouse_ssn === input.taxpayer_ssn)
  ) throw Error("Joint adoption sources need distinct actual owners");
  const refs = new Set<string>(),
    unique = (r: string) => {
      if (refs.has(r)) throw Error("Adoption evidence reference is reused");
      refs.add(r);
    };
  unique(c.record_reference);
  const wages = new Map(
    input.wage_sources.map((w) => [w.source_document_reference, w]),
  );
  if (wages.size !== input.wage_sources.length) {
    throw Error("Adoption wages need distinct current source records");
  }
  const allocations = new Map<string, number[]>(),
    programs = new Map(c.programs.map((p) => [p.record_reference, p]));
  for (const p of c.programs) {
    unique(p.record_reference);
    if (p.personal_services_review) {
      unique(p.personal_services_review.record_reference);
    }
    const w = wages.get(p.wage_source_reference);
    if (
      !w || !owners.has(p.owner_tin) ||
      w.employee_ssn.replaceAll("-", "") !== p.owner_tin ||
      p.effective_from > p.effective_through ||
      p.effective_from > "2026-12-31" || p.effective_through < "2026-01-01"
    ) {
      throw Error(
        "Adoption program needs its actual owner W-2 and effective dates",
      );
    }
  }
  const sep = c.separate_return_review;
  if (sep) {
    unique(sep.record_reference);
    if (
      input.filing_status !== FilingStatus.MFS ||
      sep.lived_apart_since > "2026-07-01" ||
      sep.taxpayer_paid_home_cost <= sep.annual_home_cost / 2 ||
      sep.taxpayer_paid_home_cost > sep.annual_home_cost ||
      new Set(sep.child_residence.map((r) => r.child_reference)).size !==
        sep.child_residence.length ||
      sep.child_residence.some((r) =>
        !c.children.some((ch) => ch.record_reference === r.child_reference)
      )
    ) {
      throw Error(
        "Separate-return adoption exception needs actual living-apart, household-cost and child-residence facts",
      );
    }
  }
  const ids = new Set<string>();
  const priorDocuments = new Map<
    string,
    { tax_year: number; parent_tin: string; slots: Set<string> }
  >();
  const children = c.children.map((ch) => {
    unique(ch.record_reference);
    unique(ch.identity_document_reference);
    if (
      ids.has(ch.identifying_number) || owners.has(ch.identifying_number) ||
      ch.date_of_birth > "2026-12-31" || ch.effort_started_on > "2026-12-31"
    ) {
      throw Error(
        "Adoption child identity or chronology conflicts with this return",
      );
    }
    ids.add(ch.identifying_number);
    const final = ch.finalization.kind === "final"
      ? ch.finalization
      : undefined;
    if (final) {
      unique(final.decree_reference);
      if (
        final.finalized_on < ch.effort_started_on ||
        final.finalized_on < ch.date_of_birth ||
        final.finalized_on > "2026-12-31" ||
        (ch.origin === "foreign") !==
          !!final.foreign_finality_election_reference
      ) {
        throw Error(
          "Adoption finality must use the actual year and required foreign finality election",
        );
      }
      if (final.foreign_finality_election_reference) {
        unique(final.foreign_finality_election_reference);
      }
    } else if (ch.finalization.kind === "not_final") {
      unique(ch.finalization.status_record_reference);
    }
    const currentFinal = final?.finalized_on.startsWith("2026-") ?? false;
    if (ch.disability) {
      unique(ch.disability.record_reference);
      if (ch.disability.unable_to_care_for_self_since > "2026-12-31") {
        throw Error("Adoption disability evidence must cover the actual year");
      }
    }
    const eligibleAt = (day: string) =>
      day < addCalendarMonths(ch.date_of_birth, 216) ||
      !!ch.disability && ch.disability.unable_to_care_for_self_since <= day;
    if (ch.special_needs) {
      unique(ch.special_needs.record_reference);
      if (
        ch.origin !== "domestic" || !final ||
        ch.special_needs.determined_on > final.finalized_on ||
        !eligibleAt(final.finalized_on)
      ) {
        throw Error(
          "Special-needs adoption requires a domestic eligible child and timely government determination",
        );
      }
    }
    const prior = ch.prior_form8839;
    if (
      prior
        ? ch.no_prior_form8839_claim_verified
        : !ch.no_prior_form8839_claim_verified
    ) {
      throw Error(
        "Adoption prior history needs either the latest filed form or an explicit no-prior-claim review",
      );
    }
    if (prior) {
      let document = priorDocuments.get(prior.source_document_reference);
      if (!document) {
        unique(prior.source_document_reference);
        document = {
          tax_year: prior.tax_year,
          parent_tin: prior.parent_tin,
          slots: new Set(),
        };
        priorDocuments.set(prior.source_document_reference, document);
      }
      const slot = `${prior.form_copy_number}:${prior.child_column}`;
      if (
        document.tax_year !== prior.tax_year ||
        document.parent_tin !== prior.parent_tin || document.slots.has(slot)
      ) {
        throw Error(
          "Prior adoption document must have consistent ownership and distinct child positions",
        );
      }
      document.slots.add(slot);
      if (
        !owners.has(prior.parent_tin) ||
        prior.child_tin !== ch.identifying_number ||
        prior.tax_year < Number(ch.effort_started_on.slice(0, 4)) ||
        ch.origin === "foreign" && (!final || currentFinal)
      ) {
        throw Error(
          "Prior Form 8839 must match the actual child, parent and claim history",
        );
      }
    }
    const expenses = new Map(ch.expenses.map((e) => [e.record_reference, e])),
      funded = new Map<string, number[]>();
    const checkAllocations = (
      b: {
        record_reference: string;
        paid_on: string;
        amount: number;
        expense_allocations: { expense_reference: string; amount: number }[];
      },
    ) => {
      unique(b.record_reference);
      if (
        b.paid_on > c.reviewed_on ||
        new Set(b.expense_allocations.map((a) => a.expense_reference)).size !==
          b.expense_allocations.length
      ) {
        throw Error(
          "Adoption benefits need distinct expense allocations and completed payment evidence",
        );
      }
      const allocated = sumSourceMoney(
        b.expense_allocations.map((a) => a.amount),
      );
      if (
        allocated > b.amount ||
        allocated !== b.amount && !(ch.special_needs && currentFinal)
      ) {
        throw Error(
          "Adoption benefits must reconcile qualified expense allocations or actual special-needs finalization",
        );
      }
      for (const a of b.expense_allocations) {
        const e = expenses.get(a.expense_reference);
        if (
          !e || e.incurred_on > b.paid_on ||
          e.paid_by === "employer" && e.paid_on !== b.paid_on
        ) {
          throw Error(
            "Adoption benefit allocation needs its actual incurred expense",
          );
        }
        funded.set(a.expense_reference, [
          ...(funded.get(a.expense_reference) ?? []),
          a.amount,
        ]);
      }
    };
    for (const b of ch.current_benefits) {
      checkAllocations(b);
      const p = programs.get(b.program_reference);
      if (
        !p || !b.paid_on.startsWith("2026-") || b.paid_on < p.effective_from ||
        b.paid_on > p.effective_through
      ) {
        throw Error(
          "Current adoption benefits need their actual 2026 qualified employer program",
        );
      }
      allocations.set(p.wage_source_reference, [
        ...(allocations.get(p.wage_source_reference) ?? []),
        b.amount,
      ]);
    }
    for (const b of ch.prior_foreign_benefits) {
      checkAllocations(b);
      if (
        ch.origin !== "foreign" || !currentFinal ||
        !owners.has(b.actual_return_owner_tin) ||
        !b.paid_on.startsWith(`${b.tax_year}-`) ||
        b.paid_on < ch.effort_started_on
      ) {
        throw Error(
          "Prior foreign benefits require actual taxed payments and current-year finality",
        );
      }
    }
    const expenseRows = ch.expenses.map((e) => {
      unique(e.record_reference);
      unique(e.receipt_reference);
      unique(e.payment_reference);
      if (
        !owners.has(e.owner_tin) || e.incurred_on < ch.effort_started_on ||
        e.incurred_on > e.paid_on || e.paid_on > "2026-12-31" ||
        !eligibleAt(e.incurred_on)
      ) {
        throw Error(
          "Adoption expenses need the actual owner, eligible child and incurred/payment chronology",
        );
      }
      for (const r of e.other_reimbursements) {
        unique(r.record_reference);
        if (r.paid_on > c.reviewed_on || r.paid_on < ch.effort_started_on) {
          throw Error(
            "Adoption reimbursement chronology conflicts with review",
          );
        }
      }
      const employer = sumSourceMoney(funded.get(e.record_reference) ?? []),
        other = sumSourceMoney(e.other_reimbursements.map((r) => r.amount));
      if (
        sumSourceMoney([employer, other]) > e.amount ||
        e.paid_by === "employer" && employer !== e.amount
      ) {
        throw Error(
          "Adoption reimbursement or direct employer payment cannot be counted as a personal expense",
        );
      }
      const paidYear = Number(e.paid_on.slice(0, 4)),
        finalYear = final ? Number(final.finalized_on.slice(0, 4)) : undefined;
      const creditYear = ch.origin === "foreign"
        ? finalYear === undefined ? undefined : Math.max(finalYear, paidYear)
        : finalYear !== undefined && paidYear >= finalYear
        ? paidYear
        : paidYear + 1;
      return {
        source: e,
        employer_funded: employer,
        other_reimbursed: other,
        unreimbursed:
          (sourceCents(e.amount) - sourceCents(employer) - sourceCents(other)) /
          100,
        credit_year: creditYear,
      };
    });
    const eligibleCurrent = input.filing_status !== FilingStatus.MFS ||
      !!sep &&
        (sep.child_residence.find((r) =>
            r.child_reference === ch.record_reference
          )?.days_in_home ?? 0) > 182;
    const line2 = rules.maximumPerChild,
      line3 = (prior?.line3 ?? 0) + (prior?.line6 ?? 0),
      line4 = Math.max(0, line2 - line3);
    const currentExpenses = roundWholeDollars(
      sumSourceMoney(
        expenseRows.filter((e) => e.credit_year === 2026).map((e) =>
          e.unreimbursed
        ),
      ),
    );
    const line5 = ch.special_needs && currentFinal ? line4 : currentExpenses;
    const currentBenefits = sumSourceMoney(
        ch.current_benefits.map((b) => b.amount),
      ),
      priorBenefits = sumSourceMoney(
        ch.prior_foreign_benefits.map((b) => b.amount),
      );
    const foreignPrior = ch.prior_foreign_benefits.length > 0;
    const line22 = roundWholeDollars(
      sumSourceMoney([currentBenefits, priorBenefits]),
    );
    const line19 = foreignPrior
      ? Math.min(rules.maximumPerChild, line22)
      : rules.maximumPerChild;
    const line20 = foreignPrior
        ? 0
        : (prior?.line20 ?? 0) + (prior?.line24 ?? 0),
      line21 = Math.max(0, line19 - line20);
    if (line3 > line2 || line20 > line19) {
      throw Error(
        "Prior adoption credit or benefit usage exceeds the remaining per-child maximum",
      );
    }
    const specialProgram = ch.special_needs_program_reference
      ? programs.get(ch.special_needs_program_reference)
      : ch.special_needs && currentFinal
      ? ch.current_benefits.map((b) => programs.get(b.program_reference)).find((
        p,
      ) =>
        p && p.effective_from <= final!.finalized_on &&
        p.effective_through >= final!.finalized_on
      )
      : undefined;
    if (
      ch.special_needs_program_reference &&
      (!specialProgram || !ch.special_needs || !currentFinal ||
        final!.finalized_on < specialProgram.effective_from ||
        final!.finalized_on > specialProgram.effective_through)
    ) {
      throw Error(
        "Special-needs exclusion needs the actual employer program at finalization",
      );
    }
    const reportChild = eligibleCurrent &&
      (ch.origin === "domestic" || !!final);
    const line24 = eligibleCurrent && reportChild
      ? specialProgram ? line21 : Math.min(line21, line22)
      : 0;
    return {
      source: ch,
      expense_rows: expenseRows,
      eligible_current_claim: eligibleCurrent,
      report_child: reportChild,
      current_benefits: currentBenefits,
      special_needs_program_reference: specialProgram?.record_reference,
      prior_foreign_benefits: priorBenefits,
      partII: {
        line2,
        line3,
        line4,
        line5,
        line6: eligibleCurrent ? Math.min(line4, line5) : 0,
      },
      partIII: {
        line19,
        line20,
        line21,
        line22: reportChild ? line22 : 0,
        line24,
      },
      taxable_benefits_outside_partIII: reportChild
        ? 0
        : roundWholeDollars(currentBenefits),
    };
  });
  for (const [id, w] of wages) {
    const reported = sumSourceMoney(
      (w.box12_entries ?? []).filter((e) => e.code === "T").map((e) =>
        e.amount
      ),
    );
    if (
      reported !== sumSourceMoney(allocations.get(id) ?? []) ||
      reported > 0 && !owners.has(w.employee_ssn.replaceAll("-", ""))
    ) {
      throw Error(
        "Adoption benefits must allocate every actual W-2 code T amount exactly once",
      );
    }
  }
  const carry = c.carryforward;
  if (carry) {
    unique(carry.filed_2025_return_reference);
    if (!owners.has(carry.parent_tin)) {
      throw Error(
        "Adoption carryforward must belong to an actual return owner",
      );
    }
  }
  const carryforward = carry
    ? reconcileAdoptionCarryforward2026(carry, c.reviewed_on)
    : undefined;
  return {
    source_input: input,
    children,
    carryforward_origins: carryforward?.origins ?? [],
    carryforward_2025_adjustment: carryforward?.adjustment,
    current_code_t_benefits: sumSourceMoney(
      children.map((r) => r.current_benefits),
    ),
    partIII_line23: children.reduce((n, r) => n + r.partIII.line22, 0),
    prior_foreign_benefits: roundWholeDollars(
      sumSourceMoney(
        children.filter((r) => r.report_child).map((r) =>
          r.prior_foreign_benefits
        ),
      ),
    ),
    taxable_benefits_outside_partIII: children.reduce(
      (n, r) => n + r.taxable_benefits_outside_partIII,
      0,
    ),
  };
}
