import { z } from "zod";
import { hsaNonreportablePayment2026Schema } from "./hsa-nonreportable-schema.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { investmentOwner2026 } from "./investment-source.ts";
import {
  isSourceMoney,
  sourceCents,
  sumSourceMoney,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
const ref = z.string().trim().min(1), date = z.string().date();
const tin = z.string().regex(/^\d{9}$/);
const money = z.number().finite().nonnegative().max(10_000_000).refine(
  isSourceMoney,
);

export const hsaDistributionCopy2026Schema = z.object({
  tax_year: z.literal(2026),
  source_document_reference: ref,
  issued_on: date,
  statement_identifier: ref,
  corrected: z.boolean(),
  supersedes_document_reference: ref.optional(),
  current_copy_review_reference: ref,
  trustee_name: ref,
  trustee_tin: tin,
  owner_tin: tin,
  recipient_tin: z.string().regex(/^(\d{9}|\d{3}-\d{2}-\d{4}|XXX-XX-\d{4})$/),
  recipient_identity_review_reference: ref,
  account_number: ref,
  box1_gross_distribution: money,
  box2_earnings_on_excess: money,
  box3_distribution_code: z.enum(["1", "2", "3", "4", "5", "6"]),
  box4_fmv_on_death: money,
  box5_account_type: z.enum(["hsa", "archer_msa", "medicare_advantage_msa"]),
}).strict();
export const hsaDistributionClaim2026Schema = z.object({
  tax_year: z.literal(2026),
  record_reference: ref,
  reviewed_on: date,
  complete_statement_correction_and_payment_inventory_verified: z.literal(true),
  no_death_inherited_account_prohibited_transaction_or_pledge_verified: z
    .literal(true),
  copies: z.array(hsaDistributionCopy2026Schema).max(300),
  accounts: z.array(
    z.object({
      record_reference: ref,
      owner_tin: tin,
      trustee_tin: tin,
      account_number: ref,
      account_agreement_reference: ref,
      opened_on: date,
      // A later trustee account can retain the beneficiary's earlier establishment
      // date only with its actual continuity/establishment evidence.
      hsa_established_on: date,
      establishment_record_reference: ref,
      ledger_statement_reference: ref,
      ledger_from: z.literal("2026-01-01"),
      ledger_through: z.literal("2026-12-31"),
      complete_reportable_payment_inventory_verified: z.literal(true),
      no_unreconciled_mistaken_distribution_or_trustee_transfer_verified: z
        .literal(true),
      nonreportable_payments: z.array(hsaNonreportablePayment2026Schema).max(
        10000,
      ).optional(),
      payments: z.array(
        z.object({
          record_reference: ref,
          custodian_transaction_identifier: ref,
          form1099sa_source_reference: ref,
          distributed_on: date,
          gross_amount: money.refine((v) => v > 0),
          earnings_on_excess: money,
        }).strict(),
      ).max(10000),
    }).strict(),
  ).min(1).max(100),
}).strict();
export const hsaDistributionSources2026Schema = investmentOwner2026.extend({
  taxpayer_dob: date,
  spouse_dob: date.optional(),
  claim: hsaDistributionClaim2026Schema,
}).strict();
export type HsaDistributionSources2026 = z.input<
  typeof hsaDistributionSources2026Schema
>;

/** Resolve correction lineage before reconciling dated payments. Retired copies
 * are retained as evidence and never contribute a second distribution. */
export function reconcileHsaDistributions2026(raw: HsaDistributionSources2026) {
  const input = hsaDistributionSources2026Schema.parse(raw), c = input.claim;
  const owners = [input.taxpayer_ssn];
  if (input.filing_status === FilingStatus.MFJ) {
    if (
      !input.spouse_ssn || input.spouse_ssn === input.taxpayer_ssn ||
      !input.spouse_dob
    ) {
      throw Error(
        "HSA distributions need distinct joint owners and actual birth dates",
      );
    }
    owners.push(input.spouse_ssn);
  }
  if (c.reviewed_on < "2026-12-31") {
    throw Error(
      "HSA distribution review must cover the complete calendar year",
    );
  }
  const refs = new Map(c.copies.map((f) => [f.source_document_reference, f]));
  if (refs.size !== c.copies.length) {
    throw Error("HSA issued copy references must be distinct");
  }
  const identity = (f: z.output<typeof hsaDistributionCopy2026Schema>) =>
    JSON.stringify([
      f.trustee_tin,
      f.owner_tin,
      f.account_number,
      f.statement_identifier,
    ]);
  const retired = new Set<string>();
  for (const f of c.copies) {
    const matches = f.recipient_tin.startsWith("XXX")
      ? f.owner_tin.endsWith(f.recipient_tin.slice(-4))
      : f.recipient_tin.replaceAll("-", "") === f.owner_tin;
    if (
      !owners.includes(f.owner_tin) || !matches ||
      f.issued_on > c.reviewed_on || f.issued_on < "2026-01-01"
    ) {
      throw Error(
        "HSA issued copy must identify an actual return owner and reviewed issue date",
      );
    }
    if (f.corrected !== !!f.supersedes_document_reference) {
      throw Error("HSA correction needs its replaced issued copy");
    }
    if (f.supersedes_document_reference) {
      const old = refs.get(f.supersedes_document_reference);
      if (
        !old || old === f || identity(old) !== identity(f) ||
        retired.has(old.source_document_reference) ||
        old.issued_on > f.issued_on
      ) {
        throw Error(
          "HSA correction must replace one matching earlier issued statement",
        );
      }
      retired.add(old.source_document_reference);
      const chain = new Set([f.source_document_reference]);
      let prior: typeof old | undefined = old;
      while (prior) {
        if (chain.has(prior.source_document_reference)) {
          throw Error("HSA correction lineage contains a cycle");
        }
        chain.add(prior.source_document_reference);
        if (!prior.supersedes_document_reference) break;
        prior = refs.get(prior.supersedes_document_reference);
        if (!prior) throw Error("HSA correction lineage is incomplete");
      }
    }
  }
  const current = c.copies.filter((f) =>
    !retired.has(f.source_document_reference)
  );
  if (new Set(current.map(identity)).size !== current.length) {
    throw Error("HSA inventory has two current copies of one statement");
  }
  const accounts = new Set<string>(),
    records = new Set<string>([c.record_reference, ...refs.keys()]);
  const used = new Set<string>();
  const unique = (r: string) => {
    if (records.has(r)) {
      throw Error(
        "HSA distribution inventory repeats a source or payment reference",
      );
    }
    records.add(r);
  };
  const reconciled = c.accounts.map((a) => {
    unique(a.record_reference);
    const key = `${a.trustee_tin}/${a.account_number}`;
    if (accounts.has(key)) {
      throw Error("HSA distribution inventory repeats a trustee account");
    }
    accounts.add(key);
    const dob = a.owner_tin === input.taxpayer_ssn
      ? input.taxpayer_dob
      : input.spouse_dob!;
    if (
      !owners.includes(a.owner_tin) || a.hsa_established_on < dob ||
      a.hsa_established_on > a.opened_on || a.opened_on > "2026-12-31"
    ) {
      throw Error(
        "HSA account establishment must reconcile to the actual owner and account dates",
      );
    }
    const forms = current.filter((f) =>
      f.trustee_tin === a.trustee_tin &&
      f.account_number === a.account_number && f.owner_tin === a.owner_tin
    );
    const transactions = new Set<string>();
    for (const p of a.payments) {
      unique(p.record_reference);
      if (transactions.has(p.custodian_transaction_identifier)) {
        throw Error("HSA ledger repeats a custodian transaction");
      }
      transactions.add(p.custodian_transaction_identifier);
      if (
        !forms.some((f) =>
          f.source_document_reference === p.form1099sa_source_reference
        ) || !p.distributed_on.startsWith("2026-") ||
        p.distributed_on < a.opened_on || p.earnings_on_excess > p.gross_amount
      ) {
        throw Error(
          "HSA payment needs its actual current statement, valid date and earnings",
        );
      }
    }
    for (const p of a.nonreportable_payments ?? []) {
      unique(p.record_reference);
      if (transactions.has(p.custodian_transaction_identifier)) {
        throw Error(
          "HSA nonreportable payment duplicates a ledger transaction",
        );
      }
      transactions.add(p.custodian_transaction_identifier);
      if (
        !p.distributed_on.startsWith("2026-") || p.distributed_on < a.opened_on
      ) {
        throw Error(
          "HSA nonreportable payment needs an actual current-year account date",
        );
      }
    }
    for (const f of forms) {
      used.add(f.source_document_reference);
      const rows = a.payments.filter((p) =>
        p.form1099sa_source_reference === f.source_document_reference
      );
      if (
        sumSourceMoney(rows.map((p) => p.gross_amount)) !==
          f.box1_gross_distribution ||
        sumSourceMoney(rows.map((p) => p.earnings_on_excess)) !==
          f.box2_earnings_on_excess ||
        (f.box3_distribution_code !== "2" && f.box2_earnings_on_excess !== 0)
      ) {
        throw Error(
          "HSA dated payments must reconcile current 1099-SA gross and excess earnings boxes",
        );
      }
    }
    return {
      ...a,
      current_copies: forms,
      gross_distributions: sumSourceMoney(
        a.payments.map((p) => p.gross_amount),
      ),
    };
  });
  if (used.size !== current.length) {
    throw Error(
      "Every current HSA statement needs its complete account ledger",
    );
  }
  return {
    source_input: input,
    current_copies: current,
    retired_copy_references: [...retired],
    accounts: reconciled,
    owners: owners.filter((owner) =>
      reconciled.some((a) => a.owner_tin === owner)
    ).map((owner_tin) => ({
      owner_tin,
      owner_dob: owner_tin === input.taxpayer_ssn
        ? input.taxpayer_dob
        : input.spouse_dob!,
      gross_distributions: sumSourceMoney(
        reconciled.filter((a) => a.owner_tin === owner_tin).map((a) =>
          a.gross_distributions
        ),
      ),
      gross_distribution_cents: reconciled.filter((a) =>
        a.owner_tin === owner_tin
      ).reduce((n, a) => n + sourceCents(a.gross_distributions), 0),
    })),
  };
}
