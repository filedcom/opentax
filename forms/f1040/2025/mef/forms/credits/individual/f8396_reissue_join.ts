import type { Form8396Source } from "../../../../../nodes/intermediate/forms/credits/individual/form8396/calculation.ts";
import { inputSchema as form8828InputSchema } from "../../../../../nodes/inputs/taxes/credit-recapture/f8828/index.ts";

/** Match the actual certificate lineage when a 2025 Form 8828 is also present. */
export function assertForm8396ReissueForm8828Join(
  source: Form8396Source,
  pending?: Readonly<Record<string, unknown>>,
): void {
  const reissue = source.reviewed_reissued_mcc;
  if (!reissue || pending?.f8828 === undefined) return;
  const { f8828s } = form8828InputSchema.parse(pending.f8828);
  const matches = f8828s.filter((item) => {
    const reviewed = item.reviewed_mcc_reissue;
    return reviewed?.original_certificate_reference ===
        reissue.original_certificate_reference &&
      reviewed?.reissued_certificate_reference ===
        reissue.reissued_certificate_reference;
  });
  if (matches.length !== 1) {
    throw new Error(
      "Form 8396 reissued MCC needs one matching Form 8828 certificate pair",
    );
  }
  const item = matches[0];
  const recapture = item.reviewed_mcc_reissue!;
  const address = item.property_address;
  const home = reissue.property_address;
  if (
    item.subsidy_type !== "mortgage_credit_certificate" ||
    item.issuer_name !== source.certificate_issuer_name ||
    item.original_loan_closing_date !== reissue.original_loan_closing_date ||
    item.highest_federally_subsidized_loan_amount !==
      reissue.original_mortgage_amount ||
    recapture.refinance_date !== reissue.refinance_date ||
    recapture.reissued_certificate_effective_date !==
      reissue.reissued_certificate_effective_date ||
    recapture.refinance_settlement_reference !==
      reissue.refinance_settlement_reference ||
    recapture.issuer_compliance_reference !==
      reissue.issuer_compliance_reference ||
    recapture.original_certificate_outstanding_debt_at_refinance !==
      reissue.original_certificate_outstanding_debt_at_refinance ||
    recapture.replacement_certificate_mortgage_debt !==
      reissue.replacement_mortgage_amount ||
    recapture.original_certificate_credit_rate !==
      reissue.original_certificate_credit_rate ||
    recapture.replacement_certificate_credit_rate !==
      reissue.replacement_certificate_credit_rate ||
    address.line1 !== home.line1 ||
    (address.line2 ?? "") !== (home.line2 ?? "") ||
    address.city !== home.city || address.state !== home.state ||
    address.zip !== home.zip
  ) {
    throw new Error(
      "Form 8396 reissued MCC terms differ from the linked Form 8828 source",
    );
  }
}
