import { inputSchema as trustK1InputSchema } from "../../../nodes/inputs/k1_trust/index.ts";
import { inputSchema as f3468InputSchema } from "../../../nodes/inputs/f3468/index.ts";
import {
  reconcileTrustPartVStatement,
  type TrustPartVStatement,
} from "../../../nodes/inputs/f3468/trust-part-v-source.ts";

export type FiledTrustPartVClaim = {
  readonly source_type: "trust";
  readonly source_ein: string;
  readonly source_name: string;
  readonly source_document_reference: string;
  readonly source_statement_reference: string;
  readonly statement: TrustPartVStatement;
  readonly credit_amount: number;
  readonly subject_to_passive_activity_limit: false;
};

/** Match every filed Form 3468 property to exactly one K-1 box 14 code M. */
export function reconcileFiledTrustPartVClaims(
  pending: Readonly<Record<string, unknown>>,
): FiledTrustPartVClaim[] {
  const k1 = pending.k1_trust === undefined
    ? []
    : trustK1InputSchema.parse(pending.k1_trust).k1_trusts;
  const form = pending.f3468 === undefined
    ? undefined
    : f3468InputSchema.parse(pending.f3468);
  const sourceClaims = k1.filter((item) =>
    item.box14_code_m_clean_electricity_investment_information === true
  );
  const filedClaims = form?.trust_part_v_claims ?? [];
  const reviews = form?.trust_part_v_source_reviews ?? [];
  if (
    sourceClaims.length !== filedClaims.length ||
    reviews.length !== filedClaims.length
  ) {
    throw new Error(
      "Form 3468 trust Part V property count differs from K-1 box 14 code M and independent review sources",
    );
  }
  if (filedClaims.length === 0) return [];
  if (
    new Set(
      reviews.map((review) =>
        `${review.issuer_ein}:${review.source_document_reference}:${review.statement_reference}`
      ),
    ).size !== reviews.length
  ) {
    throw new Error("Duplicate reviewed trust Form 3468 Part V statement");
  }
  if (
    Object.entries(form!).some(([key, value]) =>
      key !== "trust_part_v_claims" &&
      ((typeof value === "number" && value > 0) || value === true)
    )
  ) {
    throw new Error(
      "Trust Form 3468 Part V cannot mix with direct investment-credit bases",
    );
  }
  const used = new Set<number>();
  return filedClaims.map((claim) => {
    const index = sourceClaims.findIndex((item, index) =>
      !used.has(index) && item.entity_type === "trust" &&
      item.estate_trust_ein === claim.source_ein &&
      item.source_document_reference === claim.source_document_reference &&
      item.box14_code_m_form3468_part_v_statement?.statement_reference ===
        claim.statement.statement_reference
    );
    if (index < 0) {
      throw new Error(
        "Form 3468 trust Part V property lacks matching K-1 source",
      );
    }
    used.add(index);
    const source = sourceClaims[index];
    if (
      source.estate_trust_name.length > 75 ||
      !/^(([A-Za-z0-9#\-()]|&|') ?)*([A-Za-z0-9#\-()]|&|')$/.test(
        source.estate_trust_name,
      )
    ) {
      throw new Error("Form 3468 trust owner name does not fit native IRS3468");
    }
    const statement = source.box14_code_m_form3468_part_v_statement!;
    reconcileTrustPartVStatement(statement, source);
    const review = reviews.find((item) =>
      item.statement_reference === statement.statement_reference &&
      item.issuer_ein === statement.issuer_ein &&
      item.beneficiary_ssn === statement.beneficiary_ssn &&
      item.source_document_reference === statement.source_document_reference
    );
    if (
      !review ||
      JSON.stringify(statement) !== JSON.stringify(claim.statement) ||
      JSON.stringify(statement) !== JSON.stringify(review)
    ) {
      throw new Error(
        "Form 3468 property differs from its separate reviewed statement packet",
      );
    }
    return {
      source_type: "trust" as const,
      source_ein: claim.source_ein,
      source_name: source.estate_trust_name,
      source_document_reference: claim.source_document_reference,
      source_statement_reference: statement.statement_reference,
      statement,
      credit_amount: statement.beneficiary_allocated_credit,
      subject_to_passive_activity_limit: false as const,
    };
  });
}
