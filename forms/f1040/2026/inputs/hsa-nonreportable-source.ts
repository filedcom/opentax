import type { HsaFundingSources2026 } from "./hsa-funding-source.ts";
import {
  type HsaDistributionSources2026,
  reconcileHsaDistributions2026,
} from "./hsa-distribution-source.ts";
import {
  type HsaNonreportableReview2026,
  hsaNonreportableReview2026Schema,
} from "./hsa-nonreportable-schema.ts";
import { sourceCents } from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";

// Ordinary calendar-year deadline under section 7503, including the observed
// District of Columbia Emancipation Day. Disaster/combat relief is separate.
function repaymentDueOn(knowledgeDate: string) {
  const year = Number(knowledgeDate.slice(0, 4)) + 1;
  const due = new Date(Date.UTC(year, 3, 15));
  const holiday = new Date(Date.UTC(year, 3, 16));
  if (holiday.getUTCDay() === 6) holiday.setUTCDate(15);
  if (holiday.getUTCDay() === 0) holiday.setUTCDate(17);
  while (
    due.getUTCDay() === 6 || due.getUTCDay() === 0 ||
    due.getTime() === holiday.getTime()
  ) {
    due.setUTCDate(due.getUTCDate() + 1);
  }
  return due.toISOString().slice(0, 10);
}

/** Transfers and accepted mistake repayments are absent from 1099-SA gross,
 * not line-14b rollovers. Match both sides before publishing annual tax totals. */
