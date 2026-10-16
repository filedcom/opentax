import { z } from "zod";
import { ForeignAssetType } from "../../nodes/inputs/general/foreign/f8938/index.ts";
import {
  isSourceMoney,
  sumSourceMoney,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";

const ref = z.string().trim().min(1), date = z.string().date();
const money = z.number().finite().nonnegative().max(1e9).refine(isSourceMoney);
const evidence = z.object({
  document_reference: ref,
  document_sha256: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();
const distributionBase = z.object({
  record_reference: ref,
  received_on: date,
  recipient_tin: z.string().regex(/^\d{9}$/),
  currency_code: z.string().regex(/^[A-Z]{3}$/),
  receipt_document: evidence,
}).strict();
const distribution = z.discriminatedUnion("kind", [
  distributionBase.extend({
    kind: z.literal("cash"),
    amount_native: money.refine((v) => v > 0),
  }).strict(),
  distributionBase.extend({
    kind: z.literal("property"),
    property_description: ref,
    valued_on: z.literal("2026-12-31"),
    year_end_fair_market_value_native: money,
    valuation_document: evidence,
  }).strict(),
]);
const knownReview = z.object({
  kind: z.literal("known"),
  source_document: evidence,
  available_fair_market_values_for_the_year_reviewed: z.literal(true),
}).strict();
const unknownReview = z.object({
  kind: z.literal("not_readily_accessible"),
  source_document: evidence,
  neither_known_nor_reason_to_know_from_readily_accessible_information_verified:
    z.literal(true),
}).strict();
const base = z.object({
  record_reference: ref,
  reviewed_on: date,
  reviewer_reference: ref,
  beneficiary_tin: z.string().regex(/^\d{9}$/),
  interest_and_beneficiary_document: evidence,
  complete_current_distribution_inventory_reviewed: z.literal(true),
  threshold_fmv_review: z.discriminatedUnion("kind", [
    knownReview,
    unknownReview,
  ]),
  distributions: z.array(distribution).max(1000),
}).strict();
const trust = base.extend({
  kind: z.literal("foreign_trust_beneficiary"),
  non_grantor_beneficial_interest_verified: z.literal(true),
  mandatory_distribution_rights: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("none"),
      governing_instrument_document: evidence,
      no_mandatory_distribution_right_at_year_end_verified: z.literal(true),
    }).strict(),
    z.object({
      kind: z.literal("section7520_valuation"),
      governing_instrument_document: evidence,
      valued_on: z.literal("2026-12-31"),
      value_native: money,
      section7520_valuation_document: evidence,
      applicable_section7520_tables_and_rate_reviewed: z.literal(true),
    }).strict(),
  ]),
}).strict();
const yearEndInterest = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("known"),
    valued_on: z.literal("2026-12-31"),
    value_native: money,
    source_document: evidence,
  }).strict(),
  unknownReview,
]);
const other = base.extend({ year_end_interest: yearEndInterest }).strict();
export const foreignBeneficialInterest2026Schema = z.discriminatedUnion(
  "kind",
  [
    trust,
    other.extend({ kind: z.literal("foreign_estate") }).strict(),
    other.extend({ kind: z.literal("foreign_pension") }).strict(),
    other.extend({ kind: z.literal("foreign_deferred_compensation") }).strict(),
  ],
);

/** 26 CFR 1.6038D-5(f)(2)-(3). This derives Form 8938 values from reviewed
 * distribution and valuation documents; it does not calculate a section 7520
 * actuarial appraisal or determine the income-tax treatment of distributions.
 */
