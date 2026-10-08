import { z } from "zod";
import { sha256Hex } from "../../../2025/domains/execution/prepared-source.ts";
import { assertForm8814SourceReview, itemSchema } from "./index.ts";

const issuerReviewSchema = z.object({
  tax_year: z.literal(2025),
  form_kind: z.literal("1099_int"),
  issuer_tin: z.string().regex(/^\d{9}$/),
  child_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  source_document_reference: z.string().trim().min(1),
  source_document_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  box1_taxable_interest: z.number().int().positive(),
  no_other_reportable_boxes_or_adjustments: z.literal(true),
}).strict();

export const form8814PlainInterestIssuerPacketSchema = z.object({
  packet_reference: z.string().trim().min(1),
  issuers: z.array(issuerReviewSchema).min(1),
}).strict();

export type Form8814IssuerCopy = Readonly<{
  source_document_reference: string;
  bytes: Uint8Array;
}>;

/** Bind the entire reviewed plain-interest packet to retained issuer copies. */
export async function bindForm8814PlainInterestIssuerCopies(
  rawItem: unknown,
  electingParentSsn: string,
  rawPacket: unknown,
  copies: readonly Form8814IssuerCopy[],
): Promise<void> {
  const item = itemSchema.parse(rawItem);
  const packet = form8814PlainInterestIssuerPacketSchema.parse(rawPacket);
  assertForm8814SourceReview(item, electingParentSsn);
  const normalized = (value: string) => value.replace(/\D/g, "");
  const nonInterestAmounts = [
    item.tax_exempt_interest,
    item.private_activity_bond_interest,
    item.dividend_income,
    item.dividend_nominee_distribution,
    item.qualified_dividends,
    item.capital_gain_distributions,
    item.capital_gain_nominee_distribution,
    item.alaska_pfd,
    item.nontaxable_social_security,
  ];
  const aggregate = packet.issuers.reduce(
    (sum, review) => sum + review.box1_taxable_interest,
    0,
  );
  if (
    packet.packet_reference !== item.source_review?.source_document_reference ||
    !Number.isSafeInteger(aggregate) ||
    aggregate !== item.interest_income ||
    nonInterestAmounts.some((amount) => (amount ?? 0) !== 0) ||
    item.interest_adjustments !== undefined ||
    item.child_had_foreign_account === true ||
    item.child_foreign_trust_part_iii_event === true ||
    packet.issuers.some((review) =>
      normalized(review.child_ssn) !== normalized(item.child_ssn)
    ) ||
    new Set(packet.issuers.map((review) => review.issuer_tin)).size !==
      packet.issuers.length ||
    new Set(packet.issuers.map((review) => review.source_document_reference))
        .size !== packet.issuers.length ||
    copies.length !== packet.issuers.length ||
    new Set(copies.map((copy) => copy.source_document_reference)).size !==
      copies.length
  ) {
    throw new Error(
      "Form 8814 issuer copies do not match the reviewed child packet and complete interest source set",
    );
  }
  for (const review of packet.issuers) {
    const copy = copies.find((item) =>
      item.source_document_reference === review.source_document_reference
    );
    if (
      !copy || !(copy.bytes instanceof Uint8Array) || copy.bytes.length < 8 ||
      new TextDecoder().decode(copy.bytes.subarray(0, 5)) !== "%PDF-" ||
      await sha256Hex(copy.bytes) !== review.source_document_sha256
    ) {
      throw new Error(
        `Form 8814 ${review.source_document_reference} retained issuer PDF bytes differ from the reviewed SHA-256`,
      );
    }
  }
}
