import { inputSchema as partnershipK1InputSchema } from "../../../nodes/inputs/k1_partnership/index.ts";
import { inputSchema as sCorpK1InputSchema } from "../../../nodes/inputs/k1_s_corp/index.ts";

export type DisabledAccessK1Credit = {
  readonly source_type: "partnership" | "s_corporation";
  readonly entity_ein: string;
  readonly source_document_reference: string;
  readonly credit_amount: number;
  readonly subject_to_passive_activity_limit: boolean;
};

function sameCents(left: number | undefined, right: number): boolean {
  return left !== undefined &&
    Math.round(left * 100) === Math.round(right * 100);
}

/** Verify a disabled-access pass-through credit against box 15/13 code K. */
export function reconcileDisabledAccessK1Credits(
  credits: readonly DisabledAccessK1Credit[],
  pending: Readonly<Record<string, unknown>>,
): void {
  if (credits.length === 0) return;
  const partnerships = pending.k1_partnership === undefined
    ? []
    : partnershipK1InputSchema.parse(pending.k1_partnership).k1_partnerships;
  const sCorporations = pending.k1_s_corp === undefined
    ? []
    : sCorpK1InputSchema.parse(pending.k1_s_corp).k1_s_corps;
  const seen = new Set<string>();
  for (const credit of credits) {
    const key = [
      credit.source_type,
      credit.entity_ein,
      credit.source_document_reference,
    ].join(":");
    if (seen.has(key)) {
      throw new Error("Form 8826 K-1 credit source is duplicated");
    }
    seen.add(key);
    if (credit.source_type === "partnership") {
      const matches = partnerships.filter((k1) =>
        k1.partnership_ein === credit.entity_ein &&
        k1.source_document_reference === credit.source_document_reference
      );
      if (
        matches.length !== 1 ||
        !sameCents(
          matches[0].box15_code_k_disabled_access_credit,
          credit.credit_amount,
        ) ||
        matches[0].disabled_access_credit_subject_to_passive_activity_limit !==
          credit.subject_to_passive_activity_limit
      ) {
        throw new Error(
          "Form 8826 partnership credit does not reconcile to K-1 box 15 code K",
        );
      }
    } else {
      const matches = sCorporations.filter((k1) =>
        k1.corporation_ein === credit.entity_ein &&
        k1.source_document_reference === credit.source_document_reference
      );
      if (
        matches.length !== 1 ||
        !sameCents(
          matches[0].box13_code_k_disabled_access_credit,
          credit.credit_amount,
        ) ||
        matches[0].disabled_access_credit_subject_to_passive_activity_limit !==
          credit.subject_to_passive_activity_limit
      ) {
        throw new Error(
          "Form 8826 S-corporation credit does not reconcile to K-1 box 13 code K",
        );
      }
    }
  }
}
