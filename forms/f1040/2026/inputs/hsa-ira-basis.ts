import { z } from "zod";
import {
  type HsaQualifiedFunding2026,
  reconcileHsaQualifiedFunding2026,
} from "./hsa-qualified-funding.ts";
import type { retirementCopy2026Schema } from "./retirement-statement.ts";
import {
  isSourceMoney,
  sourceCents,
  sumSourceMoney,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
const ref = z.string().trim().min(1), tin = z.string().regex(/^\d{9}$/);
const money = z.number().finite().nonnegative().max(1_000_000_000).refine(
  isSourceMoney,
);
export const iraHsaValuation2026Schema = z.object({
  payment_reference: ref,
  as_of: z.string().date(),
  immediately_before_distribution_values_verified: z.literal(true),
  all_owned_traditional_sep_simple_accounts_included: z.literal(true),
  accounts: z.array(
    z.object({
      custodian_tin: tin,
      account_number: ref,
      source_document_reference: ref,
      fair_market_value: money,
    }).strict(),
  ).min(1).max(100),
}).strict();

/** Bind a separately reconciled HSA source to the actual current IRA copies and
 * return identities before any payment can leave the annual pro-rata pool. */
export function bindIraHsaFunding2026(
  hsa: HsaQualifiedFunding2026,
  actual: {
    filing_status: HsaQualifiedFunding2026["filing_status"];
    taxpayer_ssn: string;
    spouse_ssn?: string;
    taxpayer_dob: string;
    spouse_dob?: string;
    taxpayer_can_be_claimed_as_dependent?: boolean;
    spouse_can_be_claimed_as_dependent?: boolean;
    current_copies: z.output<typeof retirementCopy2026Schema>[];
  },
) {
  const r = reconcileHsaQualifiedFunding2026(hsa);
  if (
    hsa.filing_status !== actual.filing_status ||
    hsa.taxpayer_ssn !== actual.taxpayer_ssn ||
    hsa.spouse_ssn !== actual.spouse_ssn || !r.qualified_funding.length
  ) {
    throw Error(
      "IRA/HSA funding must identify the same return and actual qualified transfers",
    );
  }
  for (const o of hsa.household_eligibility.owners) {
    const primary = o.owner_tin === actual.taxpayer_ssn;
    const dob = primary ? actual.taxpayer_dob : actual.spouse_dob;
    const dependent = primary
      ? actual.taxpayer_can_be_claimed_as_dependent
      : actual.spouse_can_be_claimed_as_dependent;
    if (
      !dob || dependent === undefined || o.owner_dob !== dob ||
      o.can_be_claimed_as_dependent !== dependent
    ) {
      throw Error(
        "IRA/HSA owner eligibility must match actual birth and dependency facts",
      );
    }
  }
  for (const a of r.qualified_funding_review!.ira_accounts) {
    if (a.ira_type === "roth") {
      throw Error("Roth HSA funding needs its separate Roth basis settlement");
    }
    const copy = actual.current_copies.find((c) =>
      c.source_document_reference === a.form1099r.source_document_reference
    );
    if (!copy || JSON.stringify(copy) !== JSON.stringify(a.form1099r)) {
      throw Error(
        "IRA/HSA funding must use the identical resolved current 1099-R copy",
      );
    }
  }
  return r;
}

/** A before-transfer aggregate valuation proves that funding can consume
 * taxable IRA dollars without consuming basis. Prior basis plus all current
 * nondeductible receipts already paid is an upper bound even if earlier
 * ordinary distributions recovered some basis. Never infer an IRA value from
 * the annual Form 5498 balance or subtract funding from basis pro rata. */
export function verifyIraHsaBasisPreserved2026(input: {
  prior_basis: number;
  contributions: { received_on: string; amount: number }[];
  accounts: { custodian_tin: string; account_number: string }[];
  transfers: { source_reference: string; paid_on: string; amount: number }[];
  valuations: z.output<typeof iraHsaValuation2026Schema>[];
}) {
  const key = (a: { custodian_tin: string; account_number: string }) =>
    `${a.custodian_tin}/${a.account_number}`;
  const accountKeys = new Set(input.accounts.map(key));
  if (
    new Set(input.valuations.map((v) => v.payment_reference)).size !==
      input.valuations.length ||
    input.valuations.some((v) =>
      !input.transfers.some((t) => t.source_reference === v.payment_reference)
    )
  ) {
    throw Error(
      "IRA HSA valuations must identify distinct actual funding payments",
    );
  }
  const documents = new Set<string>();
  return input.transfers.map((t) => {
    const basisUpperBound = sumSourceMoney([
      input.prior_basis,
      ...input.contributions.filter((c) => c.received_on <= t.paid_on).map((
        c,
      ) => c.amount),
    ]);
    const v = input.valuations.find((v) =>
      v.payment_reference === t.source_reference
    );
    if (!v && basisUpperBound === 0) {
      return {
        payment_reference: t.source_reference,
        basis_upper_bound: 0,
        basis_consumed: 0,
      };
    }
    if (
      !v || v.as_of !== t.paid_on || v.accounts.length !== accountKeys.size ||
      new Set(v.accounts.map(key)).size !== accountKeys.size ||
      v.accounts.some((a) => !accountKeys.has(key(a)))
    ) {
      throw Error(
        "IRA HSA funding with basis needs every owned account's value immediately before its actual payment",
      );
    }
    for (const a of v.accounts) {
      if (documents.has(a.source_document_reference)) {
        throw Error("IRA HSA valuation statements must be distinct");
      }
      documents.add(a.source_document_reference);
    }
    const value = sumSourceMoney(v.accounts.map((a) => a.fair_market_value));
    const available = Math.max(
      0,
      sourceCents(value) - sourceCents(basisUpperBound),
    );
    if (sourceCents(t.amount) > available) {
      throw Error(
        "IRA HSA funding may consume basis; a basis-depletion settlement is required",
      );
    }
    return {
      payment_reference: t.source_reference,
      basis_upper_bound: basisUpperBound,
      aggregate_value_before_transfer: value,
      taxable_amount_available: available / 100,
      basis_consumed: 0,
    };
  });
}