export function prepareForeignBeneficialInterest2026(
  raw: z.input<typeof foreignBeneficialInterest2026Schema>,
  asset: {
    asset_type: ForeignAssetType;
    foreign_entity_type?: string;
    owner: string;
    owner_tin: string;
    currency_code: string;
    opened_or_acquired_date?: string;
    closed_or_disposed_date?: string;
  },
  reviewedOn: string,
) {
  const s = foreignBeneficialInterest2026Schema.parse(raw);
  if (
    !["taxpayer", "spouse"].includes(asset.owner) ||
    s.beneficiary_tin !== asset.owner_tin
  ) {
    throw Error(
      "Foreign beneficial-interest valuations need the actual individual owner; joint interests need separate ownership reconciliation",
    );
  }
  if (s.reviewed_on < "2026-12-31" || s.reviewed_on > reviewedOn) {
    throw Error(
      "Foreign beneficial-interest review must cover the completed year before the annual asset review",
    );
  }
  const isTrust = s.kind === "foreign_trust_beneficiary";
  const matches = isTrust
    ? [
      ForeignAssetType.ForeignTrustInterest,
      ForeignAssetType.ForeignEntityInterest,
    ].includes(asset.asset_type) && asset.foreign_entity_type === "trust"
    : s.kind === "foreign_estate"
    ? asset.asset_type === ForeignAssetType.ForeignEntityInterest &&
      asset.foreign_entity_type === "estate"
    : s.kind === "foreign_pension"
    ? asset.asset_type === ForeignAssetType.ForeignPensionInterest
    : [ForeignAssetType.OtherFinancialAccount, ForeignAssetType.Other].includes(
      asset.asset_type,
    );
  if (!matches) {
    throw Error(
      "Foreign beneficial-interest workpaper does not match the asset classification",
    );
  }
  const documents = [
    s.interest_and_beneficiary_document,
    s.threshold_fmv_review.source_document,
  ];
  const references = [s.record_reference];
  const distributions = s.distributions.map((r) => {
    references.push(r.record_reference);
    documents.push(r.receipt_document);
    if (
      r.recipient_tin !== s.beneficiary_tin ||
      r.currency_code !== asset.currency_code ||
      !r.received_on.startsWith("2026-") ||
      asset.opened_or_acquired_date &&
        r.received_on < asset.opened_or_acquired_date ||
      asset.closed_or_disposed_date &&
        r.received_on > asset.closed_or_disposed_date
    ) {
      throw Error(
        "Foreign beneficial distributions need the actual beneficiary, currency and current holding-period receipt date",
      );
    }
    if (r.kind === "property") documents.push(r.valuation_document);
    return {
      record_reference: r.record_reference,
      kind: r.kind,
      received_on: r.received_on,
      year_end_value_native: r.kind === "cash"
        ? r.amount_native
        : r.year_end_fair_market_value_native,
    };
  });
  if (new Set(references).size !== references.length) {
    throw Error(
      "Foreign beneficial-interest workpaper repeats a source record",
    );
  }
  const distributed = sumSourceMoney(
    distributions.map((r) => r.year_end_value_native),
  );
  let mandatory = 0;
  let reported: number;
  if (s.kind === "foreign_trust_beneficiary") {
    const rights = s.mandatory_distribution_rights;
    documents.push(rights.governing_instrument_document);
    if (rights.kind === "section7520_valuation") {
      documents.push(rights.section7520_valuation_document);
      mandatory = rights.value_native;
      if (asset.closed_or_disposed_date && mandatory > 0) {
        throw Error(
          "A terminated foreign trust interest cannot retain mandatory rights at year end",
        );
      }
    }
    reported = sumSourceMoney([distributed, mandatory]);
  } else {
    documents.push(s.year_end_interest.source_document);
    // Mixed availability needs individual-date valuation treatment; an annual
    // unknown-value review cannot override a reviewed known year-end interest.
    if (s.threshold_fmv_review.kind !== s.year_end_interest.kind) {
      throw Error(
        "Mixed known and unknown foreign beneficial-interest values need a reconciled annual availability workpaper",
      );
    }
    reported = s.year_end_interest.kind === "known"
      ? s.year_end_interest.value_native
      : distributed;
    if (
      asset.closed_or_disposed_date && s.year_end_interest.kind === "known" &&
      reported > 0
    ) {
      throw Error(
        "A terminated foreign beneficial interest must have zero known year-end value",
      );
    }
  }
  return {
    source: s,
    documents,
    record_references: references,
    distribution_rows: distributions,
    distributions_year_end_native: distributed,
    mandatory_rights_year_end_native: mandatory,
    reported_maximum_native: reported,
    threshold_fmv_known: s.threshold_fmv_review.kind === "known",
    threshold_fallback_native:
      s.threshold_fmv_review.kind === "not_readily_accessible"
        ? reported
        : undefined,
    reported_value_basis: isTrust
      ? "distributions_plus_mandatory_rights" as const
      : s.year_end_interest.kind === "known"
      ? "year_end_beneficial_interest" as const
      : "distributions_fallback" as const,
  };
}