export function reconcileHsaNonreportablePayments2026(
  funding: HsaFundingSources2026,
  rawReview: HsaNonreportableReview2026 | undefined,
  rawDistributions: HsaDistributionSources2026 | undefined,
) {
  const receipts = funding.claim.accounts.flatMap((a) =>
    a.receipts.flatMap((r) =>
      r.kind === "trustee_transfer" ||
        r.kind === "mistaken_distribution_repayment"
        ? [{ ...r, account: a }]
        : []
    )
  );
  if (!rawReview) {
    if (receipts.length || rawDistributions) {
      throw Error(
        "HSA transfers and mistake repayments need complete tax-treatment reconciliation",
      );
    }
    return [];
  }
  const review = hsaNonreportableReview2026Schema.parse(rawReview);
  if (!rawDistributions) {
    throw Error(
      "HSA nonreportable review needs the actual distribution ledger",
    );
  }
  const d = reconcileHsaDistributions2026(rawDistributions);
  if (
    funding.filing_status !== d.source_input.filing_status ||
    funding.taxpayer_ssn !== d.source_input.taxpayer_ssn ||
    funding.spouse_ssn !== d.source_input.spouse_ssn ||
    review.reviewed_on < funding.claim.reviewed_on ||
    review.reviewed_on < d.source_input.claim.reviewed_on
  ) {
    throw Error(
      "HSA nonreportable review must match the completed return source inventories",
    );
  }
  const key = (a: { trustee_tin: string; account_number: string }) =>
    `${a.trustee_tin}/${a.account_number}`;
  const used = new Set<string>();
  const corrections = new Map<string, { current: string; cents: number }>();
  const rows = d.accounts.flatMap((a) =>
    (a.nonreportable_payments ?? []).map((p) => {
      const source = funding.claim.accounts.find((v) => key(v) === key(a));
      if (
        !source || source.owner_tin !== a.owner_tin ||
        source.opened_on !== a.opened_on
      ) {
        throw Error(
          "HSA nonreportable debit needs the same actual owned funding account",
        );
      }
      const receiptReference = p.kind === "trustee_transfer"
        ? p.destination_receipt_reference
        : p.repayment_receipt_reference;
      const r = receipts.find((v) => v.record_reference === receiptReference);
      if (
        !r || used.has(r.record_reference) ||
        r.account.owner_tin !== a.owner_tin ||
        r.source_account_or_payment_reference !== p.record_reference ||
        r.record_reference === p.record_reference ||
        sourceCents(r.amount) !== sourceCents(p.amount) ||
        r.received_on < p.distributed_on || r.received_on > review.reviewed_on
      ) {
        throw Error(
          "HSA nonreportable debit and receipt must match owner, amount, dates and source exactly once",
        );
      }
      used.add(r.record_reference);
      let repaymentDeadline: string | undefined;
      if (p.kind === "trustee_transfer") {
        if (
          r.kind !== "trustee_transfer" ||
          r.originating_account_type !== "hsa" ||
          r.originating_owner_tin !== a.owner_tin || key(r.account) === key(a)
        ) {
          throw Error(
            "HSA direct transfer needs distinct same-beneficiary HSA accounts",
          );
        }
      } else {
        repaymentDeadline = repaymentDueOn(
          p.first_knew_or_should_have_known_on,
        );
        if (
          r.kind !== "mistaken_distribution_repayment" ||
          key(r.account) !== key(a) ||
          r.original_distribution_reference !== p.record_reference ||
          p.first_knew_or_should_have_known_on < p.distributed_on ||
          p.first_knew_or_should_have_known_on > r.received_on ||
          p.representation_signed_on < p.first_knew_or_should_have_known_on ||
          p.representation_signed_on > p.custodian_accepted_on ||
          p.custodian_accepted_on < r.received_on ||
          p.custodian_accepted_on > review.reviewed_on ||
          r.received_on > repaymentDeadline
        ) {
          throw Error(
            "HSA mistaken distribution needs a timely accepted same-account repayment and dated reasonable-cause evidence",
          );
        }
      }
      if (p.reporting.kind === "corrected") {
        // The statement lineage resolver already rejects cycles and conflicting
        // current copies. Here require this actual debit in the corrected delta.
        const reporting = p.reporting;
        const old = d.source_input.claim.copies.find((f) =>
          f.source_document_reference ===
            reporting.original_form1099sa_source_reference
        );
        const current = a.current_copies.find((f) =>
          f.source_document_reference ===
            reporting.current_form1099sa_source_reference
        );
        let ancestor = current;
        while (
          ancestor &&
          ancestor.source_document_reference !== old?.source_document_reference
        ) {
          ancestor = d.source_input.claim.copies.find((f) =>
            f.source_document_reference ===
              ancestor?.supersedes_document_reference
          );
        }
        if (
          !old || !current || !ancestor || old === current ||
          !d.retired_copy_references.includes(old.source_document_reference) ||
          old.issued_on < p.distributed_on ||
          current.issued_on <
            (p.kind === "mistaken_distribution"
              ? p.custodian_accepted_on
              : r.received_on) ||
          old.box5_account_type !== "hsa" ||
          current.box5_account_type !== "hsa" ||
          !["1", "3"].includes(old.box3_distribution_code) ||
          current.box3_distribution_code !== old.box3_distribution_code ||
          old.box2_earnings_on_excess !== current.box2_earnings_on_excess ||
          old.box4_fmv_on_death !== 0 || current.box4_fmv_on_death !== 0
        ) {
          throw Error(
            "HSA nonreportable payment needs its actual corrected 1099-SA lineage after transfer or accepted repayment",
          );
        }
        const held = corrections.get(old.source_document_reference);
        if (held && held.current !== current.source_document_reference) {
          throw Error(
            "HSA nonreportable corrections disagree on the current issued copy",
          );
        }
        corrections.set(old.source_document_reference, {
          current: current.source_document_reference,
          cents: (held?.cents ?? 0) + sourceCents(p.amount),
        });
      }
      return {
        ...p,
        owner_tin: a.owner_tin,
        source_account_reference: a.record_reference,
        destination_account_reference: r.account.record_reference,
        receipt_reference: r.record_reference,
        received_on: r.received_on,
        ...(repaymentDeadline ? { repayment_due_on: repaymentDeadline } : {}),
      };
    })
  );
  if (!rows.length || used.size !== receipts.length) {
    throw Error("HSA nonreportable inventory omits an actual debit or receipt");
  }
  const correctedCurrent = new Set<string>();
  for (const [oldRef, v] of corrections) {
    // One reviewed original-to-current delta per statement; intermediate
    // corrections remain in the lineage but cannot double-count the delta.
    if (correctedCurrent.has(v.current)) {
      throw Error(
        "HSA nonreportable correction deltas overlap the same current statement",
      );
    }
    correctedCurrent.add(v.current);
    const old = d.source_input.claim.copies.find((f) =>
      f.source_document_reference === oldRef
    )!;
    const current = d.current_copies.find((f) =>
      f.source_document_reference === v.current
    )!;
    if (
      sourceCents(old.box1_gross_distribution) -
          sourceCents(current.box1_gross_distribution) !== v.cents
    ) {
      throw Error(
        "HSA corrected gross must remove exactly the linked nonreportable debits",
      );
    }
  }
  return rows;
}
