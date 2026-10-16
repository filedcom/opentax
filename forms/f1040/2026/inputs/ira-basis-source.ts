import { hsaQualifiedFunding2026Schema } from "./hsa-qualified-funding.ts";
import {
  bindIraHsaFunding2026,
  iraHsaValuation2026Schema,
  verifyIraHsaBasisPreserved2026,
} from "./hsa-ira-basis.ts";
import {
  type IraDisposition2026,
  iraSingleDisposition2026Schema,
  iraStatementPaymentLedger2026Schema,
  resolveIraDisposition2026,
} from "./ira-disposition.ts";
import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import { investmentOwner2026 } from "./investment-source.ts";
import { retirementCopy2026Schema } from "./retirement-statement.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import {
  isSourceMoney,
  sumSourceMoney,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
import { traditionalIraBasisAmounts } from "../../nodes/intermediate/forms/income/retirement/form8606/traditional-amounts.ts";

const ref = z.string().trim().min(1),
  tin = z.string().regex(/^\d{9}$/),
  date = z.string().date();
const money = z.number().finite().nonnegative().max(1_000_000_000).refine(
  isSourceMoney,
);
const whole = z.number().int().nonnegative().max(1_000_000_000);
const account = { custodian_tin: tin, account_number: ref };
const owned = { owner_tin: tin, source_document_reference: ref };

/** Internal annual workpaper. Registration requires binding current_copies and
 * compensation to the executed retirement/wage inventory, not caller totals.
 */
export const iraBasisSource2026Schema = investmentOwner2026.extend({
  taxpayer_dob: date,
  spouse_dob: date.optional(),
  taxpayer_can_be_claimed_as_dependent: z.boolean().optional(),
  spouse_can_be_claimed_as_dependent: z.boolean().optional(),
  current_copies: z.array(retirementCopy2026Schema).max(100),
  claim: z.object({
    tax_year: z.literal(2026),
    record_reference: ref,
    reviewed_on: date,
    complete_current_copy_inventory_verified: z.literal(true),
    hsa_funding_sources: hsaQualifiedFunding2026Schema.optional(),
    owners: z.array(
      z.object({
        owner_tin: tin,
        record_reference: ref,
        all_owned_traditional_sep_simple_accounts_included: z.literal(true),
        no_inherited_ira_or_divorce_transfer: z.literal(true),
        no_qcd_hsa_disaster_repayment_recharacterization_or_returned_contribution:
          z.literal(true).optional(),
        no_qcd_disaster_repayment_recharacterization_or_returned_contribution: z
          .literal(true).optional(),
        hsa_funding_valuations: z.array(iraHsaValuation2026Schema).max(2)
          .optional(),
        no_outstanding_or_indirect_rollover: z.literal(true),
        no_roth_distributions_or_current_regular_roth_contributions: z.literal(
          true,
        ),
        no_rmd_shortfall_or_excess_contribution: z.literal(true),
        prior_basis: z.discriminatedUnion("kind", [
          z.object({
            kind: z.literal("none"),
            record_reference: ref,
            no_prior_nondeductible_basis_verified: z.literal(true),
          }).strict(),
          z.object({
            kind: z.literal("filed_form8606"),
            ...owned,
            tax_year: z.number().int().min(2001).max(2025),
            line14: whole,
            line15c_worksheet_line6: whole,
            no_intervening_basis_changes_verified: z.literal(true),
          }).strict(),
        ]),
        accounts: z.array(
          z.object({
            ...account,
            plan_type: z.enum(["traditional_ira", "sep_ira", "simple_ira"]),
            simple_first_contribution_date: date.optional(),
            year_end_statement: z.object({
              ...owned,
              as_of: z.literal("2026-12-31"),
              fair_market_value: money,
            }).strict(),
          }).strict(),
        ).min(1).max(100),
        contributions: z.array(
          z.object({
            form5498: z.object({
              ...owned,
              ...account,
              tax_year: z.literal(2026),
              box1_ira_contributions: money,
              no_rollover_recharacterization_or_employer_contribution_in_box1: z
                .literal(true),
            }).strict(),
            receipts: z.array(
              z.object({
                ...owned,
                ...account,
                designated_tax_year: z.literal(2026),
                received_on: date,
                amount: money,
              }).strict(),
            ).min(1).max(100),
          }).strict(),
        ).max(100),
        nondeductible_election: z.object({
          record_reference: ref,
          owner_tin: tin,
          all_listed_contributions_elected_nondeductible: z.literal(true),
          no_ira_deduction_claimed: z.literal(true),
          compensation_record_reference: ref,
          own_eligible_compensation: money,
          no_spousal_compensation_allocation: z.literal(true),
        }).strict().optional(),
        distributions: z.array(iraSingleDisposition2026Schema).max(100),
        statement_payment_ledgers: z.array(iraStatementPaymentLedger2026Schema)
          .max(100).optional(),
        roth_conversion_forms5498: z.array(
          z.object({
            ...owned,
            ...account,
            tax_year: z.literal(2026),
            box3_conversion_amount: money,
          }).strict(),
        ).max(100),
      }).strict(),
    ).min(1).max(2),
  }).strict(),
}).strict();
export type IraBasisSource2026 = z.input<typeof iraBasisSource2026Schema>;

