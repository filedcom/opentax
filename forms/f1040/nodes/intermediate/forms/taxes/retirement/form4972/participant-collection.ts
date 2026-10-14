import { z } from "zod";
import { reconcileSharedParticipantElections } from "./participant-inventory.ts";

const reference = z.string().trim().min(1);
const exactDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((date) =>
  !Number.isNaN(Date.parse(date)) &&
  new Date(date).toISOString().slice(0, 10) === date
);
export const participantCollectionReviewSchema = z.object({
  role: z.enum(["participant", "beneficiary"]),
  participant_ssn: z.string().regex(/^\d{9}$/),
  recipient_ssn: z.string().regex(/^\d{9}$/),
  participant_birth_date: exactDate,
  participant_death_date: exactDate.optional(),
  eligibility_record_reference: reference,
  entitlement_record_reference: reference,
  election_history_record_reference: reference,
  no_prior_election_after_1986: z.literal(true),
  full_balance_statement_reference: reference,
  source_document_references: z.array(reference).min(1),
  attributable_federal_estate_tax: z.number().nonnegative().optional(),
  estate_tax_return_reference: reference.optional(),
  allowed_death_benefit_exclusion: z.number().nonnegative().optional(),
  death_benefit_record_reference: reference.optional(),
}).strict();

type Row = Readonly<Record<string, unknown>>;
export function needsParticipantCollection(forms: readonly Row[]): boolean {
  return forms.length > 2 || forms.length === 2 && (
        forms[0].recipient === forms[1].recipient ||
        forms.some((form) =>
          form.participant_collection_review !== undefined
        ) ||
        forms.some((form) => form.beneficiary_distribution === true) &&
          !forms.some((form) => Number(form.recipient_share_pct ?? 100) < 100)
      );
}

/** Complete recipient/participant groups; no copy count or participant ceiling. */
export function reconcileParticipantCollection(
  forms: readonly Row[],
  sources: readonly Row[],
  elections: readonly Row[],
  owners?: { taxpayer: string; spouse?: string },
): void {
  const groups = new Set<string>();
  for (const [index, form] of forms.entries()) {
    const refs = form.source_document_references;
    const match = (row: Row) =>
      Array.isArray(refs) &&
      Array.isArray(row.source_document_references) &&
      refs.length === row.source_document_references.length &&
      refs.every((ref) =>
        (row.source_document_references as unknown[]).includes(ref)
      );
    const source = sources.find(match), election = elections.find(match);
    const plan = source?.form4972_plan as Row | undefined;
    const recipient = source?.recipient_ssn;
    if (
      !source || !election || !plan ||
      typeof plan.participant_ssn !== "string" ||
      !/^\d{9}$/.test(plan.participant_ssn) ||
      typeof recipient !== "string" || !/^\d{9}$/.test(recipient) ||
      typeof plan.plan_reference !== "string" || !plan.plan_reference ||
      typeof plan.full_balance_statement_reference !== "string" ||
      !plan.full_balance_statement_reference ||
      plan.all_qualified_distributions_included !== true ||
      !election.participant_name || !election.participant_ssn ||
      !election.plan_reference ||
      election.participant_name !== plan.participant_name ||
      election.participant_ssn !== plan.participant_ssn ||
      election.plan_reference !== plan.plan_reference ||
      (form.recipient !== "T" && form.recipient !== "S") ||
      (form.beneficiary_distribution === true
        ? recipient === plan.participant_ssn
        : recipient !== plan.participant_ssn)
    ) {
      throw new Error(
        "Form4972 participant collection needs complete identified participant, issued recipient and elected plan groups",
      );
    }
    const review = participantCollectionReviewSchema.parse(
      form.participant_collection_review,
    );
    const beneficiary = form.beneficiary_distribution === true;
    const sourceRefs = Array.isArray(refs) ? refs : [];
    const records = [
      review.eligibility_record_reference,
      review.entitlement_record_reference,
      review.election_history_record_reference,
      review.full_balance_statement_reference,
      ...sourceRefs,
    ];
    if (
      review.participant_ssn !== plan.participant_ssn ||
      review.recipient_ssn !== recipient ||
      review.role !== (beneficiary ? "beneficiary" : "participant") ||
      review.participant_birth_date >= "1936-01-02" ||
      review.full_balance_statement_reference !==
        plan.full_balance_statement_reference ||
      review.source_document_references.length !== sourceRefs.length ||
      new Set(review.source_document_references).size !== sourceRefs.length ||
      review.source_document_references.some((ref) =>
        !sourceRefs.includes(ref)
      ) ||
      new Set(records).size !== records.length ||
      (beneficiary &&
        (!review.participant_death_date ||
          review.participant_death_date < review.participant_birth_date ||
          review.participant_death_date > "2025-12-31")) ||
      (!beneficiary && review.participant_death_date !== undefined) ||
      (Number(form.death_benefit_exclusion ?? 0) > 0 &&
        (review.participant_death_date! >= "1996-08-21" ||
          !review.death_benefit_record_reference ||
          review.allowed_death_benefit_exclusion !==
            form.death_benefit_exclusion)) ||
      (Number(form.federal_estate_tax ?? 0) > 0 &&
        (!review.estate_tax_return_reference ||
          review.attributable_federal_estate_tax !== form.federal_estate_tax))
    ) {
      throw new Error(
        "Form4972 participant collection eligibility, entitlement, complete source inventory or estate/death records conflict",
      );
    }
    const key = `${form.recipient}:${plan.participant_ssn}`;
    if (groups.has(key)) {
      throw new Error(
        "Form4972 participant collection must combine all distributions for each recipient and participant",
      );
    }
    groups.add(key);
    if (
      owners &&
      recipient !==
        (form.recipient === "T" ? owners.taxpayer : owners.spouse)?.replaceAll(
          "-",
          "",
        )
    ) {
      throw new Error(
        "Form4972 participant collection issued recipient differs from the filing owner",
      );
    }
    for (let other = 0; other < index; other++) {
      const previous = sources.find((row) => {
        const earlier = forms[other].source_document_references;
        return Array.isArray(earlier) &&
          Array.isArray(row.source_document_references) &&
          earlier.length === row.source_document_references.length &&
          earlier.every((ref) =>
            (row.source_document_references as unknown[]).includes(ref)
          );
      });
      const otherPlan = previous?.form4972_plan as Row | undefined;
      if (
        otherPlan?.participant_ssn === plan.participant_ssn
      ) {
        if (!previous) throw new Error("Missing prior participant source");
        const priorElection = elections.find((row) => {
          const earlier = forms[other].source_document_references;
          return Array.isArray(earlier) &&
            Array.isArray(row.source_document_references) &&
            earlier.length === row.source_document_references.length &&
            earlier.every((ref) =>
              (row.source_document_references as unknown[]).includes(ref)
            );
        });
        if (!priorElection) {
          throw new Error("Missing prior participant election");
        }
        reconcileSharedParticipantElections([previous, source], [
          priorElection,
          election,
        ]);
      }
    }
  }
}
