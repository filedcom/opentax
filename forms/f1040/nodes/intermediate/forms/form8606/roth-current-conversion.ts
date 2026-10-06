import { z } from "zod";
import {
  rothConversionYearSchema,
  rothSourceMoney,
} from "./roth-conversion.ts";
import {
  rothActivityReviewSchema,
  rothPaymentAgeFacts,
} from "./roth-activity.ts";
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
const date = rothActivityReviewSchema.shape.payment.shape.distributed_on;
const calendarDate = z.string().date();
const issuer = z.object({
  name: reference,
  address_line1: reference,
  city: reference,
  state: z.string().regex(/^[A-Z]{2}$/),
  zip: reference,
}).strict();
const withdrawal = historicalTransfer.shape.issued_form1099r.omit({
  complete_direct_roth_conversion_confirmed: true,
}).extend({
  tax_year: z.literal(2025),
  box7_distribution_code: z.enum(["1", "7"]),
  issuer,
  federal_withheld: rothSourceMoney,
  state_tax_withheld: rothSourceMoney,
  local_tax_withheld: rothSourceMoney,
}).strict();
const annual = z.object({
  source_document_reference: reference,
  owner_ssn: ssn,
  all_current_regular_traditional_contributions_included: z.literal(true),
  all_current_nonconversion_traditional_distributions_included: z.literal(true),
  no_employer_sep_simple_or_returned_excess_contributions: z.literal(true),
  nondeductible_election: z.object({
    source_document_reference: reference,
    owner_ssn: ssn,
    tax_year: z.literal(2025),
    all_listed_regular_contributions_nondeductible_confirmed: z.literal(true),
  }).strict(),
  contributions: z.array(
    z.object({
      form5498: z.object({
        source_document_reference: reference,
        owner_ssn: ssn,
        tax_year: z.literal(2025),
        custodian_ein: ssn,
        account_number: reference,
        traditional_ira_confirmed: z.literal(true),
        box1_ira_contributions: rothSourceMoney,
        box2_rollover_contributions: z.literal(0),
        box8_sep_contributions: z.literal(0),
        box9_simple_contributions: z.literal(0),
      }).strict(),
      receipts: z.array(
        z.object({
          source_document_reference: reference,
          owner_ssn: ssn,
          custodian_ein: ssn,
          account_number: reference,
          designated_tax_year: z.literal(2025),
          received_on: date,
          amount: rothSourceMoney,
        }).strict(),
      ).min(1),
    }).strict(),
  ),
  withdrawals: z.array(
    z.object({
      issued_form1099r: withdrawal,
      disposition: z.object({
        source_document_reference: reference,
        owner_ssn: ssn,
        distribution_reference: reference,
        paid_on: date,
        cash_paid_to_owner: rothSourceMoney,
        no_early_distribution_exception_claimed: z.literal(true),
      }).strict(),
    }).strict(),
  ),
}).strict();
const transfer = historicalTransfer.extend({
  issued_form1099r: historicalTransfer.shape.issued_form1099r.extend({
    tax_year: z.literal(2025),
    originating_account_type: z.literal("simple_ira").optional(),
    source_kind: z.literal("completed_form4852").optional(),
    completed_form4852_reference: reference.optional(),
    box2a_taxable_amount: rothSourceMoney.optional(),
    complete_direct_roth_conversion_confirmed: z.boolean(),
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
  unconverted_disposition: z.object({
    source_document_reference: reference,
    owner_ssn: ssn,
    distribution_reference: reference,
    paid_on: date,
    cash_paid_to_owner: rothSourceMoney,
    no_early_distribution_exception_claimed: z.literal(true),
  }).strict().optional(),
}).strict();
export const currentRothConversionSchema = z.object({
  inventory: z.object({
    source_document_reference: reference,
    owner_ssn: ssn,
    traditional_accounts: z.array(
      z.object({ custodian_ein: ssn, account_number: reference }).strict(),
    ).min(1),
    simple_origins: z.array(
      z.object({
        source_document_reference: reference,
        owner_ssn: ssn,
        employer_ein: ssn,
        plan_reference: reference,
        custodian_ein: ssn,
        account_number: reference,
        account_opened_on: calendarDate,
        plan_document: z.object({
          source_document_reference: reference,
          owner_ssn: ssn,
          employer_ein: ssn,
          plan_reference: reference,
          custodian_ein: ssn,
          account_number: reference,
          plan_kind: z.literal("traditional_simple_ira"),
          effective_on: calendarDate,
        }).strict(),
        first_employer_deposit_ledger_complete: z.literal(true),
        employer_deposits: z.array(
          z.object({
            source_document_reference: reference,
            owner_ssn: ssn,
            employer_ein: ssn,
            plan_reference: reference,
            custodian_ein: ssn,
            account_number: reference,
            deposited_on: calendarDate,
            amount: rothSourceMoney.refine((amount) => amount > 0),
          }).strict(),
        ).min(1),
      }).strict(),
    ).min(1).optional(),
    all_owned_traditional_sep_simple_iras_included: z.literal(true),
    all_current_traditional_distributions_are_listed_conversions: z.boolean(),
    no_current_traditional_contributions: z.boolean(),
    no_outstanding_rollovers_repayments_qcd_hsa_disaster_or_transferred_basis: z
      .literal(true),
  }).strict(),
  annual_traditional_activity: annual.optional(),
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
/** Paper line10 permits at least three decimals; native RatioType permits five. */
export function formatForm8606BasisRatio(ratio: number) {
  const [whole, fraction] = ratio.toFixed(5).split(".");
  return `${whole}.${fraction.replace(/0+$/, "").padEnd(3, "0")}`;
}
export function currentRothConversionDocuments(review: CurrentRothConversion) {
  return [
    review.inventory,
    ...(review.inventory.simple_origins ?? []).flatMap((origin) => [
      origin,
      origin.plan_document,
      ...origin.employer_deposits,
    ]),
    ...(review.annual_traditional_activity
      ? [
        review.annual_traditional_activity.nondeductible_election,
        ...review.annual_traditional_activity.contributions.flatMap(
          (c) => [c.form5498, ...c.receipts],
        ),
        ...review.annual_traditional_activity.withdrawals.flatMap(
          (w) => [w.issued_form1099r, w.disposition],
        ),
        {
          source_document_reference:
            review.annual_traditional_activity.source_document_reference,
          owner_ssn: review.annual_traditional_activity.owner_ssn,
          all_current_regular_traditional_contributions_included: true,
          all_current_nonconversion_traditional_distributions_included: true,
          no_employer_sep_simple_or_returned_excess_contributions: true,
        },
      ]
      : []),
    ...review.year_end_statements,
    ...review.accounts.flatMap(
      (account) => [
        account.form5498,
        ...account.transfers.flatMap(
          (
            row,
          ) => [
            row.issued_form1099r,
            row.receipt,
            ...(row.unconverted_disposition
              ? [row.unconverted_disposition]
              : []),
          ],
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
        p.line10 !==
          Math.min(
            1,
            Math.round(
              p.line5 / p.line9 *
                10 ** formatForm8606BasisRatio(p.line10).split(".")[1].length,
            ) / 10 ** formatForm8606BasisRatio(p.line10).split(".")[1].length,
          ) ||
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
  const simple = new Map<
    string,
    NonNullable<typeof review.inventory.simple_origins>[number]
  >();
  for (const origin of review.inventory.simple_origins ?? []) {
    const account = key(origin);
    if (
      simple.has(account) || !owned.includes(account) ||
      origin.owner_ssn !== owner.owner_ssn ||
      origin.plan_document.owner_ssn !== origin.owner_ssn ||
      origin.plan_document.employer_ein !== origin.employer_ein ||
      origin.plan_document.plan_reference !== origin.plan_reference ||
      key(origin.plan_document) !== account ||
      origin.account_opened_on < origin.plan_document.effective_on ||
      origin.employer_deposits.some((deposit) =>
        deposit.owner_ssn !== origin.owner_ssn ||
        deposit.employer_ein !== origin.employer_ein ||
        deposit.plan_reference !== origin.plan_reference ||
        key(deposit) !== account ||
        deposit.deposited_on < origin.plan_document.effective_on ||
        deposit.deposited_on < origin.account_opened_on ||
        deposit.deposited_on > "2025-12-31"
      )
    ) {
      throw new Error(
        "SIMPLE origin employer/plan/account/owner deposit source differs",
      );
    }
    simple.set(account, origin);
  }
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
      const sourceAccount = key({
        custodian_ein: i.payer_ein,
        account_number: i.traditional_account_number,
      });
      const simpleOrigin = simple.get(sourceAccount);
      if (!!simpleOrigin !== (i.originating_account_type === "simple_ira")) {
        throw new Error(
          "SIMPLE conversion origin classification differs from employer plan source",
        );
      }
      if (simpleOrigin) {
        const first = simpleOrigin.employer_deposits.reduce(
          (earliest, deposit) =>
            deposit.deposited_on < earliest ? deposit.deposited_on : earliest,
          simpleOrigin.employer_deposits[0].deposited_on,
        );
        const anniversary = `${Number(first.slice(0, 4)) + 2}${first.slice(4)}`;
        if (i.distributed_on < anniversary) {
          throw new Error(
            "SIMPLE Roth conversion precedes employer first-deposit two-year anniversary",
          );
        }
      }
      if (
        !t.unconverted_disposition && (
          i.federal_withheld !== 0 || i.state_tax_withheld !== 0 ||
          i.local_tax_withheld !== 0 ||
          !i.complete_direct_roth_conversion_confirmed
        )
      ) {
        throw new Error(
          "Current complete direct conversion needs actual replacement/unconverted distribution records for withheld funds",
        );
      }
      if (
        (i.source_kind === "completed_form4852") !==
          !!i.completed_form4852_reference
      ) {
        throw new Error(
          "Current conversion source kind requires distinct actual completed Form4852 reference",
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
        (t.unconverted_disposition
          ? i.complete_direct_roth_conversion_confirmed ||
            t.unconverted_disposition.owner_ssn !== owner.owner_ssn ||
            t.unconverted_disposition.distribution_reference !==
              i.distribution_reference ||
            t.unconverted_disposition.paid_on < i.distributed_on ||
            t.unconverted_disposition.paid_on > "2025-12-31" ||
            sum([
                r.amount,
                t.unconverted_disposition.cash_paid_to_owner,
                i.federal_withheld,
                i.state_tax_withheld,
                i.local_tax_withheld,
              ]) !== i.box1_gross_distribution
          : r.amount !== i.box1_gross_distribution) ||
        (i.source_kind === "completed_form4852"
          ? i.box2a_taxable_amount !== undefined
          : i.box2a_taxable_amount !== r.amount) ||
        i.distributed_on < owner.date_of_birth
      ) {
        throw new Error(
          "Current conversion issued debit/paid receipt/date/owner/account lineage differs",
        );
      }
      lineages.add(lineage);
    }
  }
  const activity = review.annual_traditional_activity;
  if (
    (!activity &&
      (!review.inventory.no_current_traditional_contributions ||
        !review.inventory
          .all_current_traditional_distributions_are_listed_conversions)) ||
    (activity &&
      (activity.owner_ssn !== owner.owner_ssn ||
        activity.nondeductible_election.owner_ssn !== owner.owner_ssn ||
        review.inventory.no_current_traditional_contributions !==
          (activity.contributions.length === 0) ||
        review.inventory
            .all_current_traditional_distributions_are_listed_conversions !==
          (activity.withdrawals.length === 0)))
  ) {
    throw new Error(
      "Current annual traditional inventory/election owner and complete source declarations differ",
    );
  }
  const contributedAccounts = new Set<string>();
  for (const contribution of activity?.contributions ?? []) {
    const f = contribution.form5498;
    if (
      f.owner_ssn !== owner.owner_ssn || !owned.includes(key(f)) ||
      contributedAccounts.has(key(f)) || f.box1_ira_contributions <= 0 ||
      sum(contribution.receipts.map((r) => r.amount)) !==
        f.box1_ira_contributions ||
      contribution.receipts.some((r) =>
        r.owner_ssn !== owner.owner_ssn || key(r) !== key(f) || r.amount <= 0 ||
        r.received_on < "2025-01-01" || r.received_on > "2026-04-15" ||
        r.received_on < owner.date_of_birth
      )
    ) {
      throw new Error(
        "Annual traditional contribution issued5498/paid receipt owner account year amounts differ",
      );
    }
    contributedAccounts.add(key(f));
  }
  for (const w of activity?.withdrawals ?? []) {
    const i = w.issued_form1099r, d = w.disposition;
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
      ) || i.owner_ssn !== owner.owner_ssn || d.owner_ssn !== owner.owner_ssn ||
      d.distribution_reference !== i.distribution_reference ||
      !i.distributed_on.startsWith("2025-") || d.paid_on < i.distributed_on ||
      d.paid_on > "2025-12-31" ||
      i.box2a_taxable_amount !== i.box1_gross_distribution ||
      sum([
          d.cash_paid_to_owner,
          i.federal_withheld,
          i.state_tax_withheld,
          i.local_tax_withheld,
        ]) !== i.box1_gross_distribution
    ) {
      throw new Error(
        "Annual traditional withdrawal issued debit/owner/paid disposition lineage differs",
      );
    }
    lineages.add(lineage);
  }
  if (new Set(references).size !== references.length) {
    throw new Error(
      "Current conversion repeats actual retained source references",
    );
  }
  const rawConverted = sum(
    review.accounts.map((a) => a.form5498.box3_roth_conversion_amount),
  );
  const transfers = review.accounts.flatMap((a) => a.transfers);
  const rawGross = sum([
    ...transfers.map((t) => t.issued_form1099r.box1_gross_distribution),
    ...(activity?.withdrawals ?? []).map((w) =>
      w.issued_form1099r.box1_gross_distribution
    ),
  ]);
  const rawWithdrawals = sum([rawGross, -rawConverted]);
  const gross = roundWholeDollars(rawConverted),
    withdrawals = roundWholeDollars(rawWithdrawals);
  const contribution = roundWholeDollars(
    sum(
      (activity?.contributions ?? []).map((c) =>
        c.form5498.box1_ira_contributions
      ),
    ),
  );
  const postYear = roundWholeDollars(
    sum(
      (activity?.contributions ?? []).flatMap((c) => c.receipts).filter((r) =>
        r.received_on > "2025-12-31"
      ).map((r) => r.amount),
    ),
  );
  const basis = review.prior_form8606.filed_line14_basis,
    totalBasis = basis + contribution,
    currentBasis = totalBasis - postYear;
  const rawYearEnd = sum(
      review.year_end_statements.map((s) => s.fair_market_value),
    ),
    yearEnd = roundWholeDollars(rawYearEnd);
  if (gross <= 0) {
    throw new Error(
      "Current conversion requires positive actual source amounts",
    );
  }
  const combined = yearEnd + gross + withdrawals;
  let ratio = 0, nontaxable = 0, nontaxableWithdrawal = 0;
  for (let decimals = 3; decimals <= 5; decimals++) {
    const scale = 10 ** decimals;
    ratio = Math.min(1, Math.round(currentBasis / combined * scale) / scale);
    nontaxable = roundWholeDollars(gross * ratio);
    nontaxableWithdrawal = roundWholeDollars(withdrawals * ratio);
    if (nontaxable + nontaxableWithdrawal <= currentBasis) break;
  }
  if (nontaxable + nontaxableWithdrawal > currentBasis) {
    throw new Error(
      "Annual Form8606 filed multiplication exceeds basis at native five-decimal precision; source basis cannot be capped",
    );
  }
  const hasPartI = !!activity || withdrawals > 0 || basis > 0 && rawYearEnd > 0;
  const filedLine17 = hasPartI ? nontaxable : basis;
  const filedLine18 = gross - filedLine17,
    taxable = Math.max(0, filedLine18),
    withdrawalTaxable = withdrawals - nontaxableWithdrawal;
  const rawEarlyWithdrawals = sum([
    ...transfers.filter((t) =>
      t.issued_form1099r.box7_distribution_code === "2"
    ).map((t) => t.issued_form1099r.box1_gross_distribution - t.receipt.amount),
    ...(activity?.withdrawals ?? []).filter((w) =>
      w.issued_form1099r.box7_distribution_code === "1"
    ).map((w) => w.issued_form1099r.box1_gross_distribution),
  ]);
  const earlyWithdrawalTaxable = Math.min(
    withdrawalTaxable,
    Math.max(
      0,
      roundWholeDollars(rawEarlyWithdrawals) -
        roundWholeDollars(roundWholeDollars(rawEarlyWithdrawals) * ratio),
    ),
  );
  return {
    review,
    rawGross,
    rawConverted,
    withdrawals,
    withdrawalTaxable,
    earlyWithdrawalTaxable,
    contribution,
    year: 2025,
    gross,
    nontaxable,
    taxable,
    basis,
    yearEnd,
    ratio,
    hasPartI,
    print: {
      print_line1_nondeductible: contribution,
      print_line2_prior_basis: basis,
      print_line3_total_basis: totalBasis,
      print_line4_post_year_contributions: postYear,
      print_line5_current_basis: currentBasis,
      print_line6_year_end_value: yearEnd,
      print_line7_distributions: withdrawals,
      print_line8_conversions: gross,
      print_line9_combined_value: combined,
      print_line10_basis_ratio: ratio,
      print_line11_nontaxable_conversion: nontaxable,
      print_line12_nontaxable_distribution: nontaxableWithdrawal,
      print_line13_nontaxable: nontaxable + nontaxableWithdrawal,
      print_line14_remaining_basis: totalBasis - nontaxable -
        nontaxableWithdrawal,
      ...(activity || withdrawals > 0
        ? {
          print_line15a_not_converted: withdrawalTaxable,
          print_line15b_disaster: 0,
          print_line15c_taxable: withdrawalTaxable,
        }
        : {}),
      print_line16_converted: gross,
      print_line17_nontaxable_conversion: filedLine17,
      print_line18_taxable_conversion: filedLine18,
    },
  };
}