export function calculateIraBasis2026(raw: IraBasisSource2026) {
  const input = iraBasisSource2026Schema.parse(raw), c = input.claim;
  if (c.reviewed_on < "2027-01-01") {
    throw Error("IRA basis inventory needs a completed-year review");
  }
  if (
    input.filing_status === FilingStatus.MFJ &&
    (!input.spouse_ssn || !input.spouse_dob ||
      input.spouse_ssn === input.taxpayer_ssn)
  ) {
    throw Error(
      "Joint IRA basis inventories need distinct owners and birth dates",
    );
  }
  const copies = new Map(
    input.current_copies.map((s) => [s.source_document_reference, s]),
  );
  if (copies.size !== input.current_copies.length) {
    throw Error("IRA basis current copies must be unique");
  }
  const hsa = c.hsa_funding_sources
    ? bindIraHsaFunding2026(c.hsa_funding_sources, input)
    : undefined;
  if (hsa && hsa.qualified_funding_review!.reviewed_on > c.reviewed_on) {
    throw Error(
      "IRA annual review cannot predate the completed HSA funding review",
    );
  }
  if (
    hsa?.qualified_funding.some((o) =>
      !c.owners.some((v) => v.owner_tin === o.owner_tin)
    )
  ) {
    throw Error(
      "Every HSA funding owner needs an annual IRA account inventory",
    );
  }
  const seenOwners = new Set<string>(),
    usedCopies = new Set<string>(),
    documents = new Set<string>();
  const document = (reference: string) => {
    if (documents.has(reference)) {
      throw Error("IRA basis evidence documents must be distinct");
    }
    documents.add(reference);
  };
  const forms = c.owners.map((o) => {
    const spouse = o.owner_tin === input.spouse_ssn;
    if (
      seenOwners.has(o.owner_tin) ||
      (o.owner_tin !== input.taxpayer_ssn &&
        (!spouse || input.filing_status !== FilingStatus.MFJ))
    ) {
      throw Error(
        "IRA basis inventory must identify each actual return owner once",
      );
    }
    seenOwners.add(o.owner_tin);
    const funding = hsa?.qualified_funding.find((v) =>
      v.owner_tin === o.owner_tin
    );
    if (
      funding
        ? (o
          .no_qcd_hsa_disaster_repayment_recharacterization_or_returned_contribution ||
          !o.no_qcd_disaster_repayment_recharacterization_or_returned_contribution)
        : (!o
          .no_qcd_hsa_disaster_repayment_recharacterization_or_returned_contribution ||
          o.no_qcd_disaster_repayment_recharacterization_or_returned_contribution ||
          o.hsa_funding_valuations)
    ) {
      throw Error(
        "Annual IRA exclusions must match the actual HSA funding source route",
      );
    }
    const dob = spouse ? input.spouse_dob! : input.taxpayer_dob;
    if (dob > "2026-12-31") {
      throw Error("IRA owner birth must precede year end");
    }
    const matchOwner = (v: { owner_tin: string }) => {
      if (v.owner_tin !== o.owner_tin) {
        throw Error("IRA source owner differs from basis owner");
      }
    };
    const key = (v: { custodian_tin: string; account_number: string }) =>
      JSON.stringify([v.custodian_tin, v.account_number]);
    const accounts = new Map(o.accounts.map((a) => [key(a), a]));
    if (accounts.size !== o.accounts.length) {
      throw Error("IRA account inventory must be unique");
    }
    for (const a of o.accounts) {
      matchOwner(a.year_end_statement);
      document(a.year_end_statement.source_document_reference);
      if (
        a.plan_type !== "simple_ira" &&
          a.simple_first_contribution_date !== undefined ||
        a.simple_first_contribution_date &&
          (a.simple_first_contribution_date < dob ||
            a.simple_first_contribution_date > "2026-12-31")
      ) {
        throw Error(
          "SIMPLE first contribution date conflicts with account or owner",
        );
      }
    }
    let prior = 0;
    if (o.prior_basis.kind === "filed_form8606") {
      matchOwner(o.prior_basis);
      document(o.prior_basis.source_document_reference);
      if (
        o.prior_basis.tax_year < 2024 &&
        o.prior_basis.line15c_worksheet_line6 !== 0
      ) {
        throw Error(
          "Prior IRA repayment worksheet adjustment needs a 2024 or later form",
        );
      }
      prior = o.prior_basis.line14 + o.prior_basis.line15c_worksheet_line6;
    }
    const contributionAccounts = new Set<string>();
    const receipts = o.contributions.flatMap((r) => {
      const f = r.form5498, a = accounts.get(key(f));
      matchOwner(f);
      document(f.source_document_reference);
      if (
        !a || a.plan_type === "simple_ira" || contributionAccounts.has(key(f))
      ) {
        throw Error(
          "Regular IRA contributions need one matching traditional/SEP account statement",
        );
      }
      contributionAccounts.add(key(f));
      for (const receipt of r.receipts) {
        matchOwner(receipt);
        document(receipt.source_document_reference);
        if (
          key(receipt) !== key(f) || receipt.received_on < "2026-01-01" ||
          receipt.received_on > "2027-04-15" ||
          receipt.received_on > c.reviewed_on
        ) {
          throw Error(
            "IRA contribution receipt account or designated-year deadline disagrees",
          );
        }
      }
      if (
        sumSourceMoney(r.receipts.map((r) => r.amount)) !==
          f.box1_ira_contributions
      ) {
        throw Error(
          "IRA receipts must reconcile issued Form 5498 contributions",
        );
      }
      return r.receipts;
    });
    const contribution = sumSourceMoney(receipts.map((r) => r.amount));
    if ((o.contributions.length > 0) !== !!o.nondeductible_election) {
      throw Error(
        "Current IRA contributions need their nondeductible election and compensation evidence",
      );
    }
    if (o.nondeductible_election) {
      matchOwner(o.nondeductible_election);
      const limit = 7500 + (dob <= "1976-12-31" ? 1100 : 0);
      if (
        contribution >
          Math.min(limit, o.nondeductible_election.own_eligible_compensation)
      ) {
        throw Error(
          "IRA contributions exceed the 2026 age or own-compensation limit",
        );
      }
    }
    const hsaBasis = funding
      ? verifyIraHsaBasisPreserved2026({
        prior_basis: prior,
        contributions: receipts,
        accounts: o.accounts,
        transfers: funding.transfers,
        valuations: o.hsa_funding_valuations ?? [],
      })
      : undefined;
    const transfers = new Map<string, number[]>(),
      statementKeys = new Set<string>();
    const dispositions: IraDisposition2026[] = [
      ...o.distributions.map((source) => ({ kind: "single" as const, source })),
      ...(o.statement_payment_ledgers ?? []).map((source) => ({
        kind: "ledger" as const,
        source,
      })),
    ];
    const distributions = dispositions.map((disposition) => {
      const d = disposition.source;
      const s = copies.get(d.source_document_reference);
      if (!s || usedCopies.has(d.source_document_reference)) {
        throw Error(
          "IRA disposition needs a distinct actual current 1099-R copy",
        );
      }
      usedCopies.add(d.source_document_reference);
      document(d.source_document_reference);
      const id = s.recipient === "spouse"
        ? input.spouse_ssn
        : input.taxpayer_ssn;
      if (
        id !== o.owner_tin ||
        (s.recipient_tin.startsWith("XXX")
          ? !id?.endsWith(s.recipient_tin.slice(-4))
          : s.recipient_tin.replaceAll("-", "") !== id)
      ) throw Error("IRA 1099-R recipient differs from actual basis owner");
      const a = accounts.get(
        key({ custodian_tin: s.payer_tin, account_number: s.account_number }),
      );
      const statementKey = JSON.stringify([
        s.payer_tin,
        s.account_number,
        s.statement_identifier,
      ]);
      if (!a || statementKeys.has(statementKey)) {
        throw Error(
          "IRA distributions need unique current statements in the complete account inventory",
        );
      }
      statementKeys.add(statementKey);
      if (
        s.box2a_taxable_amount !== undefined &&
        s.box2a_taxable_amount > s.box1_gross_distribution
      ) {
        throw Error("IRA issued taxable amount exceeds its gross distribution");
      }
      if (
        s.box7a_distribution_codes.length !== 1 ||
        !["1", "2", "3", "7", "S"].includes(s.box7a_distribution_codes[0]) ||
        !s.box7b_ira_sep_simple ||
        s.box7c_trump_account || s.box7d_excess_contribution_earnings > 0 ||
        s.box3_capital_gain > 0 || s.box5_employee_contributions > 0 ||
        s.box6_nua > 0 || s.box8a_other_amount > 0 ||
        s.box8b_annuity_percentage !== undefined ||
        s.box9b_employee_contributions > 0 ||
        s.box10_irr_within_five_years > 0 ||
        s.box11_first_roth_year !== undefined
      ) {
        throw Error(
          "IRA basis workpaper requires ordinary owned traditional distributions or conversions",
        );
      }
      const fundingAccount = hsa?.qualified_funding_review?.ira_accounts.find((
        v,
      ) =>
        v.form1099r.source_document_reference === s.source_document_reference
      );
      if (fundingAccount) {
        const plan = {
          traditional: "traditional_ira",
          sep: "sep_ira",
          simple: "simple_ira",
          roth: "roth_ira",
        }[fundingAccount.ira_type];
        if (
          plan !== a.plan_type || disposition.kind !== "ledger" ||
          disposition.source.payments.length !==
            fundingAccount.payments.length ||
          disposition.source.payments.some((p) => {
            const actual = fundingAccount.payments.find((v) =>
              v.record_reference === p.record_reference
            );
            return !actual || actual.paid_on !== p.distributed_on ||
              actual.gross_amount !== p.gross ||
              actual.federal_withheld !== p.federal_withheld ||
              actual.hsa_receipt_reference !== p.hsa_receipt_reference;
          })
        ) {
          throw Error(
            "Annual IRA and HSA inventories must reconcile the same account and every dated payment",
          );
        }
      }
      const resolved = resolveIraDisposition2026(
        disposition,
        s,
        {
          owner_tin: o.owner_tin,
          dob,
        },
        a,
        funding?.transfers.filter((t) =>
          t.ira_statement_reference === s.source_document_reference
        ),
      );
      document(resolved.record_reference);
      for (const p of resolved.payments) {
        if (p.record_reference) document(p.record_reference);
        if (!p.conversion) continue;
        const receipt = p.conversion.receipt;
        document(receipt.source_document_reference);
        if (accounts.has(key(receipt))) {
          throw Error(
            "Roth conversion destination cannot be a traditional account",
          );
        }
        const values = transfers.get(key(receipt)) ?? [];
        values.push(p.converted);
        transfers.set(key(receipt), values);
      }
      return {
        source_document_reference: d.source_document_reference,
        gross: s.box1_gross_distribution,
        converted: resolved.converted,
        nonconversion: resolved.nonconversion,
        qualified_hsa_funding: resolved.qualified_hsa_funding,
        payments: resolved.payments,
      };
    });
    const roth = new Set<string>();
    for (const f of o.roth_conversion_forms5498) {
      matchOwner(f);
      document(f.source_document_reference);
      if (
        roth.has(key(f)) || !transfers.has(key(f)) ||
        sumSourceMoney(transfers.get(key(f))!) !== f.box3_conversion_amount
      ) {
        throw Error(
          "Roth Form 5498 must reconcile every direct conversion receipt once",
        );
      }
      roth.add(key(f));
    }
    if (roth.size !== transfers.size) {
      throw Error(
        "Every conversion destination needs its issued Roth Form 5498",
      );
    }
    const gross = sumSourceMoney(distributions.map((d) => d.gross)),
      converted = sumSourceMoney(distributions.map((d) => d.converted)),
      withdrawn = sumSourceMoney(distributions.map((d) => d.nonconversion));
    const yearEnd = sumSourceMoney(
      o.accounts.map((a) => a.year_end_statement.fair_market_value),
    );
    const postYearContribution = roundWholeDollars(
      sumSourceMoney(
        receipts.filter((r) => r.received_on > "2026-12-31").map((r) =>
          r.amount
        ),
      ),
    );
    const amounts = traditionalIraBasisAmounts({
      contribution: roundWholeDollars(contribution),
      priorBasis: prior,
      postYearContribution,
      yearEndValue: roundWholeDollars(yearEnd),
      distributions: roundWholeDollars(withdrawn),
      conversions: roundWholeDollars(converted),
    });
    const hasPartI = contribution > 0 || withdrawn > 0 && prior > 0 ||
      converted > 0 && prior > 0 && yearEnd > 0;
    const hasActivity = withdrawn > 0 || converted > 0;
    const line17 = hasPartI ? amounts.nontaxableConversion : prior;
    const line18 = roundWholeDollars(converted) - line17;
    const partI = hasPartI
      ? {
        line1: roundWholeDollars(contribution),
        line2: prior,
        line3: amounts.totalBasis,
        line14: amounts.remainingBasis,
        ...(hasActivity
          ? {
            line4: postYearContribution,
            line5: amounts.currentBasis,
            line6: roundWholeDollars(yearEnd),
            line7: roundWholeDollars(withdrawn),
            line8: roundWholeDollars(converted),
            line9: amounts.combined,
            line10: amounts.ratio,
            line11: amounts.nontaxableConversion,
            line12: amounts.nontaxableDistribution,
            line13: amounts.nontaxableConversion +
              amounts.nontaxableDistribution,
            line15a: amounts.taxableDistribution,
            line15b: 0,
            line15c: amounts.taxableDistribution,
          }
          : {}),
      }
      : undefined;
    return {
      owner_tin: o.owner_tin,
      source: o,
      distributions,
      raw_gross: gross,
      raw_qualified_hsa_funding: sumSourceMoney(
        distributions.map((d) => d.qualified_hsa_funding),
      ),
      hsa_basis_preservation: hsaBasis,
      raw_converted: converted,
      raw_withdrawn: withdrawn,
      amounts,
      partI,
      partII: converted > 0
        ? { line16: roundWholeDollars(converted), line17, line18 }
        : undefined,
      taxable_ira_income: amounts.taxableDistribution +
        (converted > 0 ? Math.max(0, line18) : 0),
      // Part II-only full conversions have no filed line 14 to carry automatically.
      carryforward_2027: hasPartI || !hasActivity
        ? {
          owner_tin: o.owner_tin,
          amount: amounts.remainingBasis,
          source_record_reference: c.record_reference,
        }
        : undefined,
      requires_form8606: contribution > 0 || converted > 0 ||
        withdrawn > 0 && prior > 0,
    };
  });
  if (usedCopies.size !== copies.size) {
    throw Error(
      "IRA basis workpaper must reconcile every supplied current copy",
    );
  }
  return { source_input: input, forms, hsa_funding: hsa };
}
