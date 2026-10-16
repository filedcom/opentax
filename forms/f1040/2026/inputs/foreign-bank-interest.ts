import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import { investmentOwner2026, investmentSum } from "./investment-source.ts";

const ref = z.string().trim().min(1);
const document = z.object({
  document_reference: ref,
  document_sha256: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();
// Decimal strings retain the bank's precision, including currencies with
// sub-cent minor units. Do not coerce or round an over-precise source value.
const nativeAmount = z.string().regex(/^(0|[1-9]\d{0,8})(\.\d{1,6})?$/)
  .refine((v) => Number(v) > 0);
const fxRate = z.string().regex(/^(0|[1-9]\d{0,5})(\.\d{1,8})?$/)
  .refine((v) => Number(v) > 0 && Number(v) <= 100000);

export const foreignBankInterest2026Schema = z.object({
  tax_year: z.literal(2026),
  record_reference: ref,
  foreign_account_reference: ref,
  recipient_tin: z.string().regex(/^\d{9}$/),
  institution_name: z.string().trim().min(1).max(120).regex(/^[\x20-\x7e]+$/),
  account_number: ref,
  country_name: z.string().trim().min(1).max(90).regex(/^[\x20-\x7e]+$/),
  currency_code: z.string().regex(/^[A-Z]{3}$/),
  reviewed_on: z.string().date(),
  reviewer_reference: ref,
  annual_review_document: document,
  annual_interest_summary: z.object({
    gross_interest_native: nativeAmount,
    source_document: document,
  }).strict(),
  cash_method_usd_functional_currency: z.literal(true),
  complete_current_year_interest_inventory_for_account_currency: z.literal(
    true,
  ),
  ordinary_taxable_deposit_interest_without_oid_or_other_adjustments: z.literal(
    true,
  ),
  all_interest_reportable_by_named_recipient_without_nominee_allocation: z
    .literal(true),
  no_1099_or_other_source_duplicates_these_receipts: z.literal(true),
  no_section988_disposition_or_other_account_income_pending: z.literal(true),
  receipts: z.array(
    z.object({
      record_reference: ref,
      bank_transaction_reference: ref,
      received_or_available_on: z.string().date(),
      credited_and_available_without_restriction_verified: z.literal(true),
      gross_interest_native: nativeAmount,
      // Positive foreign tax needs a separately reviewed deduction/credit route.
      foreign_tax_withheld_native: z.literal("0"),
      source_document: document,
      fx: z.object({
        rate_date: z.string().date(),
        usd_per_currency_unit: fxRate,
        source: z.enum(["bank", "published_spot_rate", "usd_no_conversion"]),
        rate_source_reference: ref,
        prevailing_receipt_date_rate_reviewed: z.literal(true),
        source_document: document,
      }).strict(),
    }).strict(),
  ).min(1).max(10000),
}).strict();

export function foreignDecimalUnits(value: string): [bigint, bigint] {
  const [whole, fraction = ""] = value.split(".");
  return [BigInt(whole + fraction), 10n ** BigInt(fraction.length)];
}
export function foreignTranslatedCents(native: string, rate: string): number {
  const [n, ns] = foreignDecimalUnits(native),
    [r, rs] = foreignDecimalUnits(rate);
  const denominator = ns * rs;
  const cents = (n * r * 100n * 2n + denominator) / (denominator * 2n);
  const result = Number(cents);
  if (!Number.isSafeInteger(result)) {
    throw new Error("Foreign interest exceeds exact USD cent range");
  }
  return result;
}

/** Actual bank records feed Schedule B directly, without constructing a 1099. */
export function calculateForeignBankInterest2026(
  raw: z.input<typeof foreignBankInterest2026Schema>[],
  rawOwner: z.input<typeof investmentOwner2026>,
) {
  const sources = z.array(foreignBankInterest2026Schema).parse(raw);
  const owner = investmentOwner2026.parse(rawOwner);
  const owners = new Set([owner.taxpayer_ssn]);
  if (owner.filing_status === FilingStatus.MFJ) {
    if (!owner.spouse_ssn || owner.spouse_ssn === owner.taxpayer_ssn) {
      throw new Error(
        "Joint foreign interest needs two distinct return filers",
      );
    }
    owners.add(owner.spouse_ssn);
  }
  const records = new Set<string>(), inventories = new Set<string>();
  const documents = new Map<string, string>();
  const checkDocument = (d: z.infer<typeof document>) => {
    if (
      documents.has(d.document_reference) &&
      documents.get(d.document_reference) !== d.document_sha256
    ) {
      throw new Error(
        "Foreign interest document reference has conflicting hashes",
      );
    }
    documents.set(d.document_reference, d.document_sha256);
  };
  const record = (ref: string) => {
    if (records.has(ref)) {
      throw new Error("Duplicate foreign interest source or receipt reference");
    }
    records.add(ref);
  };
  const ledgers = sources.map((source) => {
    record(source.record_reference);
    if (!owners.has(source.recipient_tin)) {
      throw new Error(
        "Foreign interest recipient must be an actual return filer",
      );
    }
    if (source.reviewed_on < "2026-12-31") {
      throw new Error(
        "Foreign interest needs a completed 2026 inventory review",
      );
    }
    const key = JSON.stringify([
      source.recipient_tin,
      source.foreign_account_reference,
      source.currency_code,
    ]);
    if (inventories.has(key)) {
      throw new Error(
        "Duplicate annual foreign interest account/currency inventory",
      );
    }
    inventories.add(key);
    checkDocument(source.annual_review_document);
    checkDocument(source.annual_interest_summary.source_document);
    // Reconcile the original currency before any exchange-rate conversion or
    // cent rounding, so omitted receipts cannot be concealed by USD totals.
    const nativeUnits = (value: string) => {
      const [n, scale] = foreignDecimalUnits(value);
      return n * (1_000_000n / scale);
    };
    if (
      source.receipts.reduce(
        (sum, r) => sum + nativeUnits(r.gross_interest_native),
        0n,
      ) !==
        nativeUnits(source.annual_interest_summary.gross_interest_native)
    ) {
      throw new Error(
        "Bank interest receipts do not reconcile to the original-currency annual statement total",
      );
    }
    const transactions = new Set<string>();
    const receipts = source.receipts.map((receipt) => {
      record(receipt.record_reference);
      if (transactions.has(receipt.bank_transaction_reference)) {
        throw new Error("Duplicate bank interest transaction");
      }
      transactions.add(receipt.bank_transaction_reference);
      if (
        receipt.received_or_available_on < "2026-01-01" ||
        receipt.received_or_available_on > "2026-12-31"
      ) {
        throw new Error("Foreign interest receipt must be available in 2026");
      }
      if (receipt.fx.rate_date !== receipt.received_or_available_on) {
        throw new Error(
          "Interest needs its receipt-date FX rate, not an asset valuation rate",
        );
      }
      if (
        (source.currency_code === "USD") !==
          (receipt.fx.source === "usd_no_conversion") ||
        (source.currency_code === "USD" &&
          Number(receipt.fx.usd_per_currency_unit) !== 1)
      ) {
        throw new Error("USD bank interest uses a no-conversion rate of one");
      }
      checkDocument(receipt.source_document);
      checkDocument(receipt.fx.source_document);
      const usdCents = foreignTranslatedCents(
        receipt.gross_interest_native,
        receipt.fx.usd_per_currency_unit,
      );
      return { ...receipt, amount_usd: usdCents / 100 };
    });
    const amount = investmentSum(receipts.map((r) => r.amount_usd));
    return { source_input: source, receipts, taxable_interest_usd: amount };
  });
  return {
    source_input: sources,
    ledgers,
    taxable_interest_usd: investmentSum(
      ledgers.map((l) => l.taxable_interest_usd),
    ),
    schedule_b_rows: ledgers.map((l) => ({
      payer_name: l.source_input.institution_name,
      gross: l.taxable_interest_usd,
      net: l.taxable_interest_usd,
      nominee: 0,
      accrued: 0,
      oid_adjustment: 0,
      bond_premium: 0,
    })),
    // Retained receipt provenance is available for subsequent Form 8938 binding.
    income_items: ledgers.flatMap((l) =>
      l.receipts.map((receipt) => ({
        return_source_reference: receipt.record_reference,
        foreign_account_reference: l.source_input.foreign_account_reference,
        ledger_reference: l.source_input.record_reference,
        recipient_tin: l.source_input.recipient_tin,
        kind: "interest" as const,
        amount_usd: receipt.amount_usd,
        source_document: receipt.source_document,
      }))
    ),
    documents: [...documents].map(([document_reference, document_sha256]) => ({
      document_reference,
      document_sha256,
    })),
  };
}
