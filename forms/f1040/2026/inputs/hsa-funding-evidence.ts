import { z } from "zod";
import { retirementCopy2026Schema } from "./retirement-statement.ts";
import type {
  hsaEligibility2025HistorySchema,
  hsaEligibility2026Schema,
} from "./hsa-eligibility.ts";
import type { CoverageType } from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";
import { verifyHsaFundingTransfers } from "../../nodes/intermediate/forms/adjustments/health/form8889/qualified-funding.ts";
import { hsaExactAmount } from "../../nodes/intermediate/forms/adjustments/health/form8889/exact-amount.ts";
import {
  isSourceMoney,
  sourceCents,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
const ref = z.string().trim().min(1),
  tin = z.string().regex(/^\d{9}$/),
  date = z.string().date();
const money = z.number().finite().nonnegative().max(10_000_000).refine(
  isSourceMoney,
);
export const hsaFundingReview2026Schema = z.object({
  record_reference: ref,
  reviewed_on: date,
  complete_current_ira_transfer_and_correction_inventory_verified: z.literal(
    true,
  ),
  owners: z.array(
    z.object({
      owner_tin: tin,
      lifetime_history_reference: ref,
      complete_lifetime_qualified_funding_history_reviewed: z.literal(true),
      prior_qualified_transfers: z.array(
        z.object({
          tax_year: z.number().int().min(2007).max(2025),
          filed_return_reference: ref,
          amount: money.refine((v) => v > 0),
        }).strict(),
      ).max(100),
    }).strict(),
  ).min(1).max(2),
  ira_accounts: z.array(
    z.object({
      record_reference: ref,
      owner_tin: tin,
      trustee_tin: tin,
      account_number: ref,
      ira_type: z.enum(["traditional", "roth", "sep", "simple"]),
      account_agreement_reference: ref,
      owned_or_maintained_for_identified_beneficiary_verified: z.literal(true),
      current_issued_copy_after_corrections_verified: z.literal(true),
      form1099r: retirementCopy2026Schema,
      // A SEP/SIMPLE plan is ongoing if employer contributions were made for
      // the plan year ending within 2026, even when the cash arrived later.
      employer_plan_year_review: z.object({
        record_reference: ref,
        plan_year_ends_on: date,
        employer_contributions_for_that_plan_year: money,
        complete_plan_year_employer_contribution_inventory_verified: z.literal(
          true,
        ),
      }).strict().optional(),
      ledger_reference: ref,
      complete_calendar_year_distribution_ledger_verified: z.literal(true),
      payments: z.array(
        z.object({
          record_reference: ref,
          custodian_transaction_identifier: ref,
          paid_on: date,
          gross_amount: money.refine((v) => v > 0),
          federal_withheld: money,
          hsa_receipt_reference: ref.optional(),
          transfer_election: z.object({
            record_reference: ref,
            requested_on: date,
            direct_trustee_payment_instruction_reference: ref,
            direct_trustee_transfer_verified: z.literal(true),
            coverage_continuity_reference: ref,
            household_first_day_facts_unchanged_through_transfer_verified: z
              .literal(true),
            separate_funding_testing_period_acknowledged: z.literal(true),
          }).strict().optional(),
        }).strict(),
      ).min(1).max(1000),
    }).strict(),
  ).min(1).max(100),
}).strict();

const historicalCopy = retirementCopy2026Schema.omit({
  box7c_trump_account: true,
  box7d_excess_contribution_earnings: true,
}).extend({
  tax_year: z.literal(2025),
  box11_first_roth_year: z.number().int().min(1998).max(2025).optional(),
}).strict();
export const hsaFundingReview2025Schema = hsaFundingReview2026Schema.extend({
  owners: z.array(hsaFundingReview2026Schema.shape.owners.element.extend({
    prior_qualified_transfers: z.array(
      hsaFundingReview2026Schema.shape.owners.element.shape
        .prior_qualified_transfers.element.extend({
          tax_year: z.number().int().min(2007).max(2024),
        }),
    ).max(100),
  })).min(1).max(2),
  ira_accounts: z.array(
    hsaFundingReview2026Schema.shape.ira_accounts.element.extend({
      form1099r: historicalCopy,
    }),
  ).min(1).max(100),
}).strict();

export type HsaFundingReceipt = {
  record_reference: string;
  owner_tin: string;
  amount: number;
  received_on: string;
  originating_ira_type: "traditional" | "roth" | "sep" | "simple";
  ira_distribution_source_reference: string;
  source_account_or_payment_reference: string;
  hsa_account_reference: string;
};
type Eligibility =
  | z.output<typeof hsaEligibility2026Schema>
  | z.output<typeof hsaEligibility2025HistorySchema>;
/** Reconcile actual dated IRA payments and HSA receipts using contribution-year
 * eligibility. Annual deductions and IRA basis are settled by the caller. */
export function reconcileHsaFundingSources<Year extends 2025 | 2026>(
  year: Year,
  reviewed:
    | z.output<typeof hsaFundingReview2026Schema>
    | z.output<typeof hsaFundingReview2025Schema>,
  receipts: HsaFundingReceipt[],
  source: {
    taxpayer_ssn: string;
    claim: { reviewed_on: string };
    household_eligibility: { owners: Eligibility[] };
  },
  owners: {
    owner_tin: string;
    actual_eligible_hdhp_coverage_by_month: (CoverageType | null)[];
  }[],
  rules: { selfOnlyLimit: number; familyLimit: number; catchupLimit: number },
) {
  if (
    reviewed.ira_accounts.some((a) => a.form1099r.tax_year !== year) ||
    source.household_eligibility.owners.some((o) => o.tax_year !== year)
  ) {
    throw Error(
      "HSA funding statements and eligibility must retain their actual contribution year",
    );
  }
  if (reviewed.reviewed_on < source.claim.reviewed_on) {
    throw Error("HSA IRA review predates the completed funding inventory");
  }
  const ids = [...new Set(receipts.map((r) => r.owner_tin))];
  if (
    reviewed.owners.length !== ids.length ||
    new Set(reviewed.owners.map((o) => o.owner_tin)).size !== ids.length ||
    reviewed.owners.some((o) => !ids.includes(o.owner_tin))
  ) {
    throw Error(
      "HSA lifetime reviews must identify each actual IRA transfer owner exactly once",
    );
  }
  if (reviewed.owners.some((o) => o.prior_qualified_transfers.length)) {
    throw Error(
      "HSA qualified funding election was already used in an earlier year",
    );
  }
  const refs = new Set<string>(),
    receiptRefs = new Set<string>(),
    accounts = new Set<string>();
  const unique = (value: string) => {
    if (refs.has(value)) {
      throw Error("HSA IRA evidence repeats a record or issued statement");
    }
    refs.add(value);
  };
  unique(reviewed.record_reference);
  for (const owner of reviewed.owners) unique(owner.lifetime_history_reference);
  const transfers = reviewed.ira_accounts.flatMap((a) => {
    const f = a.form1099r;
    unique(a.record_reference);
    unique(f.source_document_reference);
    const accountKey = `${a.owner_tin}/${a.trustee_tin}/${a.account_number}`;
    if (accounts.has(accountKey)) {
      throw Error(
        "HSA IRA funding repeats an account's current issued statement",
      );
    }
    accounts.add(accountKey);
    const recipient = a.owner_tin === source.taxpayer_ssn
      ? "taxpayer"
      : "spouse";
    if (
      !ids.includes(a.owner_tin) || f.recipient !== recipient ||
      f.recipient_tin.replaceAll("-", "") !== a.owner_tin ||
      f.payer_tin !== a.trustee_tin || f.account_number !== a.account_number
    ) {
      throw Error(
        "HSA funding IRA statement, account and recipient must match the transfer owner",
      );
    }
    if (
      f.corrected !== (f.supersedes_document_reference !== undefined) ||
      f.supersedes_document_reference === f.source_document_reference
    ) {
      throw Error(
        "HSA funding needs consistent current IRA correction evidence",
      );
    }
    const codes: readonly string[] = a.ira_type === "roth"
      ? ["J", "Q", "T"]
      : ["1", "2", "3", "4", "7", "S"];
    if (
      f.box7a_distribution_codes.length !== 1 ||
      !codes.includes(f.box7a_distribution_codes[0]) ||
      (f.box7a_distribution_codes[0] === "S" && a.ira_type !== "simple") ||
      (a.ira_type !== "roth" && !f.box7b_ira_sep_simple) ||
      ("box7c_trump_account" in f && f.box7c_trump_account) ||
      f.box3_capital_gain || f.box6_nua ||
      ("box7d_excess_contribution_earnings" in f &&
        f.box7d_excess_contribution_earnings) ||
      f.box8a_other_amount ||
      f.box10_irr_within_five_years ||
      (f.box2a_taxable_amount ?? 0) > f.box1_gross_distribution
    ) {
      throw Error(
        "HSA funding needs an ordinary IRA distribution statement consistent with its account type",
      );
    }
    const plan = a.employer_plan_year_review;
    if ((a.ira_type === "sep" || a.ira_type === "simple") !== !!plan) {
      throw Error(
        "HSA SEP/SIMPLE funding requires the employer plan-year contribution inventory",
      );
    }
    if (
      plan &&
      (!plan.plan_year_ends_on.startsWith(`${year}-`) ||
        plan.employer_contributions_for_that_plan_year !== 0)
    ) throw Error("HSA funding cannot come from an ongoing SEP or SIMPLE IRA");
    const transactionIds = new Set<string>();
    let gross = 0, withheld = 0;
    const rows = a.payments.flatMap((p) => {
      unique(p.record_reference);
      if (transactionIds.has(p.custodian_transaction_identifier)) {
        throw Error("HSA IRA ledger repeats a custodian transaction");
      }
      transactionIds.add(p.custodian_transaction_identifier);
      if (
        !p.paid_on.startsWith(`${year}-`) || p.federal_withheld > p.gross_amount
      ) {
        throw Error(
          "HSA IRA ledger must contain valid actual contribution-year distributions",
        );
      }
      gross += sourceCents(p.gross_amount);
      withheld += sourceCents(p.federal_withheld);
      if (!p.hsa_receipt_reference) {
        if (p.transfer_election) {
          throw Error("HSA transfer election has no destination receipt");
        }
        return [];
      }
      const r = receipts.find((r) =>
          r.record_reference === p.hsa_receipt_reference
        ),
        e = p.transfer_election;
      if (
        !r || !e || receiptRefs.has(r.record_reference) ||
        r.owner_tin !== a.owner_tin || r.originating_ira_type !== a.ira_type ||
        r.ira_distribution_source_reference !== f.source_document_reference ||
        r.source_account_or_payment_reference !== p.record_reference ||
        sourceCents(r.amount) !== sourceCents(p.gross_amount) ||
        p.federal_withheld !== 0
      ) {
        throw Error(
          "HSA IRA payment must match one actual owner receipt, amount and direct-transfer election",
        );
      }
      unique(e.record_reference);
      receiptRefs.add(r.record_reference);
      if (
        e.requested_on > p.paid_on || p.paid_on > r.received_on ||
        p.paid_on.slice(0, 7) !== r.received_on.slice(0, 7)
      ) {
        throw Error(
          "HSA IRA transfer dates need same-month payment and receipt without prior-year designation",
        );
      }
      const month = Number(p.paid_on.slice(5, 7));
      const owner = owners.find((o) => o.owner_tin === a.owner_tin)!;
      // First-day coverage is sourced separately. A continuity review cannot
      // override a policy/arrangement starting or ending before the transfer.
      const first = p.paid_on.slice(0, 7) + "-01";
      for (const h of source.household_eligibility.owners) {
        for (
          const plan of [...h.plans, ...h.direct_primary_care_arrangements]
        ) {
          const active = (d: string) =>
            plan.effective_from <= d && plan.effective_through >= d;
          if (
            active(first) !== active(p.paid_on) ||
            active(first) !== active(r.received_on) ||
            (plan.effective_from > first &&
              plan.effective_from <= r.received_on) ||
            (plan.effective_through >= first &&
              plan.effective_through < r.received_on)
          ) {
            throw Error(
              "HSA transfer coverage changed after the month's eligibility review",
            );
          }
        }
      }
      return [{
        owner_tin: a.owner_tin,
        amount: r.amount,
        month,
        coverage: owner.actual_eligible_hdhp_coverage_by_month[month - 1],
        source_reference: p.record_reference,
        receipt_reference: r.record_reference,
        ira_statement_reference: f.source_document_reference,
        hsa_account_reference: r.hsa_account_reference,
        paid_on: p.paid_on,
        received_on: r.received_on,
        testing_period: {
          starts_on: r.received_on.slice(0, 7) + "-01",
          ends_on: new Date(Date.UTC(year + 1, month, 0)).toISOString().slice(
            0,
            10,
          ),
          contribution_year: year,
          amount: r.amount,
          election_reference: e.record_reference,
        },
      }];
    });
    if (
      !rows.length || gross !== sourceCents(f.box1_gross_distribution) ||
      withheld !== sourceCents(f.box4_federal_withheld)
    ) {
      throw Error(
        "HSA IRA funding ledger must reconcile its entire issued gross distribution and withholding",
      );
    }
    return rows;
  });
  if (receiptRefs.size !== receipts.length) {
    throw Error("HSA IRA funding inventory omits a current receipt");
  }
  return ids.map((owner_tin) => {
    const eligibility = source.household_eligibility.owners.find((o) =>
      o.owner_tin === owner_tin
    )!;
    const held = transfers.filter((t) => t.owner_tin === owner_tin).sort((
      a,
      b,
    ) => a.paid_on.localeCompare(b.paid_on));
    const checked = verifyHsaFundingTransfers(
      held.map((t) => ({ ...t, amount: sourceCents(t.amount) })),
      eligibility.owner_dob <= `${year - 54}-01-01`,
      rules.selfOnlyLimit * 100,
      rules.familyLimit * 100,
      rules.catchupLimit * 100,
    );
    return {
      owner_tin,
      amount: hsaExactAmount(checked.total, 100),
      transfers: held,
    };
  });
}
