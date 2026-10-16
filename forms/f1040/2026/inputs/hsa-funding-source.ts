import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import { investmentOwner2026 } from "./investment-source.ts";
import { w2Item2026Schema } from "./w2-source.ts";
import { w2_2026 } from "./w2.ts";
import { hsaEmployerContributionsForYear } from "../../nodes/intermediate/forms/adjustments/health/form8889/employer-contributions.ts";
import {
  isSourceMoney,
  sourceCents,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";

const ref = z.string().trim().min(1);
const date = z.string().date();
const tin = z.string().regex(/^\d{9}$/);
const money = z.number().finite().nonnegative().max(10_000_000).refine(
  isSourceMoney,
);
const receipt = {
  record_reference: ref,
  custodian_transaction_identifier: ref,
  statement_reference: ref,
  received_on: date,
  amount: money.refine((v) => v > 0),
  source_account_or_payment_reference: ref,
};
const regular = {
  ...receipt,
  contribution_tax_year: z.union([
    z.literal(2025),
    z.literal(2026),
    z.literal(2027),
  ]),
  tax_year_designation_reference: ref,
};
export const hsaReceipt2026Schema = z.discriminatedUnion("kind", [
  z.object({
    ...regular,
    kind: z.literal("personal_cash"),
    contributor_tin: tin,
    not_employer_or_cafeteria_plan_payment_verified: z.literal(true),
  }).strict(),
  z.object({
    ...regular,
    kind: z.literal("employer_cash"),
    employer_ein: tin,
    payroll_record_reference: ref,
    // Current-calendar-year receipts must identify their actual issued W-2.
    // Following-year receipts instead retain their employer's payroll record.
    current_w2_source_reference: ref.optional(),
    includes_employee_cafeteria_plan_and_insurer_payments_reviewed: z.literal(
      true,
    ),
  }).strict(),
  z.object({
    ...receipt,
    kind: z.literal("reported_rollover"),
    originating_account_type: z.enum(["hsa", "archer_msa"]),
    originating_owner_tin: tin,
    distribution_received_on: date,
    originating_distribution_reference: ref,
  }).strict(),
  z.object({
    ...receipt,
    kind: z.literal("ira_funding_transfer"),
    originating_owner_tin: tin,
    originating_ira_type: z.enum(["traditional", "roth", "sep", "simple"]),
    ira_distribution_source_reference: ref,
    direct_trustee_transfer_verified: z.literal(true),
  }).strict(),
  z.object({
    ...receipt,
    kind: z.literal("trustee_transfer"),
    originating_account_type: z.enum(["hsa", "archer_msa"]),
    originating_owner_tin: tin,
    direct_trustee_transfer_verified: z.literal(true),
  }).strict(),
  z.object({
    ...receipt,
    kind: z.literal("mistaken_distribution_repayment"),
    original_distribution_reference: ref,
    custodian_accepted_mistaken_distribution_repayment_verified: z.literal(
      true,
    ),
  }).strict(),
]);
const account = z.object({
  record_reference: ref,
  owner_tin: tin,
  trustee_tin: tin,
  account_number: ref,
  opened_on: date,
  ledger_statement_reference: ref,
  ledger_from: z.literal("2026-01-01"),
  ledger_through: date,
  complete_receipts_including_transfers_and_repayments_verified: z.literal(
    true,
  ),
  no_employer_error_recoveries_or_unreconciled_corrections_verified: z.literal(
    true,
  ),
  form5498sa: z.object({
    tax_year: z.literal(2026),
    source_document_reference: ref,
    owner_tin: tin,
    trustee_tin: tin,
    account_number: ref,
    issued_on: date,
    current_issued_copy_or_custodian_substitute_after_corrections_verified: z
      .literal(true),
    box1_archer_msa_contributions: z.literal(0),
    box2_calendar_year_contributions: money,
    box3_following_year_contributions_for_2026: money,
    box4_calendar_year_rollovers: money,
    box5_year_end_fmv: money,
    box6_account_type: z.literal("hsa"),
  }).strict(),
  receipts: z.array(hsaReceipt2026Schema).max(10000),
}).strict();
export const hsaFundingClaim2026Schema = z.object({
  tax_year: z.literal(2026),
  record_reference: ref,
  reviewed_on: date,
  complete_owner_accounts_and_funding_inventory_verified: z.literal(true),
  current_w2_copies_after_corrections_verified: z.literal(true),
  ordinary_calendar_year_deadlines_no_postponement_or_combat_zone_verified: z
    .literal(true),
  accounts: z.array(account).min(1).max(100),
}).strict();
/** Funding reconciliation only: reported rollover/IRA classifications do not
 * establish tax-free treatment. Distribution, lifetime-election, excess and
 * testing-period source checks must precede any return output or deduction. */
export const hsaFundingSources2026Schema = investmentOwner2026.extend({
  wage_sources: z.array(w2Item2026Schema).max(100),
  claim: hsaFundingClaim2026Schema,
}).strict();
export type HsaFundingSources2026 = z.input<typeof hsaFundingSources2026Schema>;

export function reconcileHsaFunding2026(raw: HsaFundingSources2026) {
  const input = hsaFundingSources2026Schema.parse(raw), claim = input.claim;
  const joint = input.filing_status === FilingStatus.MFJ;
  if (joint && (!input.spouse_ssn || input.spouse_ssn === input.taxpayer_ssn)) {
    throw Error("HSA funding needs distinct joint-return owners");
  }
  const owners = [input.taxpayer_ssn, ...(joint ? [input.spouse_ssn!] : [])];
  if (claim.reviewed_on < "2027-04-15") {
    throw Error(
      "HSA funding review must cover the ordinary contribution deadline",
    );
  }
  w2_2026.compute({ formType: "f1040", taxYear: 2026 }, {
    filing_status: input.filing_status,
    taxpayer_ssn: input.taxpayer_ssn,
    spouse_ssn: input.spouse_ssn,
    w2s: input.wage_sources,
  });
  const refs = new Set<string>([claim.record_reference]);
  const unique = (r: string) => {
    if (refs.has(r)) {
      throw Error("HSA funding has a repeated source or receipt record");
    }
    refs.add(r);
  };
  const wageOwners = new Set<string>();
  const wages = new Map(input.wage_sources.map((w) => {
    unique(w.source_document_reference);
    const codeW = (w.box12_entries ?? []).find((e) => e.code === "W")?.amount ??
      0;
    if (!money.safeParse(codeW).success) {
      throw Error("HSA code W needs exact source cents");
    }
    const key = `${w.employee_ssn.replaceAll("-", "")}/${
      w.employer_ein.replaceAll("-", "")
    }`;
    if (codeW > 0 && wageOwners.has(key)) {
      throw Error(
        "HSA employer funding needs one current W-2 copy per owner and employer",
      );
    }
    if (codeW > 0) wageOwners.add(key);
    return [w.source_document_reference, {
      owner_tin: w.employee_ssn.replaceAll("-", ""),
      employer_ein: w.employer_ein.replaceAll("-", ""),
      code_w_cents: sourceCents(codeW),
      ledger_cents: 0,
    }];
  }));
  const accounts = new Set<string>();
  const reconciled = claim.accounts.map((a) => {
    const f = a.form5498sa;
    unique(a.record_reference);
    unique(f.source_document_reference);
    const key = `${a.trustee_tin}/${a.account_number}`;
    if (accounts.has(key)) throw Error("HSA funding repeats a trustee account");
    accounts.add(key);
    if (
      !owners.includes(a.owner_tin) || f.owner_tin !== a.owner_tin ||
      f.trustee_tin !== a.trustee_tin || f.account_number !== a.account_number
    ) {
      throw Error(
        "HSA statement and account must identify the actual return owner",
      );
    }
    if (
      a.opened_on > a.ledger_through || a.ledger_through < "2027-04-15" ||
      a.ledger_through > "2027-12-31" || a.ledger_through > claim.reviewed_on ||
      f.issued_on < "2027-04-15" || f.issued_on > claim.reviewed_on
    ) {
      throw Error(
        "HSA statement and ledger need a complete ordered contribution period",
      );
    }
    let box2 = 0, box3 = 0, box4 = 0, personal = 0, employer = 0;
    let priorEmployer = 0,
      followingEmployer = 0,
      funding = 0,
      transfers = 0,
      repayments = 0;
    const transferReviews: string[] = [];
    const transactionIds = new Set<string>();
    for (const r of a.receipts) {
      unique(r.record_reference);
      if (transactionIds.has(r.custodian_transaction_identifier)) {
        throw Error("HSA ledger repeats a custodian transaction");
      }
      transactionIds.add(r.custodian_transaction_identifier);
      if (
        r.received_on < a.ledger_from || r.received_on > a.ledger_through ||
        r.received_on < a.opened_on
      ) {
        throw Error("HSA receipt falls outside the retained account ledger");
      }
      const cents = sourceCents(r.amount),
        current = r.received_on.startsWith("2026-");
      if (r.kind === "personal_cash" || r.kind === "employer_cash") {
        const y = r.contribution_tax_year;
        if (r.received_on < `${y}-01-01` || r.received_on > `${y + 1}-04-15`) {
          throw Error(
            "HSA contribution tax year conflicts with its ordinary deposit deadline",
          );
        }
        if (current) box2 += cents;
        else if (y === 2026) box3 += cents;
        if (r.kind === "personal_cash") {
          if (y === 2026) personal += cents;
        } else {
          if (current) {
            const w = wages.get(r.current_w2_source_reference ?? "");
            if (
              !w || w.owner_tin !== a.owner_tin ||
              w.employer_ein !== r.employer_ein
            ) {
              throw Error(
                "HSA employer receipt needs its actual owner/employer W-2",
              );
            }
            w.ledger_cents += cents;
          } else if (r.current_w2_source_reference !== undefined) {
            throw Error(
              "Following-year HSA receipts cannot be reported in a 2026 W-2",
            );
          }
          if (y === 2026) employer += cents;
          if (current && y === 2025) priorEmployer += cents;
          if (!current && y === 2026) followingEmployer += cents;
        }
      } else {
        if (
          "originating_owner_tin" in r &&
          r.originating_owner_tin !== a.owner_tin
        ) {
          throw Error(
            "HSA incoming transfers must retain the same account owner",
          );
        }
        if (r.kind === "reported_rollover") {
          if (r.distribution_received_on > r.received_on) {
            throw Error(
              "HSA rollover deposit precedes the source distribution",
            );
          }
          if (current) box4 += cents;
        } else if (r.kind === "ira_funding_transfer") {
          if (current) {
            box2 += cents;
            funding += cents;
          }
        } else if (r.kind === "trustee_transfer") {
          if (current) transfers += cents;
        } else if (current) repayments += cents;
        transferReviews.push(r.record_reference);
      }
    }
    if (
      box2 !== sourceCents(f.box2_calendar_year_contributions) ||
      box3 !== sourceCents(f.box3_following_year_contributions_for_2026) ||
      box4 !== sourceCents(f.box4_calendar_year_rollovers)
    ) {
      throw Error(
        "HSA dated receipts do not reconcile Form 5498-SA boxes 2, 3 and 4",
      );
    }
    return {
      record_reference: a.record_reference,
      owner_tin: a.owner_tin,
      personal_2026_cents: personal,
      employer_2026_cents: employer,
      employer_2026_for_2025_cents: priorEmployer,
      employer_2027_for_2026_cents: followingEmployer,
      ira_funding_2026_cents: funding,
      rollover_2026_cents: box4,
      trustee_transfers_2026_cents: transfers,
      mistaken_repayments_2026_cents: repayments,
      records_requiring_tax_treatment_review: transferReviews,
    };
  });
  for (const w of wages.values()) {
    if (w.code_w_cents !== w.ledger_cents) {
      throw Error("HSA employer receipts do not reconcile each W-2 code W");
    }
  }
  const byOwner = owners.filter((id) =>
    reconciled.some((a) => a.owner_tin === id)
  ).map((owner_tin) => {
    const held = reconciled.filter((a) => a.owner_tin === owner_tin);
    const sum = (
      key:
        | "personal_2026_cents"
        | "employer_2026_cents"
        | "employer_2026_for_2025_cents"
        | "employer_2027_for_2026_cents"
        | "ira_funding_2026_cents",
    ) => held.reduce((s, a) => s + a[key], 0);
    const codeW = [...wages.values()].filter((w) => w.owner_tin === owner_tin)
      .reduce((s, w) => s + w.code_w_cents, 0);
    // Run the shared worksheet in cents and round only at the filed-line boundary.
    const employer = hsaEmployerContributionsForYear(
      codeW,
      sum("employer_2026_for_2025_cents"),
      sum("employer_2027_for_2026_cents"),
    );
    if (employer !== sum("employer_2026_cents")) {
      throw Error(
        "HSA employer worksheet differs from designated-year receipts",
      );
    }
    return {
      owner_tin,
      personal_contributions_for_2026: sum("personal_2026_cents") / 100,
      employer_contributions_for_2026: employer / 100,
      reported_ira_funding_for_2026: sum("ira_funding_2026_cents") / 100,
      employer_worksheet: {
        code_w: codeW / 100,
        made_in_2026_for_2025: sum("employer_2026_for_2025_cents") / 100,
        made_in_2027_for_2026: sum("employer_2027_for_2026_cents") / 100,
      },
    };
  });
  return { source_input: input, accounts: reconciled, owners: byOwner };
}
