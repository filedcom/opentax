import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import type { calculateForeignBankInterest2026 } from "./foreign-bank-interest.ts";

const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const evidence = z.object({
  document_reference: ref,
  document_sha256: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();
const account = z.object({
  record_reference: ref,
  institution_name: ref,
  account_number: ref,
  country_name: z.string().trim().min(1).max(90).regex(/^[\x20-\x7e]+$/),
  subject_tin: tin,
  relationship: z.enum(["financial_interest", "signature_authority", "both"]),
  relationship_started_on: z.string().date(),
  relationship_ended_on: z.string().date().optional(),
  location_and_relationship_document: evidence,
  physically_outside_us_under_fbar_definition_verified: z.literal(true),
  income_review: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("no_reportable_income"),
      no_income_reportable_by_subject_from_this_account_verified: z.literal(
        true,
      ),
      source_document: evidence,
    }).strict(),
    z.object({
      kind: z.literal("issued_1099_copies"),
      source_references: z.array(ref).min(1),
      all_reportable_income_in_these_copies_verified: z.literal(true),
      source_document: evidence,
    }).strict(),
    z.object({
      kind: z.literal("foreign_bank_interest_statements"),
      source_references: z.array(ref).min(1),
      all_reportable_income_in_these_statements_verified: z.literal(true),
      source_document: evidence,
    }).strict(),
  ]),
}).strict();

/** Reviewed Schedule B facts, not an FBAR calculation, filing or Form 8938. */
export const foreignAccountReview2026Schema = z.object({
  tax_year: z.literal(2026),
  record_reference: ref,
  reviewed_on: z.string().date(),
  reviewer_reference: ref,
  complete_year_account_and_signature_authority_inventory_reviewed: z.literal(
    true,
  ),
  no_form8814_child_account_reporting: z.literal(true),
  accounts: z.array(account).min(1),
  // Separate conclusions for both joint filers, including a spouse with no accounts.
  fbar_reviews: z.array(
    evidence.extend({
      subject_tin: tin,
      required: z.boolean(),
      determination_explanation: ref,
      complete_account_inventory_values_and_filing_exceptions_reviewed: z
        .literal(true),
    }).strict(),
  ).min(1).max(2),
}).strict();

