import { z } from "zod";
import type { NodeOutput } from "../../../../core/types/tax-node.ts";
import { f1099int } from "../../nodes/inputs/income/investments/f1099int/index.ts";
import { f1099div } from "../../nodes/inputs/income/investments/f1099div/index.ts";
import {
  paperInputSchema as scheduleBSchema,
  schedule_b,
} from "../../nodes/intermediate/aggregation/income/investments/schedule_b/index.ts";
import {
  divItem2026Schema,
  intItem2026Schema,
  investmentOwner2026,
  investmentSum,
  reconcileDividends2026,
  reconcileInterest2026,
} from "./investment-source.ts";

import {
  foreignAccountReview2026Schema,
  prepareForeignAccounts2026,
} from "./foreign-accounts.ts";

const ctx = { taxYear: 2026, formType: "f1040" };
// Schedule B's $1,500 threshold is unchanged in the 2026 draft instructions.
// The 199A values are Rev. Proc. 2025-32 §4.26; this source contract rejects
// positive box 5. Its separate MFS threshold must be wired before enabling QBI.
const dividendConfig = {
  scheduleBDividendThreshold: 1500,
  sec199aSingleThreshold: 201750,
  sec199aMfjThreshold: 403500,
};

/** A calculation workpaper, not a registered return input or filing endpoint. */
export const investmentIncome2026Schema = investmentOwner2026.extend({
  f1099ints: z.array(intItem2026Schema).default([]),
  f1099divs: z.array(divItem2026Schema).default([]),
  foreign_accounts_question: z.boolean(),
  foreign_account_review: foreignAccountReview2026Schema.optional(),
  // Trust income, grantor ownership and Forms 3520/3520-A need separate routes.
  foreign_trust_question: z.literal(false),
}).strict();

function amount(outputs: NodeOutput[], node: string, field: string) {
  return investmentSum(
    outputs.filter((o) => o.nodeType === node).flatMap((o) => {
      const value = o.fields[field];
      if (value === undefined) return [];
      if (typeof value !== "number") {
        throw new Error(`Expected numeric ${node}.${field}`);
      }
      return [value];
    }),
  );
}

