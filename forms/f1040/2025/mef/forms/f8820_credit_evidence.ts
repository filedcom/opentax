import type { F8820Input } from "../../../nodes/inputs/f8820/index.ts";
import { inputSchema as partnershipK1InputSchema } from "../../../nodes/inputs/k1_partnership/index.ts";
import { inputSchema as sCorpK1InputSchema } from "../../../nodes/inputs/k1_s_corp/index.ts";
import { inputSchema as trustK1InputSchema } from "../../../nodes/inputs/k1_trust/index.ts";

type OrphanDrugK1Credit = NonNullable<
  F8820Input["pass_through_credits"]
>[number];

/** Require each pass-through orphan-drug credit to match one source K-1. */
export function reconcileOrphanDrugK1Credits(
  credits: readonly OrphanDrugK1Credit[],
  pending: Readonly<Record<string, unknown>>,
): void {
  if (credits.length === 0) return;
  const partnerships = pending.k1_partnership === undefined
    ? []
    : partnershipK1InputSchema.parse(pending.k1_partnership).k1_partnerships;
  const sCorporations = pending.k1_s_corp === undefined
    ? []
    : sCorpK1InputSchema.parse(pending.k1_s_corp).k1_s_corps;
  const estatesAndTrusts = pending.k1_trust === undefined
    ? []
    : trustK1InputSchema.parse(pending.k1_trust).k1_trusts;
  const seen = new Set<string>();
  for (const credit of credits) {
    const key = [
      credit.source_type,
      credit.entity_ein,
      credit.source_document_reference,
    ].join(":");
    if (seen.has(key)) {
      throw new Error("Form 8820 K-1 credit source is duplicated");
    }
    seen.add(key);
    if (credit.source_type === "partnership") {
      const matches = partnerships.filter((k1) =>
        k1.partnership_ein === credit.entity_ein &&
        k1.source_document_reference === credit.source_document_reference
      );
      if (
        matches.length !== 1 ||
        matches[0].box15_code_z_orphan_drug_credit !== credit.credit_amount ||
        matches[0].orphan_drug_credit_subject_to_passive_activity_limit !==
          credit.subject_to_passive_activity_limit
      ) {
        throw new Error(
          "Form 8820 partnership credit does not reconcile to K-1 box 15 code Z",
        );
      }
    } else if (credit.source_type === "s_corporation") {
      const matches = sCorporations.filter((k1) =>
        k1.corporation_ein === credit.entity_ein &&
        k1.source_document_reference === credit.source_document_reference
      );
      if (
        matches.length !== 1 ||
        matches[0].box13_code_z_orphan_drug_credit !== credit.credit_amount ||
        matches[0].orphan_drug_credit_subject_to_passive_activity_limit !==
          credit.subject_to_passive_activity_limit
      ) {
        throw new Error(
          "Form 8820 S-corporation credit does not reconcile to K-1 box 13 code Z",
        );
      }
    } else {
      const matches = estatesAndTrusts.filter((k1) =>
        k1.entity_type === credit.source_type &&
        k1.estate_trust_ein === credit.entity_ein &&
        k1.source_document_reference === credit.source_document_reference
      );
      if (
        matches.length !== 1 ||
        matches[0].box13_code_m_orphan_drug_credit !== credit.credit_amount ||
        matches[0].orphan_drug_credit_subject_to_passive_activity_limit !==
          credit.subject_to_passive_activity_limit
      ) {
        throw new Error(
          "Form 8820 estate/trust credit does not reconcile to K-1 box 13 code M",
        );
      }
    }
  }
}
