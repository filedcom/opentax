import { z } from "zod";
import type { HsaFundingSources2026 } from "./hsa-funding-source.ts";
import {
  type HsaDistributionSources2026,
  hsaDistributionSources2026Schema,
  reconcileHsaDistributions2026,
} from "./hsa-distribution-source.ts";
import { hsaRolloverElapsedDays } from "../../nodes/intermediate/forms/adjustments/health/form8889/rollover-timing.ts";
import {
  isSourceMoney,
  sourceCents,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
import { addCalendarMonths } from "./retirement-statement.ts";
const ref = z.string().trim().min(1),
  date = z.string().date(),
  tin = z.string().regex(/^\d{9}$/);
const money = z.number().positive().finite().max(10_000_000).refine(
  isSourceMoney,
);
export const hsaRolloverReview2026Schema = z.object({
  record_reference: ref,
  reviewed_on: date,
  ordinary_60_day_deadline_no_waiver_or_postponement_claimed: z.literal(true),
  complete_current_and_cross_year_rollover_inventory_verified: z.literal(true),
  // Section 223(f)(5)(B) tests distributions received by the beneficiary across
  // all HSAs, not merely contributions to this destination account.
  owners: z.array(
    z.object({
      owner_tin: tin,
      history_reference: ref,
      history_from: z.literal("2025-01-01"),
      history_through: z.literal("2026-12-31"),
      all_owned_hsa_rollover_distributions_across_custodians_reviewed: z
        .literal(true),
      prior_tax_free_rollovers: z.array(
        z.object({
          record_reference: ref,
          distribution_received_on: date,
          source_trustee_tin: tin,
          source_account_number: ref,
          source_payment_reference: ref,
          source_statement_reference: ref,
          destination_receipt_reference: ref,
          deposited_on: date,
          amount: money,
          filed_return_reference: ref,
          qualified_under_223f5_on_latest_filed_return_verified: z.literal(
            true,
          ),
        }).strict(),
      ).max(100),
    }).strict(),
  ).min(1).max(2),
  rollovers: z.array(
    z.object({
      record_reference: ref,
      owner_tin: tin,
      distribution_payment_reference: ref,
      destination_receipt_reference: ref,
      beneficiary_received_cash_before_redeposit_verified: z.literal(true),
      custodian_rollover_acceptance_reference: ref,
    }).strict(),
  ).min(1).max(100),
}).strict();
export type HsaRolloverReview2026 = z.input<typeof hsaRolloverReview2026Schema>;

/** Join actual dated payouts and reported rollover receipts before allowing
 * line 14b. This route covers 2026 HSA payouts deposited in 2026/2027 in an
 * inventoried HSA; prior-origin payouts/MSA sources require their own ledger. */
export function reconcileHsaRollovers2026(
  funding: HsaFundingSources2026,
  rawReview: HsaRolloverReview2026 | undefined,
  rawDistributions: HsaDistributionSources2026 | undefined,
) {
  const receipts = funding.claim.accounts.flatMap((a) =>
    a.receipts.flatMap((r) =>
      r.kind === "reported_rollover" ? [{ ...r, account: a }] : []
    )
  );
  if (!rawReview) {
    if (
      receipts.some((r) =>
        r.received_on.startsWith("2026-") ||
        r.distribution_received_on.startsWith("2026-")
      ) || rawDistributions
    ) {
      throw Error(
        "HSA reported rollovers need actual distribution and rollover history reconciliation",
      );
    }
    return [];
  }
  const review = hsaRolloverReview2026Schema.parse(rawReview);
  if (!rawDistributions) {
    throw Error(
      "HSA rollover review needs the actual current distribution inventory",
    );
  }
  const d = reconcileHsaDistributions2026(
    hsaDistributionSources2026Schema.parse(rawDistributions),
  );
  if (
    d.source_input.filing_status !== funding.filing_status ||
    d.source_input.taxpayer_ssn !== funding.taxpayer_ssn ||
    d.source_input.spouse_ssn !== funding.spouse_ssn ||
    review.reviewed_on < funding.claim.reviewed_on ||
    review.reviewed_on < d.source_input.claim.reviewed_on
  ) {
    throw Error(
      "HSA rollover review must match the return and completed source inventories",
    );
  }
  const active = receipts.filter((r) =>
    r.received_on.startsWith("2026-") ||
    r.distribution_received_on.startsWith("2026-")
  );
  const owners = [...new Set(active.map((r) => r.account.owner_tin))];
  if (
    review.owners.length !== owners.length ||
    new Set(review.owners.map((o) => o.owner_tin)).size !== owners.length ||
    review.owners.some((o) => !owners.includes(o.owner_tin))
  ) {
    throw Error(
      "HSA rollover history must cover every rollover beneficiary once",
    );
  }
  const records = new Set<string>(), usedReceipts = new Set<string>();
  const unique = (value: string) => {
    if (records.has(value)) {
      throw Error("HSA rollover evidence repeats a source record");
    }
    records.add(value);
  };
  unique(review.record_reference);
  for (const owner of review.owners) {
    unique(owner.history_reference);
    for (const p of owner.prior_tax_free_rollovers) {
      unique(p.record_reference);
      unique(p.source_payment_reference);
      unique(p.destination_receipt_reference);
      if (!p.distribution_received_on.startsWith("2025-")) {
        throw Error(
          "HSA prior rollover history needs actual 2025 payout dates",
        );
      }
      hsaRolloverElapsedDays(p.distribution_received_on, p.deposited_on);
      if (p.deposited_on > review.reviewed_on) {
        throw Error("HSA rollover history cannot use a future redeposit");
      }
    }
  }
  const rows = review.rollovers.map((v) => {
    unique(v.record_reference);
    const r = active.find((r) =>
      r.record_reference === v.destination_receipt_reference
    );
    const account = d.accounts.find((a) =>
      a.payments.some((p) =>
        p.record_reference === v.distribution_payment_reference
      )
    );
    const p = account?.payments.find((p) =>
      p.record_reference === v.distribution_payment_reference
    );
    const form = account?.current_copies.find((c) =>
      c.source_document_reference === p?.form1099sa_source_reference
    );
    if (!r || !account || !p || !form || usedReceipts.has(r.record_reference)) {
      throw Error(
        "HSA rollover must identify one actual payout and each redeposit exactly once",
      );
    }
    usedReceipts.add(r.record_reference);
    if (
      v.owner_tin !== r.account.owner_tin ||
      v.owner_tin !== account.owner_tin ||
      r.originating_owner_tin !== v.owner_tin ||
      r.originating_account_type !== "hsa" ||
      r.originating_distribution_reference !== p.record_reference ||
      r.distribution_received_on !== p.distributed_on ||
      !["1", "3"].includes(form.box3_distribution_code) ||
      form.box5_account_type !== "hsa" || form.box4_fmv_on_death !== 0 ||
      p.earnings_on_excess !== 0 ||
      r.received_on > review.reviewed_on ||
      r.record_reference === p.record_reference
    ) {
      throw Error(
        "HSA rollover source identity, payout classification, dates or receipt linkage disagree",
      );
    }
    const days = hsaRolloverElapsedDays(p.distributed_on, r.received_on);
    const history = review.owners.find((o) => o.owner_tin === v.owner_tin)!;
    for (const prior of history.prior_tax_free_rollovers) {
      if (
        prior.source_payment_reference === p.record_reference ||
        prior.destination_receipt_reference === r.record_reference
      ) {
        throw Error(
          "HSA prior and current rollovers need distinct source records",
        );
      }
      if (
        p.distributed_on < addCalendarMonths(prior.distribution_received_on, 12)
      ) {
        throw Error(
          "HSA beneficiary already used a tax-free rollover within one year across owned HSAs",
        );
      }
    }
    return {
      ...v,
      distributed_on: p.distributed_on,
      deposited_on: r.received_on,
      amount: r.amount,
      elapsed_days: days,
      next_rollover_distribution_on_or_after: addCalendarMonths(
        p.distributed_on,
        12,
      ),
      source_account_reference: account.record_reference,
      destination_account_reference: r.account.record_reference,
      form1099sa_source_reference: p.form1099sa_source_reference,
      gross_payment: p.gross_amount,
    };
  });
  if (usedReceipts.size !== active.length) {
    throw Error("HSA rollover inventory omits an actual reported redeposit");
  }
  const payouts = new Map<string, typeof rows>();
  for (const row of rows) {
    const held = payouts.get(row.distribution_payment_reference) ?? [];
    held.push(row);
    payouts.set(row.distribution_payment_reference, held);
  }
  for (const held of payouts.values()) {
    if (
      held.reduce((n, v) => n + sourceCents(v.amount), 0) >
        sourceCents(held[0].gross_payment)
    ) throw Error("HSA rollover redeposits exceed their actual payout");
  }
  for (const owner of owners) {
    const payments = [...payouts.values()].map((v) => v[0]).filter((v) =>
      v.owner_tin === owner
    ).sort((a, b) => a.distributed_on.localeCompare(b.distributed_on));
    for (let i = 1; i < payments.length; i++) {
      if (
        payments[i].distributed_on <
          addCalendarMonths(payments[i - 1].distributed_on, 12)
      ) {
        throw Error(
          "HSA beneficiary cannot roll over two distributions within one year across owned HSAs",
        );
      }
    }
  }
  return rows;
}