export function calculateInvestmentIncome2026(
  raw: z.input<typeof investmentIncome2026Schema>,
) {
  const input = investmentIncome2026Schema.parse(raw);
  const owner = {
    filing_status: input.filing_status,
    taxpayer_ssn: input.taxpayer_ssn,
    ...(input.spouse_ssn ? { spouse_ssn: input.spouse_ssn } : {}),
  };
  const foreignAccounts = input.foreign_account_review
    ? prepareForeignAccounts2026(input.foreign_account_review, owner, [
      ...input.f1099ints.map((i) => ({
        reference: i.source_document_reference,
        recipient_tin: i.recipient_tin,
        account_number: i.account_number,
      })),
      ...input.f1099divs.map((i) => ({
        reference: i.source_document_reference,
        recipient_tin: i.recipient_tin,
        account_number: i.account_number,
      })),
    ])
    : undefined;
  if (input.foreign_accounts_question !== Boolean(foreignAccounts)) {
    throw new Error(
      "Foreign account answer must match the reviewed account inventory",
    );
  }
  if (!input.f1099ints.length && !input.f1099divs.length && !foreignAccounts) {
    throw new Error(
      "Investment workpaper needs an issued copy or a foreign account disclosure",
    );
  }
  const interest = input.f1099ints.length
    ? reconcileInterest2026(input.f1099ints, owner)
    : undefined;
  const dividends = input.f1099divs.length
    ? reconcileDividends2026(input.f1099divs, owner)
    : undefined;
  const sourceOutputs = [
    ...(interest
      ? f1099int.compute(ctx, { f1099ints: interest.normalized }).outputs
      : []),
    ...(dividends
      ? f1099div.computeWithConfig(ctx, {
        f1099divs: dividends.normalized,
      }, dividendConfig).outputs
      : []),
  ];
  const bInputs: Record<string, unknown> = {
    foreign_accounts_question: input.foreign_accounts_question,
    foreign_trust_question: input.foreign_trust_question,
    ...(foreignAccounts
      ? {
        fincen_form114_required: foreignAccounts.fincen_form114_required,
        foreign_countries: foreignAccounts.foreign_countries,
      }
      : {}),
  };
  // Match executor accumulation, including dividend_info arrays. This keeps
  // below-threshold dividends informational on Schedule B, never routed twice.
  for (
    const output of sourceOutputs.filter((o) => o.nodeType === "schedule_b")
  ) {
    for (const [key, value] of Object.entries(output.fields)) {
      const previous = bInputs[key];
      bInputs[key] = previous === undefined ? value : [previous, value].flat();
    }
  }
  const scheduleBInput = scheduleBSchema.parse(bInputs);
  const bOutputs = schedule_b.computeForPaper(scheduleBInput).outputs;
  const all = [...sourceOutputs, ...bOutputs];
  const cents = {
    taxable_interest: amount(all, "f1040", "line2b_taxable_interest"),
    ordinary_dividends: amount(all, "f1040", "line3b_ordinary_dividends"),
    qualified_dividends: amount(all, "f1040", "line3a_qualified_dividends"),
    tax_exempt_interest: amount(all, "f1040", "line2a_tax_exempt"),
    federal_withholding: amount(all, "f1040", "line25b_withheld_1099"),
    early_withdrawal_penalty: amount(
      all,
      "schedule1",
      "line18_early_withdrawal",
    ),
    capital_gain_distributions: amount(
      all,
      "schedule_d",
      "line13_cap_gain_distrib",
    ),
    // Recompute from the retained 2026 copies: the shared INT AMT output
    // predates this contract's explicit gross/net PAB premium allocation.
    pab_interest: investmentSum([
      interest?.pabInterest ?? 0,
      dividends?.pabInterest ?? 0,
    ]),
    state_withholding: investmentSum([
      ...input.f1099ints.map((i) => i.box17),
      ...input.f1099divs.map((i) => i.box16),
    ]),
  };
  if (
    amount(all, "agi_aggregator", "line2b_taxable_interest") !==
      cents.taxable_interest ||
    amount(all, "agi_aggregator", "line3b_ordinary_dividends") !==
      cents.ordinary_dividends ||
    amount(all, "form8960", "line1_taxable_interest") !==
      cents.taxable_interest ||
    amount(all, "form8960", "line2_ordinary_dividends") !==
      cents.ordinary_dividends ||
    amount(all, "income_tax_calculation", "qualified_dividends") !==
      cents.qualified_dividends
  ) {
    throw new Error("Shared investment handoffs do not reconcile");
  }
  return {
    source_input: input,
    foreign_accounts: foreignAccounts,
    interest,
    dividends,
    cents,
    // Add sources contributing to the SAME printed line before rounding.
    lines: {
      line2a: Math.round(cents.tax_exempt_interest),
      line2b: Math.round(cents.taxable_interest),
      line3a: Math.round(cents.qualified_dividends),
      line3b: Math.round(cents.ordinary_dividends),
      capital_gain_distributions: Math.round(cents.capital_gain_distributions),
      investment_withholding: Math.round(cents.federal_withholding),
      early_withdrawal_penalty: Math.round(cents.early_withdrawal_penalty),
      amt_pab_interest: Math.round(cents.pab_interest),
    },
    schedule_b: {
      source_input: scheduleBInput,
      required: bOutputs.some((o) => o.nodeType === "schedule_b"),
      workpaper: bOutputs.find((o) => o.nodeType === "schedule_b")?.fields,
    },
    // State withholding retains the issued copies above. Schedule A must own
    // its election/limits. Gain distributions need the Schedule D inventory;
    // Form 8960 additionally needs reconciled MAGI and expense allocations.
    // Nothing here is dispatched to the runtime until those receivers exist.
  };
}
