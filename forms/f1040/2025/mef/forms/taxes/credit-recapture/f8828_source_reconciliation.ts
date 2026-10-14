import type { FilerIdentity } from "../../../../../mef/header.ts";
import {
  computeF8828Lines,
  type F8828Item,
  inputSchema as f8828InputSchema,
} from "../../../../../nodes/inputs/taxes/credit-recapture/f8828/index.ts";
import {
  inputSchema as form8949InputSchema,
} from "../../../../../nodes/intermediate/forms/income/investments/form8949/index.ts";

function sameAddress(
  a: F8828Item["property_address"],
  b: F8828Item["property_address"],
): boolean {
  return a.line1 === b.line1 && (a.line2 ?? "") === (b.line2 ?? "") &&
    a.city === b.city && a.state === b.state && a.zip === b.zip;
}

function assertReviewedRecords(item: F8828Item): void {
  const issuer = item.reviewed_issuer;
  const conventional = item.reviewed_conventional_refinance;
  if (
    conventional && (
      conventional.refinance_settlement_reference ===
        conventional.original_loan_payoff_reference ||
      conventional.refinance_settlement_reference ===
        issuer.document_reference ||
      conventional.original_loan_payoff_reference ===
        issuer.document_reference ||
      conventional.original_issuer_notification_reference !==
        issuer.document_reference ||
      conventional.borrower_ssn !== issuer.borrower_ssn ||
      conventional.refinance_date !== item.full_repayment_date ||
      !sameAddress(conventional.property_address, item.property_address)
    )
  ) {
    throw new Error(
      "Form 8828 conventional refinance records differ from issuer, payoff, or property",
    );
  }
  const owners = item.reviewed_coownership;
  const expectedHighestLoan = owners
    ? owners.whole_highest_federally_subsidized_loan_amount
    : item.highest_federally_subsidized_loan_amount;
  const expectedIssuerAmount = owners
    ? owners.whole_issuer_federally_subsidized_amount
    : item.issuer_federally_subsidized_amount;
  if (
    issuer.issuer_name !== item.issuer_name ||
    issuer.issuer_state !== item.issuer_state ||
    issuer.issuer_type !== item.issuer_type ||
    issuer.original_loan_closing_date !== item.original_loan_closing_date ||
    issuer.highest_federally_subsidized_loan_amount !== expectedHighestLoan ||
    issuer.federally_subsidized_amount !== expectedIssuerAmount ||
    issuer.adjusted_qualifying_income !== item.adjusted_qualifying_income ||
    issuer.holding_period_percentage !== item.issuer_holding_period_percentage
  ) {
    throw new Error(
      "Form 8828 issuer calculation facts differ from the reviewed notification",
    );
  }
  const disposition = item.reviewed_disposition;
  if (
    disposition.source_transaction_id !== item.source_transaction_id ||
    !sameAddress(disposition.property_address, item.property_address) ||
    disposition.disposition_date !== item.disposition_date ||
    disposition.sales_price_of_interest !== item.sales_price_of_interest ||
    disposition.selling_expenses !== item.selling_expenses ||
    disposition.adjusted_basis_of_interest !==
      item.adjusted_basis_of_interest ||
    disposition.gain_included_in_gross_income !==
      item.home_gain_included_in_gross_income
  ) {
    throw new Error(
      "Form 8828 property, disposition, basis or gain differs from reviewed disposition records",
    );
  }
  const gain = computeF8828Lines(item).line13_gain_or_loss;
  if (
    disposition.gain_included_in_gross_income > Math.max(0, gain) ||
    (item.disposition_kind === "sale" && gain > 0 &&
      disposition.gain_included_in_gross_income === 0 &&
      !disposition.exclusion_record_reference)
  ) {
    throw new Error(
      "Form 8828 fully excluded sale needs reviewed exclusion evidence",
    );
  }
}

function linkedForm8949Transactions(
  pending: Readonly<Record<string, unknown>>,
) {
  const raw = pending.form8949;
  if (raw === undefined) return [];
  const source = form8949InputSchema.parse(raw);
  const nested = source.transaction === undefined
    ? []
    : Array.isArray(source.transaction)
    ? source.transaction
    : [source.transaction];
  return nested;
}

/** Validate reviewed facts and the exact final-return destinations before registration. */
export function reconcileForm8828Sources(
  items: readonly F8828Item[],
  pending?: Readonly<Record<string, unknown>>,
  filer?: FilerIdentity,
): void {
  const seenTransactions = new Set<string>();
  const ownerIds = filer
    ? new Set([
      filer.primarySSN.replace(/\D/g, ""),
      filer.spouse?.ssn.replace(/\D/g, ""),
    ])
    : undefined;
  for (const item of items) {
    assertReviewedRecords(item);
    if (seenTransactions.has(item.source_transaction_id)) {
      throw new Error("Form 8828 property disposition identity must be unique");
    }
    seenTransactions.add(item.source_transaction_id);
    if (
      ownerIds &&
      (!ownerIds.has(item.reviewed_disposition.owner_ssn) ||
        !ownerIds.has(item.reviewed_issuer.borrower_ssn))
    ) {
      throw new Error(
        "Form 8828 reviewed owner and borrower must identify a return filer",
      );
    }
  }
  if (!pending) return;
  if (pending.f8828 !== undefined) {
    const preparedItems = f8828InputSchema.parse(pending.f8828).f8828s;
    if (JSON.stringify(preparedItems) !== JSON.stringify(items)) {
      throw new Error("Form 8828 reviewed source differs from prepared return");
    }
  }
  const f1040 = pending.f1040 as Record<string, unknown> | undefined;
  const schedule2 = pending.schedule2 as Record<string, unknown> | undefined;
  if (!f1040 || !schedule2) {
    throw new Error("Form 8828 needs Form 1040 and Schedule 2 destinations");
  }
  if (
    items.some((item) =>
      item.adjusted_gross_income !== f1040.line11_agi ||
      item.tax_exempt_interest !== (f1040.line2a_tax_exempt ?? 0)
    )
  ) {
    throw new Error(
      "Form 8828 modified AGI sources must match Form 1040 lines 11 and 2a",
    );
  }
  const totalTax = items.reduce(
    (sum, item) => sum + computeF8828Lines(item).line23_tax,
    0,
  );
  if (totalTax !== (schedule2.line17b_mortgage_subsidy_recapture ?? 0)) {
    throw new Error("Form 8828 line 23 total must match Schedule 2 line 17b");
  }
  const transactions = linkedForm8949Transactions(pending);
  for (const item of items) {
    const taxableGain = item.home_gain_included_in_gross_income;
    if (taxableGain <= 0 || item.disposition_kind === "gift") continue;
    const matches = transactions.filter((tx) =>
      tx.source_transaction_id === item.source_transaction_id
    );
    if (matches.length !== 1) {
      throw new Error(
        "Form 8828 taxable home gain needs one exact linked Form 8949 row",
      );
    }
    const tx = matches[0];
    if (
      tx.date_sold !== item.disposition_date ||
      tx.proceeds !== item.sales_price_of_interest - item.selling_expenses ||
      tx.cost_basis !== item.adjusted_basis_of_interest ||
      tx.gain_loss !== taxableGain ||
      (tx.adjustment_amount ?? 0) !==
        taxableGain - computeF8828Lines(item).line13_gain_or_loss ||
      (taxableGain < computeF8828Lines(item).line13_gain_or_loss &&
        !tx.adjustment_codes?.includes("H")) ||
      !tx.is_long_term
    ) {
      throw new Error(
        "Form 8828 taxable gain differs from its linked Form 8949 sale row",
      );
    }
  }
}
