import { z } from "zod";
import {
  rothConversionYearSchema,
  rothSourceMoney,
} from "./roth-conversion.ts";
import { rothPaymentAgeFacts } from "./roth-activity.ts";
import { roundWholeDollars } from "../../../../whole-dollars.ts";
const reference = z.string().trim().min(1), ssn = z.string().regex(/^\d{9}$/);
const historicalAccount = rothConversionYearSchema.shape.accounts.element;
const historicalTransfer = historicalAccount.shape.transfers.element;
const filedMoney = z.number().int().nonnegative();
const priorPartI = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("carryforward"),
    line1: filedMoney,
    line2: filedMoney,
    line3: filedMoney,
  }).strict(),
  z.object({
    method: z.literal("allocated"),
    line1: filedMoney,
    line2: filedMoney,
    line3: filedMoney,
    line4: filedMoney,
    line5: filedMoney,
    line6: filedMoney,
    line7: filedMoney,
    line8: filedMoney,
    line9: filedMoney,
    line10: z.number().min(0).max(1),
    line11: filedMoney,
    line12: filedMoney,
    line13: filedMoney,
  }).strict(),
]);
const transfer = historicalTransfer.extend({
  issued_form1099r: historicalTransfer.shape.issued_form1099r.extend({
    tax_year: z.literal(2025),
    issuer: z.object({
      name: reference,
      address_line1: reference,
      city: reference,
      state: z.string().regex(/^[A-Z]{2}$/),
      zip: reference,
    }).strict(),
    federal_withheld: rothSourceMoney,
    state_tax_withheld: rothSourceMoney,
    local_tax_withheld: rothSourceMoney,
  }).strict(),
}).strict();
export const currentRothConversionSchema = z.object({
  inventory: z.object({
    source_document_reference: reference,
    owner_ssn: ssn,
    traditional_accounts: z.array(
      z.object({ custodian_ein: ssn, account_number: reference }).strict(),
    ).min(1),
    all_owned_traditional_sep_simple_iras_included: z.literal(true),
    all_current_traditional_distributions_are_listed_conversions: z.literal(
      true,
    ),
    no_current_traditional_contributions: z.literal(true),
    no_outstanding_rollovers_repayments_qcd_hsa_disaster_or_transferred_basis: z
      .literal(true),
  }).strict(),
  prior_form8606: z.object({
    source_document_reference: reference,
    tax_year: z.literal(2024),
    owner_ssn: ssn,
    owner_name: reference,
    filed_line14_basis: z.number().int().nonnegative(),
    filed_part_i: priorPartI,
  }).strict(),
  year_end_statements: z.array(
    z.object({
      source_document_reference: reference,
      owner_ssn: ssn,
      custodian_ein: ssn,
      account_number: reference,
      as_of: z.literal("2025-12-31"),
      fair_market_value: rothSourceMoney,
    }).strict(),
  ).min(1),
  accounts: z.array(
    historicalAccount.extend({
      form5498: historicalAccount.shape.form5498.extend({
        tax_year: z.literal(2025),
      }).strict(),
      transfers: z.array(transfer).min(1),
    }).strict(),
  ).min(1),
}).strict();
export type CurrentRothConversion = z.infer<typeof currentRothConversionSchema>;
const sum = (numbers: readonly number[]) =>
  numbers.reduce((s, n) => s + Math.round(n * 100), 0) / 100;
