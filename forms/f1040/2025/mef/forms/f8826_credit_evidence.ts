import { inputSchema as partnershipK1InputSchema } from "../../../nodes/inputs/k1_partnership/index.ts";
import { inputSchema as sCorpK1InputSchema } from "../../../nodes/inputs/k1_s_corp/index.ts";
import { inputSchema as trustK1InputSchema } from "../../../nodes/inputs/k1_trust/index.ts";

export type DisabledAccessK1Credit = {
  readonly source_type: "partnership" | "s_corporation" | "estate" | "trust";
  readonly entity_ein: string;
  readonly source_document_reference: string;
  readonly source_statement_reference?: string;
  readonly credit_amount: number;
  readonly subject_to_passive_activity_limit: boolean;
};

function sameCents(left: number | undefined, right: number): boolean {
  return left !== undefined &&
    Math.round(left * 100) === Math.round(right * 100);
}

function sameK1Credit(
  left: number | undefined,
  right: number,
  passive: boolean,
): boolean {
  return passive
    ? left !== undefined && Number.isInteger(right) &&
      Math.round(left) === right
    : sameCents(left, right);
}

/** Verify a disabled-access pass-through credit against the matching K-1 code. */
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
        !sameK1Credit(
          matches[0].box15_code_k_disabled_access_credit,
          credit.credit_amount,
          credit.subject_to_passive_activity_limit,
        ) ||
        matches[0].disabled_access_credit_subject_to_passive_activity_limit !==
          credit.subject_to_passive_activity_limit
      ) {
        throw new Error(
          "Form 8826 partnership credit does not reconcile to K-1 box 15 code K",
        );
      }
    } else if (credit.source_type === "s_corporation") {
      const matches = sCorporations.filter((k1) =>
        k1.corporation_ein === credit.entity_ein &&
        k1.source_document_reference === credit.source_document_reference
      );
      if (
        matches.length !== 1 ||
        !sameK1Credit(
          matches[0].box13_code_k_disabled_access_credit,
          credit.credit_amount,
          credit.subject_to_passive_activity_limit,
        ) ||
        matches[0].disabled_access_credit_subject_to_passive_activity_limit !==
          credit.subject_to_passive_activity_limit
      ) {
        throw new Error(
          "Form 8826 S-corporation credit does not reconcile to K-1 box 13 code K",
        );
      }
    } else {
      const matches = estatesAndTrusts.filter((k1) =>
        k1.entity_type === credit.source_type &&
        k1.estate_trust_ein === credit.entity_ein &&
        k1.source_document_reference === credit.source_document_reference &&
        k1.box13_code_zz_disabled_access_statement_reference ===
          credit.source_statement_reference
      );
      if (
        !credit.source_statement_reference || matches.length !== 1 ||
        !sameK1Credit(
          matches[0].box13_code_zz_disabled_access_credit,
          credit.credit_amount,
          credit.subject_to_passive_activity_limit,
        ) ||
        matches[0].disabled_access_credit_subject_to_passive_activity_limit !==
          credit.subject_to_passive_activity_limit
      ) {
        throw new Error(
          "Form 8826 estate/trust credit does not reconcile to K-1 box 13 code ZZ statement",
        );
      }
    }
  }
}
