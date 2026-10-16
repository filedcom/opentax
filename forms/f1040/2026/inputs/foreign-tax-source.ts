import { z } from "zod";
import {
  ForeignTaxKind,
  IncomeCategory,
} from "../../nodes/intermediate/forms/credits/foreign/form_1116/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import {
  divItem2026Schema,
  intItem2026Schema,
  investmentOwner2026,
  reconcileDividends2026,
  reconcileInterest2026,
} from "./investment-source.ts";
import {
  foreignDecimalUnits,
  foreignTranslatedCents,
} from "./foreign-bank-interest.ts";

const ref = z.string().trim().min(1).max(200);
const document = z.object({
  document_reference: ref,
  document_sha256: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();
const amount = z.string().regex(/^(0|[1-9]\d{0,8})(\.\d{1,6})?$/);
const positive = amount.refine((v) => Number(v) > 0);
const usd = z.number().finite().nonnegative().max(1e9).refine((v) =>
  Math.abs(v * 100 - Math.round(v * 100)) < .00001
);
const rate = z.string().regex(/^(0|[1-9]\d{0,5})(\.\d{1,8})?$/)
  .refine((v) => Number(v) > 0 && Number(v) <= 100000);
const category = z.union([z.nativeEnum(IncomeCategory), z.literal("lump_sum")]);
const taxKind = z.union([z.nativeEnum(ForeignTaxKind), z.literal("ptep")]);
// September 28, 2026 draft instructions, Part II: do not use the old single 951A group.
const ptepGroup = z.enum([
  "R965a",
  "R965b",
  "959c1",
  "RPR951A",
  "RPO951A",
  "R245Ad",
  "965a",
  "965b",
  "PR951A",
  "PO951A",
  "245Ad",
  "951a1A",
]);
const allocation = z.object({
  record_reference: ref,
  income_category: category,
  country_name: ref,
  tax_kind: taxKind,
  ptep_group: ptepGroup.optional(),
  income_source_references: z.array(ref).min(1).max(1000),
  // Source denomination: original currency for payments, issued USD for 1099 copies.
  amount_native: positive,
  // These are reductions to taxes actually paid, not deemed-paid taxes.
  reduction_native: amount.default("0"),
  reduction_document: document.optional(),
  reduction_treatment: z.enum([
    "part_ii_ptep_965g_960d4",
    "part_ii_noncreditable",
    "line12",
  ]).optional(),
  allocation_document: document,
  creditability_review: z.object({
    source_document: document,
    legal_actual_taxpayer_compulsory_income_tax_or_in_lieu_tax_reviewed: z
      .literal(true),
    holding_period_related_payments_subsidies_and_other_section901_disallowances_reviewed:
      z.literal(true),
    all_disallowed_amounts_identified_in_reduction: z.literal(true),
    excluded_income_and_other_line12_reductions_reviewed: z.literal(true),
  }).strict(),
}).strict();
const payment = z.object({
  kind: z.literal("foreign_tax_payment"),
  record_reference: ref,
  taxpayer_tin: z.string().regex(/^\d{9}$/),
  country_name: ref,
  taxing_authority_reference: ref,
  payment_transaction_reference: ref,
  paid_or_withheld_on: z.string().date(),
  foreign_liability_reference: ref,
  currency_code: z.string().regex(/^[A-Z]{3}$/),
  gross_tax_native: positive,
  source_document: document,
  fx: z.object({
    rate_date: z.string().date(),
    usd_per_currency_unit: rate,
    rate_source_reference: ref,
    conversion_explanation: z.string().trim().min(1).max(9000),
    payment_date_prevailing_rate_verified: z.literal(true),
    source_document: document,
  }).strict(),
  complete_payment_allocation_reviewed: z.literal(true),
  // Foreign-tax-base allocation is a retained workpaper, not inferred from US AGI.
  allocation_based_on_foreign_tax_base_by_category_reviewed: z.literal(true),
  allocations: z.array(allocation).min(1).max(1000),
}).strict();
const statementCommon = {
  record_reference: ref,
  allocations: z.array(allocation).min(1).max(1000),
  // Issued-box USD amounts use the instructions' 1099-taxes exception, with no invented native amount or payment date.
  complete_country_and_income_allocation_on_issued_copy_reviewed: z.literal(
    true,
  ),
};
const intStatement = z.object({
  kind: z.literal("issued_1099_int"),
  ...statementCommon,
  copy: intItem2026Schema.extend({
    box6: usd.refine((v) => v > 0),
    source_document_sha256: z.string().regex(/^[0-9a-f]{64}$/),
  }),
}).strict();
const divStatement = z.object({
  kind: z.literal("issued_1099_div"),
  ...statementCommon,
  copy: divItem2026Schema.extend({
    box7: usd.refine((v) => v > 0),
    source_document_sha256: z.string().regex(/^[0-9a-f]{64}$/),
  }),
}).strict();

/** Source workpaper only. Public investment intake remains gated until credit,
 * deduction, AMT, and return-line consumers can use these taxes exactly once. */
export const foreignTaxSource2026Schema = investmentOwner2026.extend({
  claim: z.object({
    tax_year: z.literal(2026),
    record_reference: ref,
    reviewed_on: z.string().date(),
    reviewer_reference: ref,
    review_document: document,
    election: z.enum([
      "credit_with_form1116",
      "credit_without_form1116",
      "itemized_deduction",
    ]),
    accounting_method: z.literal("paid"),
    usd_functional_currency_without_qbu_conversion: z.literal(true),
    paid_method_consistent_with_prior_elections_reviewed: z.literal(true),
    all_current_foreign_tax_sources_and_owners_included: z.literal(true),
    no_refund_redetermination_contested_tax_or_released_section909_tax: z
      .literal(true),
    no_tax_payment_previously_credited_or_deducted: z.literal(true),
    sources: z.array(
      z.discriminatedUnion("kind", [payment, intStatement, divStatement]),
    ).min(1).max(1000),
  }).strict(),
}).strict();
export type ForeignTaxSource2026 = z.input<typeof foreignTaxSource2026Schema>;
const nativeUnits = (v: string) => {
  const [n, scale] = foreignDecimalUnits(v);
  return n * (1_000_000n / scale);
};

function decimalNative(units: bigint): string {
  const digits = units.toString().padStart(7, "0");
  return `${digits.slice(0, -6)}.${digits.slice(-6)}`.replace(/0+$/, "")
    .replace(/\.$/, "");
}

/** Split the translated payment cents without creating or losing a cent.
 * Largest remainders break ties in retained source order. */
function apportionedCents(total: number, weights: bigint[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0n);
  const products = weights.map((w) => BigInt(total) * w);
  const result = products.map((p) => Number(p / sum));
  const order = products.map((p, i) => ({ i, remainder: p % sum })).sort((
    a,
    b,
  ) =>
    a.remainder === b.remainder ? a.i - b.i : a.remainder > b.remainder ? -1 : 1
  );
  const left = total - result.reduce((a, b) => a + b, 0);
  for (let i = 0; i < left; i++) result[order[i].i]++;
  return result;
}

export function prepareForeignTaxSources2026(raw: ForeignTaxSource2026) {
  const source = foreignTaxSource2026Schema.parse(raw),
    { claim, ...owner } = source;
  const owners = new Set([source.taxpayer_ssn]);
  if (source.filing_status === FilingStatus.MFJ) {
    if (!source.spouse_ssn || source.spouse_ssn === source.taxpayer_ssn) {
      throw Error("Foreign taxes need two distinct joint return owners");
    }
    owners.add(source.spouse_ssn);
  }
  if (claim.reviewed_on < "2026-12-31") {
    throw Error("Foreign taxes need a completed annual inventory review");
  }
  const records = new Set<string>(),
    identities = new Set<string>(),
    hashes = new Map<string, string>();
  const record = (r: string) => {
    if (records.has(r)) {
      throw Error("Duplicate foreign-tax source or allocation reference");
    }
    records.add(r);
  };
  const checkDocument = (d: z.infer<typeof document>) => {
    if (
      hashes.has(d.document_reference) &&
      hashes.get(d.document_reference) !== d.document_sha256
    ) throw Error("Foreign-tax document reference has conflicting hashes");
    hashes.set(d.document_reference, d.document_sha256);
  };
  record(claim.record_reference);
  checkDocument(claim.review_document);
  const receipts = claim.sources.map((s) => {
    record(s.record_reference);
    const taxpayer = s.kind === "foreign_tax_payment"
      ? s.taxpayer_tin
      : s.copy.recipient_tin;
    if (!owners.has(taxpayer)) {
      throw Error("Foreign tax must belong to an actual return filer");
    }
    const isPayment = s.kind === "foreign_tax_payment";
    let cents: number, originalNative: bigint;
    let identity: unknown[];
    if (isPayment) {
      if (
        !s.paid_or_withheld_on.startsWith("2026-") ||
        s.paid_or_withheld_on > claim.reviewed_on ||
        s.fx.rate_date !== s.paid_or_withheld_on
      ) throw Error("Paid foreign tax needs its actual 2026 payment-date rate");
      if (
        s.currency_code === "USD" && Number(s.fx.usd_per_currency_unit) !== 1
      ) throw Error("USD foreign tax must use a unit exchange rate");
      cents = foreignTranslatedCents(
        s.gross_tax_native,
        s.fx.usd_per_currency_unit,
      );
      originalNative = nativeUnits(s.gross_tax_native);
      identity = [
        taxpayer,
        s.taxing_authority_reference,
        s.payment_transaction_reference,
      ];
      checkDocument(s.source_document);
      checkDocument(s.fx.source_document);
    } else {
      // Reuse the issued-copy income validation with only the tax box removed
      // from that income-only projection. The original taxed copy stays retained.
      if (s.kind === "issued_1099_int") {
        reconcileInterest2026([{ ...s.copy, box6: 0 }], owner);
      } else reconcileDividends2026([{ ...s.copy, box7: 0 }], owner);
      cents = Math.round(
        (s.kind === "issued_1099_int" ? s.copy.box6 : s.copy.box7) * 100,
      );
      originalNative = BigInt(cents) * 10000n;
      identity = [
        s.kind,
        taxpayer,
        s.kind === "issued_1099_int" ? s.copy.payer_tin : s.copy.payerTin,
        s.copy.account_number,
      ];
      checkDocument({
        document_reference: s.copy.source_document_reference,
        document_sha256: s.copy.source_document_sha256,
      });
    }
    const key = JSON.stringify(identity);
    if (identities.has(key)) {
      throw Error("Duplicate foreign tax payment or issued account copy");
    }
    identities.add(key);
    const weights = s.allocations.map((a) => nativeUnits(a.amount_native));
    if (weights.reduce((a, b) => a + b, 0n) !== originalNative) {
      throw Error(
        "Foreign tax allocations must reconcile to the complete original payment or issued box",
      );
    }
    const reductions = s.allocations.map((a) =>
      nativeUnits(a.reduction_native)
    );
    for (const [i, a] of s.allocations.entries()) {
      record(a.record_reference);
      checkDocument(a.allocation_document);
      checkDocument(a.creditability_review.source_document);
      if (
        new Set(a.income_source_references).size !==
          a.income_source_references.length
      ) throw Error("Foreign tax allocation has duplicate income references");
      if (reductions[i] > weights[i]) {
        throw Error("Foreign tax reduction exceeds its source allocation");
      }
      if (
        reductions[i] > 0 && (!a.reduction_document || !a.reduction_treatment)
      ) {
        throw Error("Foreign tax reduction needs its source workpaper");
      }
      if (a.reduction_document) checkDocument(a.reduction_document);
      if (isPayment && a.country_name !== s.country_name) {
        throw Error("Payment tax country must match its allocation countries");
      }
      if (
        a.reduction_treatment === "part_ii_ptep_965g_960d4" &&
        a.tax_kind !== "ptep"
      ) throw Error("PTEP reduction needs a PTEP tax allocation");
      if ((a.tax_kind === "ptep") !== Boolean(a.ptep_group)) {
        throw Error("PTEP tax allocations need exactly one current group code");
      }
      if (
        !isPayment &&
        (a.income_source_references.length !== 1 ||
          a.income_source_references[0] !== s.copy.source_document_reference)
      ) {
        throw Error(
          "Issued foreign tax must reference the same issued income copy",
        );
      }
      if (
        !isPayment &&
        (a.income_category !== IncomeCategory.Passive ||
          a.tax_kind !==
            (s.kind === "issued_1099_int"
              ? ForeignTaxKind.Interest
              : ForeignTaxKind.Dividends))
      ) {
        throw Error(
          "The 1099-taxes exception needs matching passive statement income",
        );
      }
    }
    // Split each allocation into allowed/reduced components before apportioning
    // so both the Part II total and the reduction ledger conserve source cents.
    const portions = apportionedCents(
      cents,
      weights.flatMap((w, i) => [w - reductions[i], reductions[i]]),
    );
    return {
      source_reference: s.record_reference,
      taxpayer_tin: taxpayer,
      country_name: isPayment ? s.country_name : undefined,
      paid_or_accrued_label: isPayment ? s.paid_or_withheld_on : "1099 taxes",
      currency_code: isPayment ? s.currency_code : undefined,
      original_tax_native: isPayment ? s.gross_tax_native : undefined,
      gross_tax_usd: cents / 100,
      conversion_explanation: isPayment
        ? s.fx.conversion_explanation
        : undefined,
      allocations: s.allocations.map((a, i) => ({
        ...a,
        gross_tax_usd: (portions[2 * i] + portions[2 * i + 1]) / 100,
        reduction_usd: portions[2 * i + 1] / 100,
        tax_after_reviewed_reductions_usd: portions[2 * i] / 100,
      })),
    };
  });
  const rows = receipts.flatMap((receipt) =>
    receipt.allocations.map((a) => ({
      ...a,
      source_reference: receipt.source_reference,
      taxpayer_tin: receipt.taxpayer_tin,
      country_name: a.country_name,
      paid_or_accrued_label: receipt.paid_or_accrued_label,
      currency_code: receipt.currency_code,
      // PTEP reductions under 965(g)/960(d)(4) belong before Part II, unlike line-12 reductions.
      part_ii_tax_native: receipt.currency_code
        ? decimalNative(
          nativeUnits(a.amount_native) -
            (a.reduction_treatment?.startsWith("part_ii_")
              ? nativeUnits(a.reduction_native)
              : 0n),
        )
        : undefined,
      part_ii_tax_usd: a.reduction_treatment?.startsWith("part_ii_")
        ? a.tax_after_reviewed_reductions_usd
        : a.gross_tax_usd,
      line12_reduction_usd: a.reduction_treatment === "line12"
        ? a.reduction_usd
        : 0,
    }))
  );
  const sum = (values: number[]) => {
    const cents = values.reduce((n, v) => n + Math.round(v * 100), 0);
    if (!Number.isSafeInteger(cents)) {
      throw Error("Foreign-tax total exceeds exact USD cents");
    }
    return cents / 100;
  };
  const categories = [...new Set(rows.map((r) => r.income_category))].map(
    (income_category) => {
      const items = rows.filter((r) => r.income_category === income_category);
      return {
        income_category,
        rows: items,
        gross_tax_usd: sum(items.map((r) => r.gross_tax_usd)),
        reviewed_reductions_usd: sum(items.map((r) => r.reduction_usd)),
        tax_after_reviewed_reductions_usd: sum(
          items.map((r) => r.tax_after_reviewed_reductions_usd),
        ),
      };
    },
  );
  return {
    source_input: source,
    receipts,
    categories,
    documents: [...hashes].map(([document_reference, document_sha256]) => ({
      document_reference,
      document_sha256,
    })),
    gross_tax_usd: sum(receipts.map((r) => r.gross_tax_usd)),
    requires_income_and_return_binding: true as const,
    requires_creditability_and_reduction_line_binding: true as const,
    requires_election_eligibility_and_carryover_review: true as const,
    filing_ready: false as const,
  };
}