export function currentRothConversionDocuments(review: CurrentRothConversion) {
  return [
    review.inventory,
    ...review.year_end_statements,
    ...review.accounts.flatMap(
      (account) => [
        account.form5498,
        ...account.transfers.flatMap(
          (row) => [row.issued_form1099r, row.receipt],
        ),
      ],
    ),
  ];
}
export function reviewedCurrentRothConversion(
  raw: unknown,
  owner: { owner_ssn: string; date_of_birth: string },
  rothAccounts: readonly { custodian_ein: string; account_number: string }[],
) {
  const review = currentRothConversionSchema.parse(raw);
  const prior = review.prior_form8606, p = prior.filed_part_i;
  if (
    p.line3 !== p.line1 + p.line2 ||
    (p.method === "carryforward"
      ? prior.filed_line14_basis !== p.line3
      : p.line5 !== p.line3 - p.line4 ||
        p.line9 !== p.line6 + p.line7 + p.line8 || p.line9 <= 0 ||
        p.line10 !== Math.min(1, Math.round(p.line5 / p.line9 * 1000) / 1000) ||
        p.line11 !== roundWholeDollars(p.line8 * p.line10) ||
        p.line12 !== roundWholeDollars(p.line7 * p.line10) ||
        p.line13 !== p.line11 + p.line12 ||
        prior.filed_line14_basis !== p.line3 - p.line13)
  ) {
    throw new Error(
      "Current conversion retained prior filed PartI basis equations differ",
    );
  }
  const key = (row: { custodian_ein: string; account_number: string }) =>
    JSON.stringify([row.custodian_ein, row.account_number]);
  const owned = review.inventory.traditional_accounts.map(key);
  const statementKeys = review.year_end_statements.map(key);
  if (
    review.inventory.owner_ssn !== owner.owner_ssn ||
    review.prior_form8606.owner_ssn !== owner.owner_ssn ||
    new Set(owned).size !== owned.length ||
    new Set(statementKeys).size !== statementKeys.length ||
    owned.length !== statementKeys.length ||
    owned.some((k) => !statementKeys.includes(k)) ||
    review.year_end_statements.some((s) => s.owner_ssn !== owner.owner_ssn)
  ) {
    throw new Error(
      "Current conversion complete traditional owner/account/year-end inventory differs",
    );
  }
  const references = [
    review.prior_form8606.source_document_reference,
    ...currentRothConversionDocuments(review).map((d) =>
      d.source_document_reference
    ),
  ];
  const lineages = new Set<string>(), incoming = new Set<string>();
  for (const account of review.accounts) {
    const f = account.form5498;
    if (
      incoming.has(key(f)) || !rothAccounts.some((a) => key(a) === key(f)) ||
      f.owner_ssn !== owner.owner_ssn ||
      sum(account.transfers.map((t) => t.receipt.amount)) !==
        f.box3_roth_conversion_amount
    ) {
      throw new Error(
        "Current conversion actual Roth5498 account/owner/incoming receipt amounts differ",
      );
    }
    incoming.add(key(f));
    for (const t of account.transfers) {
      const i = t.issued_form1099r, r = t.receipt;
      if (
        i.federal_withheld !== 0 || i.state_tax_withheld !== 0 ||
        i.local_tax_withheld !== 0
      ) {
        throw new Error(
          "Current complete direct conversion needs actual replacement/unconverted distribution records for withheld funds",
        );
      }
      const lineage = JSON.stringify([
        i.payer_ein,
        i.traditional_account_number,
        i.distribution_reference,
      ]);
      rothPaymentAgeFacts({ date_of_birth: owner.date_of_birth }, {
        distributed_on: i.distributed_on,
        distribution_code: i.box7_distribution_code === "7" ? "T" : "J",
      }, Infinity);
      if (
        lineages.has(lineage) ||
        !owned.includes(
          JSON.stringify([i.payer_ein, i.traditional_account_number]),
        ) ||
        i.owner_ssn !== owner.owner_ssn || r.owner_ssn !== owner.owner_ssn ||
        !i.distributed_on.startsWith("2025-") ||
        r.received_on < i.distributed_on || r.received_on > "2025-12-31" ||
        r.custodian_ein !== f.custodian_ein ||
        r.account_number !== f.account_number ||
        r.originating_distribution_reference !== i.distribution_reference ||
        r.amount !== i.box1_gross_distribution ||
        i.box2a_taxable_amount !== i.box1_gross_distribution ||
        i.distributed_on < owner.date_of_birth
      ) {
        throw new Error(
          "Current conversion issued debit/paid receipt/date/owner/account lineage differs",
        );
      }
      lineages.add(lineage);
    }
  }
  if (new Set(references).size !== references.length) {
    throw new Error(
      "Current conversion repeats actual retained source references",
    );
  }
  const rawGross = sum(
    review.accounts.map((a) => a.form5498.box3_roth_conversion_amount),
  );
  const gross = roundWholeDollars(rawGross),
    basis = review.prior_form8606.filed_line14_basis;
  const rawYearEnd = sum(
    review.year_end_statements.map((s) => s.fair_market_value),
  );
  const yearEnd = roundWholeDollars(rawYearEnd);
  if (gross <= 0) {
    throw new Error(
      "Current conversion requires positive actual source amounts",
    );
  }
  // Filed line10 rounded to three decimal places, then used by the printed worksheet.
  const ratio = Math.min(
    1,
    Math.round(basis / (yearEnd + gross) * 1000) / 1000,
  );
  const nontaxable = Math.min(basis, gross, roundWholeDollars(gross * ratio));
  const hasPartI = basis > 0 && rawYearEnd > 0;
  const filedLine17 = hasPartI ? nontaxable : basis;
  const filedLine18 = gross - filedLine17;
  const taxable = Math.max(0, filedLine18);
  return {
    review,
    rawGross,
    year: 2025,
    gross,
    nontaxable,
    taxable,
    basis,
    yearEnd,
    ratio,
    hasPartI,
    print: {
      print_line1_nondeductible: 0,
      print_line2_prior_basis: basis,
      print_line3_total_basis: basis,
      print_line4_post_year_contributions: 0,
      print_line5_current_basis: basis,
      print_line6_year_end_value: yearEnd,
      print_line7_distributions: 0,
      print_line8_conversions: gross,
      print_line9_combined_value: yearEnd + gross,
      print_line10_basis_ratio: ratio,
      print_line11_nontaxable_conversion: nontaxable,
      print_line12_nontaxable_distribution: 0,
      print_line13_nontaxable: nontaxable,
      print_line14_remaining_basis: basis - nontaxable,
      print_line16_converted: gross,
      print_line17_nontaxable_conversion: filedLine17,
      print_line18_taxable_conversion: filedLine18,
    },
  };
}