export function prepareForeignAccounts2026(
  raw: z.input<typeof foreignAccountReview2026Schema>,
  owner: {
    filing_status: FilingStatus;
    taxpayer_ssn: string;
    spouse_ssn?: string;
  },
  copies: {
    reference: string;
    recipient_tin: string;
    account_number: string;
  }[],
  bankInterest?: ReturnType<typeof calculateForeignBankInterest2026>,
) {
  const input = foreignAccountReview2026Schema.parse(raw);
  if (input.reviewed_on < "2026-12-31") {
    throw new Error("Foreign account inventory needs a completed 2026 review");
  }
  const subjects = [owner.taxpayer_ssn];
  if (owner.filing_status === FilingStatus.MFJ) {
    if (!owner.spouse_ssn || owner.spouse_ssn === owner.taxpayer_ssn) {
      throw new Error(
        "Joint foreign account review needs two distinct actual filers",
      );
    }
    subjects.push(owner.spouse_ssn);
  }
  if (
    input.fbar_reviews.length !== subjects.length ||
    subjects.some((tin) =>
      input.fbar_reviews.filter((r) => r.subject_tin === tin).length !== 1
    )
  ) {
    throw new Error(
      "FBAR reviews must identify each actual return filer exactly once",
    );
  }
  const records = new Set([input.record_reference]),
    accounts = new Set<string>();
  const documents = new Map<string, string>(), boundCopies = new Set<string>();
  const boundLedgers = new Set<string>();
  const checkDocument = (document: z.infer<typeof evidence>) => {
    const previous = documents.get(document.document_reference);
    if (previous && previous !== document.document_sha256) {
      throw new Error(
        "Foreign account document reference has conflicting hashes",
      );
    }
    documents.set(document.document_reference, document.document_sha256);
  };
  for (const review of input.fbar_reviews) checkDocument(review);
  for (const document of bankInterest?.documents ?? []) checkDocument(document);
  for (const row of input.accounts) {
    if (!subjects.includes(row.subject_tin)) {
      throw new Error("Foreign account subject must be an actual return filer");
    }
    if (
      row.relationship_started_on > "2026-12-31" ||
      (row.relationship_ended_on && (row.relationship_ended_on < "2026-01-01" ||
        row.relationship_ended_on < row.relationship_started_on))
    ) throw new Error("Foreign account relationship must overlap 2026");
    const key = JSON.stringify([
      row.subject_tin,
      row.institution_name.toLowerCase(),
      row.account_number,
    ]);
    if (records.has(row.record_reference) || accounts.has(key)) {
      throw new Error(
        "Duplicate foreign account source or subject/account relationship",
      );
    }
    records.add(row.record_reference);
    accounts.add(key);
    checkDocument(row.location_and_relationship_document);
    checkDocument(row.income_review.source_document);
    if (row.income_review.kind === "issued_1099_copies") {
      for (const reference of row.income_review.source_references) {
        const matches = copies.filter((copy) => copy.reference === reference);
        if (
          matches.length !== 1 ||
          matches[0].recipient_tin !== row.subject_tin ||
          matches[0].account_number !== row.account_number ||
          boundCopies.has(reference)
        ) {
          throw new Error(
            "Foreign account income must bind once to its actual owner/account source copy",
          );
        }
        boundCopies.add(reference);
      }
    } else if (row.income_review.kind === "foreign_bank_interest_statements") {
      if (row.relationship === "signature_authority") {
        throw new Error(
          "Reportable bank interest needs the recipient's financial interest in the account",
        );
      }
      for (const reference of row.income_review.source_references) {
        const matches = bankInterest?.ledgers.filter((l) =>
          l.source_input.record_reference === reference
        ) ?? [];
        const ledger = matches[0]?.source_input;
        if (
          matches.length !== 1 || !ledger || boundLedgers.has(reference) ||
          ledger.foreign_account_reference !== row.record_reference ||
          ledger.recipient_tin !== row.subject_tin ||
          ledger.account_number !== row.account_number ||
          ledger.institution_name.toLowerCase() !==
            row.institution_name.toLowerCase() ||
          ledger.country_name.toLowerCase() !== row.country_name.toLowerCase()
        ) {
          throw new Error(
            "Foreign bank interest must bind once to its actual account, institution and owner",
          );
        }
        if (
          ledger.receipts.some((r) =>
            r.received_or_available_on < row.relationship_started_on ||
            (row.relationship_ended_on &&
              r.received_or_available_on > row.relationship_ended_on)
          )
        ) {
          throw new Error(
            "Foreign interest receipt falls outside the recipient's account relationship",
          );
        }
        if (ledger.reviewed_on > input.reviewed_on) {
          throw new Error(
            "Account review cannot predate its bank interest reconciliation",
          );
        }
        if (
          copies.some((copy) =>
            copy.recipient_tin === row.subject_tin &&
            copy.account_number === row.account_number
          )
        ) {
          throw new Error(
            "Foreign bank account also has an issued income copy; reconcile duplicate source coverage first",
          );
        }
        boundLedgers.add(reference);
      }
    } else if (
      copies.some((copy) =>
        copy.recipient_tin === row.subject_tin &&
        copy.account_number === row.account_number
      )
    ) {
      throw new Error(
        "No-reportable-income review conflicts with an issued account copy",
      );
    }
  }
  if (
    (bankInterest?.ledgers ?? []).some((l) =>
      !boundLedgers.has(l.source_input.record_reference)
    )
  ) {
    throw new Error(
      "Every foreign bank interest ledger needs its matching account income review",
    );
  }
  for (const review of input.fbar_reviews) {
    if (
      review.required &&
      !input.accounts.some((a) => a.subject_tin === review.subject_tin)
    ) {
      throw new Error("Required FBAR review needs an account for that filer");
    }
  }
  const required = input.fbar_reviews.some((r) => r.required);
  const names = new Map<string, string>();
  for (const row of input.accounts) {
    names.set(row.country_name.toLowerCase(), row.country_name);
  }
  if (names.size > 25) {
    throw new Error(
      "More than 25 foreign countries needs a separate disclosure route",
    );
  }
  return {
    source_input: input,
    foreign_accounts_question: true as const,
    fincen_form114_required: required,
    foreign_countries: required
      ? [...names.values()].map((name) => ({ name }))
      : [],
    // FBAR is filed separately; this result neither files it nor establishes compliance.
    fbar_filing_status: "not_established" as const,
  };
}
