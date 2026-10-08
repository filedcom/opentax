import { inputSchema as generalInputSchema } from "../../../../nodes/inputs/general/filing/general/index.ts";
import {
  type EicTaxResidencyReview,
  eicTaxResidencyReviewSchema,
} from "../../../../nodes/intermediate/forms/credits/earned-income/eitc/index.ts";

interface ElectionFields {
  filing_status?: unknown;
  eic_tax_residency_review?: unknown;
  taxpayer_first_name?: unknown;
  taxpayer_last_name?: unknown;
  spouse_first_name?: unknown;
  spouse_last_name?: unknown;
}

/** Validate the Form 1040 full-year resident election and return the printed name. */
export function residentElectionName(
  fields: ElectionFields,
  pending?: Readonly<Record<string, unknown>>,
  attachmentSha256ByFileName?: Readonly<Record<string, string>>,
  requireSignedStatementAttachment = false,
): string | undefined {
  const review = fields.eic_tax_residency_review === undefined
    ? undefined
    : eicTaxResidencyReviewSchema.parse(fields.eic_tax_residency_review);
  const general = pending?.general === undefined
    ? undefined
    : generalInputSchema.parse(pending.general);
  if (
    general &&
    JSON.stringify(general.eic_tax_residency_review) !== JSON.stringify(review)
  ) {
    throw new Error(
      "Form 1040 resident-election facts differ from general source",
    );
  }
  if (!review || review.status === "all_year_resident") return undefined;
  if (fields.filing_status !== "mfj") {
    throw new Error("Form 1040 resident election requires a joint return");
  }
  const name = electedPersonName(fields, review);
  if (review.status === "joint_new_election") {
    if (
      requireSignedStatementAttachment &&
      attachmentSha256ByFileName?.[review.signed_statement_file_name] !==
        review.signed_statement_pdf_sha256
    ) {
      throw new Error(
        "Form 1040 new resident election needs its signed statement PDF",
      );
    }
  }
  return name;
}

function electedPersonName(
  fields: ElectionFields,
  review: Extract<EicTaxResidencyReview, { elected_person: string }>,
): string {
  const first = review.elected_person === "taxpayer"
    ? fields.taxpayer_first_name
    : fields.spouse_first_name;
  const last = review.elected_person === "taxpayer"
    ? fields.taxpayer_last_name
    : fields.spouse_last_name;
  if (typeof first !== "string" || typeof last !== "string") {
    throw new Error(
      "Form 1040 resident election needs the elected spouse name",
    );
  }
  const name = `${first.trim()} ${last.trim()}`;
  if (
    name.length > 35 ||
    !/^([A-Za-z0-9'-] ?)*[A-Za-z0-9'-]$/.test(name)
  ) {
    throw new Error("Form 1040 resident election needs an IRS-valid name");
  }
  return name;
}
