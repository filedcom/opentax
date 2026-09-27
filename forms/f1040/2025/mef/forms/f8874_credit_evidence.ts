import { inputSchema as partnershipK1InputSchema } from "../../../nodes/inputs/k1_partnership/index.ts";
import { inputSchema as sCorpK1InputSchema } from "../../../nodes/inputs/k1_s_corp/index.ts";
import { inputSchema as trustK1InputSchema } from "../../../nodes/inputs/k1_trust/index.ts";

export type NewMarketsK1CreditEvidence = {
  readonly source_type: "partnership" | "s_corporation" | "estate" | "trust";
  readonly source_ein: string;
  readonly source_document_reference: string;
  readonly source_statement_reference?: string;
  readonly credit_amount: number;
  readonly subject_to_passive_activity_limit: boolean;
};

export function reconcileNewMarketsK1Credits(
  entries: readonly NewMarketsK1CreditEvidence[],
  pending: Readonly<Record<string, unknown>>,
): void {
  if (entries.length === 0) return;
  const partnerships =
    entries.some((entry) => entry.source_type === "partnership")
      ? partnershipK1InputSchema.parse(pending.k1_partnership).k1_partnerships
      : [];
  const corporations =
    entries.some((entry) => entry.source_type === "s_corporation")
      ? sCorpK1InputSchema.parse(pending.k1_s_corp).k1_s_corps
      : [];
  const estatesAndTrusts =
    entries.some((entry) =>
        entry.source_type === "estate" || entry.source_type === "trust"
      )
      ? trustK1InputSchema.parse(pending.k1_trust).k1_trusts
      : [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const key =
      `${entry.source_type}:${entry.source_ein}:${entry.source_document_reference}:${
        entry.source_statement_reference ?? ""
      }`;
    if (seen.has(key)) {
      throw new Error("Form 3800 New Markets Credit K-1 source is duplicated");
    }
    seen.add(key);
    const matches = entry.source_type === "partnership"
      ? partnerships.filter((k1) =>
        k1.partnership_ein === entry.source_ein &&
        k1.source_document_reference === entry.source_document_reference &&
        k1.box15_code_ad_new_markets_credit === entry.credit_amount &&
        k1.new_markets_credit_subject_to_passive_activity_limit ===
          entry.subject_to_passive_activity_limit
      )
      : entry.source_type === "s_corporation"
      ? corporations.filter((k1) =>
        k1.corporation_ein === entry.source_ein &&
        k1.source_document_reference === entry.source_document_reference &&
        k1.box13_code_ad_new_markets_credit === entry.credit_amount &&
        k1.new_markets_credit_subject_to_passive_activity_limit ===
          entry.subject_to_passive_activity_limit
      )
      : estatesAndTrusts.filter((k1) =>
        k1.entity_type === entry.source_type &&
        k1.estate_trust_ein === entry.source_ein &&
        k1.source_document_reference === entry.source_document_reference &&
        k1.box13_code_zz_new_markets_statement_reference ===
          entry.source_statement_reference &&
        k1.box13_code_zz_new_markets_credit === entry.credit_amount &&
        k1.new_markets_credit_subject_to_passive_activity_limit ===
          entry.subject_to_passive_activity_limit
      );
    if (matches.length !== 1) {
      throw new Error(
        `Form 3800 New Markets Credit does not reconcile to ${entry.source_type} K-1 ${
          entry.source_type === "partnership" ||
            entry.source_type === "s_corporation"
            ? "code AD"
            : "code ZZ statement"
        }`,
      );
    }
  }
}
